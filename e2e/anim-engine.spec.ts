import { test, expect, type Page } from '@playwright/test';

// Timeline v2 Phase 1 (docs/TIMELINE_V2_PLAN.md) — the golden parity harness for the
// declarative animation engine. Lower thirds now CREATE as data blocks, so the harness
// builds each preset's LEGACY twin explicitly (the preset's emitted region spliced into
// the same template) and proves the two representations behave identically: same
// durations, same settled states, same press chain, and a playhead resolver that agrees
// with real playback.

async function toApp(page: Page) {
  await page.goto('/app');
  await page.keyboard.press('Escape'); // the wizard modal — these tests don't need a project
}

/** Runs in the page: boot templates into hidden iframes; build legacy twins. */
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
  // The preset's ORIGINAL emitted region, spliced over the data region — the legacy twin.
  async function legacyTwin(tpl, presetId, steps) {
    const { anyPresetById } = await import('/src/blocks/animPatch.ts');
    const { detectPrefix, countLines } = await import('/src/model/structure.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const preset = anyPresetById(presetId);
    const prefix = detectPrefix(tpl.html);
    const data = parseAnimData(tpl.js);
    const region = preset.emit({
      prefix,
      lineCount: Math.max(1, countLines(tpl.html)),
      hasAccent: tpl.html.includes(prefix + '-accent'),
      steps: !!steps,
      stepOutsideParts: [],
      speed: data ? data.speed : 1,
      easeIn: preset.autoEase.easeIn,
      easeOut: preset.autoEase.easeOut,
    });
    const OPEN = '/* == ANIMATION';
    const CLOSE = '/* == END ANIMATION == */';
    const start = tpl.js.indexOf(OPEN);
    const end = tpl.js.indexOf(CLOSE) + CLOSE.length;
    return { ...tpl, js: tpl.js.slice(0, start) + region + tpl.js.slice(end) };
  }
`;

test('parity: created data templates match each preset\'s legacy emit', async ({ page }) => {
  test.setTimeout(120_000);
  await toApp(page);
  // One variant × six presets covers every value type the emits use: mask reveals
  // (yPercent), slides (x/y + opacity), scale pops, clip-path wipes, filter blurs, skews.
  const failures = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantById } = await import('/src/templates/catalog.ts');
    const failures = [];
    for (const presetId of ['line-reveal', 'slide-fade', 'pop-spring', 'mask-wipe', 'blur-in', 'snap-stinger']) {
      const tpl = variantById('lt01').create({ animation: { presetId } });
      if (!tpl.js.includes('var NOACG_ANIM')) { failures.push(presetId + ': creation did not emit the data block'); continue; }
      const wNew = await boot(tpl);
      const wOld = await boot(await legacyTwin(tpl, presetId, false));
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
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const tpl = variantById('lt01').create({ animation: { steps: true } });
    const data = parseAnimData(tpl.js);
    if (!data) return { fail: 'creation did not emit the data block' };
    const wNew = await boot(tpl);
    const wOld = await boot(await legacyTwin(tpl, 'line-reveal', true));
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
      hiddenMatch: sameStyle(a.hidden, b.hidden),
      shownMatch: sameStyle(a.shown, b.shown),
      pressesOld: a.presses.length,
      pressesNew: b.presses.length,
      durationsClose: a.presses.every((d, i) => Math.abs(d - b.presses[i]) < 0.03),
      dataReveals: data.steps[1].reveals,
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

test('parity: clock templates carry startClock/stopClock through the step-call model', async ({ page }) => {
  test.setTimeout(60_000);
  await toApp(page);
  // Game timers create as data blocks now (docs/TIMELINE_V2_PLAN.md §3b): the preset's
  // tl.call(startClock)/tl.call(stopClock) hooks must survive the conversion as step calls,
  // and the data interpreter must run them exactly where the legacy emit did.
  const failures = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantById } = await import('/src/templates/catalog.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const failures = [];
    for (const pair of [['gt01', 'timer-line-reveal'], ['gt02', 'timer-run']]) {
      const variant = pair[0], presetId = pair[1];
      const tpl = variantById(variant).create({ animation: { presetId } });
      if (!tpl.js.includes('var NOACG_ANIM')) { failures.push(variant + ': the flip did not emit the data block'); continue; }
      const data = parseAnimData(tpl.js);
      if (!data) { failures.push(variant + ': the data block is not readable'); continue; }
      // The hooks land on the right steps: startClock on the entrance, stopClock on the Out.
      const enter = (data.steps[0].calls || []).map((c) => c.call);
      const out = (data.steps[data.steps.length - 1].calls || []).map((c) => c.call);
      if (!enter.includes('startClock')) failures.push(variant + ': entrance missing startClock (' + JSON.stringify(enter) + ')');
      if (!out.includes('stopClock')) failures.push(variant + ': Out missing stopClock (' + JSON.stringify(out) + ')');

      const wNew = await boot(tpl);
      const wOld = await boot(await legacyTwin(tpl, presetId, false));

      // Entrance + exit: identical length and settled look as the legacy emit.
      const inOld = wOld.buildInTimeline(); inOld.pause();
      const inNew = wNew.buildInTimeline(); inNew.pause();
      if (Math.abs(inOld.duration() - inNew.duration()) > 0.05) failures.push(variant + ': in duration ' + inOld.duration() + ' vs ' + inNew.duration());
      inOld.progress(1, true); inNew.progress(1, true);
      for (const sel of ['.game-timer', '.game-timer-box', '#f0', '.game-timer-clock']) {
        if (!sameStyle(styleOf(wOld, sel), styleOf(wNew, sel)))
          failures.push(variant + ': settled IN mismatch on ' + sel + ' ' + JSON.stringify(styleOf(wOld, sel)) + ' vs ' + JSON.stringify(styleOf(wNew, sel)));
      }
      const outOld = wOld.buildOutTimeline(); outOld.pause();
      const outNew = wNew.buildOutTimeline(); outNew.pause();
      if (Math.abs(outOld.duration() - outNew.duration()) > 0.05) failures.push(variant + ': out duration ' + outOld.duration() + ' vs ' + outNew.duration());

      // Clock lifecycle: with the clock functions spied, a real (non-suppressed) run fires
      // startClock during the entrance and stopClock during the exit — identically in both
      // representations. (The data interpreter resolves window[name] at fire time; the legacy
      // emit captured the identifier at build time — reassigning before build covers both.)
      for (const w of [wOld, wNew]) { w.__started = 0; w.__stopped = 0; w.startClock = function () { w.__started++; }; w.stopClock = function () { w.__stopped++; }; }
      wOld.buildInTimeline().progress(1); wNew.buildInTimeline().progress(1);
      wOld.buildOutTimeline().progress(1); wNew.buildOutTimeline().progress(1);
      if (wOld.__started < 1) failures.push(variant + ': legacy startClock never fired under the trigger');
      if (wOld.__started !== wNew.__started) failures.push(variant + ': startClock count ' + wOld.__started + ' vs ' + wNew.__started);
      if (wOld.__stopped !== wNew.__stopped) failures.push(variant + ': stopClock count ' + wOld.__stopped + ' vs ' + wNew.__stopped);

      // The settle contract: progress(1, true) suppresses callbacks, so a scrubbed/settled
      // state never ticks the clock.
      wNew.__started = 0; wNew.__stopped = 0;
      wNew.buildInTimeline().progress(1, true); wNew.buildOutTimeline().progress(1, true);
      if (wNew.__started !== 0 || wNew.__stopped !== 0) failures.push(variant + ': settle re-fired the clock (' + wNew.__started + '/' + wNew.__stopped + ')');
    }
    return failures;
  })()`);
  expect(failures).toEqual([]);
});

