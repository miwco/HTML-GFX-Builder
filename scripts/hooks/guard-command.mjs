// PreToolUse guard for shell commands (the Bash and PowerShell tools). Enforces, cheapest
// check first:
//
//  1. Dev servers go through the Claude preview tools, never a raw shell command - a stray
//     server on this checkout's port is exactly the "reuseExistingServer picks up the wrong
//     env" e2e trap documented in CLAUDE.md.
//  2. Commit messages follow the house rules (CLAUDE.md "Git"): no Co-Authored-By trailers,
//     no AI/agent/chat-session language, no internal plan codenames.
//  3. Commits never include dist/ or the generated .claude/launch.json.
//  4. The e2e suites only start when their port is free - Playwright would otherwise reuse
//     whatever server is already there, with whatever env it was started with.
//
// The commit-message scan works on the raw command text (the message is embedded in it via
// -m / heredoc / here-string), so it is quoting-style agnostic.

import { spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { readHookInput, deny } from './lib.mjs';
import { devPort, livePort } from '../dev-port.mjs';

const input = await readHookInput();
const command = input?.tool_input?.command;
if (typeof command !== 'string' || command.length === 0) process.exit(0);

// --- 1. Dev-server policy -----------------------------------------------------------------

const DEV_SERVER_PATTERNS = [
  /\bnpm\s+run\s+dev\b/,
  /\bnpm\s+run\s+preview\b/,
  // A direct vite invocation (bare at a command position, or via npx) that is not `vite build`.
  /(^|[;&|(]\s*|\bnpx\s+)vite\b(?!\s+build\b)(?![.-])/m,
];
if (DEV_SERVER_PATTERNS.some((p) => p.test(command))) {
  deny(
    'Dev servers are managed by the Claude preview tools in this repo, never a raw shell command - ' +
      'a hand-started server on this checkout\'s port makes the e2e suite silently reuse it with the ' +
      'wrong env (see CLAUDE.md "Verifying changes" gotchas).\n' +
      'Use preview_start with {name: "dev"} instead - .claude/launch.json already points it at this ' +
      "checkout's port (node scripts/dev-port.mjs prints it). For a production build, run `npm run build`.",
  );
}

// --- 2 + 3. Commit guards ------------------------------------------------------------------

// "git ... commit" within one shell command segment (not across ; | & or newlines).
const isCommit = /\bgit\b[^\n;|&]*\bcommit\b/.test(command);

if (isCommit) {
  // Never allowed, no escape hatch: agent co-author trailers and generated-with footers.
  if (/co-authored-by/i.test(command) || /🤖/u.test(command)) {
    deny(
      'Blocked: commit messages in this repo never carry Co-Authored-By trailers or ' +
        '"Generated with" footers (user rule in CLAUDE.md "Git"). Rewrite the message without them.',
    );
  }

  // House-style violations: AI/agent mentions, chat-session phrases, internal plan codenames.
  // A commit genuinely about AI tooling may mention these - bypass by putting
  // ALLOW_AI_MENTION=1 in the command (any shell syntax; the literal text is what counts).
  const escaped = /ALLOW_AI_MENTION\s*=\s*1/.test(command);
  if (!escaped) {
    const STYLE_VIOLATIONS = [
      // (?![./\\-]) lets file/branch/path references through: CLAUDE.md, .claude/,
      // claude/branch-name, and Windows paths like C:\claude\repo (backslash separator).
      [/\bclaude\b(?![./\\-])/i, 'mentions Claude'],
      [/\bcodex\b/i, 'mentions Codex'],
      [/\bchatgpt\b/i, 'mentions ChatGPT'],
      [/\bcopilot\b/i, 'mentions Copilot'],
      [/\banthropic\b/i, 'mentions Anthropic'],
      [/\bopenai\b/i, 'mentions OpenAI'],
      [/\bas requested\b/i, 'chat phrase "as requested"'],
      [/\bas instructed\b/i, 'chat phrase "as instructed"'],
      [/\bper (?:your|the|my) instruction/i, 'chat phrase "per ... instructions"'],
      [/\bthis session\b/i, 'chat phrase "this session"'],
      [/\bthis conversation\b/i, 'chat phrase "this conversation"'],
      [/\bcontinued work\b/i, 'vague phrase "continued work"'],
      [/\bmade changes\b/i, 'vague phrase "made changes"'],
      [/\bai update\b/i, 'vague phrase "AI update"'],
      [/\bera[ -]?\d/i, 'internal era codename'],
      [/\bT\d\.\d\b/, 'internal plan codename (T3.5-style)'],
    ];
    const hits = STYLE_VIOLATIONS.filter(([pattern]) => pattern.test(command)).map(([, why]) => why);
    if (hits.length > 0) {
      deny(
        `Blocked: this commit command trips the commit-message style rules (CLAUDE.md "Git"): ${hits.join('; ')}.\n` +
          'Messages must read as written by a human developer for an outside reader - no AI/agent/chat ' +
          'language, no internal codenames. If a mention is deliberate because the commit is genuinely ' +
          'about AI tooling, include ALLOW_AI_MENTION=1 in the command to bypass this check.',
      );
    }
  }

  // Staged-content check: dist/ and the generated launch.json are never committed. Both are
  // gitignored, so reaching the index takes a force-add - catch it here. `git commit -a`
  // also sweeps in unstaged tracked changes, so scan those too when -a/--all is present.
  const staged = gitLines(['diff', '--cached', '--name-only']);
  const sweepsTracked = /\bgit\b[^\n;|&]*\bcommit\b[^\n;|&]*(\s--all\b|\s-(?!-)[a-zA-Z]*a)/.test(command);
  const candidates = sweepsTracked ? staged.concat(gitLines(['diff', '--name-only'])) : staged;
  const forbidden = candidates.filter((f) => f.startsWith('dist/') || f === '.claude/launch.json');
  if (forbidden.length > 0) {
    deny(
      `Blocked: this commit would include generated files that never go into the repo: ${[...new Set(forbidden)].join(', ')}.\n` +
        'dist/ is build output and .claude/launch.json is regenerated per-checkout by postinstall. ' +
        'Unstage them (git restore --staged <path>) and commit again.',
    );
  }
}

// --- 4. E2E preflight ----------------------------------------------------------------------

if (/\btest:e2e\b/.test(command) || /\bplaywright\s+test\b/.test(command)) {
  const live = /\btest:e2e:live\b/.test(command) || /playwright\.live\.config/.test(command);
  const port = live ? livePort() : devPort();
  if (await portInUse(port)) {
    deny(
      `Blocked: something is already listening on port ${port} - this checkout's ${live ? 'live' : 'offline'} ` +
        'e2e port. Playwright runs with reuseExistingServer:true, so it would reuse that server with ' +
        `whatever env it was started with, and the ${live ? 'configured-mode' : 'offline-pinned'} specs ` +
        'fail confusingly (see CLAUDE.md "Verifying changes" gotchas).\n' +
        'Stop that server first (preview_stop if it was started with the preview tools), then re-run. ' +
        "Servers in other worktrees are harmless - they live on their own ports.",
    );
  }
}

process.exit(0);

/** Run git with the given args in this checkout and return stdout as trimmed lines. */
function gitLines(args) {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  if (res.status !== 0 || typeof res.stdout !== 'string') return []; // fail open - git itself will complain
  return res.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** True when something accepts TCP connections on localhost:port. */
function portInUse(port) {
  return new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' });
    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(750);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}
