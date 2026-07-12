// C-vs-B comparison rig — the decisive test behind the moat memo.
//
//   node scripts/ai-compare.mjs [out-dir] [count | id,id,…]
//
// The memo's central claim is that this service beats "just asking Claude/Codex to make
// the same graphic". This bench runs the SAME brief through three arms on the SAME model
// (claude-sonnet-5) and lays the results side by side so a human can judge:
//
//   A  RAW          one shot, a generic "make a broadcast graphic" system prompt. No taste
//                   teaching, no example, no layout-safety rules, no validation repair. This
//                   is roughly what a person gets from a bare prompt.
//   B  RAW+ITERATE  arm A, then N generic self-critique rounds ("review your own work as a
//                   broadcast designer, fix overlaps/contrast/hierarchy, re-emit"). This is a
//                   competent person iterating with vanilla Claude — THE REAL BAR.
//   C  PIPELINE     our claudeProvider.generate: full house-contract system prompt + lt01 as a
//                   worked example + the automatic validation repair round. The product.
//
// The only variables between arms are the system prompt and the iteration/verification loop —
// the moat levers. Rendering, model, and scoring are identical.
//
// HONEST HANDICAP: arms A and B are TOLD the SPX format basics (definition, fN↔id, runtime
// functions, relative refs, gsap global) so their output renders and can pass the validator on
// format grounds. We deliberately give the baseline the format knowledge for free — so any C
// win is a TASTE / LAYOUT / RELIABILITY win, not "we happen to know our own file format". The
// validator's hard errors are all format-level; field-mapping is only a warning. So `valid` is
// mildly house-biased toward C; the neutral, cross-arm score is the text-OVERLAP count and the
// screenshots. Read those first.
//
// Requirements: the dev server (this checkout's port — scripts/dev-port.mjs) and VITE_ANTHROPIC_API_KEY in .env (or
// the environment). ⚠ SPENDS REAL TOKENS — arm B multiplies calls by the round count, so a full
// run is roughly count × (1 + ROUNDS_B + up-to-2) generations. Third arg limits to the first N
// briefs or a comma-separated id list.

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { devPort } from './dev-port.mjs';

const BASE = `http://localhost:${devPort()}`;
const OUT = process.argv[2] || './compare-out';
const FILTER = process.argv[3] ?? '';
const ROUNDS_B = 2; // arm B: 1 generation + this many self-critique improvement rounds
mkdirSync(OUT, { recursive: true });

// A representative spread: growing bars + count-up, calm panel, dense cascading data rows,
// a timed colour wipe, and a fullscreen dual-slide. Layout AND motion challenges.
const BRIEFS = [
  ['election-bars', 'Election results panel: three candidates as horizontal bars that grow to their percentage on play. Fields: three candidate names, three party names, three percentages. Counted-up numbers at the bar ends. Serious, newsroom-clean, bottom-center.'],
  ['weather-now', 'A "weather now" side panel: big temperature, a condition line, wind and humidity as small rows, city name as a caps kicker. Fields for all values. Calm and airy, mid-right, gentle slide-in.'],
  ['timing-tower', 'A motorsport timing tower, top-left: positions 1-5 as compact rows (position number on an accent chip, driver three-letter code, gap time). One textarea field, one line per driver "VER +0.000". Rows cascade in fast. Condensed, high-contrast.'],
  ['karaoke-line', 'A karaoke lyric line, bottom-center: current line + next line smaller and dimmed. The current line wipes to the accent color left-to-right over 4 seconds after play. Playful, rounded.'],
  ['versus-card', 'A fullscreen match-up card: two team names and logo image fields around a big VS, event/date line underneath. Both sides slide in from their edges and meet in the middle. Dark arena mood.'],
];

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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.5 });
await page.addInitScript((key) => {
  localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: key, model: 'claude-sonnet-5' }));
}, KEY);
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);

const selected = /^[a-z-]+(,[a-z-]+)*$/.test(FILTER)
  ? BRIEFS.filter(([id]) => FILTER.split(',').includes(id))
  : BRIEFS.slice(0, Number(FILTER) || Infinity);

