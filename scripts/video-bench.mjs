// Video AI quality bench: run REAL generations for the wizard's video example prompts
// (the built-in chips double as the feature's acceptance tests), capture key frames from
// the live player, run automated readability checks, and build a review gallery. This is
// the raw material for iterating the video prompt harness in src/ai/video/.
//
//   node scripts/video-bench.mjs [out-dir] [label,label,… | count | briefs.json] [runs-per-example]
//                                [--engine=remotion|hyperframes] [--stub]
//
// `--engine` picks the GENERATION ENGINE the wizard creates with, so the same briefs can be
// benched through either coder; everything downstream (the source file captured, the frame
// strip, the checks) follows the engine. `--stub` seeds NO key, so the app falls back to the
// offline stub provider and the bench's own plumbing runs end to end for FREE - use it to
// prove a bench change works before spending anything.
//
// Requirements: the dev server (this checkout's port — scripts/dev-port.mjs) and
// VITE_ANTHROPIC_API_KEY in .env (or the environment). The bench seeds the app's AI
// settings itself (key + model + proxyUrl:'' + harness off), so a dev server started with
// a fuller .env (hosted-mode VITE_AI_PROXY_URL) still benches in direct bring-your-own-key
// mode. ⚠ The dev server must NOT have the SUPABASE vars set, though: with a backend
// configured the visitor is signed out, and the wizard's video step renders a sign-in prompt
// instead of the engine picker and prompt box - the bench then times out on a missing
// control rather than saying anything useful. ⚠ SPENDS REAL TOKENS — a video generation is two Sonnet calls
// (director + coder) plus up to two repair rounds; expect tens of cents per run. The
// second arg filters to specific example labels (comma list, e.g. "Sports
// stinger,Countdown"), the first N, or a path to a .json file of custom briefs
// ([{label, prompt, durationSec?}] — typed into the wizard instead of a chip); the third
// repeats each example (generation is stochastic — reliability needs more than one
// sample).
//
// Beyond validation, every run gets RUNTIME READABILITY CHECKS at hold-phase frames -
// occlusion ("the title is behind the shape panels", the video counterpart of the SPX
// bench's overlap check) and CLIPPING ("KITCHEN" painting as "KITCH"). Both come from the
// player host itself, which inlines src/video/textChecks.js at build time — the same code
// the AI's injected validator probes with, so the bench and the generation gate can never
// drift apart. A stale built host has no checks to call: `npm run build:player-host`.

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';

const BASE = `http://localhost:${devPort()}`;
// Flags are position-independent; the three positional args keep their old meaning.
const ARGS = process.argv.slice(2);
const flag = (name) => ARGS.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const POS = ARGS.filter((a) => !a.startsWith('--'));
const OUT = POS[0] || './video-bench-out';
const FILTER = POS[1] ?? '';
const RUNS = Math.max(1, Number(POS[2]) || 1);
const STUB = ARGS.includes('--stub');
const ENGINE = flag('engine') ?? 'remotion';
if (!['remotion', 'hyperframes'].includes(ENGINE)) {
  console.error(`Unknown --engine=${ENGINE} (use remotion or hyperframes).`);
  process.exit(1);
}
/** The engine's source file: what the store holds it in, and what it is called on disk. */
const SOURCE = ENGINE === 'hyperframes'
  ? { field: 'html', ext: 'html', label: 'composition.html' }
  : { field: 'tsx', ext: 'tsx', label: 'Composition.tsx' };
mkdirSync(OUT, { recursive: true });

// The example labels as the wizard shows them (VideoStep.tsx EXAMPLES). The bench drives
// the real chips so it always tests the shipped prompts — never a drifted copy.
const EXAMPLE_LABELS = ['Sports stinger', 'News intro', 'Logo reveal', 'Countdown'];

// The frame fractions captured per run: entrance, build, midpoint, hold, exit, final.
const SHOT_FRACTIONS = [0.12, 0.3, 0.5, 0.7, 0.88, 1];
// Readability is checked where the hero must be legible — the hold phase.
const CHECK_FRACTIONS = [0.5, 0.6, 0.7];

