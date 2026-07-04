// Phase 2 verification sweep: for each lower-third variant run the deterministic checks
// (validate, runtime, presets, steps, auto-fit) and capture a settled-state screenshot
// over a video-like backdrop for the user's taste review.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || './l3-shots';
const CATEGORY = process.argv[3] || 'lower-third';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.5 });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);

// ---------- 1) Deterministic checks (run inside the app page: Vite serves the source) ----------
const results = await page.evaluate(async (CATEGORY) => {
  const { CATALOG } = await import('/src/templates/catalog.ts');
  const LOWER_THIRDS = CATALOG[CATEGORY] || [];
  const { composeDocument } = await import('/src/preview/composeDocument.ts');
  const { validateTemplate } = await import('/src/validation/validateTemplate.ts');

  const runInFrame = (tpl, fn) => new Promise((resolve) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:absolute;left:-9999px;width:1920px;height:1080px';
    const errs = [];
    f.onload = async () => {
      const w = f.contentWindow;
      w.onerror = (m) => { errs.push(String(m)); return false; };
      try { resolve({ ...(await fn(w, f.contentDocument)), errs }); }
      catch (e) { resolve({ fatal: e.message, errs }); }
      finally { setTimeout(() => f.remove(), 30); }
    };
    f.srcdoc = composeDocument(tpl);
    document.body.appendChild(f);
  });

  const out = [];
  for (const v of LOWER_THIRDS) {
    const row = { id: v.id, name: v.name, checks: {}, issues: [] };
    const tpl = v.create();
    const val = validateTemplate(tpl);
    row.checks.valid = val.ok;
    if (!val.ok) row.issues.push(...val.errors.map((e) => e.rule + ': ' + e.message));
    row.checks.rootVars = tpl.css.includes('--accent:') && tpl.css.includes('--scale:');
    row.checks.markers = tpl.js.includes('== ANIMATION') && tpl.js.includes('== END ANIMATION ==');
    row.checks.fontFace = tpl.css.includes('@font-face');
    const isCredits = CATEGORY === 'end-credits';
    const isTicker = CATEGORY === 'ticker';
    // Clock categories share the countdown engine; their prefix differs.
    const clockPrefix = { 'starting-soon': 'ss', 'game-timer': 'gt' }[CATEGORY] || null;
    const isScoreboard = CATEGORY === 'scoreboard';
    const isInfographic = CATEGORY === 'infographic';
    const isQuiz = CATEGORY === 'quiz';
    row.checks.masks = isCredits ? tpl.html.includes('credits-track')
      : isTicker ? tpl.html.includes('ticker-track')
      : clockPrefix ? tpl.html.includes(`${clockPrefix}-clock`)
      : (/-mask/.test(tpl.html) && tpl.html.includes('id="f0"'));

    const rt = await runInFrame(tpl, async (w, d) => {
      w.update(JSON.stringify({ f0: 'Test Person', f1: 'Test Title' }));
      w.play();
      await new Promise((r) => setTimeout(r, 60));
      w.stop();
      return { bound: d.getElementById('f0')?.textContent === 'Test Person' };
    });
    row.checks.runtime = !rt.fatal && rt.errs.length === 0 && !!rt.bound;
    if (rt.fatal || rt.errs.length) row.issues.push('runtime: ' + (rt.fatal || rt.errs[0]));

    let presetOk = true;
    // Rotate easing presets so every animation preset gets runtime coverage with several easings.
    const EASINGS = ['auto', 'easy-ease', 'ease-out', 'back', 'bounce', 'elastic', 'expo', 'sine', 'circ', 'linear', 'cubic', 'ease-in', 'ease-in-out'];
    let e = 0;
    for (const p of v.animationPresets) {
      for (let k = 0; k < 3 && presetOk; k++) {
        const easing = EASINGS[e++ % EASINGS.length];
        const t2 = v.create({ animation: { presetId: p, easing } });
        if (!t2.js.includes("var easeIn = '") || !t2.js.includes("var easeOut = '")) {
          presetOk = false; row.issues.push('easing vars missing for ' + p + '/' + easing); break;
        }
        const r2 = await runInFrame(t2, async (w) => { w.play(); await new Promise((r) => setTimeout(r, 40)); w.stop(); return {}; });
        if (r2.fatal || r2.errs.length) { presetOk = false; row.issues.push('preset ' + p + '/' + easing + ': ' + (r2.fatal || r2.errs[0])); }
      }
      if (!presetOk) break;
    }
    row.checks.allPresets = presetOk;

    if (['lower-third', 'info-card'].includes(CATEGORY) && v.maxLines >= 2) {
      const t3 = v.create({ animation: { steps: true } });
      row.checks.stepsDecl = Number(t3.settings.steps) >= 2;
      const r3 = await runInFrame(t3, async (w) => {
        w.play(); await new Promise((r) => setTimeout(r, 30)); w.next(); await new Promise((r) => setTimeout(r, 30));
        return { hasReveal: typeof w.revealNextStep === 'function' };
      });
      row.checks.stepsRuntime = !r3.fatal && r3.errs.length === 0 && !!r3.hasReveal;
      if (r3.fatal || r3.errs.length) row.issues.push('steps: ' + (r3.fatal || r3.errs[0]));
    }

    if (clockPrefix) {
      // Clock categories: after play() the clock must render M:SS and actually tick down.
      const r7 = await runInFrame(tpl, async (w, d) => {
        w.play();
        const clock = d.querySelector(`.${clockPrefix}-clock`);
        const first = clock.textContent;
        // startClock() fires after the entrance timeline, so the first tick can land ~1.7 s in.
        await new Promise((r) => setTimeout(r, 3000));
        return { first, later: clock.textContent, format: /^\d+:\d{2}$/.test(clock.textContent) };
      });
      row.checks.autoFit = !r7.fatal && r7.errs.length === 0 && r7.format && r7.later !== r7.first;
      if (!row.checks.autoFit) row.issues.push('clock: ' + JSON.stringify(r7));
      out.push(row);
      continue;
    }
    if (isScoreboard) {
      // Scoreboards: all four fields (teams + scores) bind through update().
      const r8 = await runInFrame(tpl, async (w, d) => {
        w.update(JSON.stringify({ f0: 'HOME', f1: '12', f2: 'AWAY', f3: '8' }));
        return {
          teams: d.getElementById('f0')?.textContent === 'HOME' && d.getElementById('f2')?.textContent === 'AWAY',
          scores: d.getElementById('f1')?.textContent === '12' && d.getElementById('f3')?.textContent === '8',
        };
      });
      row.checks.autoFit = !r8.fatal && r8.errs.length === 0 && !!r8.teams && !!r8.scores;
      if (!row.checks.autoFit) row.issues.push('scoreboard: ' + JSON.stringify(r8));
      out.push(row);
      continue;
    }
    if (isInfographic) {
      // Bar designs rebuild from the textarea; stat designs count the number up during play.
      const r9 = await runInFrame(tpl, async (w, d) => {
        if (d.getElementById('ig-bars')) {
          w.update(JSON.stringify({ f0: 'Alpha | 80\nBeta | 55\nGamma | 30', f1: 'Results' }));
          return { bars: d.getElementById('ig-bars').children.length };
        }
        w.play();
        const el = d.getElementById('f0');
        const first = el.textContent;
        await new Promise((r) => setTimeout(r, 500));
        return { counting: el.textContent !== first || first === '0' };
      });
      row.checks.autoFit = !r9.fatal && r9.errs.length === 0 && (r9.bars >= 3 || !!r9.counting);
      if (!row.checks.autoFit) row.issues.push('infographic: ' + JSON.stringify(r9));
      out.push(row);
      continue;
    }
    if (isQuiz) {
      // Quiz: options bind, and next() reveals the correct answer highlight.
      const r10 = await runInFrame(tpl, async (w, d) => {
        w.update(JSON.stringify({ f0: 'Which planet is red?', f1: 'Venus', f2: 'Mars', f3: 'Pluto', f4: 'Titan', f5: 'B' }));
        w.play();
        await new Promise((r) => setTimeout(r, 900));
        w.next();
        await new Promise((r) => setTimeout(r, 500));
        return {
          bound: d.getElementById('f2')?.textContent === 'Mars',
          revealed: !!d.querySelector('.qz-correct'),
        };
      });
      row.checks.autoFit = !r10.fatal && r10.errs.length === 0 && !!r10.bound && !!r10.revealed;
      if (!row.checks.autoFit) row.issues.push('quiz: ' + JSON.stringify(r10));
      out.push(row);
      continue;
    }
    if (isTicker) {
      const r6 = await runInFrame(tpl, async (w, d) => {
        w.update(JSON.stringify({ f0: 'Item one\nItem two\nItem three', f1: 'LIVE' }));
        const track = d.getElementById('ticker-track');
        return { items: track.children.length, label: d.getElementById('f1')?.textContent };
      });
      row.checks.autoFit = !r6.fatal && r6.errs.length === 0 && r6.items >= 3 && r6.label === 'LIVE';
      if (!row.checks.autoFit) row.issues.push('ticker-track: ' + JSON.stringify(r6));
      out.push(row);
      continue;
    }
    if (isCredits) {
      const r5 = await runInFrame(tpl, async (w, d) => {
        w.update(JSON.stringify({ f0: 'CREW\nDirector | Ada Lovelace\nProducer | Grace Hopper', f1: '(c) 2026 Test' }));
        const track = d.getElementById('credits-track');
        return { rows: track.children.length, hasEnd: !!track.querySelector('.credits-end') };
      });
      row.checks.autoFit = !r5.fatal && r5.errs.length === 0 && r5.rows >= 2 && r5.hasEnd;
      if (!row.checks.autoFit) row.issues.push('credits-track: ' + JSON.stringify(r5));
      out.push(row);
      continue;
    }
    const t4 = v.create({ lines: [{ title: 'Name', sample: 'X' }, { title: 'Title', sample: 'T' }] });
    const r4 = await runInFrame(t4, async (w, d) => {
      const long = 'Alexandrina Konstantinopolous-Vanderberg Featherstonehaugh III';
      const el = d.getElementById('f0');
      const box = d.querySelector('[class*="-box"]');
      w.update(JSON.stringify({ f0: 'Al', f1: 'Title' }));
      const shortH = el.getBoundingClientRect().height;
      w.update(JSON.stringify({ f0: long, f1: 'Title' }));
      const longRect = el.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      return { wrapped: longRect.height > shortH * 1.5, boxW: Math.round(boxRect.width) };
    });
    // The cap differs per category — read it from the generated CSS (max-width on the box).
    const cap = Number((t4.css.match(/max-width:\s*(\d+)px/) || [])[1] ?? 830);
    row.checks.autoFit = !r4.fatal && !!r4.wrapped && r4.boxW <= cap + 2;
    if (!row.checks.autoFit) row.issues.push('autofit: ' + JSON.stringify({ fatal: r4.fatal, wrapped: r4.wrapped, boxW: r4.boxW, cap }));
    out.push(row);
  }
  return out;
}, CATEGORY);