// ── Generate all three arms for one brief (browser context) ──────────────────
// Returns { A, B, C } each { name, type, summary, html, css, js, ok, errors }.
async function generateArms(brief, roundsB) {
  return page.evaluate(
    async ({ brief: b, roundsB: rounds }) => {
      const { callClaude } = await import('/src/ai/anthropic.ts');
      const { claudeProvider } = await import('/src/ai/claudeProvider.ts');
      const { validateTemplate } = await import('/src/validation/validateTemplate.ts');
      const { parseDefinition } = await import('/src/model/spxDefinition.ts');
      const { RESOLUTIONS, DEFAULT_SETTINGS } = await import('/src/model/types.ts');

      const RES = RESOLUTIONS[0];

      // The emit tool — same three-file structured output the pipeline uses, so rendering is
      // identical across arms. Defined here (not imported) to keep the arms self-contained.
      const EMIT = {
        name: 'emit_template',
        description: 'Return the complete SPX template as its three code files.',
        input_schema: {
          type: 'object',
          required: ['name', 'type', 'summary', 'html', 'css', 'js'],
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            summary: { type: 'string' },
            html: { type: 'string' },
            css: { type: 'string' },
            js: { type: 'string' },
          },
        },
      };

      // The baseline system prompt: FORMAT ONLY. No taste, no example, no layout-safety rules,
      // no motion doctrine — the honest "generic competent user who knows the file format".
      const BASE_SYSTEM =
        'You make broadcast graphics as SPX / CasparCG HTML templates. Return the complete ' +
        'template as three files via the emit_template tool.\n\n' +
        'Format basics (so it runs in playout):\n' +
        '- index.html defines window.SPXGCTemplateDefinition with DataFields named f0, f1, …; ' +
        'each field maps to one element with the same id. Field types: textfield, textarea, ' +
        'number, filelist (for images).\n' +
        '- template.js (loaded in <head>) defines global update(data /* a JSON string */), ' +
        'play(), stop(), next().\n' +
        '- External references are relative: css/template.css, js/template.js, js/gsap.min.js. ' +
        'GSAP is available as the global "gsap" (the only library). No CDN or absolute paths.\n' +
        '- Each tool field is the PURE contents of that one file: "html" is the full document ' +
        '(doctype…</html>, and the SPXGCTemplateDefinition <script> lives here); "css" is CSS ' +
        'only; "js" is JavaScript only — no <script> tags, no HTML.\n\n' +
        'Return ONLY via the emit_template tool.';

      const briefText =
        `Create a broadcast graphics template.\n\nUser brief: ${b}\n\n` +
        `Canvas: ${RES.width}×${RES.height} @ 25 fps.`;

      function toTemplate(emitted) {
        const parsed = parseDefinition(emitted.html);
        return {
          name: emitted.name || 'AI template',
          type: emitted.type || 'blank',
          resolution: RES,
          fps: 25,
          html: emitted.html,
          css: emitted.css,
          js: emitted.js,
          fields: (parsed && parsed.fields) || [],
          settings: (parsed && parsed.settings) || { ...DEFAULT_SETTINGS, description: emitted.name },
          assets: [],
          layers: [],
        };
      }

      function scored(emitted) {
        const t = toTemplate(emitted);
        const v = validateTemplate(t);
        t._ok = v.ok;
        t._errors = v.errors.map((e) => `${e.rule}: ${e.message}`);
        t._summary = emitted.summary;
        return t;
      }

      // Arm A — one raw shot, no repair.
      const emitA = await callClaude({
        system: BASE_SYSTEM,
        messages: [{ role: 'user', content: [{ type: 'text', text: briefText }] }],
        tool: EMIT,
      });
      const A = scored(emitA);

      // Arm B — start from A's generation, then N generic self-critique rounds.
      let curB = emitA;
      for (let i = 0; i < rounds; i++) {
        curB = await callClaude({
          system: BASE_SYSTEM,
          messages: [
            { role: 'user', content: [{ type: 'text', text: briefText }] },
            { role: 'assistant', content: 'Here is my template.' },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    'You are a senior broadcast graphics designer reviewing your OWN work above. ' +
                    'Find and fix every problem that would embarrass you on air: text overlapping ' +
                    'other text, weak contrast or unreadable colours, clumsy or missing hierarchy, ' +
                    'text that clips or escapes its box, motion that bounces when it should be crisp, ' +
                    'and anything that looks generic or AI-generated. Then re-emit the COMPLETE, ' +
                    'improved template.\n\n' +
                    `=== index.html ===\n${curB.html}\n=== template.css ===\n${curB.css}\n=== template.js ===\n${curB.js}`,
                },
              ],
            },
          ],
          tool: EMIT,
        });
      }
      const B = scored(curB);

      // Arm C — the real pipeline (full system prompt + example + validation repair).
      const changeC = await claudeProvider.generate(b, {
        images: [],
        palette: null,
        resolution: RES,
        fps: 25,
      });
      const cTpl = changeC.template;
      const vC = validateTemplate(cTpl);
      const C = {
        ...cTpl,
        _ok: vC.ok,
        _errors: vC.errors.map((e) => `${e.rule}: ${e.message}`),
        _summary: changeC.summary,
      };

      const pack = (t) => ({
        name: t.name,
        type: t.type,
        summary: t._summary,
        html: t.html,
        css: t.css,
        js: t.js,
        ok: t._ok,
        errors: t._errors,
      });
      return { A: pack(A), B: pack(B), C: pack(C) };
    },
    { brief, roundsB },
  );
}

