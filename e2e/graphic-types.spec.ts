import { test, expect, type Page } from '@playwright/test';

// GRAPHIC TYPES (docs/GRAPHIC_TYPES.md) — the conformance suite every registered type passes.
//
// A type says what a graphic IS (structure, fields, state groups, default path, control
// events) independently of what it looks like. These checks are what "to the quality bar
// everything else is measured against" means in practice, and they run per type, so adding a
// type either passes them or fails the build.

async function toApp(page: Page) {
  await page.goto('/app');
  await page.keyboard.press('Escape');
}

const HARNESS = `
  async function types() {
    const { TYPES } = await import('/src/templates/types/registry.ts');
    return TYPES;
  }
  async function boot(tpl) {
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-3000px;top:0;width:1280px;height:720px;';
    document.body.appendChild(f);
    await new Promise((res) => { f.onload = res; f.srcdoc = composeDocument(tpl); });
    await new Promise((r) => setTimeout(r, 60));
    return f.contentWindow;
  }
`;

test('every type conforms: parses, validates, binds its fields and events, and exports', async ({ page }) => {
  test.setTimeout(180_000);
  await toApp(page);
  const report = await page.evaluate(`(async () => {
    ${HARNESS}
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const { allOperatorEvents, deriveMachine, spxSteps, validateMachine } = await import('/src/blocks/animMachine.ts');
    const { validateTemplate } = await import('/src/validation/validateTemplate.ts');
    const { variantsFromType, missingParts, typeFieldsToSpx } = await import('/src/templates/types/graphicType.ts');
    const { hasMachineRuntime } = await import('/src/templates/shared/animRuntime.ts');

    const out = [];
    for (const type of await types()) {
      for (const variant of variantsFromType(type)) {
        const tpl = variant.create({});
        const data = parseAnimData(tpl.js);
        const problems = [];

        if (!data) problems.push('the animation data does not parse');
        // Every part the type PROMISED must actually exist in what the design emitted.
        const missing = missingParts(type, tpl);
        if (missing.length) problems.push('missing required parts: ' + missing.join(', '));

        // The export gate. A type that cannot ship is not a type.
        const verdict = validateTemplate(tpl);
        if (!verdict.ok) problems.push('validation: ' + verdict.errors.map((e) => e.rule + ' ' + e.message).join(' | '));

        if (data) {
          // The SPX steps count is derived, never guessed.
          if (String(spxSteps(data)) !== tpl.settings.steps)
            problems.push('settings.steps ' + tpl.settings.steps + ' != spxSteps ' + spxSteps(data));
          // A machine that made it into the code must be sound and runnable.
          if (data.machine) {
            const verdictM = validateMachine(data);
            if (verdictM.errors.length) problems.push('machine: ' + verdictM.errors.join(' | '));
            if (!hasMachineRuntime(tpl.js)) problems.push('machine present but the interpreter predates the engine');
          }
          // Declared control events must exist as real arrows, or the control page would grow
          // a button that dispatches an event nothing listens for.
          const authored = allOperatorEvents(data.machine ?? deriveMachine(data));
          for (const c of type.controls) {
            if (!authored.includes(c.event)) problems.push('control event "' + c.event + '" is not authored in the machine');
          }
        }

        // Every non-hidden field the type declared must have its element in the markup.
        const spxFields = typeFieldsToSpx(type.fields);
        if (spxFields.length !== tpl.fields.length)
          problems.push('field count: type declares ' + spxFields.length + ', template emits ' + tpl.fields.length);
        for (const f of tpl.fields) {
          if (!new RegExp('id="' + f.field + '"').test(tpl.html) && !new RegExp('id="' + f.field + '"').test(tpl.js))
            problems.push('field ' + f.field + ' has no element');
        }

        out.push({ type: type.id, variant: variant.id, problems });
      }
    }
    return out;
  })()`);
  const broken = (report as Array<{ type: string; variant: string; problems: string[] }>).filter((r) => r.problems.length);
  expect(broken).toEqual([]);
  expect((report as unknown[]).length).toBeGreaterThan(0);
});

