import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// THE CATALOG BASELINE — the safety net the theme-token migration is built on
// (src/model/themeTokens.ts holds the tokens; DESIGN_LANGUAGE §8 holds the rationale).
// Two baselines, because they answer different questions.
//
// **Source** — a hash of each emitted pane. Tokenizing REWRITES the CSS text by design
// (`calc(18px * var(--scale))` becomes `var(--panel-radius)`), so this baseline is EXPECTED
// to move on a tokenization commit. Its job is to make that move explicit and reviewable,
// and to prove the refactor did not touch `html` or `js` on the way past.
//
// **Render** — a fingerprint of the settled graphic's computed styles and geometry. This one
// must NOT move. Substituting a variable for the literal it was given cannot change what the
// viewer sees, so any drift here is a real regression. This is the actual gate.
//
// The two flags encode the workflow: on a tokenization commit you re-record the source
// hashes and let the render fingerprints hold the line.
//
//     UPDATE_CATALOG_BASELINE=1 npx playwright test catalog-baseline   # source moved on purpose
//     UPDATE_RENDER_BASELINE=1  npx playwright test catalog-baseline   # the look moved on purpose
//
// A mismatch writes the full emitted panes (source) or the per-element records (render) to
// this test's output directory, so the actual values can be diffed against a re-capture.

const BASELINE = fileURLToPath(new URL('catalog-baseline.json', import.meta.url));
const RENDER_BASELINE = fileURLToPath(new URL('catalog-render-baseline.json', import.meta.url));
const UPDATE = process.env.UPDATE_CATALOG_BASELINE === '1';
const UPDATE_RENDER = process.env.UPDATE_RENDER_BASELINE === '1';

interface Emitted {
  id: string;
  category: string;
  html: string;
  css: string;
  js: string;
  error: string | null;
}

type PaneHashes = { html: string; css: string; js: string };

const hash = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

/** Every catalog variant, created at its own defaults. CATALOG is already the MERGED
 *  catalog, so this covers the type-compiled designs alongside the hand-written ones. */
const EMIT = `(async () => {
  const { CATALOG } = await import('/src/templates/catalog.ts');
  const out = [];
  for (const [category, variants] of Object.entries(CATALOG)) {
    for (const variant of variants ?? []) {
      try {
        const tpl = variant.create({});
        out.push({ id: variant.id, category, html: tpl.html, css: tpl.css, js: tpl.js, error: null });
      } catch (e) {
        out.push({ id: variant.id, category, html: '', css: '', js: '', error: String(e) });
      }
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
})()`;

test('every catalog variant emits byte-identical code', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto('/app');
  await page.keyboard.press('Escape');

  const emitted = (await page.evaluate(EMIT)) as Emitted[];
  expect(emitted.length, 'the catalog produced no variants — the import or the merge is broken').toBeGreaterThan(0);

  const failedToCreate = emitted.filter((e) => e.error);
  expect(failedToCreate.map((e) => `${e.id}: ${e.error}`)).toEqual([]);

  const actual: Record<string, PaneHashes> = {};
  for (const e of emitted) {
    actual[e.id] = { html: hash(e.html), css: hash(e.css), js: hash(e.js) };
  }

  if (UPDATE || !existsSync(BASELINE)) {
    writeFileSync(
      BASELINE,
      `${JSON.stringify(
        {
          $comment:
            'Emitted-code fingerprints for every catalog variant at its own defaults. ' +
            'Re-record with UPDATE_CATALOG_BASELINE=1 and let the diff be the review. ' +
            'See e2e/catalog-baseline.spec.ts.',
          variants: actual,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    test.info().annotations.push({ type: 'baseline', description: `recorded ${emitted.length} variants` });
    return;
  }

  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')).variants as Record<string, PaneHashes>;

  // The variant SET first: an added or removed design must be a visible decision, never a
  // silent pass because its id simply stopped being compared.
  expect(Object.keys(actual).sort(), 'the set of catalog variants changed').toEqual(Object.keys(baseline).sort());

  // Then the panes. Report every drifted pane at once — during a bulk migration the useful
  // question is "which variants moved", not "which one moved first".
  const drifted: string[] = [];
  for (const e of emitted) {
    const was = baseline[e.id];
    const now = actual[e.id];
    if (!was) continue;
    const panes = (['html', 'css', 'js'] as const).filter((p) => was[p] !== now[p]);
    if (!panes.length) continue;
    drifted.push(`${e.id} (${e.category}): ${panes.join(', ')}`);
    const dir = testInfo.outputPath('emitted');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${e.id}.html`), e.html, 'utf8');
    writeFileSync(path.join(dir, `${e.id}.css`), e.css, 'utf8');
    writeFileSync(path.join(dir, `${e.id}.js`), e.js, 'utf8');
  }

  expect(
    drifted,
    'Emitted code moved. If that was the point, re-record with UPDATE_CATALOG_BASELINE=1 ' +
      'and review the JSON diff; the full emitted panes are in this test’s output directory.',
  ).toEqual([]);
});

