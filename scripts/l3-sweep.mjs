// Phase 2 verification sweep: for each lower-third variant run the deterministic checks
// (validate, runtime, presets, steps, auto-fit) and capture a settled-state screenshot
// over a video-like backdrop for the user's taste review.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || './l3-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.5 });
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);

// ---------- 1) Deterministic checks (run inside the app page: Vite serves the source) ----------
const results = await page.evaluate(async () => {
  const { LOWER_THIRDS } = await import('/src/templates/lowerThirds/index.ts');
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
    row.checks.masks = tpl.html.includes('l3-mask') && tpl.html.includes('id="f0"');

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
    for (const p of v.animationPresets) {
      const t2 = v.create({ animation: { presetId: p } });
      const r2 = await runInFrame(t2, async (w) => { w.play(); await new Promise((r) => setTimeout(r, 40)); w.stop(); return {}; });
      if (r2.fatal || r2.errs.length) { presetOk = false; row.issues.push('preset ' + p + ': ' + (r2.fatal || r2.errs[0])); break; }
    }
    row.checks.allPresets = presetOk;

    if (v.maxLines >= 2) {
      const t3 = v.create({ animation: { steps: true } });
      row.checks.stepsDecl = Number(t3.settings.steps) >= 2;
      const r3 = await runInFrame(t3, async (w) => {
        w.play(); await new Promise((r) => setTimeout(r, 30)); w.next(); await new Promise((r) => setTimeout(r, 30));
        return { hasReveal: typeof w.revealNextStep === 'function' };
      });
      row.checks.stepsRuntime = !r3.fatal && r3.errs.length === 0 && !!r3.hasReveal;
      if (r3.fatal || r3.errs.length) row.issues.push('steps: ' + (r3.fatal || r3.errs[0]));
    }

    const t4 = v.create({ lines: [{ title: 'Name', sample: 'X' }, { title: 'Title', sample: 'T' }] });
    const r4 = await runInFrame(t4, async (w, d) => {
      const long = 'Alexandrina Konstantinopolous-Vanderberg Featherstonehaugh III';
      const el = d.getElementById('f0');
      const box = d.querySelector('.l3-box');
      w.update(JSON.stringify({ f0: 'Al', f1: 'Title' }));
      const shortH = el.getBoundingClientRect().height;
      w.update(JSON.stringify({ f0: long, f1: 'Title' }));
      const longRect = el.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      return { wrapped: longRect.height > shortH * 1.5, boxW: Math.round(boxRect.width) };
    });
    row.checks.autoFit = !r4.fatal && !!r4.wrapped && r4.boxW <= 830;
    if (!row.checks.autoFit) row.issues.push('autofit: ' + JSON.stringify({ fatal: r4.fatal, wrapped: r4.wrapped, boxW: r4.boxW }));
    out.push(row);
  }
  return out;
});

console.log(JSON.stringify(results, null, 1));

// ---------- 2) Taste screenshots: settled state over a video-like backdrop ----------
const ids = results.map((r) => r.id);
for (const id of ids) {
  await page.evaluate(async (variantId) => {
    const { LOWER_THIRDS } = await import('/src/templates/lowerThirds/index.ts');
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    const v = LOWER_THIRDS.find((x) => x.id === variantId);
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
  }, id);
  await page.waitForTimeout(1600); // let the entrance settle
  await page.screenshot({ path: `${OUT}/${id}.png` });
  console.log('shot:', id);
}

await browser.close();
console.log('DONE');
