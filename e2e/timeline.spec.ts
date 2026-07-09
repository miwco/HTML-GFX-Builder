import { test, expect, type Page, type FrameLocator } from '@playwright/test';

// Era 6 — the timeline strip under the preview (docs/TIMELINE_PLAN.md): tracks parsed from
// the marked ANIMATION region, a live playhead that follows ▶ Play / ■ Stop, and a scrubber
// that pauses the preview. Also pins the "design view": after every rebuild the canvas shows
// the graphic SETTLED (never blank), with clocks/loops idle until a real Play.

async function createHairline(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
}

function frame(page: Page): FrameLocator {
  return page.frameLocator('iframe.preview-frame');
}

test('design view: the canvas shows the settled graphic without pressing Play', async ({ page }) => {
  await createHairline(page);
  // No Play pressed — the settle-on-rebuild jump makes the graphic visible at rest.
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await expect(frame(page).locator('#f0')).toHaveText('Alexandra Riva');
});

test('timeline strip lives under the preview and renders the preset structure', async ({ page }) => {
  await createHairline(page); // lt01 default preset: line-reveal (set + accent + lines)
  // Under the preview (inside .preview-wrap), NOT in the Motion tab.
  const timeline = page.locator('.preview-wrap [data-testid="timeline"]');
  await expect(timeline).toBeVisible();
  await expect(timeline).toContainText('Expo'); // line-reveal's auto ease pair, in plain words
  const rows = timeline.locator('.timeline-row');
  await expect(rows).toHaveCount(3);
  // Rows are labelled in plain words (the raw selector lives in the tooltip)…
  await expect(rows.nth(0)).toContainText('Whole graphic');
  await expect(rows.nth(1)).toContainText('Accent line');
  await expect(rows.nth(2)).toContainText('Name + Title');
  // …and each bar says what it does (line-reveal: the accent draws, the lines slide).
  await expect(rows.nth(1).locator('.timeline-bar-verb')).toHaveText('draw');
  await expect(rows.nth(2).locator('.timeline-bar-verb')).toHaveText('slide');
  // The gesture hint makes retime/stretch/ease discoverable without hovering.
  await expect(timeline.getByTestId('timeline-hint')).toContainText('drag a bar to retime');
  // Both phases offered, with real durations; idle playhead parks at the END of In.
  await expect(timeline.locator('[data-testid="timeline-seg-in"]')).toContainText('s');
  await expect(timeline.locator('[data-testid="timeline-seg-out"]')).toContainText('s');
  const inLabel = (await timeline.locator('[data-testid="timeline-seg-in"]').textContent())!;
  const inDuration = inLabel.match(/([\d.]+)s/)![1];
  await expect(page.getByTestId('timeline-time')).toHaveText(`${inDuration}s`);
});

test('the playhead follows Play and the phase follows Stop', async ({ page }) => {
  await createHairline(page);
  const time = page.getByTestId('timeline-time');
  const parked = (await time.textContent())!;

  // Play restarts the entrance from 0 — the readout leaves its parked end-of-In value.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => (await time.textContent()) !== parked, { timeout: 2000, intervals: [25, 50, 100] })
    .toBe(true);
  // …and settles back at the end when the entrance finishes.
  await expect(time).toHaveText(parked, { timeout: 5000 });

  // Stop switches the strip to the Out phase automatically (the playhead follows the run).
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect(page.locator('[data-testid="timeline"] button.tab.active')).toContainText('Out');
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');
});