// ── The render fingerprint — the gate tokenization must not move ────────────────────────

interface Rendered {
  id: string;
  error: string | null;
  /** [elementKey, "prop:value; … |rect"] for the settled graphic, capped. */
  elements: [string, string][];
  /** Total elements found, so a change in element COUNT is caught even past the cap. */
  count: number;
}

/** The properties a theme can move. Geometry rides along as the rect, which catches the
 *  layout consequences (a changed padding shifts what sits next to it) that a property
 *  list alone would miss. */
const CAPTURE = `(async () => {
  const PROPS = ['background-color','background-image','border-radius','box-shadow','backdrop-filter',
    'color','font-family','font-size','font-weight','letter-spacing','text-transform','line-height',
    'padding','gap','opacity','transform','filter','text-shadow','border-width','border-style',
    'border-color','-webkit-text-stroke','clip-path','mix-blend-mode'];
  const MAX_ELEMENTS = 80;
  // GSAP writes sub-pixel inline transforms; rounding keeps the fingerprint stable without
  // hiding a real move (a themed radius or padding change is never sub-pixel).
  const round1 = (s) => String(s).replace(/-?\\d+\\.\\d+/g, (m) => (Math.round(parseFloat(m) * 10) / 10).toFixed(1));

  const { CATALOG } = await import('/src/templates/catalog.ts');
  const { composeDocument } = await import('/src/preview/composeDocument.ts');
  const out = [];

  for (const variants of Object.values(CATALOG)) {
    for (const variant of variants ?? []) {
      const rec = { id: variant.id, error: null, elements: [], count: 0 };
      let frame = null;
      try {
        const tpl = variant.create({});
        frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;width:' +
          tpl.resolution.width + 'px;height:' + tpl.resolution.height + 'px;';
        await new Promise((res, rej) => {
          frame.onload = res;
          frame.onerror = () => rej(new Error('the iframe failed to load'));
          frame.srcdoc = composeDocument(tpl);
          document.body.appendChild(frame);
        });
        const win = frame.contentWindow, doc = frame.contentDocument;
        if (!win || !doc) throw new Error('the iframe has no document');

        // Fonts change every measurement; the cap stops a missing face from hanging the run.
        await Promise.race([doc.fonts.ready.then(() => undefined), new Promise((r) => setTimeout(r, 1500))]);

        // MEASURE THE AUTHORED DESIGN, NOT AN ANIMATION PHASE.
        //
        // The first version of this fingerprinted the settled on-air pose. That is the wrong
        // frame to measure and it made the spec flaky under load: a ticker marquee is an
        // infinite GSAP repeat driven by a measured builder, so there is no "settled" state
        // for it to reach — seeking an endless timeline to its end lands wherever the clock
        // happened to be, and tk06 drifted by 32 elements whenever the machine was busy.
        //
        // Motion is deliberately NOT tokenized (model/themeTokens.ts says why), so the gate
        // does not need the animated frame to do its job: everything a token can touch —
        // colour, radius, blur, shadow, weight, tracking, and the layout those imply — is
        // fully determined by the CSS with no timeline running at all. Removing motion from
        // the measurement removes the whole class of timing flake with it. The animated
        // runtime is still covered, by bench.spec.ts.
        const still = doc.createElement('style');
        still.textContent =
          '*, *::before, *::after { animation: none !important; transition: none !important; }' +
          // Templates hide their root until play(); reveal it so layout is measurable. The
          // root is always the template's single top-level element, and forcing it the same
          // way every run means the reveal itself can never drift.
          ' body > * { opacity: 1 !important; }';
        doc.head.appendChild(still);

        // Never play. Just make sure nothing GSAP may have touched at load carries inline
        // styles into the measurement.
        try {
          if (win.gsap) {
            win.gsap.globalTimeline.pause();
            win.gsap.killTweensOf('*');
            win.gsap.set(doc.body.querySelectorAll('*'), { clearProps: 'all' });
          }
        } catch (e) { void e; }
        await new Promise((r) => win.requestAnimationFrame(() => win.requestAnimationFrame(r)));

        const walk = (el, path) => {
          rec.count++;
          if (rec.elements.length < MAX_ELEMENTS) {
            const cs = win.getComputedStyle(el);
            const decls = PROPS.map((p) => p + ':' + round1(cs.getPropertyValue(p))).join('; ');
            const r = el.getBoundingClientRect();
            const rect = [r.x, r.y, r.width, r.height].map((n) => Math.round(n)).join(',');
            rec.elements.push([path, decls + ' |' + rect]);
          }
          const seen = {};
          for (const kid of Array.from(el.children)) {
            const cls = typeof kid.className === 'string' && kid.className.trim()
              ? '.' + kid.className.trim().split(/\\s+/).join('.') : '';
            const base = kid.tagName.toLowerCase() + cls;
            seen[base] = (seen[base] || 0) + 1;
            walk(kid, path + '>' + base + '[' + seen[base] + ']');
          }
        };
        walk(doc.body, 'body');
      } catch (e) {
        rec.error = String(e);
      } finally {
        if (frame) frame.remove();
      }
      out.push(rec);
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
})()`;

