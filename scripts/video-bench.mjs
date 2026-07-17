// Video AI quality bench: run REAL generations for the wizard's video example prompts
// (the built-in chips double as the feature's acceptance tests), capture key frames from
// the live player, run automated readability checks, and build a review gallery. This is
// the raw material for iterating the video prompt harness in src/ai/video/.
//
//   node scripts/video-bench.mjs [out-dir] [label,label,… | count | briefs.json] [runs-per-example]
//
// Requirements: the dev server (this checkout's port — scripts/dev-port.mjs) and
// VITE_ANTHROPIC_API_KEY in .env (or the environment). The bench seeds the app's AI
// settings itself (key + model + proxyUrl:'' + harness off), so a dev server started with
// a fuller .env (hosted-mode VITE_AI_PROXY_URL, Supabase) still benches in direct
// bring-your-own-key mode. ⚠ SPENDS REAL TOKENS — a video generation is two Sonnet calls
// (director + coder) plus up to two repair rounds; expect tens of cents per run. The
// second arg filters to specific example labels (comma list, e.g. "Sports
// stinger,Countdown"), the first N, or a path to a .json file of custom briefs
// ([{label, prompt, durationSec?}] — typed into the wizard instead of a chip); the third
// repeats each example (generation is stochastic — reliability needs more than one
// sample).
//
// Beyond validation, every run gets RUNTIME READABILITY CHECKS at hold-phase frames:
// hit-testing each text element against the actual paint order catches "the title is
// behind the shape panels", the video counterpart of the SPX bench's overlap check.

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';

const BASE = `http://localhost:${devPort()}`;
const OUT = process.argv[2] || './video-bench-out';
const FILTER = process.argv[3] ?? '';
const RUNS = Math.max(1, Number(process.argv[4]) || 1);
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
const KEY = readKey();
if (!KEY) {
  console.error('No VITE_ANTHROPIC_API_KEY found (in .env or the environment). Aborting before spending anything.');
  process.exit(1);
}

// Selection: chip labels, a count, or a custom-briefs JSON file. A custom brief is
// {label, prompt, durationSec?, transparent?} and is typed into the wizard's prompt box.
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
  // proxyUrl:'' pins DIRECT mode (an empty string beats the ?? fallback to the dev
  // server's VITE_AI_PROXY_URL); useHarness:false keeps the run on the measured path.
  localStorage.setItem(
    'spx-gfx-ai',
    JSON.stringify({ apiKey: key, model: 'claude-sonnet-5', proxyUrl: '', useHarness: false }),
  );
}, KEY);

// Preflight: confirm the app actually resolves to direct mode with the seeded key before
// spending anything (a settings-resolution change would otherwise fail mid-bench, or
// silently bench the wrong transport).
{
  await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
  const resolved = await page.evaluate(async () => {
    const { loadAiSettings } = await import('/src/ai/settings.ts');
    const s = loadAiSettings();
    return { direct: !s.proxyUrl && Boolean(s.apiKey), model: s.model, harness: s.useHarness };
  });
  if (!resolved.direct || resolved.harness) {
    console.error(`Preflight failed: expected direct BYO-key mode with the harness off, got ${JSON.stringify(resolved)}.`);
    await browser.close();
    process.exit(1);
  }
  console.log(`Preflight OK: direct mode, model ${resolved.model}.`);
}

