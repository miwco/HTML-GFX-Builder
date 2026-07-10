import { test, expect, type Page } from '@playwright/test';

// Timeline v2 Phase 1 (docs/TIMELINE_V2_PLAN.md) — the golden parity harness for the
// declarative animation engine. No UI exists yet: these are browser logic-checks (the
// house fast path — import source modules straight from the dev server) proving that a
// legacy emitted region, converted to NOACG_ANIM data and played by the interpreter,
// behaves exactly like the original: same durations, same settled states, same press
// chain, and a playhead resolver that agrees with the real playback.

async function toApp(page: Page) {
  await page.goto('/app');
  await page.keyboard.press('Escape'); // the wizard modal — these tests don't need a project
}

/** Runs in the page: boot a template into a hidden iframe, return its window handle. */
const HARNESS = `
  async function boot(tpl) {
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-3000px;top:0;width:1280px;height:720px;';
    document.body.appendChild(f);
    await new Promise((res) => { f.onload = res; f.srcdoc = composeDocument(tpl); });
    await new Promise((r) => setTimeout(r, 60));
    return f.contentWindow;
  }
  function styleOf(w, sel) {
    const el = w.document.querySelector(sel);
    if (!el) return null;
    const s = w.getComputedStyle(el);
    return { opacity: s.opacity, transform: s.transform, filter: s.filter };
  }
  // Compare two computed-style snapshots with numeric tolerance (matrix floats drift).
  function sameStyle(a, b) {
    if (!a || !b) return a === b;
    const nums = (str) => (str.match(/-?[\\d.]+/g) || []).map(Number);
    for (const key of ['opacity', 'transform', 'filter']) {
      const na = nums(a[key]); const nb = nums(b[key]);
      if (na.length !== nb.length) return false;
      for (let i = 0; i < na.length; i++) if (Math.abs(na[i] - nb[i]) > 0.6) return false;
    }
    return true;
  }
  async function convert(tpl) {
    const { importAnimData } = await import('/src/blocks/animImport.ts');
    const { replaceRegionWithAnimData } = await import('/src/templates/shared/animRuntime.ts');
    const data = importAnimData(tpl);
    if (!data) return null;
    const js = replaceRegionWithAnimData(tpl.js, data);
    return js ? { data, tpl: { ...tpl, js } } : null;
  }
`;

test('parity: converted data + interpreter matches the legacy emit across preset styles', async ({ page }) => {
  test.setTimeout(120_000);
  await toApp(page);
  // One variant × six presets covers every value type the emits use: mask reveals
  // (yPercent), slides (x/y + opacity), scale pops, clip-path wipes, filter blurs, skews.
  const failures = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantById } = await import('/src/templates/catalog.ts');
    const { swapAnimationPreset, presetConfigFromTemplate, anyPresetById } = await import('/src/blocks/animPatch.ts');
    const failures = [];
    for (const presetId of ['line-reveal', 'slide-fade', 'pop-spring', 'mask-wipe', 'blur-in', 'snap-stinger']) {
      const base = variantById('lt01').create({});
      const preset = anyPresetById(presetId);
      const cfg = { ...presetConfigFromTemplate(base, false), easeIn: preset.autoEase.easeIn, easeOut: preset.autoEase.easeOut };
      const tpl = { ...base, js: swapAnimationPreset(base.js, presetId, cfg) };
      const converted = await convert(tpl);
      if (!converted) { failures.push(presetId + ': importer returned null'); continue; }
      const wOld = await boot(tpl);
      const wNew = await boot(converted.tpl);
      // Entrance: same length, same settled look.
      const inOld = wOld.buildInTimeline(); inOld.pause();
      const inNew = wNew.buildInTimeline(); inNew.pause();
      if (Math.abs(inOld.duration() - inNew.duration()) > 0.03)
        failures.push(presetId + ': in duration ' + inOld.duration() + ' vs ' + inNew.duration());
      inOld.progress(1, true); inNew.progress(1, true);
      for (const sel of ['.lower-third', '.lower-third-box', '#f0', '#f1']) {
        if (!sameStyle(styleOf(wOld, sel), styleOf(wNew, sel)))
          failures.push(presetId + ': settled IN mismatch on ' + sel + ' ' + JSON.stringify(styleOf(wOld, sel)) + ' vs ' + JSON.stringify(styleOf(wNew, sel)));
      }
      // Exit: same length, both fully hidden at the end.
      const outOld = wOld.buildOutTimeline(); outOld.pause();
      const outNew = wNew.buildOutTimeline(); outNew.pause();
      if (Math.abs(outOld.duration() - outNew.duration()) > 0.03)
        failures.push(presetId + ': out duration ' + outOld.duration() + ' vs ' + outNew.duration());
      outOld.progress(1, true); outNew.progress(1, true);
      const rootOld = styleOf(wOld, '.lower-third'); const rootNew = styleOf(wNew, '.lower-third');
      if (rootOld.opacity !== '0' || rootNew.opacity !== '0')
        failures.push(presetId + ': out did not hide the root (' + rootOld.opacity + ' / ' + rootNew.opacity + ')');
    }
    return failures;
  })()`);
  expect(failures).toEqual([]);
});

test('parity: the press chain — pre-hidden reveals, per-press timelines, exhaustion', async ({ page }) => {
  test.setTimeout(60_000);
  await toApp(page);
  const result = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantById } = await import('/src/templates/catalog.ts');
    const tpl = variantById('lt01').create({ animation: { steps: true } });
    const converted = await convert(tpl);
    if (!converted) return { fail: 'importer returned null' };
    const wOld = await boot(tpl);
    const wNew = await boot(converted.tpl);
    const run = (w) => {
      w.buildInTimeline().pause().progress(1, true);
      const hidden = styleOf(w, '#f1');
      const presses = [];
      let tw;
      while ((tw = w.revealNextStep())) { tw.pause(); presses.push(tw.duration()); tw.progress(1, true); }
      return { hidden, shown: styleOf(w, '#f1'), presses };
    };
    const a = run(wOld);
    const b = run(wNew);
    return {
      // The revealed line is parked identically before its press, and lands identically.
      hiddenMatch: sameStyle(a.hidden, b.hidden),
      shownMatch: sameStyle(a.shown, b.shown),
      pressesOld: a.presses.length,
      pressesNew: b.presses.length,
      durationsClose: a.presses.every((d, i) => Math.abs(d - b.presses[i]) < 0.03),
      dataReveals: converted.data.steps[1].reveals,
    };
  })()`);
  expect(result).toMatchObject({
    hiddenMatch: true,
    shownMatch: true,
    pressesOld: 1,
    pressesNew: 1,
    durationsClose: true,
    dataReveals: ['#f1'],
  });
});

