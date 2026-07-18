#!/usr/bin/env node
// Run the e2e specs that cover the files you changed - the inner-loop companion to the full
// suite (`npm run test:e2e`, which remains the merge gate).
//
//   npm run test:e2e:affected            # diff against the merge-base with main + working tree
//   npm run test:e2e:affected -- <ref>   # diff against an explicit base ref
//   npm run test:e2e:affected -- --list  # print the plan without running Playwright
//
// The mapping below is CURATED, not traced: it errs toward running more. Anything touching the
// shared core (store, model, preview composer, validation, the shell, the e2e helpers, build
// config) runs the full suite, because those files feed every flow.
import { execFileSync, spawnSync } from 'node:child_process';

// ── Source-area → spec globs ────────────────────────────────────────────────
// Order does not matter; every matching rule contributes its specs (union).
const MAP = [
  [/^src\/ai\/video\//, ['video-project.spec.ts', 'video-inputs.spec.ts', 'video-settings.spec.ts', 'video-player-host.spec.ts']],
  [/^src\/ai\//, ['ai.spec.ts', 'ai-depth.spec.ts', 'import-graphic.spec.ts']],
  [/^src\/video\//, ['video-project.spec.ts', 'video-inputs.spec.ts', 'video-settings.spec.ts', 'video-player-host.spec.ts']],
  [/^src\/components\/video\//, ['video-project.spec.ts', 'video-inputs.spec.ts', 'video-settings.spec.ts', 'video-player-host.spec.ts']],
  [/^player-host\//, ['video-player-host.spec.ts', 'video-project.spec.ts']],
  // The host BUILD is load-bearing for the preview: it inlines the player JS and the bundled
  // video fonts into public/player-host/index.html, which the video specs load.
  [/^scripts\/build-player-host/, ['video-player-host.spec.ts', 'video-project.spec.ts']],
  [/^src\/render\//, ['render.spec.ts', 'render-schedule.spec.ts']],
  [/^api\//, ['render.spec.ts', 'render-schedule.spec.ts']],
  [/^src\/export\//, ['exports.spec.ts', 'package.spec.ts', 'offline.spec.ts', 'control.spec.ts']],
  [/^src\/control\//, ['control.spec.ts', 'exports.spec.ts']],
  [/^src\/blocks\//, ['anim-engine.spec.ts', 'timeline-v2.spec.ts', 'inspector.spec.ts', 'canvas-keyframe.spec.ts', 'legacy-timeline.spec.ts', 'multi-select.spec.ts', 'pasteboard.spec.ts', 'ux.spec.ts', 'bench.spec.ts']],
  [/^src\/templates\//, ['bench.spec.ts', 'house.spec.ts', 'wave2.spec.ts', 'timeline-v2.spec.ts', 'wizard-filters.spec.ts', 'wizard-logo.spec.ts', 'wizard-preview.spec.ts', 'format.spec.ts', 'ux.spec.ts']],
  [/^src\/components\/wizard\//, ['wizard-filters.spec.ts', 'wizard-logo.spec.ts', 'wizard-preview.spec.ts', 'flows.spec.ts', 'ux.spec.ts', 'import.spec.ts', 'import-graphic.spec.ts', 'project.spec.ts']],
  [/^src\/components\/Canvas/, ['canvas-selection.spec.ts', 'canvas-keyframe.spec.ts', 'multi-select.spec.ts', 'wysiwyg.spec.ts', 'inline-edit.spec.ts', 'pasteboard.spec.ts', 'import-graphic.spec.ts']],
  [/^src\/components\/(StepTimeline|TimelineDock|LegacyTimeline|Inspector|PlayoutSimulator)/, ['timeline-v2.spec.ts', 'legacy-timeline.spec.ts', 'inspector.spec.ts', 'anim-engine.spec.ts', 'canvas-keyframe.spec.ts', 'ux.spec.ts']],
  [/^src\/components\/(fields|SampleDataPanel|ControlPanel)/, ['control.spec.ts', 'images.spec.ts', 'ux.spec.ts', 'video-inputs.spec.ts']],
  [/^src\/components\/(AssetsPanel|assetInfo)/, ['assets.spec.ts', 'images.spec.ts']],
  [/^src\/components\/(PacketManager|Homebase)/, ['packets.spec.ts']],
  [/^src\/components\/auth\//, ['auth.spec.ts', 'sync.spec.ts']],
  [/^src\/backend\//, ['auth.spec.ts', 'sync.spec.ts', 'offline.spec.ts']],
  [/^src\/community\//, ['community.spec.ts']],
  [/^src\/showchat\//, ['community.spec.ts']],
  [/^src\/landing\//, ['landing.spec.ts']],
  [/^index\.html$/, ['landing.spec.ts']],
  [/^src\/teach\//, ['lazy-editor.spec.ts']],
  [/^src\/assets\//, ['assets.spec.ts', 'images.spec.ts', 'bench.spec.ts']],
];

// Anything matching these runs the FULL suite - shared foundations with fan-out everywhere.
const CORE = [
  /^src\/store\//,
  /^src\/model\//,
  /^src\/preview\//,
  /^src\/validation\//,
  /^src\/components\/(AppShell|PreviewFrame|WorkspaceDock|CodeEditor|App\.)/,
  /^src\/(App|main)\./,
  /^src\/styles/,
  /^e2e\/_/,
  /^playwright\.config\.ts$/,
  /^(package|package-lock)\.json$/,
  /^vite\.config/,
  /^app\.html$/,
];

// Files that never affect the offline e2e surface.
const IGNORE = [/^docs\//, /\.md$/, /^scripts\/(?!.*(renderDevPlugin|build-player-host))/, /^e2e\/configured\//, /^render-worker\//, /^supabase\//, /^NoaCG-Brand-Kit\//, /^example_projects\//];

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
const baseArg = args.find((a) => !a.startsWith('--'));

function git(...cmd) {
  return execFileSync('git', cmd, { encoding: 'utf8' }).trim();
}

const base = baseArg ?? git('merge-base', 'HEAD', 'main');
const committed = git('diff', '--name-only', `${base}...HEAD`).split('\n');
// Porcelain lines are `XY path` (a rename is `XY old -> new`); a global trim() would eat the
// first line's leading status space, so strip the prefix by pattern, not by position.
const working = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
  .split('\n')
  .map((l) => l.replace(/^.{2} /, '').replace(/^.* -> /, '').trim());
const changed = [...new Set([...committed, ...working])].filter(Boolean).map((f) => f.replace(/\\/g, '/'));

if (changed.length === 0) {
  console.log('e2e-affected: no changes vs', base, '- nothing to run.');
  process.exit(0);
}

const specs = new Set();
let full = false;
const unmapped = [];
for (const file of changed) {
  if (IGNORE.some((r) => r.test(file))) continue;
  if (/^e2e\/[^/]+\.spec\.ts$/.test(file)) {
    specs.add(file.replace(/^e2e\//, ''));
    continue;
  }
  if (CORE.some((r) => r.test(file))) {
    full = true;
    continue;
  }
  const rules = MAP.filter(([r]) => r.test(file));
  if (rules.length === 0) {
    // Unknown territory: be safe, run everything, and say why.
    unmapped.push(file);
    full = true;
  } else {
    for (const [, list] of rules) for (const s of list) specs.add(s);
  }
}

if (unmapped.length > 0) {
  console.log('e2e-affected: no mapping for these files (falling back to the full suite):');
  for (const f of unmapped) console.log('  -', f);
}

const plan = full ? [] : [...specs].sort();
if (full) {
  console.log(`e2e-affected: core/unmapped change detected - running the FULL suite (${changed.length} changed files).`);
} else if (plan.length === 0) {
  console.log('e2e-affected: changes touch nothing the offline e2e suite covers - nothing to run.');
  process.exit(0);
} else {
  console.log(`e2e-affected: ${changed.length} changed files -> ${plan.length} spec files:`);
  for (const s of plan) console.log('  -', s);
}

if (listOnly) process.exit(0);

const result = spawnSync('npx', ['playwright', 'test', ...plan], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