// ── Key: .env first, then the environment ──
function readKey() {
  const clean = (v) => v.replace(/^[\s"']+|[\s"']+$/g, '');
  if (process.env.VITE_ANTHROPIC_API_KEY) return clean(process.env.VITE_ANTHROPIC_API_KEY);
  if (existsSync('.env')) {
    const m = readFileSync('.env', 'utf8').match(/^VITE_ANTHROPIC_API_KEY=(.+)$/m);
    if (m) return clean(m[1]) || null;
  }
  return null;
}
const KEY = STUB ? '' : readKey();
if (!STUB && !KEY) {
  console.error('No VITE_ANTHROPIC_API_KEY found (in .env or the environment). Aborting before spending anything.');
  process.exit(1);
}

// Selection: chip labels, a count, or a custom-briefs JSON file. A custom brief is
// {label, prompt, durationSec?, transparent?, assets?: [file paths]} and is typed into the
// wizard's prompt box, with any assets really uploaded first.
let selected;
if (FILTER.endsWith('.json') && existsSync(FILTER)) {
  selected = JSON.parse(readFileSync(FILTER, 'utf8'));
} else {
  selected = (FILTER.includes(',') || EXAMPLE_LABELS.includes(FILTER)
    ? EXAMPLE_LABELS.filter((l) => FILTER.split(',').map((s) => s.trim()).includes(l))
    : EXAMPLE_LABELS.slice(0, Number(FILTER) || Infinity)
  ).map((label) => ({ label }));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1720, height: 980 } });
await page.addInitScript((key) => {
  // proxyUrl:'' pins DIRECT mode - an empty string beats loadAiSettings' ?? fallback to the
  // dev server's VITE_AI_PROXY_URL, so a full .env no longer reroutes bench calls. NOTE:
  // `useHarness` is deliberately NOT seeded - it gates the SPX wizard only (AiStep), never
  // the video path, so pinning it here would just be a stale mirror of an unrelated default.
  // --stub seeds an EMPTY key, which is how aiConfigured() falls back to the offline stub
  // provider - the free plumbing check.
  localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: key, model: 'claude-sonnet-5', proxyUrl: '' }));
}, KEY);