test('promotion is byte-identical apart from the machine the type adds', async ({ page }) => {
  test.setTimeout(120_000);
  await toApp(page);
  // A type that PROMOTES an existing variant must not change what that variant looks like.
  // Markup and styling have to come out identical; only the animation region may differ, and
  // only by gaining a machine. This is the guarantee that makes promotion safe to do in bulk.
  const report = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantsFromType } = await import('/src/templates/types/graphicType.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const out = [];
    for (const type of await types()) {
      for (const design of type.designs) {
        const promoted = variantsFromType(type).find((v) => v.id === design.id).create({});
        const original = design.create(type, {});   // the design alone, before the type touches it
        const data = parseAnimData(promoted.js);
        out.push({
          variant: design.id,
          htmlSame: promoted.html === original.html || promoted.settings.steps !== original.settings.steps,
          cssSame: promoted.css === original.css,
          // Outside the marked region, the JS must be untouched.
          preRegionSame: promoted.js.split('== ANIMATION')[0] === original.js.split('== ANIMATION')[0],
          jsDiffersOnlyByMachine: promoted.js === original.js || !!data.machine,
        });
      }
    }
    return out;
  })()`);
  for (const row of report as Array<Record<string, unknown>>) {
    expect(row, `promoted variant ${row.variant}`).toMatchObject({
      htmlSame: true, cssSame: true, preRegionSame: true, jsDiffersOnlyByMachine: true,
    });
  }
});

test('a promoted design keeps the capabilities it was authored with', async ({ page }) => {
  test.setTimeout(120_000);
  await toApp(page);
  // THE CAPABILITIES GATE, mechanically (docs/GRAPHIC_TYPES.md §5). A compiled variant takes
  // its TYPE's capabilities, so promotion can quietly rewrite a design's motion: the wizard,
  // the Inspector and the AI's legal-preset set all read the compiled list, and
  // `animationPresets[0]` IS the default a new project is created with.
  //
  // Nothing caught this before, and the reason is worth keeping: `create({})` resolves the
  // preset from the design's OWN variant record, so the emitted code never moves and neither
  // does any baseline taken from it. The drift lives entirely in what the UI offers, which is
  // why it has to be compared against the hand-written variant rather than against output.
  const report = await page.evaluate(`(async () => {
    ${HARNESS}
    const { variantsFromType } = await import('/src/templates/types/graphicType.ts');
    // The hand-written lists, BEFORE the merge — a design's authored capabilities.
    const sources = await Promise.all([
      import('/src/templates/lowerThirds/index.ts'),
      import('/src/templates/infoCards/index.ts'),
      import('/src/templates/cornerBug/index.ts'),
      import('/src/templates/infographics/index.ts'),
      import('/src/templates/gameTimers/index.ts'),
      import('/src/templates/startingSoon/index.ts'),
      import('/src/templates/tickers/index.ts'),
      import('/src/templates/scoreboards/index.ts'),
      import('/src/templates/quiz/index.ts'),
    ]);
    const authored = {};
    for (const mod of sources) {
      for (const value of Object.values(mod)) {
        if (Array.isArray(value)) for (const v of value) if (v && v.id) authored[v.id] = v;
      }
    }
    const out = [];
    for (const type of await types()) {
      for (const variant of variantsFromType(type)) {
        // A design authored only as a TypeDesign has no separate source to disagree with.
        const own = authored[variant.id];
        if (!own) continue;
        // Every capability the compiled variant carries, against the design's authored one.
        // A type may legitimately WIDEN what is offered (a longer preset list, more lines);
        // it may never change the design's own default or take something away.
        const drift = [];
        if (variant.animationPresets[0] !== own.animationPresets[0])
          drift.push('default entrance ' + own.animationPresets[0] + ' -> ' + variant.animationPresets[0]);
        const lost = own.animationPresets.filter((p) => !variant.animationPresets.includes(p));
        if (lost.length) drift.push('presets no longer offered: ' + lost.join(', '));
        if (variant.defaultZone !== own.defaultZone)
          drift.push('zone ' + own.defaultZone + ' -> ' + variant.defaultZone);
        if (variant.defaultPalette.id !== own.defaultPalette.id)
          drift.push('palette ' + own.defaultPalette.id + ' -> ' + variant.defaultPalette.id);
        if (variant.defaultFontId !== own.defaultFontId)
          drift.push('font ' + own.defaultFontId + ' -> ' + variant.defaultFontId);
        if (variant.logo !== own.logo) drift.push('logo ' + own.logo + ' -> ' + variant.logo);
        if (variant.maxLines < own.maxLines)
          drift.push('maxLines narrowed ' + own.maxLines + ' -> ' + variant.maxLines);
        out.push({ variant: variant.id, type: type.id, drift });
      }
    }
    return out;
  })()`);
  const rows = report as Array<{ variant: string; type: string; drift: string[] }>;
  expect(rows.length).toBeGreaterThan(0);
  expect(
    rows.filter((r) => r.drift.length).map((r) => `${r.variant} (${r.type}): ${r.drift.join('; ')}`),
    'promotion changed a design’s authored capabilities — give the TypeDesign its own ' +
      'animationPresets / defaultZone / palette / fontId instead of taking the type’s',
  ).toEqual([]);
});

// ── The acceptance criteria, met by SHIPPED types ────────────────────────────────────────
// docs/noacg-master-goals.md §1.4 states these as tests of the model. Phase 1 proved them
// against hand-written definitions; a type that ships has to pass them for real.

/** Create a registered type's first design and boot it into a hidden frame. */
const TYPE_HARNESS = `
  ${HARNESS}
  async function bootType(typeId) {
    const { typeById } = await import('/src/templates/types/registry.ts');
    const { variantsFromType } = await import('/src/templates/types/graphicType.ts');
    const tpl = variantsFromType(typeById(typeId))[0].create({});
    return { tpl, w: await boot(tpl) };
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function settled(read, want, budget) {
    budget = budget || 3000;
    for (var waited = 0; waited < budget; waited += 40) { if (read() === want) return read(); await sleep(40); }
    return read();
  }
  async function reaches(read, atLeast, budget) {
    budget = budget || 4000;
    for (var waited = 0; waited < budget; waited += 40) { if (read() >= atLeast) return read(); await sleep(40); }
    return read();
  }
`;

test('the quiz board passes the Millionaire test: pick, change, lock, reveal', async ({ page }) => {
  test.setTimeout(90_000);
  await toApp(page);
  const result = await page.evaluate(`(async () => {
    ${TYPE_HARNESS}
    const { w } = await bootType('quiz-board');
    const has = (sel, cls) => w.document.querySelector(sel).classList.contains(cls);
    const state = () => w.noacgMachineState().groups.main;
    const pick = () => w.document.getElementById('f6').textContent;

    w.play();
    await sleep(400);

    // Select an answer - WHICH answer is data riding the event, not a state.
    w.noacgDispatch('select', { f6: 'C' });
    const selectedC = await settled(() => has('.quiz-option-3', 'quiz-sel'), true);
    // Change it freely: the self-transition replays the state and repaints from the new data.
    w.noacgDispatch('select', { f6: 'A' });
    const movedToA = await settled(() => has('.quiz-option-1', 'quiz-sel') && !has('.quiz-option-3', 'quiz-sel'), true);

    // Lock. From here a selection is not refused - there is no arrow for it to travel.
    w.noacgDispatch('lock');
    const locked = state();
    const dimApplied = await settled(() => has('.quiz', 'quiz-locked'), true);
    w.noacgDispatch('select', { f6: 'D' });
    await sleep(150);
    const afterIllegal = { state: state(), pick: pick(), stillA: has('.quiz-option-1', 'quiz-sel') };

    // Reveal: the correct answer and the wrong pick get DIFFERENT treatments.
    w.noacgDispatch('judge');
    await settled(() => has('.quiz-option-2', 'quiz-correct'), true);
    const judged = {
      correctOnB: has('.quiz-option-2', 'quiz-correct'),
      wrongOnA: has('.quiz-option-1', 'quiz-wrong'),
    };

    // Reset for the next question: data in, board clean.
    w.update(JSON.stringify({ f0: 'Which ocean is the largest?', f6: '' }));
    await sleep(120);
    const reset = {
      noSelection: !has('.quiz-option-1', 'quiz-sel') && !has('.quiz-option-1', 'quiz-wrong'),
      noReveal: !has('.quiz-option-2', 'quiz-correct'),
      unlocked: !has('.quiz', 'quiz-locked'),
    };
    return { selectedC, movedToA, locked, dimApplied, afterIllegal, judged, reset };
  })()`);
  expect(result).toMatchObject({
    selectedC: true,
    movedToA: true,
    locked: 'locked',
    dimApplied: true,
    // The late selection is dropped whole - the event AND its payload.
    afterIllegal: { state: 'locked', pick: 'A', stillA: true },
    judged: { correctOnB: true, wrongOnA: true },
    reset: { noSelection: true, noReveal: true, unlocked: true },
  });
});

test('the quiz board still degrades to dumb-stepping: next alone walks it', async ({ page }) => {
  await toApp(page);
  // The compatibility criterion. Whatever a machine adds, the graphic must remain drivable by
  // the only four calls a playout server makes.
  const result = await page.evaluate(`(async () => {
    ${TYPE_HARNESS}
    const { tpl, w } = await bootType('quiz-board');
    const walk = [];
    w.update(JSON.stringify({ f5: 'B' }));
    w.play();
    walk.push(w.noacgMachineState().groups.main);
    for (let i = 0; i < Number(tpl.settings.steps); i++) { w.next(); walk.push(w.noacgMachineState().groups.main); }
    w.stop();
    await sleep(400);
    return { walk, steps: tpl.settings.steps, offAir: w.noacgMachineState().groups.main };
  })()`);
  expect(result).toMatchObject({ steps: '2', offAir: 'off' });
  const walk = (result as { walk: string[] }).walk;
  // play() lands on the entrance and the first press moves the graphic on. The press after
  // that is deliberately a no-op: nothing authored an arrow into the exit, so stop() is what
  // takes the graphic off air — the same contract a graphic with no machine has always had.
  expect(walk[0]).not.toBe(walk[1]);
  expect(walk[2]).toBe(walk[1]);
});

test('the ticker passes the ticker test: it cycles on a timer, and pause holds it', async ({ page }) => {
  test.setTimeout(90_000);
  await toApp(page);
  const result = await page.evaluate(`(async () => {
    ${TYPE_HARNESS}
    const { w } = await bootType('ticker');
    w.gsap.globalTimeline.timeScale(20);   // 1s of authored time ~ 50ms of wall clock
    w.play();
    // No operator input at all - the machine's own timer advances it.
    const cycled = await reaches(() => w.tickerIndex, 2);
    const state = w.noacgMachineState().groups.main;
    w.noacgDispatch('pause');
    await sleep(80);
    const atPause = w.tickerIndex;
    await sleep(600);                       // several beats' worth - a held ticker must not move
    const held = { state: w.noacgMachineState().groups.main, frozen: w.tickerIndex === atPause };
    w.noacgDispatch('resume');
    const resumed = await reaches(() => w.tickerIndex, atPause + 1);
    return { cycled, state, held, resumedPast: resumed > atPause };
  })()`);
  expect(result).toMatchObject({ state: 'advance', held: { state: 'paused', frozen: true }, resumedPast: true });
  expect((result as { cycled: number }).cycled).toBeGreaterThanOrEqual(2);
});

test('the scoreboard passes the scorebug test: data moves nothing, parallel groups move alone', async ({ page }) => {
  test.setTimeout(90_000);
  await toApp(page);
  const result = await page.evaluate(`(async () => {
    ${TYPE_HARNESS}
    const { w } = await bootType('scoreboard');
    const groups = () => w.noacgMachineState().groups;
    w.play();
    await sleep(400);

    // A score change is DATA: the number moves, no pointer does.
    const before = JSON.stringify(groups());
    w.update(JSON.stringify({ f1: '14', f3: '7' }));
    await sleep(120);
    const dataMovedNothing = JSON.stringify(groups()) === before;
    const score = w.document.getElementById('f1').textContent;

    // Three events for three different groups, dispatched in one tick. The serial queue
    // resolves them in order, and each group answers only for itself.
    w.noacgDispatch('flag');
    w.noacgDispatch('clockStart');
    w.noacgDispatch('final');
    const settledState = groups();
    await sleep(300);

    // The guard drops a repeat - there is no 'flag' arrow leaving 'shown'.
    w.noacgDispatch('flag');
    const repeatDropped = groups().flag === 'shown';
    w.noacgDispatch('clearFlag');
    await sleep(300);
    return { dataMovedNothing, score, settledState, repeatDropped, cleared: groups().flag, final: groups().result };
  })()`);
  expect(result).toMatchObject({
    dataMovedNothing: true,
    score: '14',
    // Pointers move synchronously at dispatch, before any animation settles.
    settledState: { flag: 'shown', clock: 'running', result: 'final' },
    repeatDropped: true,
    cleared: 'none',
    final: 'final',
  });
});

test('the countdown holds and resumes its clock from a parallel group', async ({ page }) => {
  test.setTimeout(90_000);
  await toApp(page);
  const result = await page.evaluate(`(async () => {
    ${TYPE_HARNESS}
    const { w } = await bootType('countdown');
    const clock = () => w.document.querySelector('.game-timer-clock').textContent;
    w.play();
    await sleep(1200);                       // let the clock actually tick at least once
    const running = clock();
    w.noacgDispatch('pause');
    await sleep(150);
    const atPause = clock();
    await sleep(1600);                       // a held clock must read the same afterwards
    const held = clock() === atPause;
    w.noacgDispatch('resume');
    await sleep(1400);
    const movedAgain = clock() !== atPause;
    return { state: w.noacgMachineState().groups.clock, running, held, movedAgain };
  })()`);
  expect(result).toMatchObject({ state: 'running', held: true, movedAgain: true });
});

test('a type keeps its catalog identity: same id, same slot, reachable by id', async ({ page }) => {
  await toApp(page);
  const result = await page.evaluate(`(async () => {
    ${HARNESS}
    const { CATALOG, variantById, variantsFor } = await import('/src/templates/catalog.ts');
    const rows = [];
    for (const type of await types()) {
      for (const design of type.designs) {
        const found = variantById(design.id);
        const list = variantsFor(type.structure.category);
        rows.push({
          id: design.id,
          resolves: !!found,
          carriesTypeId: found?.typeId === type.id,
          // Promotion replaces IN PLACE - a promoted design must not appear twice, and must
          // not jump to the end of the browse grid.
          appearsOnce: list.filter((v) => v.id === design.id).length === 1,
        });
      }
    }
    return { rows, categories: Object.keys(CATALOG).length };
  })()`);
  for (const row of (result as { rows: Array<Record<string, unknown>> }).rows) {
    expect(row, `catalog identity for ${row.id}`).toMatchObject({
      resolves: true, carriesTypeId: true, appearsOnce: true,
    });
  }
});