test('scrubbing pauses the preview mid-animation', async ({ page }) => {
  await createHairline(page);
  // Scrub the OUT phase to its end: the graphic leaves and HOLDS there (paused).
  await page.getByTestId('timeline-seg-out').click();
  const scrub = page.getByTestId('timeline-scrub');
  await scrub.focus();
  for (let i = 0; i < 80; i++) await page.keyboard.press('ArrowRight'); // well past the 0.60s out
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');
  await page.waitForTimeout(400); // paused means paused
  await expect(frame(page).locator('.lower-third').first()).toHaveCSS('opacity', '0');
  // Play reclaims the playhead and brings the graphic back.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('T2: stretching a bar rewrites the duration literal in the marked region', async ({ page }) => {
  await createHairline(page); // line-reveal: bar 1 = .lower-third-accent, duration 0.45 / animSpeed
  const inTab = page.getByTestId('timeline-seg-in');
  await expect(inTab).toContainText('In 0.95s');

  // Drag the accent bar's right-edge handle to the right — the entrance gets longer.
  const handle = page.getByTestId('timeline-handle-1');
  const box = (await handle.boundingBox())!;
  const lane = (await page.locator('.timeline-lane').first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + lane.width * 0.4, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();

  // The code changed (one undoable patch): the phase re-parses longer than before…
  await expect(inTab).not.toContainText('In 0.95s');
  // …and the emitted literal is a readable `N / animSpeed` duration on the accent tween.
  await page.waitForTimeout(650); // rebuild carries the new region into the preview
  const js = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');
  const accentDuration = js.match(/lower-third-accent[\s\S]*?duration:\s*([\d.]+)\s*\/\s*animSpeed/)?.[1];
  expect(Number(accentDuration)).toBeGreaterThan(0.45);

  // Undo restores the original timing.
  await page.keyboard.press('Control+z');
  await expect(inTab).toContainText('In 0.95s');
});

test('T2: moving a bar writes an explicit start position', async ({ page }) => {
  await createHairline(page); // line-reveal: bar 2 = the staggered lines, starts at 0.30
  // Drag the lines bar to the right (later start).
  const bar = page.getByTestId('timeline-bar-2');
  const before = (await bar.boundingBox())!;
  const lane = (await page.locator('.timeline-lane').nth(2).boundingBox())!;
  await page.mouse.move(before.x + 10, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + 10 + lane.width * 0.25, before.y + before.height / 2, { steps: 6 });
  await page.mouse.up();

  await page.waitForTimeout(650);
  const js = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');
  // The '-=0.15' overlap became an absolute `N / animSpeed` position on the lines tween.
  const linesCall = js.match(/tl\.fromTo\(\['#f0', '#f1'\][\s\S]*?\);/)?.[0] ?? '';
  expect(linesCall).not.toContain("'-=");
  expect(linesCall).toMatch(/,\s*[\d.]+ \/ animSpeed/);
  // And the graphic still plays to a settled visible state with the new choreography.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('T2.5: the ease picker writes and clears a per-tween ease literal', async ({ page }) => {
  await createHairline(page); // line-reveal: tween 1 = the accent draw (inherits easeIn)
  const templateJs = async () =>
    page
      .frameLocator('iframe.preview-frame')
      .locator('body')
      .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');

  // Pick Back for the accent tween — its call gains an explicit quoted ease.
  const ease = page.getByTestId('timeline-ease-1');
  await expect(ease).toHaveValue('auto');
  await ease.selectOption('back.out(1.6)');
  await page.waitForTimeout(650);
  const withEase = (await templateJs()).match(/tl\.fromTo\('\.lower-third-accent'[\s\S]*?\);/)?.[0] ?? '';
  expect(withEase).toContain("ease: 'back.out(1.6)'");
  await expect(page.getByTestId('timeline-ease-1')).toHaveValue('back.out(1.6)');

  // Back to auto — the override is removed and the knob rules again.
  await page.getByTestId('timeline-ease-1').selectOption('auto');
  await page.waitForTimeout(650);
  const cleared = (await templateJs()).match(/tl\.fromTo\('\.lower-third-accent'[\s\S]*?\);/)?.[0] ?? '';
  expect(cleared).not.toContain("ease: 'back.out(1.6)'");
});

test('T3: Continue steps appear as segments — live playhead + editable per-step timing/ease', async ({ page }) => {
  // Create Soft Stack (three lines) with steps mode on.
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Soft Stack' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click(); // Fields
  await page.getByRole('button', { name: 'Next ›' }).click(); // Style
  await page.getByRole('button', { name: 'Next ›' }).click(); // Animation
  await page.locator('.wz-step input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);

  // The playout chain: ▶ In · » 2 · » 3 · ■ Out.
  await expect(page.getByTestId('timeline-seg-step-2')).toBeVisible();
  await expect(page.getByTestId('timeline-seg-step-3')).toBeVisible();

  // Play, then Continue — the playhead follows into the step segment.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await page.waitForTimeout(1100); // let the entrance finish
  await page.getByRole('button', { name: '» Next' }).click();
  await expect(page.locator('[data-testid="timeline"] button.tab.active')).toContainText('2');

  const templateJs = async () =>
    page
      .frameLocator('iframe.preview-frame')
      .locator('body')
      .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');

  // T3.2: stretch the step's reveal bar — the stepDurations literal grows.
  await page.getByTestId('timeline-seg-step-2').click();
  const handle = page.getByTestId('timeline-handle-0');
  const hb = (await handle.boundingBox())!;
  const lane = (await page.locator('.timeline-lane').first().boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + lane.width * 0.5, hb.y + hb.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  const durations = (await templateJs()).match(/var stepDurations = \[([^\]]*)\]/)?.[1] ?? '';
  expect(Number(durations.split(',')[0])).toBeGreaterThan(0.45);

  // …and a per-step ease pick writes into stepEases.
  await page.getByTestId('timeline-seg-step-2').click();
  await page.getByTestId('timeline-ease-0').selectOption('back.out(1.6)');
  await page.waitForTimeout(650);
  expect(await templateJs()).toMatch(/var stepEases = \['back\.out\(1\.6\)'/);
});

test('T3.3: dragging a line onto another step regroups the Continue chain (and back out)', async ({ page }) => {
  // Soft Stack with steps: reveal groups start as [['#f1'], ['#f2']].
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Soft Stack' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.locator('.wz-step input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);

  const templateJs = async () =>
    page
      .frameLocator('iframe.preview-frame')
      .locator('body')
      .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');
  expect(await templateJs()).toContain("var stepGroups = [['#f1'], ['#f2']];");

  // MERGE: open »3 and drag its line's bar onto the »2 tab — one press reveals both lines.
  await page.getByTestId('timeline-seg-step-3').click();
  const bar = page.getByTestId('timeline-bar-0');
  const bb = (await bar.boundingBox())!;
  const tab2 = (await page.getByTestId('timeline-seg-step-2').boundingBox())!;
  await page.mouse.move(bb.x + 20, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(tab2.x + tab2.width / 2, tab2.y + tab2.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  expect(await templateJs()).toContain("var stepGroups = [['#f1', '#f2']];");
  // The emptied step is gone, and its timing knobs were spliced with it.
  await expect(page.getByTestId('timeline-seg-step-3')).toHaveCount(0);
  expect((await templateJs()).match(/var stepDurations = \[([^\]]*)\]/)![1].split(',')).toHaveLength(1);

  // One Continue now reveals BOTH lines.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await page.waitForTimeout(1100);
  const f2Before = await frame(page).locator('#f2').evaluate((el) => getComputedStyle(el).transform);
  await page.getByRole('button', { name: '» Next' }).click();
  await expect
    .poll(async () => frame(page).locator('#f2').evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(f2Before);

  // SPLIT: drag #f2 out to the »+ target — the chain grows back to two steps.
  await page.getByTestId('timeline-seg-step-2').click();
  const row2 = page.getByTestId('timeline-bar-1'); // second row of the group = #f2
  const rb = (await row2.boundingBox())!;
  await page.mouse.move(rb.x + 20, rb.y + rb.height / 2);
  await page.mouse.down();
  await page.mouse.move(rb.x + 40, rb.y - 10, { steps: 2 }); // start the drag → »+ appears
  const plus = (await page.getByTestId('timeline-seg-new').boundingBox())!;
  await page.mouse.move(plus.x + plus.width / 2, plus.y + plus.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  expect(await templateJs()).toContain("var stepGroups = [['#f1'], ['#f2']];");
  await expect(page.getByTestId('timeline-seg-step-3')).toBeVisible();
});

test('the appears-on menu regroups the Continue chain without dragging', async ({ page }) => {
  // Soft Stack with steps: groups start as [['#f1'], ['#f2']].
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Soft Stack' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.locator('.wz-step input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);

  const templateJs = async () =>
    page
      .frameLocator('iframe.preview-frame')
      .locator('body')
      .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');

  // MERGE: on »3, the line's menu says which press it plays on — pick the 1st.
  await page.getByTestId('timeline-seg-step-3').click();
  await page.getByTestId('timeline-appears-0').selectOption('0');
  await page.waitForTimeout(650);
  expect(await templateJs()).toContain("var stepGroups = [['#f1', '#f2']];");
  await expect(page.getByTestId('timeline-seg-step-3')).toHaveCount(0);

  // SPLIT: open »2 (the auto-replay reclaimed the selection) — the group lists both
  // lines now; give the second one its own new » Next press.
  await page.getByTestId('timeline-seg-step-2').click();
  await page.getByTestId('timeline-appears-1').selectOption('1');
  await page.waitForTimeout(650);
  expect(await templateJs()).toContain("var stepGroups = [['#f1'], ['#f2']];");
  await expect(page.getByTestId('timeline-seg-step-3')).toBeVisible();
});

test('the »+ Step button turns steps on, then splits a group into another step', async ({ page }) => {
  await createHairline(page); // two lines, created WITHOUT steps
  const templateJs = async () =>
    page
      .frameLocator('iframe.preview-frame')
      .locator('body')
      .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');

  // No steps yet — but the strip offers »+ Step (the affordance the Motion checkbox hides).
  expect(await templateJs()).not.toContain('function revealNextStep');
  const addStep = page.getByTestId('timeline-seg-new');
  await expect(addStep).toBeVisible();

  // Click 1: step reveal turns ON — same patch as the Motion panel's checkbox.
  await addStep.click();
  await expect(page.getByTestId('timeline-seg-step-2')).toBeVisible();
  await page.waitForTimeout(650);
  const js = await templateJs();
  expect(js).toContain("var stepGroups = [['#f1']];");
  // The SPX steps setting follows, so the operator gets the Continue button.
  const html = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => document.documentElement.outerHTML);
  expect(html).toContain('"steps": "2"');

  // With every line already in its own step (and none multi-line), »+ Step stays visible
  // but disabled — its tooltip explains why instead of the affordance vanishing.
  await expect(addStep).toBeDisabled();
  await expect(addStep).toHaveAttribute('title', /Every line already has its own/);

  // Two-line template: nothing left to split — undo removes the steps and »+ re-enables.
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('timeline-seg-step-2')).toHaveCount(0);
  await expect(page.getByTestId('timeline-seg-new')).toBeEnabled();
});

test('the »+ Step button splits the last multi-line reveal into its own step', async ({ page }) => {
  // Soft Stack with steps ON: groups start as [['#f1'], ['#f2']] — all single-line.
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Soft Stack' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.locator('.wz-step input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);

  const templateJs = async () =>
    page
      .frameLocator('iframe.preview-frame')
      .locator('body')
      .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');

  // All groups single-line → nothing to split → »+ Step is offered but disabled.
  await expect(page.getByTestId('timeline-seg-new')).toBeDisabled();

  // Merge »3 into »2 by dragging (T3.3) — now one multi-line group exists.
  await page.getByTestId('timeline-seg-step-3').click();
  const bar = page.getByTestId('timeline-bar-0');
  const bb = (await bar.boundingBox())!;
  const tab2 = (await page.getByTestId('timeline-seg-step-2').boundingBox())!;
  await page.mouse.move(bb.x + 20, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(tab2.x + tab2.width / 2, tab2.y + tab2.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  expect(await templateJs()).toContain("var stepGroups = [['#f1', '#f2']];");

  // »+ Step re-enables; a CLICK splits the group's last line into a new Continue step.
  const addStep = page.getByTestId('timeline-seg-new');
  await expect(addStep).toBeEnabled();
  await addStep.click();
  await page.waitForTimeout(650);
  expect(await templateJs()).toContain("var stepGroups = [['#f1'], ['#f2']];");
  await expect(page.getByTestId('timeline-seg-step-3')).toBeVisible();
});

test('the On air card names the hold and pauses the preview at the settled state', async ({ page }) => {
  await createHairline(page);
  const hold = page.getByTestId('timeline-seg-hold');
  await expect(hold).toContainText('On air');
  await expect(hold).toContainText('until ■ Stop'); // manual out — the default
  await hold.click();
  await expect(hold).toHaveClass(/active/);
  // The tracks area explains the hold instead of charting tween rows.
  await expect(page.getByTestId('timeline-hold-note')).toContainText('holds here');
  // The preview shows the settled on-air look (the end of the entrance).
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  // A real run reclaims the strip from the hold selection.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(hold).not.toHaveClass(/active/, { timeout: 3000 });
});

test('a hand-edited region the parser cannot read gets an honest note, not a vanished strip', async ({ page }) => {
  await createHairline(page);
  await expect(page.getByTestId('timeline').locator('.timeline-tracks')).toBeVisible();
  // Mangle the marked region beyond the parser's shapes (rename the build functions).
  await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const s = useTemplateStore.getState();
    s.setJs(s.template.js.replace(/buildInTimeline/g, 'buildEntrance'));
  });
  await expect(page.getByTestId('timeline-unreadable')).toContainText('hand-crafted');
  await expect(page.getByTestId('timeline').locator('.timeline-tracks')).toHaveCount(0);
});

test('timeline strip collapses to a slim bar and remembers it', async ({ page }) => {
  await createHairline(page);
  const timeline = page.getByTestId('timeline');
  await expect(timeline.locator('.timeline-tracks')).toBeVisible();
  await timeline.locator('.timeline-collapse').click();
  await expect(timeline.locator('.timeline-tracks')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('timeline').locator('.timeline-tracks')).toHaveCount(0);
});