// ── In-page diagnostics ──
// The repair loop is invisible from outside: intermediate validator findings are handed
// straight back to the model and never reach the store. So the bench watches the two places
// they DO surface — the busy line (stage names, including "round N of 2") and the API calls
// themselves (a repair round's user message quotes the exact findings, and the source that
// produced them, which is the ONLY copy when a rejected result keeps the previous code).
// Wrapping fetch also gives real token usage per run - the honest way to report a bench's
// cost. Purely observational: nothing here changes what the app does.
await page.addInitScript(() => {
  window.__bench = { stages: [], calls: [], wrapped: false };

  // The fetch wrapper goes FIRST and the observer is deferred to DOM-ready: an init script
  // runs at document-start, where document.documentElement can still be absent - observing
  // it there throws, and everything after the throw (the wrapper) silently never installs.
  const origFetch = window.fetch;
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    let record = null;
    if (/anthropic\.com|\/messages$/.test(String(url)) && init?.body) {
      try {
        const body = JSON.parse(init.body);
        const last = body.messages?.[body.messages.length - 1];
        const text = typeof last?.content === 'string'
          ? last.content
          : (last?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
        const isRepair = /failed validation/.test(text);
        record = {
          tool: body.tools?.[0]?.name ?? '(text)',
          model: body.model,
          repairFindings: isRepair ? text.split('\n').filter((l) => l.startsWith('- ')) : [],
          failedSource: isRepair ? (text.split(/=== [^=]+ ===\n/)[1] ?? '') : '',
        };
        window.__bench.calls.push(record);
      } catch { /* a body we can't read is not worth failing the run over */ }
    }
    const res = await origFetch(input, init);
    if (record) {
      res.clone().json().then((j) => {
        record.inputTokens = j?.usage?.input_tokens ?? 0;
        record.outputTokens = j?.usage?.output_tokens ?? 0;
      }).catch(() => {});
    }
    return res;
  };
  window.__bench.wrapped = true;

  const watchStages = () => {
    new MutationObserver(() => {
      const el = document.querySelector('.video-chat .hint');
      const t = el?.textContent?.replace(/^⏳\s*/, '').trim();
      if (t && window.__bench.stages[window.__bench.stages.length - 1] !== t) window.__bench.stages.push(t);
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  };
  if (document.documentElement) watchStages();
  else document.addEventListener('DOMContentLoaded', watchStages);
});

// Preflight: confirm the app actually resolves to the transport this run expects before
// spending anything (a settings-resolution change would otherwise fail mid-bench, or
// silently bench the wrong transport). --stub inverts the expectation: it must resolve to
// the OFFLINE provider, or the "free" run would quietly spend money.
{
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
  const resolved = await page.evaluate(async () => {
    const { loadAiSettings, aiConfigured } = await import('/src/ai/settings.ts');
    const s = loadAiSettings();
    return { direct: !s.proxyUrl && Boolean(s.apiKey), configured: aiConfigured(), model: s.model };
  });
  if (STUB && resolved.configured) {
    console.error(`Preflight failed: --stub must resolve to the OFFLINE provider, got ${JSON.stringify(resolved)}.`);
    await browser.close();
    process.exit(1);
  }
  if (!STUB && !resolved.direct) {
    console.error(`Preflight failed: expected direct BYO-key mode, got ${JSON.stringify(resolved)}.`);
    await browser.close();
    process.exit(1);
  }
  console.log(
    STUB
      ? `Preflight OK: OFFLINE stub provider (${ENGINE}) — no tokens will be spent.`
      : `Preflight OK: direct mode, model ${resolved.model}, engine ${ENGINE}.`,
  );
}

const slug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The player host frame (sandboxed; Playwright reaches inside via CDP). */
async function playerFrame() {
  const el = await page.waitForSelector('iframe.video-player-frame', { timeout: 15_000 });
  const frame = await el.contentFrame();
  if (!frame) throw new Error('player host frame not reachable');
  return frame;
}

/**
 * DEAD SPACE at the current frame: the largest rectangle of the frame carrying no designed
 * element, as a percentage of the frame.
 *
 * "The text is readable" and "the frame is composed" are different questions - the host's
 * text checks answer the first, this answers the second. Backdrops are excluded on purpose
 * (anything covering ≥55% of the frame reads as the stage, not as content), so it measures
 * where the DESIGNED elements sit: text, images, and shape layers.
 *
 * A METRIC, not a pass/fail gate, and deliberately kept out of the clean count: generous
 * negative space is a legitimate choice, and the measured within-brief spread (16-23
 * points across three samples of the same brief) is far too wide to judge a single run by.
 * It earns its place as an OUTLIER detector - "this one frame is mostly empty" - not as
 * something to tune a prompt against.
 */
async function measureDeadSpace(frame) {
  return frame.evaluate(() => {
    const root = document.querySelector('[data-composition-id]') ?? document.body;
    const f = root.getBoundingClientRect();
    if (f.width < 1 || f.height < 1) return 0;
    const COLS = 32;
    const ROWS = 18;
    const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    const isContent = (el) => {
      if (el === root || el === document.body || el === document.documentElement) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      if ((r.width * r.height) / (f.width * f.height) >= 0.55) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.15) return false;
      if (['IMG', 'SVG', 'svg', 'CANVAS'].includes(el.tagName)) return true;
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return true;
      if (cs.backgroundImage !== 'none') return true;
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
      return m ? (m[1].split(',').map(Number)[3] ?? 1) > 0.15 : false;
    };
    for (const el of document.querySelectorAll('body *')) {
      if (!isContent(el)) continue;
      // Text is measured by its GLYPH extent (a nowrap line's box can be far wider than
      // its letters); everything else by its box.
      let r = el.getBoundingClientRect();
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
        try {
          const range = document.createRange();
          range.selectNodeContents(el);
          const ink = range.getBoundingClientRect();
          if (ink.width > 0) r = ink;
        } catch { /* fall back to the box */ }
      }
      const c0 = Math.max(0, Math.floor(((r.left - f.left) / f.width) * COLS));
      const c1 = Math.min(COLS - 1, Math.ceil(((r.right - f.left) / f.width) * COLS) - 1);
      const r0 = Math.max(0, Math.floor(((r.top - f.top) / f.height) * ROWS));
      const r1 = Math.min(ROWS - 1, Math.ceil(((r.bottom - f.top) / f.height) * ROWS) - 1);
      for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) grid[y][x] = true;
    }
    // Largest all-empty rectangle: per-row histogram of empty runs, then the standard
    // largest-rectangle-in-histogram scan down the grid.
    const heights = new Array(COLS).fill(0);
    let best = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) heights[x] = grid[y][x] ? 0 : heights[x] + 1;
      const stack = [];
      for (let x = 0; x <= COLS; x++) {
        const h = x === COLS ? 0 : heights[x];
        let start = x;
        while (stack.length && stack[stack.length - 1].h >= h) {
          const top = stack.pop();
          best = Math.max(best, top.h * (x - top.x));
          start = top.x;
        }
        stack.push({ x: start, h });
      }
    }
    return Math.round((best / (COLS * ROWS)) * 100);
  });
}