test('every catalog variant renders identically', async ({ page }, testInfo) => {
  test.setTimeout(300_000);

  // The fingerprint is PLATFORM-BOUND: rects and letter-spacing resolve through the OS font
  // rasterizer, so a baseline recorded on Windows can never match a Linux runner — CI was red
  // for a day on exactly that before the baseline learned to say where it was recorded. The
  // comparison runs only on the recording platform; everywhere else this skips loudly rather
  // than failing meaninglessly. The SOURCE baseline above is byte-exact and platform-free, so
  // CI keeps its guard against emitted-code drift either way.
  if (!UPDATE_RENDER && existsSync(RENDER_BASELINE)) {
    const recordedOn = JSON.parse(readFileSync(RENDER_BASELINE, 'utf8')).platform;
    test.skip(
      typeof recordedOn === 'string' && recordedOn !== process.platform,
      `render baseline recorded on "${recordedOn}", this is "${process.platform}" — font rasterization differs; re-record here to compare here`,
    );
  }

  await page.goto('/app');
  await page.keyboard.press('Escape');

  const rendered = (await page.evaluate(CAPTURE)) as Rendered[];
  expect(rendered.length).toBeGreaterThan(0);
  expect(rendered.filter((r) => r.error).map((r) => `${r.id}: ${r.error}`)).toEqual([]);

  // Per ELEMENT, not per variant: during a bulk migration "which element moved" is the
  // question, and a whole-variant hash answers it with a shrug.
  const actual: Record<string, Record<string, string>> = {};
  for (const r of rendered) {
    const byKey: Record<string, string> = { '#count': String(r.count) };
    for (const [key, record] of r.elements) byKey[key] = hash(record);
    actual[r.id] = byKey;
  }

  if (UPDATE_RENDER || !existsSync(RENDER_BASELINE)) {
    writeFileSync(
      RENDER_BASELINE,
      `${JSON.stringify(
        {
          $comment:
            'Computed-style and geometry fingerprints of every catalog variant, settled and on air. ' +
            'Substituting a token for the literal it was given must not move these. ' +
            'Re-record with UPDATE_RENDER_BASELINE=1 only when the look changed ON PURPOSE. ' +
            'Platform-bound: compared only on the platform that recorded it (font rasterization).',
          platform: process.platform,
          variants: actual,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    test.info().annotations.push({ type: 'baseline', description: `recorded ${rendered.length} variants` });
    return;
  }

  const baseline = JSON.parse(readFileSync(RENDER_BASELINE, 'utf8')).variants as Record<
    string,
    Record<string, string>
  >;
  expect(Object.keys(actual).sort(), 'the set of catalog variants changed').toEqual(Object.keys(baseline).sort());

  const drifted: string[] = [];
  for (const r of rendered) {
    const was = baseline[r.id];
    if (!was) continue;
    const now = actual[r.id];
    const keys = [...new Set([...Object.keys(was), ...Object.keys(now)])].sort();
    const moved = keys.filter((k) => was[k] !== now[k]);
    if (!moved.length) continue;
    drifted.push(`${r.id}: ${moved.length} element(s) — ${moved.slice(0, 4).join(', ')}`);
    const dir = testInfo.outputPath('rendered');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, `${r.id}.txt`),
      r.elements.map(([k, v]) => `${moved.includes(k) ? 'MOVED ' : '      '}${k}\n        ${v}`).join('\n'),
      'utf8',
    );
  }

  expect(
    drifted,
    'The rendered look moved. A token substitution cannot do this — investigate before ' +
      're-recording. Full per-element records are in this test’s output directory.',
  ).toEqual([]);
});
