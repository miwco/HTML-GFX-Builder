// AI quality bench: run REAL generations for a bank of template-less briefs, screenshot
// each result over a video-like backdrop, and build a review gallery. This is the raw
// material for iterating the system prompt in src/ai/claudeProvider.ts.
//
//   node scripts/ai-bench.mjs [out-dir] [count]
//
// Requirements: the dev server on http://localhost:5174 and VITE_ANTHROPIC_API_KEY in
// .env (or the environment). ⚠ SPENDS REAL TOKENS — roughly a few cents per brief with
// the default model; [count] limits the run (default: all briefs).

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2] || './bench-out';
const COUNT = Number(process.argv[3]) || Infinity;
mkdirSync(OUT, { recursive: true });

// ── The brief bank: deliberately OFF-catalog graphics (no starting template) ──
const BRIEFS = [
  ['election-bars', 'Election results panel: three candidates as horizontal bars that grow to their percentage on play. Fields: three candidate names, three party names, three percentages. Counted-up numbers at the bar ends. Serious, newsroom-clean, bottom-center.'],
  ['weather-now', 'A "weather now" side panel: big temperature, a condition line, wind and humidity as small rows, city name as a caps kicker. Fields for all values. Calm and airy, mid-right, gentle slide-in.'],
  ['timing-tower', 'A motorsport timing tower, top-left: positions 1-5 as compact rows (position number on an accent chip, driver three-letter code, gap time). One textarea field, one line per driver "VER +0.000". Rows cascade in fast. Condensed, high-contrast.'],
  ['breaking-stinger', 'A full-width BREAKING NEWS stinger: a red band slams in across the lower third with the word BREAKING, then a headline field slides up under it. Urgent but controlled, fast snap, no bounce.'],
  ['recipe-card', 'A cooking-show ingredient card, mid-left: dish name heading, then a textarea of ingredients rendered as a tidy checklist with accent bullets. Warm, friendly, soft corners; items cascade in.'],
  ['donation-counter', 'A charity telethon total counter, bottom-center: a big euro amount counting up to the field value on each update while on air, a "TOTAL RAISED" kicker, and a progress bar toward a goal field. Celebratory but tasteful.'],
  ['karaoke-line', 'A karaoke lyric line, bottom-center: current line + next line smaller and dimmed. The current line wipes to the accent color left-to-right over 4 seconds after play. Playful, rounded.'],
  ['versus-card', 'A fullscreen match-up card: two team names and logo image fields around a big VS, event/date line underneath. Both sides slide in from their edges and meet in the middle. Dark arena mood.'],
  ['stock-strip', 'A financial index strip, top of screen: five index names with values and up/down arrows colored by direction, from one textarea field "DAX 18123 +0.4". Values update in place. Precise, tabular, no decoration.'],
  ['poll-donut', 'A live poll result: a donut/ring that fills to a percentage field on play, the percentage counted up in the middle, question text above. One accent, clean strokes, mid-center.'],
  ['schedule-board', 'A "coming up tonight" schedule board: three rows of time + show name from a textarea ("20:00 | News"), a header field on top. Elegant fullscreen-lite panel, rows reveal one by one.'],
  ['quote-card', 'A quote/attribution card for a talk show: a large quotation with typographic quote marks, the speaker name and role underneath. Fields: quote, name, role. Literary, generous whitespace, mid-center.'],
];

// ── Key: .env first, then the environment ──
function readKey() {
  // Tolerate quotes/whitespace around the value (Vite's own dotenv does the same).
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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.5 });
await page.addInitScript((key) => {
  localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: key, model: 'claude-sonnet-5' }));
}, KEY);
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);

const results = [];
for (const [id, brief] of BRIEFS.slice(0, COUNT)) {
  process.stdout.write(`▸ ${id} … `);
  try {
    const r = await page.evaluate(
      async ({ brief: b }) => {
        const { claudeProvider } = await import('/src/ai/claudeProvider.ts');
        const { validateTemplate } = await import('/src/validation/validateTemplate.ts');
        const change = await claudeProvider.generate(b, {
          images: [],
          palette: null,
          resolution: { width: 1920, height: 1080, label: '1080p' },
          fps: 25,
        });
        const v = validateTemplate(change.template);
        return {
          name: change.template.name,
          summary: change.summary,
          ok: v.ok,
          errors: v.errors.map((e) => `${e.rule}: ${e.message}`),
          template: change.template,
        };
      },
      { brief },
    );

    // Screenshot the settled graphic over a video-like backdrop (same recipe as the sweeps).
    await page.evaluate(async ({ template }) => {
      const { composeDocument } = await import('/src/preview/composeDocument.ts');
      document.body.innerHTML = '';
      document.body.style.cssText =
        'margin:0;width:1920px;height:1080px;overflow:hidden;position:relative;' +
        'background: radial-gradient(1200px 700px at 30% 20%, #2a3648 0%, #141b26 45%, #0a0e15 100%);';
      const f = document.createElement('iframe');
      f.id = 'shot';
      f.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;border:0;background:transparent';
      await new Promise((res) => { f.onload = res; f.srcdoc = composeDocument(template); document.body.appendChild(f); });
      f.contentWindow.play();
    }, { template: r.template });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/${id}.png` });

    results.push({ id, brief, name: r.name, summary: r.summary, ok: r.ok, errors: r.errors });
    console.log(r.ok ? `OK  (${r.name})` : `INVALID (${r.errors.length} errors)`);

    // Back to the app for the next round.
    await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
  } catch (e) {
    results.push({ id, brief, name: null, summary: null, ok: false, errors: [String(e.message || e)] });
    console.log('FAILED: ' + (e.message || e));
  }
}

writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));

// ── The review gallery ──
const rows = results
  .map(
    (r) => `
  <figure class="${r.ok ? 'ok' : 'bad'}">
    <img src="${r.id}.png" alt="${r.id}" loading="lazy">
    <figcaption>
      <strong>${r.name ?? r.id}</strong> <em>${r.ok ? '✓ valid' : '✗ ' + r.errors.join(' · ')}</em>
      <p>${r.summary ?? ''}</p>
      <details><summary>brief</summary><p>${r.brief}</p></details>
    </figcaption>
  </figure>`,
  )
  .join('\n');
writeFileSync(
  `${OUT}/review.html`,
  `<!doctype html><meta charset="utf-8"><title>AI bench review</title>
<style>
  body{background:#10141b;color:#e8ecf2;font:14px/1.5 system-ui;margin:0;padding:32px}
  h1{font-size:20px} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:16px}
  figure{margin:0;border:1px solid #242c38;border-radius:10px;overflow:hidden;background:#171d26}
  figure.bad{border-color:#7a2e2e} img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
  figcaption{padding:10px 12px} em{color:#8b95a5;font-style:normal;font-size:12px;margin-left:6px}
  figure.bad em{color:#ff8484} p{margin:6px 0 0;color:#8b95a5;font-size:13px} summary{cursor:pointer;color:#8b95a5;font-size:12px;margin-top:6px}
</style>
<h1>AI quality bench — ${results.filter((r) => r.ok).length}/${results.length} valid</h1>
<div class="grid">${rows}</div>`,
);

await browser.close();
console.log(`\nDone: ${results.filter((r) => r.ok).length}/${results.length} valid → ${OUT}/review.html`);