const slug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The player host frame (sandboxed; Playwright reaches inside via CDP). */
async function playerFrame() {
  const el = await page.waitForSelector('iframe.video-player-frame', { timeout: 15_000 });
  const frame = await el.contentFrame();
  if (!frame) throw new Error('player host frame not reachable');
  return frame;
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
 * Readability check inside the player host at the current frame: hit-test every visible
 * text element against the real paint order (elementsFromPoint). A text element counts as
 * OCCLUDED when most of its sample points are covered by a PAINTED element (a shape panel,
 * an image) that is neither its ancestor nor its descendant — i.e. "the title is behind
 * the graphics".
 */
async function checkReadability(frame) {
  return frame.evaluate(() => {
    const doc = document;
    const win = window;
    const painted = (el) => {
      if (['IMG', 'VIDEO', 'CANVAS', 'SVG', 'svg'].includes(el.tagName)) return true;
      const cs = win.getComputedStyle(el);
      if (Number(cs.opacity) < 0.05) return false;
      // background-clip: text paints only inside its own glyphs - the standard technique
      // for a specular sweep over a wordmark (a duplicate glyph layer), not an occluder.
      if ((cs.webkitBackgroundClip ?? cs.backgroundClip) === 'text') return false;
      if (cs.backgroundImage !== 'none') return true;
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
      if (!m) return false;
      const parts = m[1].split(',').map(Number);
      return (parts[3] ?? 1) > 0.05;
    };
    const texts = [...doc.querySelectorAll('body *')].filter((el) => {
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.3) return false;
      if (parseFloat(cs.fontSize) < 12) return false;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
      const r = el.getBoundingClientRect();
      return r.width * r.height > 500 && r.width > 0;
    });
    const issues = [];
    for (const el of texts) {
      const r = el.getBoundingClientRect();
      const points = [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + r.width * 0.25, r.top + r.height / 2],
        [r.left + r.width * 0.75, r.top + r.height / 2],
        [r.left + r.width / 2, r.top + r.height * 0.25],
        [r.left + r.width / 2, r.top + r.height * 0.75],
      ];
      let blocked = 0;
      let blocker = null;
      for (const [x, y] of points) {
        if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) continue;
        for (const hit of doc.elementsFromPoint(x, y)) {
          if (hit === el || el.contains(hit) || hit.contains(el)) break; // reached our text — visible here
          // A layer carrying the SAME text is deliberate duplicate-glyph layering (sweeps,
          // glows), the same rule the SPX bench applies - never an occlusion.
          if (hit.textContent.trim() === el.textContent.trim() && hit.textContent.trim()) break;
          if (painted(hit)) {
            blocked++;
            blocker = blocker ?? `<${hit.tagName.toLowerCase()}${hit.className && typeof hit.className === 'string' ? '.' + hit.className.split(' ')[0] : ''}>`;
            break;
          }
        }
      }
      if (blocked >= 3) {
        issues.push(`"${el.textContent.trim().slice(0, 28)}" is painted BEHIND ${blocker} (${blocked}/5 sample points covered)`);
      }
    }
    return issues.slice(0, 5);
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
      if (example.prompt) {
        // A custom brief: type it in instead of clicking a chip.
        await page.getByTestId('video-prompt').fill(example.prompt);
        if (example.durationSec != null) {
          await page.getByTestId('video-step-duration').fill(String(example.durationSec));
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
      const state = await page.evaluate(async () => {
        const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
        const p = useVideoProjectStore.getState().project;
        return {
          tsx: p.tsx,
          motionPlan: p.motionPlan,
          hasAssistantTurn: p.chat.some((m) => m.role === 'assistant'),
          inputs: p.inputs.map((i) => `${i.key}:${i.type}`),
        };
      });
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
      writeFileSync(`${OUT}/${id}.tsx`, state.tsx);
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
      const occlusions = [];
      for (const frac of CHECK_FRACTIONS) {
        const f = Math.round(frac * (durationInFrames - 1));
        await seekTo(f);
        for (const issue of await checkReadability(frame)) {
          const tagged = `@${Math.round(frac * 100)}%: ${issue}`;
          if (!occlusions.some((o) => o.slice(o.indexOf(':')) === tagged.slice(tagged.indexOf(':')))) occlusions.push(tagged);
        }
      }

      results.push({ id, label, run, ok: !rejected, summary, inputs: state.inputs, shots, occlusions, rejectionErrors });
      console.log(
        (rejected ? `REJECTED (validation: ${rejectionErrors.join(' · ').slice(0, 200)})` : 'OK') +
          (occlusions.length ? `  ⚠ ${occlusions.length} occlusion(s)` : ''),
      );
    } catch (e) {
      results.push({ id, label, run, ok: false, summary: String(e.message || e), inputs: [], shots: [], occlusions: [], rejectionErrors: [] });
      console.log('FAILED: ' + (e.message || e));
    }
  }
}

writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));

// ── The review gallery: one row per run, the frame strip left to right ──
const rows = results
  .map((r) => {
    const strip = r.shots
      .map((s, i) => `<figure><img src="${s}" loading="lazy"><figcaption>${Math.round(SHOT_FRACTIONS[i] * 100)}%</figcaption></figure>`)
      .join('');
    return `
  <section class="${r.ok && !r.occlusions.length ? 'ok' : 'bad'}">
    <h2>${r.label}${r.run > 1 || r.id.includes('-r') ? ` · run ${r.run}` : ''} <em>${r.ok ? '✓' : '✗'}</em></h2>
    ${r.occlusions.length ? `<p class="warn">⚠ ${r.occlusions.join(' · ')}</p>` : ''}
    ${(r.rejectionErrors ?? []).length ? `<p class="warn">✗ validation: ${r.rejectionErrors.join(' · ')}</p>` : ''}
    <div class="strip">${strip}</div>
    <p>${r.summary}</p>
    <p class="meta">inputs: ${r.inputs.join(', ') || '(none)'} · <a href="${r.id}.tsx">tsx</a> · <a href="${r.id}.plan.json">plan</a></p>
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
<h1>Video AI bench — ${results.filter((r) => r.ok && !r.occlusions.length).length}/${results.length} clean</h1>
${rows}`,
);

await browser.close();
const clean = results.filter((r) => r.ok && !r.occlusions.length).length;
console.log(`\nDone: ${clean}/${results.length} clean → ${OUT}/review.html`);