// Neutral text-overlap detector, run inside the iframe. Two kinds of collision:
//   - DIFFERENT text overlapping (>15% of the smaller box) — always a bug.
//   - SAME text overlapping but NOT near-coincident — a MISALIGNED layered wipe/glow.
// A perfectly-coincident duplicate (a real karaoke wipe over its base, a glow copy) is
// intentional and allowed; an offset one is the exact bug the old whitelist hid.
const OVERLAP_FN = () => {
  const host = document.getElementById('shot');
  if (!host || !host.contentDocument) return [];
  const doc = host.contentDocument;
  const texts = [...doc.querySelectorAll('body *')].filter((el) => {
    const cs = doc.defaultView.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false;
    return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  });
  const label = (el) => `<${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}> "${el.textContent.trim().slice(0, 24)}"`;
  const found = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i]; const b = texts[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(); const rb = b.getBoundingClientRect();
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix <= 4 || iy <= 4) continue;
      const inter = ix * iy;
      const areaA = ra.width * ra.height, areaB = rb.width * rb.height;
      const smaller = Math.min(areaA, areaB);
      if (smaller <= 0) continue;
      if (a.textContent.trim() === b.textContent.trim()) {
        // Intentional layer ONLY when the two copies are near-coincident (IoU high AND
        // centres within a few px). Offset identical text = a misaligned wipe = a bug.
        const union = areaA + areaB - inter;
        const iou = union > 0 ? inter / union : 0;
        const dx = Math.abs((ra.left + ra.right) / 2 - (rb.left + rb.right) / 2);
        const dy = Math.abs((ra.top + ra.bottom) / 2 - (rb.top + rb.bottom) / 2);
        if (!(iou > 0.8 && dx < 6 && dy < 6)) found.push(`${label(a)} ⇄ ${label(b)} (misaligned)`);
      } else if (inter / smaller > 0.15) {
        found.push(`${label(a)} ⇄ ${label(b)}`);
      }
    }
  }
  return found;
};

// ── Render one arm's template and capture screenshot + neutral overlap check ──
async function shoot(arm, id, tpl) {
  await page.evaluate(async ({ template }) => {
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    document.body.innerHTML = '';
    document.body.style.cssText =
      'margin:0;width:1920px;height:1080px;overflow:hidden;position:relative;' +
      'background: radial-gradient(1200px 700px at 30% 20%, #2a3648 0%, #141b26 45%, #0a0e15 100%);';
    const f = document.createElement('iframe');
    f.id = 'shot';
    f.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;border:0;background:transparent';
    await new Promise((res) => {
      f.onload = res;
      f.srcdoc = composeDocument(template);
      document.body.appendChild(f);
    });
    try {
      f.contentWindow.play();
    } catch {
      // A broken arm may throw on play() — the screenshot still shows what it produced.
    }
  }, { template: { ...tpl, resolution: { width: 1920, height: 1080, label: '1080p' }, fps: 25, fields: [], settings: {}, assets: [], layers: [] } });
  // Sample DURING motion (mid-animation) and again once settled — a transient collision
  // while bars grow / rows cascade / a lyric wipes is just as real as one in the final frame.
  await page.waitForTimeout(1000);
  const mid = await page.evaluate(OVERLAP_FN);
  await page.waitForTimeout(1600); // ~2.6s total after play()
  await page.screenshot({ path: `${OUT}/${id}-${arm}.png` });
  const late = await page.evaluate(OVERLAP_FN);
  return [...new Set([...mid, ...late])].slice(0, 5);
}

// ── Run ──────────────────────────────────────────────────────────────────────
const ARMS = [
  ['A', 'Raw (one shot)'],
  ['B', `Raw + iterate (${ROUNDS_B} rounds)`],
  ['C', 'Our pipeline'],
];
const results = [];
for (const [id, brief] of selected) {
  process.stdout.write(`▸ ${id} … generating A/B/C `);
  let arms;
  try {
    arms = await generateArms(brief, ROUNDS_B);
  } catch (e) {
    console.log('FAILED: ' + (e.message || e));
    results.push({ id, brief, arms: null, error: String(e.message || e) });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    continue;
  }

  const row = { id, brief, arms: {} };
  for (const [key] of ARMS) {
    const tpl = arms[key];
    // Dump the raw three files so the design can be judged from the code, not just the shot.
    writeFileSync(
      `${OUT}/${id}-${key}.code.txt`,
      `=== index.html ===\n${tpl.html}\n\n=== template.css ===\n${tpl.css}\n\n=== template.js ===\n${tpl.js}\n`,
    );
    let overlaps;
    try {
      overlaps = await shoot(key, id, tpl);
    } catch (e) {
      overlaps = [`render error: ${e.message || e}`];
    }
    row.arms[key] = { name: tpl.name, summary: tpl.summary, ok: tpl.ok, errors: tpl.errors, overlaps };
    process.stdout.write(`${key}${tpl.ok ? '✓' : '✗'}${overlaps.length ? '⚠' + overlaps.length : ''} `);
  }
  results.push(row);
  console.log('');

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));