test('resolver: agrees with the real interpreter at keyframe times', async ({ page }) => {
  await toApp(page);
  const mismatches = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantById } = await import('/src/templates/catalog.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const { resolveValue } = await import('/src/blocks/animEval.ts');
    const tpl = variantById('lt01').create({});
    const data = parseAnimData(tpl.js);
    const w = await boot(tpl);
    const tl = w.buildInTimeline(); tl.pause();
    const speed = data.speed || 1;
    const mismatches = [];
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

test('3D transforms: rotationX/Y/z + perspective author and play through the real interpreter', async ({ page }) => {
  // docs/PRESET_MODEL_REVIEW.md gap 7 — the 3D vocabulary is ordinary numeric tracks: the
  // model round-trips them, and the SAME interpreter (no special-casing) applies them via
  // GSAP as a genuine 3D transform. Author a card-flip on #f0 through the real mutators,
  // then prove the played result is 3D and settles to the resolver's values.
  await toApp(page);
  const problems = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantById } = await import('/src/templates/catalog.ts');
    const { parseAnimData, spliceAnimData } = await import('/src/blocks/animData.ts');
    const { setKeyframe } = await import('/src/blocks/animEdit.ts');
    const { resolveValue } = await import('/src/blocks/animEval.ts');
    const tpl = variantById('lt01').create({});
    let data = parseAnimData(tpl.js);
    const enterDur = data.steps[0].duration;
    // Perspective set once at the entrance; rotationY 90 -> 0 (the card flip), plus an X
    // tilt and a depth push, all resolving to identity by the settled state.
    data = setKeyframe(data, 0, '#f0', 'transformPerspective', 0, 600);
    data = setKeyframe(data, 0, '#f0', 'rotationY', 0, 90);
    data = setKeyframe(data, 0, '#f0', 'rotationY', enterDur, 0);
    data = setKeyframe(data, 0, '#f0', 'rotationX', 0, 20);
    data = setKeyframe(data, 0, '#f0', 'rotationX', enterDur, 0);
    data = setKeyframe(data, 0, '#f0', 'z', 0, -200);
    data = setKeyframe(data, 0, '#f0', 'z', enterDur, 0);
    const js = spliceAnimData(tpl.js, data);
    if (!js || js === tpl.js) return ['splice produced no change'];
    const w = await boot({ ...tpl, js });
    const tl = w.buildInTimeline(); tl.pause();
    const problems = [];
    // Near the start: #f0 is mid-flip — the live transform must be a real 3D matrix and
    // rotationY still near its 90deg 'from' value.
    tl.pause(0.001);
    const startTransform = w.getComputedStyle(w.document.querySelector('#f0')).transform;
    if (!/matrix3d/.test(startTransform)) problems.push('entrance is not 3D: ' + startTransform);
    const startRotY = Number(w.gsap.getProperty('#f0', 'rotationY'));
    if (Math.abs(startRotY - 90) > 3) problems.push('start rotationY ' + startRotY + ' not ~90');
    // Settled: every 3D prop matches the resolver AND the authored end values.
    tl.progress(1, true);
    for (const spec of [['rotationX', 0], ['rotationY', 0], ['z', 0], ['transformPerspective', 600]]) {
      const prop = spec[0], want = spec[1];
      const live = Number(w.gsap.getProperty('#f0', prop));
      const resolved = Number(resolveValue(data, '#f0', prop, 0, enterDur));
      if (Math.abs(live - want) > 1) problems.push(prop + ' settled live ' + live + ' != ' + want);
      if (Math.abs(live - resolved) > 1) problems.push(prop + ' live/resolver drift ' + live + ' / ' + resolved);
    }
    return problems;
  })()`);
  expect(problems).toEqual([]);
});

test('serializer: canonical fixed point, lossless splice, hand-edit round-trip', async ({ page }) => {
  await toApp(page);
  const result = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantById } = await import('/src/templates/catalog.ts');
    const { parseAnimData, serializeAnimData, spliceAnimData } = await import('/src/blocks/animData.ts');
    const tpl = variantById('lt01').create({});
    const js = tpl.js; // created AS a data block now
    const data = parseAnimData(js);
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