/**
 * HyperFrames only: are the declared controls actually WIRED? The validator now rejects an
 * unbound variable, so a SHIPPED generation should never have one - this stays as an
 * independent audit of that rule rather than as the rule itself.
 */
function checkVariableBindings(html) {
  const m = html.match(/data-composition-variables\s*=\s*'([^']*)'/);
  if (!m) return [];
  let decls;
  try {
    decls = JSON.parse(m[1]);
  } catch {
    return ['data-composition-variables is not parseable JSON'];
  }
  const dead = [];
  for (const d of Array.isArray(decls) ? decls : []) {
    if (!d?.id) continue;
    const id = d.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bound =
      new RegExp(`data-var-(text|src)\\s*=\\s*["']${id}["']`).test(html) ||
      new RegExp(`var\\(\\s*--${id}\\b`).test(html);
    if (!bound) dead.push(`"${d.id}" (${d.type}) is declared but nothing binds it`);
  }
  return dead;
}

/** Seek the player transport to a frame and let it settle. */
async function seekTo(frameNo) {
  await page.evaluate((f) => {
    const el = document.querySelector('[data-testid=video-scrubber]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(f));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, frameNo);
  await page.waitForTimeout(350);
}

/**
 * Readability at the current frame, run by the player host's own checks
 * (src/video/textChecks.js, inlined into the host at build time and installed on
 * window.__noacgTextChecks at boot) so the bench and the AI's injected validator judge a
 * composition by the SAME code:
 *   - OCCLUSION: "the title is painted behind the shape panels" (paint-order hit test).
 *   - CLIP: "KITCHEN" rendering as "KITCH" — glyphs cut by the frame or an
 *     overflow-hidden ancestor.
 * Returns [{kind, key, message}]; the caller decides how each kind is scored.
 */
async function checkReadability(frame) {
  return frame.evaluate(() => {
    const checks = window.__noacgTextChecks;
    if (!checks) {
      return [
        {
          kind: 'harness',
          key: 'harness:missing',
          message:
            'window.__noacgTextChecks is missing — the built player host is stale; run `npm run build:player-host`',
        },
      ];
    }
    return [...checks.occlusion(), ...checks.clip(), ...checks.safeArea()];
  });
}

const results = [];
for (const example of selected) {
  const { label } = example;
  for (let run = 1; run <= RUNS; run++) {
    const id = RUNS > 1 ? `${slug(label)}-r${run}` : slug(label);
    process.stdout.write(`▸ ${id} … `);
    try {
      // Fresh page state each run; the wizard opens over whatever project autosaved.
      await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Video or animation with AI' }).click();
      await page.getByTestId('video-step').waitFor();
      // A backend-configured dev server puts a sign-in prompt where the controls are. Say so
      // instead of timing out on a control that was never going to appear.
      if ((await page.getByTestId('video-prompt').count()) === 0) {
        throw new Error(
          'the video step has no prompt box - the dev server is backend-configured (VITE_SUPABASE_*), so it renders the sign-in prompt; restart it without those vars',
        );
      }
      if (ENGINE !== 'remotion') {
        // Remotion is preselected; anything else is an explicit card pick.
        await page.getByTestId(`video-engine-${ENGINE}`).click();
      }
      if (example.prompt) {
        // A custom brief: type it in instead of clicking a chip.
        await page.getByTestId('video-prompt').fill(example.prompt);
        if (example.durationSec != null) {
          await page.getByTestId('video-step-duration').fill(String(example.durationSec));
        }
        if (example.transparent) {
          await page.getByLabel('Transparent').check();
        }
        if (example.assets?.length) {
          // Real uploads, through the step's own hidden file input - the only way to bench
          // the asset:<name> contract (and the image variable) against actual files.
          await page.locator('input[type=file]').setInputFiles(example.assets);
          await page.getByText(/asset/i).first().waitFor({ timeout: 15_000 }).catch(() => {});
        }
      } else {
        await page.getByRole('button', { name: label, exact: true }).click();
      }
      await page.getByTestId('video-create').click();
      await page.getByTestId('video-shell').waitFor();

      // The first generation auto-runs in the chat. Wait for the assistant turn (real
      // generation: director + coder + probe + repairs — allow several minutes) or a
      // surfaced API error.
      const outcome = await Promise.race([
        page.locator('.ai-msg.assistant').first().waitFor({ timeout: 360_000 }).then(() => 'reply'),
        page.locator('.video-chat .status-bad').first().waitFor({ timeout: 360_000 }).then(() => 'error'),
      ]);
      if (outcome === 'error') {
        const msg = await page.locator('.video-chat .status-bad').first().innerText();
        throw new Error(`generation failed: ${msg.slice(0, 200)}`);
      }

      // Duration and summary come from the DOM (always the running app's truth); the module
      // and plan come from the store. After an HMR-touched dev server the eval-context store
      // can be a GHOST instance (see CLAUDE.md "Verifying changes") - detect that by
      // cross-checking the store's chat against the visible assistant bubble and fail the
      // run loudly instead of silently benching the starter module.
      const summary = (await page.locator('.ai-msg.assistant').last().innerText()).trim();
      const durationInFrames =
        Number(await page.getByTestId('video-scrubber').getAttribute('max')) + 1;
      const state = await page.evaluate(async (field) => {
        const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
        const p = useVideoProjectStore.getState().project;
        return {
          source: p[field],
          engine: p.engine,
          motionPlan: p.motionPlan,
          hasAssistantTurn: p.chat.some((m) => m.role === 'assistant'),
          inputs: p.inputs.map((i) => `${i.key}:${i.type}`),
        };
      }, SOURCE.field);
      if (state.engine !== ENGINE) {
        throw new Error(`engine mismatch: asked for ${ENGINE}, the project says ${state.engine}`);
      }
      if (!state.hasAssistantTurn) {
        throw new Error(
          'ghost store: the eval-context store has no assistant turn while the UI shows one - restart the dev server (HMR staleness) and re-run',
        );
      }
      const rejected = /failed validation/.test(summary);
      // A rejected result keeps the previous code, but the chat panel lists the exact
      // validator findings - capture them, they are the whole point of a failed run.
      const rejectionErrors = rejected
        ? await page.locator('.change-preview li').allInnerTexts()
        : [];
      writeFileSync(`${OUT}/${id}.${SOURCE.ext}`, state.source);
      writeFileSync(`${OUT}/${id}.plan.json`, JSON.stringify(state.motionPlan, null, 2));

      // Pause the player (the apply auto-replays), then capture the frame strip.
      const pauseBtn = page.locator('.video-transport button[title=Pause]');
      if (await pauseBtn.count()) await pauseBtn.click();
      const stage = page.locator('iframe.video-player-frame');
      const shots = [];
      for (const frac of SHOT_FRACTIONS) {
        const f = Math.min(durationInFrames - 1, Math.round(frac * (durationInFrames - 1)));
        await seekTo(f);
        const name = `${id}-f${String(Math.round(frac * 100)).padStart(3, '0')}.png`;
        await stage.screenshot({ path: `${OUT}/${name}` });
        shots.push(name);
      }

      // Readability at the hold-phase frames.
      const frame = await playerFrame();
      /** key -> {kind, message, fracs} across the hold samples. */
      const seen = new Map();
      for (const frac of CHECK_FRACTIONS) {
        const f = Math.round(frac * (durationInFrames - 1));
        await seekTo(f);
        for (const issue of await checkReadability(frame)) {
          const entry = seen.get(issue.key) ?? { ...issue, fracs: [] };
          entry.fracs.push(frac);
          seen.set(issue.key, entry);
        }
      }
      // A CLIP or SAFE-AREA finding must persist across EVERY sample (text still emerging
      // from a mask, or still sliding in from off-frame, is an entrance - not a defect) —
      // the same rule the injected validator applies. An OCCLUSION needs a MAJORITY: it can
      // legitimately cover part of the hold,
      // but a single sample is not enough. Measured, not guessed: a benched countdown put
      // its outgoing digit behind the dial for exactly one sample mid-swap — a transition
      // working as designed, reported as a defect under the old any-sample rule.
      const minSamples = (kind) => (kind === 'occlusion' ? 2 : CHECK_FRACTIONS.length);
      const issues = [...seen.values()]
        .filter((e) => e.fracs.length >= minSamples(e.kind))
        .map((e) => `@${e.fracs.map((f) => `${Math.round(f * 100)}%`).join(',')}: ${e.message}`);

      // Composition, measured separately from readability: the settled frame at its emptiest.
      const deadSpaces = [];
      for (const frac of CHECK_FRACTIONS) {
        await seekTo(Math.round(frac * (durationInFrames - 1)));
        deadSpaces.push(await measureDeadSpace(frame));
      }
      const deadSpace = Math.max(0, ...deadSpaces);
      const deadVars = ENGINE === 'hyperframes' ? checkVariableBindings(state.source) : [];

      // The generation's own trace: stages seen, calls made, and the findings each repair
      // round was fired by. A rejected result keeps the previous code in the store, so the
      // repair requests are the ONLY surviving copy of what the model actually wrote.
      const diag = await page.evaluate(() => window.__bench ?? { stages: [], calls: [], wrapped: false });
      if (!diag.wrapped) {
        // Never report "0 tokens, 0 repair rounds" when the truth is "nothing was watching":
        // an uninstalled probe looks exactly like a perfect run.
        throw new Error('the in-page diagnostics never installed - token and repair counts would be fiction');
      }
      const repairs = diag.calls.filter((c) => c.repairFindings.length > 0);
      repairs.forEach((r, i) => {
        if (r.failedSource) writeFileSync(`${OUT}/${id}.rejected-${i + 1}.${SOURCE.ext}`, r.failedSource);
      });
      const tokens = diag.calls.reduce(
        (t, c) => ({ in: t.in + (c.inputTokens ?? 0), out: t.out + (c.outputTokens ?? 0) }),
        { in: 0, out: 0 },
      );

      results.push({
        id, label, run, engine: ENGINE, ok: !rejected, summary, inputs: state.inputs, shots, issues,
        rejectionErrors, deadSpace, deadVars,
        repairRounds: repairs.length,
        repairCauses: repairs.flatMap((r) => r.repairFindings),
        calls: diag.calls.length,
        tokens,
        stages: diag.stages,
      });
      console.log(
        (rejected ? `REJECTED (validation: ${rejectionErrors.join(' · ').slice(0, 200)})` : 'OK') +
          (repairs.length ? `  ↻ ${repairs.length} repair round(s)` : '') +
          (issues.length ? `  ⚠ ${issues.length} readability issue(s)` : '') +
          (deadVars.length ? `  ⚠ ${deadVars.length} dead control(s)` : '') +
          `  dead space ${deadSpace}%  [${tokens.in}in/${tokens.out}out]`,
      );
    } catch (e) {
      results.push({
        id, label, run, engine: ENGINE, ok: false, summary: String(e.message || e), inputs: [], shots: [],
        issues: [], rejectionErrors: [], deadSpace: 0, deadVars: [], repairRounds: 0, repairCauses: [],
        calls: 0, tokens: { in: 0, out: 0 }, stages: [],
      });
      console.log('FAILED: ' + (e.message || e));
    }
  }
}

writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));

// ── The review gallery: one row per run, the frame strip left to right ──
/** A run is clean when it validated AND showed no readability or editability defect.
 *  Dead space is deliberately NOT part of this - see measureDeadSpace. */
const isClean = (r) => r.ok && !r.issues.length && !(r.deadVars ?? []).length;

const rows = results
  .map((r) => {
    const strip = r.shots
      .map((s, i) => `<figure><img src="${s}" loading="lazy"><figcaption>${Math.round(SHOT_FRACTIONS[i] * 100)}%</figcaption></figure>`)
      .join('');
    return `
  <section class="${isClean(r) ? 'ok' : 'bad'}">
    <h2>${r.label}${r.run > 1 || r.id.includes('-r') ? ` · run ${r.run}` : ''} <em>${r.ok ? '✓' : '✗'}</em></h2>
    ${r.issues.length ? `<p class="warn">⚠ ${r.issues.join(' · ')}</p>` : ''}
    ${(r.rejectionErrors ?? []).length ? `<p class="warn">✗ validation: ${r.rejectionErrors.join(' · ')}</p>` : ''}
    ${r.repairRounds ? `<p class="warn">↻ ${r.repairRounds} repair round(s): ${r.repairCauses.join(' · ')}</p>` : ''}
    ${(r.deadVars ?? []).length ? `<p class="warn">⚠ dead controls: ${r.deadVars.join(' · ')}</p>` : ''}
    <div class="strip">${strip}</div>
    <p>${r.summary}</p>
    <p class="meta">inputs: ${r.inputs.join(', ') || '(none)'} · largest empty region ${r.deadSpace ?? 0}% · ${r.tokens?.in ?? 0}in/${r.tokens?.out ?? 0}out over ${r.calls ?? 0} call(s) · <a href="${r.id}.${SOURCE.ext}">${SOURCE.label}</a> · <a href="${r.id}.plan.json">plan</a></p>
  </section>`;
  })
  .join('\n');
writeFileSync(
  `${OUT}/review.html`,
  `<!doctype html><meta charset="utf-8"><title>Video AI bench review</title>
<style>
  body{background:#10141b;color:#e8ecf2;font:14px/1.5 system-ui;margin:0;padding:32px}
  h1{font-size:20px} h2{font-size:15px;margin:0 0 6px} em{color:#7ddb8a;font-style:normal;margin-left:6px}
  section{border:1px solid #242c38;border-radius:10px;background:#171d26;padding:14px 16px;margin-bottom:16px}
  section.bad{border-color:#7a2e2e} section.bad em{color:#ff8484}
  .strip{display:flex;gap:6px;overflow-x:auto} figure{margin:0} figcaption{color:#8b95a5;font-size:11px;text-align:center}
  img{height:150px;display:block;border-radius:4px}
  p{margin:8px 0 0;color:#8b95a5;font-size:13px} p.warn{color:#ffb35c} .meta a{color:#6ea8ff}
</style>
<h1>Video AI bench (${ENGINE}) — ${results.filter(isClean).length}/${results.length} clean</h1>
${rows}`,
);

await browser.close();
const clean = results.filter(isClean).length;
const totals = results.reduce(
  (t, r) => ({ i: t.i + (r.tokens?.in ?? 0), o: t.o + (r.tokens?.out ?? 0), rep: t.rep + (r.repairRounds ?? 0) }),
  { i: 0, o: 0, rep: 0 },
);
console.log(
  `\nDone (${ENGINE}): ${clean}/${results.length} clean, ${totals.rep} repair round(s), ` +
    `${totals.i} input / ${totals.o} output tokens → ${OUT}/review.html`,
);