// ── Scoreboard ──
const done = results.filter((r) => r.arms);
const tally = (key) => {
  let valid = 0, clean = 0, overlaps = 0;
  for (const r of done) {
    const a = r.arms[key];
    if (a.ok) valid++;
    if (a.ok && !a.overlaps.length) clean++;
    overlaps += a.overlaps.length;
  }
  return { valid, clean, overlaps, total: done.length };
};
const board = Object.fromEntries(ARMS.map(([k]) => [k, tally(k)]));

// ── Gallery: three columns per brief, scoreboard on top ──
const armHead = ARMS.map(
  ([k, label]) =>
    `<th>${label}<br><span class="sb">${board[k].clean}/${board[k].total} clean · ${board[k].valid} valid · ${board[k].overlaps} overlaps</span></th>`,
).join('');

const rows = done
  .map((r) => {
    const cells = ARMS.map(([k]) => {
      const a = r.arms[k];
      const cls = a.ok && !a.overlaps.length ? 'ok' : 'bad';
      return `<td class="${cls}">
        <img src="${r.id}-${k}.png" alt="${r.id} ${k}" loading="lazy">
        <div class="meta"><strong>${a.name ?? ''}</strong>
          <em>${a.ok ? '✓ valid' : '✗ ' + (a.errors[0] ?? 'invalid')}</em>
          ${a.overlaps.length ? `<p class="warn">⚠ ${a.overlaps.length} overlap: ${a.overlaps.join(' · ')}</p>` : ''}
          <p>${a.summary ?? ''}</p>
          <p><a href="${r.id}-${k}.code.txt">view code</a></p>
        </div></td>`;
    }).join('');
    return `<tr><th class="brief">${r.id}<p>${r.brief}</p></th>${cells}</tr>`;
  })
  .join('\n');

writeFileSync(
  `${OUT}/review.html`,
  `<!doctype html><meta charset="utf-8"><title>C-vs-B comparison</title>
<style>
  body{background:#0b0f17;color:#e8ecf2;font:14px/1.5 system-ui;margin:0;padding:28px}
  h1{font-size:20px;margin:0 0 4px} .lead{color:#8b95a5;max-width:900px;margin:0 0 20px}
  .lead b{color:#f0b429}
  table{border-collapse:collapse;width:100%} th,td{vertical-align:top;padding:8px;border:1px solid #1c2532}
  thead th{background:#141b26;position:sticky;top:0} .sb{font-weight:400;color:#8b95a5;font-size:11px}
  th.brief{width:200px;text-align:left;font-weight:600} th.brief p{font-weight:400;color:#8b95a5;font-size:12px;margin:6px 0 0}
  td{width:26%} td.bad{background:#1a1113} td img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;border-radius:6px;background:#000}
  .meta{padding:8px 2px 0} em{color:#7fd18a;font-style:normal;font-size:12px;margin-left:6px} td.bad em{color:#ff8484}
  .meta p{margin:5px 0 0;color:#8b95a5;font-size:12px} p.warn{color:#ffb35c} a{color:#5aa9e6}
</style>
<h1>C-vs-B comparison — is the pipeline better than iterating with a bare prompt?</h1>
<p class="lead">Same brief, same model (claude-sonnet-5), three arms. <b>A</b> is one raw shot;
<b>B</b> is a competent iterator (${ROUNDS_B} generic self-critique rounds) — the real bar;
<b>C</b> is our pipeline. The neutral cross-arm score is the <b>text-overlap count</b> and the
screenshots — <b>valid</b> is mildly biased toward C because A/B were only handed the file format,
not our taste rules. If C doesn't clearly out-clean B here, the moat is not in generation.</p>
<table><thead><tr><th>brief</th>${armHead}</tr></thead><tbody>${rows}</tbody></table>`,
);

await browser.close();
console.log('\nScoreboard (clean / valid / overlaps out of ' + done.length + '):');
for (const [k, label] of ARMS) {
  const b = board[k];
  console.log(`  ${k} ${label.padEnd(24)}  clean ${b.clean}/${b.total} · valid ${b.valid} · overlaps ${b.overlaps}`);
}
console.log(`\nDone → ${OUT}/review.html`);