test('resolver: agrees with the real interpreter at keyframe times', async ({ page }) => {
  await toApp(page);
  const mismatches = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantById } = await import('/src/templates/catalog.ts');
    const { resolveValue } = await import('/src/blocks/animEval.ts');
    const tpl = variantById('lt01').create({});
    const converted = await convert(tpl);
    const { data } = converted;
    const w = await boot(converted.tpl);
    const tl = w.buildInTimeline(); tl.pause();
    const speed = data.speed || 1;
    const mismatches = [];
    // At every numeric keyframe the eased playback and the resolver agree exactly
    // (linear display interpolation only differs BETWEEN keyframes, by design).
    const step = data.steps[0];
    for (const selector of Object.keys(step.layers)) {
      for (const prop of Object.keys(step.layers[selector])) {
        for (const kf of step.layers[selector][prop]) {
          if (typeof kf.value !== 'number') continue;
          // pause(0) on a never-rendered timeline writes nothing (GSAP renders lazily) —
          // sample a hair after zero; the tolerance absorbs the sliver of motion.
          tl.pause(Math.min(Math.max(kf.time / speed, 0.001), tl.duration()));
          const live = Number(w.gsap.getProperty(selector, prop));
          const resolved = resolveValue(data, selector, prop, 0, kf.time);
          if (Math.abs(live - Number(resolved)) > 0.6)
            mismatches.push(selector + '.' + prop + '@' + kf.time + ': live ' + live + ' vs resolved ' + resolved);
        }
      }
    }
    // Cross-step inheritance: with no Out keyframes for a prop, the Out-step resolution
    // returns the entrance's final value.
    const inherited = resolveValue(data, '#f0', 'yPercent', data.steps.length - 1, 0);
    const lastEnter = step.layers['#f0'].yPercent.slice(-1)[0].value;
    if (inherited !== lastEnter && data.steps[data.steps.length - 1].layers['#f0']?.yPercent === undefined)
      mismatches.push('inheritance: ' + inherited + ' vs ' + lastEnter);
    return mismatches;
  })()`);
  expect(mismatches).toEqual([]);
});

test('serializer: canonical fixed point, lossless splice, hand-edit round-trip', async ({ page }) => {
  await toApp(page);
  const result = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantById } = await import('/src/templates/catalog.ts');
    const { importAnimData } = await import('/src/blocks/animImport.ts');
    const { replaceRegionWithAnimData } = await import('/src/templates/shared/animRuntime.ts');
    const { parseAnimData, serializeAnimData, spliceAnimData } = await import('/src/blocks/animData.ts');
    const tpl = variantById('lt01').create({});
    const data = importAnimData(tpl);
    const js = replaceRegionWithAnimData(tpl.js, data);
    // Fixed point: parse(serialize) then serialize again is byte-identical.
    const once = serializeAnimData(data);
    const twice = serializeAnimData(parseAnimData('var NOACG_ANIM = ' + once + ';'));
    // A visual edit (splice) touches only the literal — the interpreter and everything
    // around it survive byte-for-byte.
    const parsed = parseAnimData(js);
    parsed.steps[0].duration = 1.5;
    const spliced = spliceAnimData(js, parsed);
    // A HAND edit in the code round-trips: change one value in the text (only the first
    // of several 110s — the others must survive), the parse sees it.
    const handEdited = js.replace('"value": 110', '"value": 90');
    const reparsed = parseAnimData(handEdited);
    const values = [];
    for (const s of reparsed.steps) for (const l of Object.values(s.layers))
      for (const kfs of Object.values(l)) for (const kf of kfs) values.push(kf.value);
    return {
      fixedPoint: once === twice,
      spliceKeepsInterpreter: spliced.includes('function buildStepTimeline') && spliced.includes('"duration": 1.5'),
      spliceKeepsOutsideCode: spliced.split('== ANIMATION')[0] === js.split('== ANIMATION')[0],
      handEditSeen: values.includes(90) && values.includes(110),
    };
  })()`);
  expect(result).toEqual({
    fixedPoint: true,
    spliceKeepsInterpreter: true,
    spliceKeepsOutsideCode: true,
    handEditSeen: true,
  });
});