console.log(JSON.stringify(results, null, 1));

// ---------- 2) Taste screenshots: settled state over a video-like backdrop ----------
const ids = results.map((r) => r.id);
for (const id of ids) {
  await page.evaluate(async ([variantId, CAT]) => {
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    const { CATALOG: C2 } = await import('/src/templates/catalog.ts');
    const v = (C2[CAT] || []).find((x) => x.id === variantId);
    const tpl = v.create();
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;width:1920px;height:1080px;overflow:hidden;position:relative;' +
      'background: radial-gradient(1200px 700px at 30% 20%, #2a3648 0%, #141b26 45%, #0a0e15 100%);';
    // a few soft shapes so it reads like out-of-focus video, not a flat card
    const blob = (x, y, s, c) => { const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:50%;background:${c};filter:blur(90px);opacity:.5`;
      document.body.appendChild(d); };
    blob(1250, 120, 420, '#3d5a80'); blob(300, 600, 380, '#1f3a2e'); blob(1500, 700, 300, '#4a3660');
    const f = document.createElement('iframe');
    f.id = 'shot';
    f.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;border:0;background:transparent';
    f.setAttribute('allowtransparency', 'true');
    await new Promise((res) => { f.onload = res; f.srcdoc = composeDocument(tpl); document.body.appendChild(f); });
    const w = f.contentWindow;
    w.update(JSON.stringify({ f0: v.suggestedLines[0]?.sample || 'Name', f1: v.suggestedLines[1]?.sample || '' }));
    w.play();
  }, [id, CATEGORY]);
  await page.waitForTimeout(['end-credits', 'ticker'].includes(CATEGORY) ? 4500 : 1600); // continuous motion needs longer
  if (CATEGORY === 'quiz') {
    // Show the answer reveal in the taste shot.
    await page.evaluate(() => document.getElementById('shot').contentWindow.next());
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `${OUT}/${id}.png` });
  console.log('shot:', id);
}

await browser.close();
console.log('DONE');
