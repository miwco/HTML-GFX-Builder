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
  // The selected ▶ In card's inspector speaks the vocabulary: line-reveal's tuned
  // entrance ease (expo.out) shows as Expo; the header speed knob reads Normal.
  await expect(timeline.getByTestId('timeline-phase-ease')).toHaveValue('expo');
  await expect(timeline.getByTestId('timeline-speed')).toHaveValue('1');
  // The overview: one strip, part rows spanning every section (set-only rows dropped).
  const labels = timeline.locator('.timeline-ov-labels .timeline-label');
  await expect(labels).toHaveCount(3);
  await expect(labels.nth(0)).toContainText('Accent line'); // (labels carry the ▸ drawer arrow)
  await expect(labels.nth(1)).toContainText('Name');
  await expect(labels.nth(2)).toContainText('Title');
  // The section chain reads the playout story: In · hold · Out (no steps yet).
  await expect(timeline.getByTestId('timeline-ov-sec-in')).toContainText('In');
  await expect(timeline.getByTestId('timeline-ov-sec-hold')).toContainText('hold');
  await expect(timeline.getByTestId('timeline-ov-sec-out')).toContainText('Out');
  // Bars say what they do (line-reveal: the accent draws, the lines slide) — and both the
  // entrance AND the exit are visible at once, no segment switching.
  await expect(timeline.getByTestId('timeline-bar-in-1').locator('.timeline-bar-verb')).toHaveText('draw');
  await expect(timeline.getByTestId('timeline-bar-in-2').locator('.timeline-bar-verb')).toHaveText('slide');
  await expect(timeline.getByTestId('timeline-bar-out-0')).toBeVisible();
  // The gesture hint makes retime/stretch/ease discoverable without hovering.
  await expect(timeline.getByTestId('timeline-hint')).toContainText('drag a bar to retime');
  // Both phases offered, with real durations; idle playhead parks at the END of In.
  await expect(timeline.locator('[data-testid="timeline-seg-in"]')).toContainText('s');
  await expect(timeline.locator('[data-testid="timeline-seg-out"]')).toContainText('s');
  const inLabel = (await timeline.locator('[data-testid="timeline-seg-in"]').textContent())!;
  const inDuration = inLabel.match(/([\d.]+)s/)![1];
  await expect(page.getByTestId('timeline-time')).toHaveText(`${inDuration}s`);
});

test('the overview zooms and scrolls without losing the story', async ({ page }) => {
  await createHairline(page);
  const canvas = page.locator('.timeline-ov-canvas');
  const before = (await canvas.boundingBox())!.width;
  await page.getByTestId('timeline-zoom-in').click();
  await page.getByTestId('timeline-zoom-in').click();
  const after = (await canvas.boundingBox())!.width;
  expect(after).toBeGreaterThan(before * 1.3); // sections scale with the zoom…
  // …while the hold stays a fixed break (it waits for a cue, it has no clock).
  const hold = await page.getByTestId('timeline-ov-sec-hold').boundingBox();
  expect(hold!.width).toBeLessThan(80);
  // Clicking a section header selects that moment (same as its card).
  await page.getByTestId('timeline-ov-sec-out').click();
  await expect(page.getByTestId('timeline-seg-out')).toHaveClass(/active/);
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
  const handle = page.getByTestId('timeline-handle-in-1');
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
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

test('T2/T5.1: dragging ONE layer of a joint tween splits it and retimes only that layer', async ({ page }) => {
  await createHairline(page); // line-reveal: Name+Title share one staggered tween at 0.30
  // Drag TITLE's bar (the joint tween's second member) to the right.
  const bar = page.getByTestId('timeline-bar-in-2-m1');
  const before = (await bar.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 100, before.y + before.height / 2, { steps: 6 });
  await page.mouse.up();

  await page.waitForTimeout(650);
  const js = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');
  // The joint ENTRANCE call became per-layer calls with explicit positions (the exit's
  // joint tween is deliberately untouched — only the dragged phase splits)…
  expect(js).not.toContain("tl.fromTo(['#f0', '#f1']");
  const nameCall = js.match(/tl\.fromTo\('#f0'[\s\S]*?\);/)?.[0] ?? '';
  const titleCall = js.match(/tl\.fromTo\('#f1'[\s\S]*?\);/)?.[0] ?? '';
  expect(nameCall).toMatch(/,\s*0\.3 \/ animSpeed/); // Name kept its exact old start
  const titleStart = Number(titleCall.match(/,\s*([\d.]+) \/ animSpeed/)?.[1] ?? 0);
  expect(titleStart).toBeGreaterThan(0.5); // …and only Title moved (0.40 + ~drag)
  // The stagger is gone (each layer owns its start) and nothing staggers jointly anymore.
  expect(nameCall).not.toContain('stagger');
  // The graphic still plays to a settled visible state with the new choreography.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('T5.2: a bar resizes from its start edge — the end stays pinned', async ({ page }) => {
  await createHairline(page); // the accent draws 0.00–0.45s
  const handle = page.getByTestId('timeline-handle-left-in-1');
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + 60, hb.y + hb.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  const js = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');
  const accent = js.match(/tl\.fromTo\('\.lower-third-accent'[\s\S]*?\);/)?.[0] ?? '';
  const start = Number(accent.match(/,\s*([\d.]+) \/ animSpeed/)?.[1] ?? -1);
  const duration = Number(accent.match(/duration:\s*([\d.]+)\s*\/\s*animSpeed/)?.[1] ?? -1);
  expect(start).toBeGreaterThan(0); // the start moved right…
  expect(duration).toBeLessThan(0.45); // …the duration compensated…
  expect(Math.round((start + duration) * 100) / 100).toBe(0.45); // …and the END stayed pinned.
});

test('T5.3: dragging an entrance bar onto a » press reveals that layer there instead', async ({ page }) => {
  await createHairline(page);
  await page.getByTestId('timeline-seg-new').click(); // steps on: Title → press 1
  await page.waitForTimeout(650);
  const templateJs = async () =>
    page
      .frameLocator('iframe.preview-frame')
      .locator('body')
      .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');

  // Drag the ACCENT's entrance bar onto the » 1 card — it should join that press, not
  // retime the entrance.
  const bar = page.getByTestId('timeline-bar-in-1');
  await bar.scrollIntoViewIfNeeded();
  const bb = (await bar.boundingBox())!;
  const card = (await page.getByTestId('timeline-seg-step-2').boundingBox())!;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  let js = await templateJs();
  expect(js).toContain("var stepGroups = [['#f1', '.lower-third-accent']];");
  expect(js).toContain("'.lower-third-accent': 'rise'");

  // And drag its reveal bar back onto the entrance card — appears with ▶ Play again.
  const reveal = page.getByTestId('timeline-bar-step-2-r1');
  await reveal.scrollIntoViewIfNeeded();
  const rb = (await reveal.boundingBox())!;
  const inCard = (await page.getByTestId('timeline-seg-in').boundingBox())!;
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
  await page.mouse.down();
  await page.mouse.move(inCard.x + inCard.width / 2, inCard.y + inCard.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(650);
  js = await templateJs();
  expect(js).toContain("var stepGroups = [['#f1']];");
  expect(js).toMatch(/tl\.fromTo\('\.lower-third-accent'/); // drawn by the entrance again
});

test('T5.4: the layer drawer writes an enters-from transform as clean fromTo literals', async ({ page }) => {
  await createHairline(page);
  // Expand the Name row's basic animation controls.
  await page.getByTestId('timeline-expand-f0').click();
  const x = page.getByTestId('timeline-from-x');
  await expect(x).toHaveValue('0');
  await x.fill('-40');
  await x.press('Enter');
  await page.waitForTimeout(650);
  const js = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');
  // Name got its OWN tween (split from the joint lines tween) with the from/to pair.
  const nameCall = js.match(/tl\.fromTo\('#f0'[\s\S]*?\);/)?.[0] ?? '';
  expect(nameCall).toContain('x: -40');
  expect(nameCall).toMatch(/\bx: 0\b/); // settles at the design position
  const titleCall = js.match(/tl\.fromTo\('#f1'[\s\S]*?\);/)?.[0] ?? '';
  expect(titleCall).not.toContain('x: -40'); // the sibling layer is untouched
  // The drawer reads the value back from the code.
  await expect(page.getByTestId('timeline-from-x')).toHaveValue('-40');
  // Setting it back to 0 removes the pair again — minimal code.
  await page.getByTestId('timeline-from-x').fill('0');
  await page.getByTestId('timeline-from-x').press('Enter');
  await page.waitForTimeout(650);
  const cleaned = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');
  expect(cleaned.match(/tl\.fromTo\('#f0'[\s\S]*?\);/)?.[0] ?? '').not.toContain('x: -40');
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
  await expect(page.locator('[data-testid="timeline"] button.tab.active')).toContainText('» 1');

  const templateJs = async () =>
    page
      .frameLocator('iframe.preview-frame')
      .locator('body')
      .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');

  // T3.2: stretch the step's reveal bar — the stepDurations literal grows.
  await page.getByTestId('timeline-seg-step-2').click();
  const handle = page.getByTestId('timeline-handle-step-2-r0');
  await handle.scrollIntoViewIfNeeded();
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2 + 120, hb.y + hb.height / 2, { steps: 6 });
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

  // MERGE: drag »3's reveal bar onto the »2 card — one press reveals both lines. (No
  // segment switching needed — the overview shows every press at once.)
  const bar = page.getByTestId('timeline-bar-step-3-r0');
  await bar.scrollIntoViewIfNeeded(); // narrow panes scroll the overview horizontally
  const bb = (await bar.boundingBox())!;
  const tab2 = (await page.getByTestId('timeline-seg-step-2').boundingBox())!;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
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

  // SPLIT: drag #f2's reveal bar out to the »+ target — the chain grows back to two steps.
  const row2 = page.getByTestId('timeline-bar-step-2-r1'); // the group's second part = #f2
  await row2.scrollIntoViewIfNeeded();
  const rb = (await row2.boundingBox())!;
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
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
  const definitionSteps = async () =>
    (
      await page
        .frameLocator('iframe.preview-frame')
        .locator('body')
        .evaluate(() => document.documentElement.outerHTML)
    ).match(/"steps": "(\d+)"/)?.[1];

  expect(await definitionSteps()).toBe('3'); // Play + two presses

  // MERGE: on »3, the line's menu says which press it plays on — pick press 1.
  await page.getByTestId('timeline-seg-step-3').click();
  await expect(page.getByTestId('timeline-appears-0')).toContainText('appears on press'); // self-labeling
  await page.getByTestId('timeline-appears-0').selectOption('0');
  await page.waitForTimeout(650);
  expect(await templateJs()).toContain("var stepGroups = [['#f1', '#f2']];");
  await expect(page.getByTestId('timeline-seg-step-3')).toHaveCount(0);
  // The SPX definition follows the shorter chain — no dead Continue press on air.
  expect(await definitionSteps()).toBe('2');

  // SPLIT: open »2 (the auto-replay reclaimed the selection) — the group lists both
  // lines now; give the second one its own new » Next press.
  await page.getByTestId('timeline-seg-step-2').click();
  await page.getByTestId('timeline-appears-1').selectOption('1');
  await page.waitForTimeout(650);
  expect(await templateJs()).toContain("var stepGroups = [['#f1'], ['#f2']];");
  await expect(page.getByTestId('timeline-seg-step-3')).toBeVisible();
  expect(await definitionSteps()).toBe('3');
});

test('a Motion preset swap keeps the regrouped Continue chain and its tuning', async ({ page }) => {
  // Soft Stack with steps; merge »3 into »2 so the chain differs from the default emit.
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

  await page.getByTestId('timeline-seg-step-3').click();
  await page.getByTestId('timeline-appears-0').selectOption('0');
  await page.waitForTimeout(650);
  expect(await templateJs()).toContain("var stepGroups = [['#f1', '#f2']];");

  // Tune the merged press's ease so per-step tuning must survive the swap too.
  await page.getByTestId('timeline-seg-step-2').click();
  await page.getByTestId('timeline-ease-0').selectOption('back.out(1.6)');
  await page.waitForTimeout(650);
  expect(await templateJs()).toMatch(/var stepEases = \['back\.out\(1\.6\)'\]/);

  // Swap the entrance preset from the ▶ In card — the chain must NOT reset.
  await page.getByTestId('timeline-seg-in').click();
  await page.getByTestId('timeline-phase-preset').selectOption('pop-spring');
  await page.waitForTimeout(650);
  const js = await templateJs();
  expect(js).toContain('Pop spring');
  expect(js).toContain("var stepGroups = [['#f1', '#f2']];");
  expect(js).toMatch(/var stepEases = \['back\.out\(1\.6\)'\]/);
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

  // Click 1: step reveal turns ON — same patch as the Motion panel's checkbox — and the
  // strip announces that ▶ Play behaves differently now.
  await addStep.click();
  await expect(page.getByTestId('timeline-seg-step-2')).toBeVisible();
  await expect(page.getByTestId('timeline-notice')).toContainText('Play now shows only the first line');
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
  const bar = page.getByTestId('timeline-bar-step-3-r0');
  await bar.scrollIntoViewIfNeeded(); // narrow panes scroll the overview horizontally
  const bb = (await bar.boundingBox())!;
  const tab2 = (await page.getByTestId('timeline-seg-step-2').boundingBox())!;
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
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
  // A note under the overview explains the hold (the hold section itself has no clock).
  await expect(page.getByTestId('timeline-hold-note')).toContainText('holds here');
  // The preview shows the settled on-air look (the end of the entrance).
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  // A real run reclaims the strip from the hold selection.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect(hold).not.toHaveClass(/active/, { timeout: 3000 });
});

test('the On air card edits how the graphic leaves air, syncing the SPX definition', async ({ page }) => {
  await createHairline(page);
  const readOut = async () =>
    page.evaluate(async () => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      const t = useTemplateStore.getState().template;
      return { setting: t.settings.out, def: t.html.match(/"out": "([^"]+)"/)?.[1] ?? null };
    });
  expect(await readOut()).toEqual({ setting: 'manual', def: 'manual' });

  // Selecting ● On air surfaces the out-mode control in the hold note.
  await page.getByTestId('timeline-seg-hold').click();
  const mode = page.getByTestId('timeline-out-mode');
  await expect(mode).toHaveValue('manual');

  // stays — no out: the setting AND the serialized definition follow, so exports agree.
  await mode.selectOption('none');
  expect(await readOut()).toEqual({ setting: 'none', def: 'none' });
  await expect(page.getByTestId('timeline-seg-hold')).toContainText('stays');

  // Auto-out with an editable delay in milliseconds.
  await mode.selectOption('auto');
  expect(await readOut()).toEqual({ setting: '5000', def: '5000' });
  const ms = page.getByTestId('timeline-out-ms');
  await expect(ms).toHaveValue('5000');
  await ms.fill('3000');
  await ms.press('Enter');
  expect(await readOut()).toEqual({ setting: '3000', def: '3000' });
  await expect(page.getByTestId('timeline-seg-hold')).toContainText('auto-out 3s');

  // One undoable apply per edit, like every strip control.
  await page.keyboard.press('Control+z');
  expect((await readOut()).setting).toBe('5000');
});

/** Wait until the edit's auto-replay has run to completion — a replay CLAIMS the strip's
 *  selection when it starts, so a spec must let it pass before picking another card. */
async function replayDone(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const w = (document.querySelector('iframe.preview-frame') as HTMLIFrameElement)
            .contentWindow as { __activeTl?: { tl: { progress: () => number } } } | null;
          return w?.__activeTl ? w.__activeTl.tl.progress() : null;
        }),
      { timeout: 8000 },
    )
    .toBe(1);
}

test('the ■ Out card swaps just the exit — repeated phase mixing never strands a stale tag', async ({ page }) => {
  await createHairline(page);
  // First mix the entrance (Pop spring in, Line reveal out kept)…
  await page.getByTestId('timeline-phase-preset').selectOption('pop-spring');
  await replayDone(page); // the auto-replay reclaims the selection — let it pass
  // …then swap the exit from its own card.
  await page.getByTestId('timeline-seg-out').click();
  await expect(page.getByTestId('timeline-phase-preset')).toHaveValue('line-reveal');
  await page.getByTestId('timeline-phase-preset').selectOption('drop-in');
  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js).toContain('// In preset: Pop spring'); // the entrance survived
  // Exactly ONE out tag, and it names the new exit (the splitRegion head/tail fix).
  expect(js.match(/\/\/ Out preset: /g)).toHaveLength(1);
  expect(js).toContain('// Out preset: Drop in');
  expect(js).toContain("var easeIn = 'back.out(1.6)'"); // pop-spring's tuned entrance ease, kept
  expect(js).toContain("var easeOut = 'power2.in'"); // drop-in's designed exit ease
});

test('the In and Out cards carry the phase easing choice (phase-correct halves)', async ({ page }) => {
  await createHairline(page);
  // The ▶ In card writes the easeIn knob with the vocabulary's In-direction curve.
  await page.getByTestId('timeline-phase-ease').selectOption('back');
  const js1 = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js1).toContain("var easeIn = 'back.out(1.6)'"); // entrances settle (Out-direction curve)
  expect(js1).toContain("var easeOut = 'power3.in'"); // the exit knob untouched
  await replayDone(page); // the auto-replay reclaims the selection — let it pass
  // The ■ Out card writes the easeOut knob with the exit-correct half.
  await page.getByTestId('timeline-seg-out').click();
  await page.getByTestId('timeline-phase-ease').selectOption('expo');
  const js2 = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js2).toContain("var easeIn = 'back.out(1.6)'"); // still the In pick
  expect(js2).toContain("var easeOut = 'expo.in'"); // exits leave quickly (In-direction curve)
});

test('the strip header speed knob writes animSpeed and auto-replays', async ({ page }) => {
  await createHairline(page);
  const inDuration = async () =>
    Number((await page.getByTestId('timeline-seg-in').textContent())!.match(/([\d.]+)s/)![1]);
  const before = await inDuration();
  await expect(page.getByTestId('timeline-speed')).toHaveValue('1');
  await page.getByTestId('timeline-speed').selectOption('1.5');
  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js).toContain('var animSpeed = 1.5;');
  // The moment cards' REAL durations follow the knob (tween durations are X / animSpeed;
  // overlap positions stay literal, so the total shrinks without dividing exactly).
  expect(await inDuration()).toBeLessThan(before);
  // …and the auto-replay shows the faster motion without pressing Play.
  await expect
    .poll(async () => frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity), { timeout: 6000 })
    .toBe('1');
});

test('the Out card names the exit direction (Blur in → Blur out); the In card keeps entrance names', async ({ page }) => {
  await createHairline(page);
  const optionText = (id: string) =>
    page.locator(`[data-testid="timeline-phase-preset"] option[value="${id}"]`).first().textContent();
  // ▶ In card (selected by default): entrance names read as-is.
  await expect(page.getByTestId('timeline-seg-in')).toHaveClass(/active/);
  expect((await optionText('blur-in'))?.trim()).toBe('Blur in');
  expect((await optionText('drop-in'))?.trim()).toBe('Drop in');
  // ■ Out card: the same presets present their EXIT direction.
  await page.getByTestId('timeline-seg-out').click();
  expect((await optionText('blur-in'))?.trim()).toBe('Blur out');
  expect((await optionText('drop-in'))?.trim()).toBe('Drop out');
  // Direction-neutral names are unchanged (they read for both halves).
  expect((await optionText('mask-wipe'))?.trim()).toBe('Mask wipe');
});

test('an exit never leaks its end state into the next playback (blur out → clean replay)', async ({ page }) => {
  await createHairline(page); // In: Line reveal (no filter) — a cross-property mix with a Blur exit
  const boxFilter = () =>
    frame(page).locator('.lower-third-box').evaluate((el) => getComputedStyle(el).filter);
  // Give the exit a Blur — it leaves filter:blur on the box that the entrance never resets.
  await page.getByTestId('timeline-seg-out').click();
  await page.getByTestId('timeline-phase-preset').selectOption('blur-in');
  await replayDone(page);

  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect.poll(boxFilter, { timeout: 3000 }).toBe('none'); // entrance settles clear
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect.poll(boxFilter, { timeout: 3000 }).not.toBe('none'); // exit blurs the box
  // Replay: the graphic must start from the clean initial state, NOT the blurred exit state.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect.poll(boxFilter, { timeout: 3000 }).toBe('none');
});

test('auto-out (settings.out = N ms) leaves the graphic by itself in the preview', async ({ page }) => {
  await createHairline(page);
  const rootOpacity = () =>
    frame(page).locator('.lower-third').evaluate((el) => getComputedStyle(el).opacity);
  // Set a short auto-out on the ● On air card.
  await page.getByTestId('timeline-seg-hold').click();
  await page.getByTestId('timeline-out-mode').selectOption('auto');
  await page.getByTestId('timeline-out-ms').fill('400');
  await page.getByTestId('timeline-out-ms').press('Enter');
  await page.waitForTimeout(700); // definition-change rebuild

  await page.getByRole('button', { name: '▶ Play' }).click();
  // On air right after the entrance…
  await expect.poll(rootOpacity, { timeout: 2000 }).toBe('1');
  // …then it leaves by itself once the hold elapses (entrance ≈0.9s + 400ms hold + exit).
  await expect.poll(rootOpacity, { timeout: 4000 }).toBe('0');
});

test('the Out card grows a per-layer "leaves to" drawer that patches the exit and resets cleanly', async ({ page }) => {
  await createHairline(page);
  await page.getByTestId('timeline-seg-out').click();
  // Blur exit: it animates only the box, so a line has NO exit tween of its own — the
  // leaves-to drawer must INSERT one (the clean insert path). (Line reveal's exit already
  // moves the lines; that would be the split path — covered by the split-on-drag suite.)
  await page.getByTestId('timeline-phase-preset').selectOption('blur-in');
  await replayDone(page);
  await page.getByTestId('timeline-seg-out').click(); // the replay reclaimed the selection

  // The row arrow opens the leaves-to drawer (the exit-side twin of enters-from).
  await page.getByTestId('timeline-expand-f0').click();
  await expect(page.locator('.timeline-drawer-label')).toContainText('leaves to');
  await page.getByTestId('timeline-to-y').fill('-40');
  await page.getByTestId('timeline-to-y').press('Enter');
  await replayDone(page);

  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  // A real exit tween for #f0 now lives in buildOutTimeline (leaves toward y and fades).
  expect(js).toMatch(/function buildOutTimeline[\s\S]*tl\.to\('#f0', \{ y: -40, opacity: 0/);

  // The leave plays on Stop, and the replay starts from the clean resting state.
  const f0y = () =>
    frame(page).locator('#f0').evaluate((el) => getComputedStyle(el).transform);
  await page.getByRole('button', { name: '▶ Play' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect.poll(f0y, { timeout: 3000 }).toContain('-40'); // moved on the way out
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect.poll(f0y, { timeout: 3000 }).toBe('matrix(1, 0, 0, 1, 0, 0)'); // reset
});

test('dark color-scheme reaches the app root and the preview stays transparent', async ({ page }) => {
  await createHairline(page);
  // The app declares itself dark, so native select popups render dark-on-dark readable.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toContain('dark');
  // The composed preview declares the SAME scheme (Chromium disables iframe transparency
  // on a mismatch) and its body stays transparent so the stage shows through.
  await expect(frame(page).locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
  const bodyBg = await frame(page)
    .locator('body')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bodyBg).toBe('rgba(0, 0, 0, 0)');
  // Select options are painted EXPLICITLY — some Windows/Chromium builds ignore
  // color-scheme for the native popup and rendered light-grey text on white.
  const option = await page
    .locator('.timeline-ease option')
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, color: s.color };
    });
  expect(option.bg).toBe('rgb(20, 25, 34)'); // --bg-2
  expect(option.color).toBe('rgb(232, 237, 242)'); // --text
});

test('the strip can turn step reveal off (the step hint carries the action)', async ({ page }) => {
  // Soft Stack with steps on.
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

  // The action lives in the step segment's hint line.
  await page.getByTestId('timeline-seg-step-2').click();
  await page.getByTestId('timeline-steps-off').click();
  await page.waitForTimeout(650);

  const js = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');
  expect(js).not.toContain('function revealNextStep');
  // The SPX definition drops back to a single state; the step cards are gone.
  const html = await page
    .frameLocator('iframe.preview-frame')
    .locator('body')
    .evaluate(() => document.documentElement.outerHTML);
  expect(html).toContain('"steps": "1"');
  await expect(page.getByTestId('timeline-seg-step-2')).toHaveCount(0);
  await expect(page.getByTestId('timeline-seg-in')).toHaveClass(/active/);
});

test('corner bug: steps are not offered — the logo is not a text line', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Corner bug' }).click();
  await page.locator('.wz-variant', { hasText: 'Glass Mark' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
  // One text line + a logo slot: »+ Step is offered but disabled, with the reason.
  const addStep = page.getByTestId('timeline-seg-new');
  await expect(addStep).toBeDisabled();
  await expect(addStep).toHaveAttribute('title', /at least two text lines/);
});

test('any part can move onto a press: the accent joins the Continue chain and back', async ({ page }) => {
  await createHairline(page); // two lines + the accent, steps off
  const templateJs = async () =>
    page
      .frameLocator('iframe.preview-frame')
      .locator('body')
      .evaluate(() => document.getElementById('spx-template-js')?.textContent ?? '');
  const definitionSteps = async () =>
    (
      await page
        .frameLocator('iframe.preview-frame')
        .locator('body')
        .evaluate(() => document.documentElement.outerHTML)
    ).match(/"steps": "(\d+)"/)?.[1];
  const accentOpacity = () =>
    frame(page).locator('.lower-third-accent').evaluate((el) => getComputedStyle(el).opacity);

  // Turn steps on: Title takes press 1; the accent still enters with the graphic and is
  // listed under the step's rows as an assignable part.
  await page.getByTestId('timeline-seg-new').click();
  await page.waitForTimeout(650);
  await page.getByTestId('timeline-seg-step-2').click();
  const addMenu = page.getByTestId('timeline-appears-add-0');
  await expect(addMenu).toContainText('appears with ▶ Play');

  // Give the accent its own new press: the chain grows, the reveal map says 'rise', the
  // SPX definition follows, and the entrance no longer draws the accent in.
  await addMenu.selectOption('1');
  await page.waitForTimeout(650);
  let js = await templateJs();
  expect(js).toContain("var stepGroups = [['#f1'], ['.lower-third-accent']];");
  expect(js).toContain("'.lower-third-accent': 'rise'");
  expect(await definitionSteps()).toBe('3');

  // On air: Play parks the accent hidden; the 2nd » Next press reveals it.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await page.waitForTimeout(1200);
  expect(await accentOpacity()).toBe('0');
  await page.getByRole('button', { name: '» Next' }).click(); // press 1 — the Title
  await page.getByRole('button', { name: '» Next' }).click(); // press 2 — the accent
  await expect.poll(accentOpacity, { timeout: 3000 }).toBe('1');

  // Send it back to appearing with the graphic: the emptied press disappears, the reveal
  // map entry goes with it, and the entrance draws the accent again.
  await page.getByTestId('timeline-seg-step-3').click();
  await page.getByTestId('timeline-appears-0').selectOption('-1');
  await page.waitForTimeout(650);
  js = await templateJs();
  expect(js).toContain("var stepGroups = [['#f1']];");
  expect(js).not.toContain("'.lower-third-accent': 'rise'");
  expect(js).toMatch(/tl\.fromTo\('\.lower-third-accent'/); // back in the entrance
  expect(await definitionSteps()).toBe('2');
});

test('the part registry names the template structure — the shared identity contract', async ({ page }) => {
  await createHairline(page);
  const parts = await page.evaluate(async () => {
    const { getTemplateParts } = await import('/src/model/structure.ts');
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const t = useTemplateStore.getState().template;
    return getTemplateParts(t.html, t.fields) as {
      selector: string; kind: string; label: string; channel: string;
    }[];
  });
  const bySelector = Object.fromEntries(parts.map((p) => [p.selector, p]));
  expect(bySelector['.lower-third']).toMatchObject({ kind: 'root', label: 'Whole graphic' });
  expect(bySelector['.lower-third-box']).toMatchObject({ kind: 'panel', label: 'Panel' });
  expect(bySelector['.lower-third-accent']).toMatchObject({ kind: 'accent', label: 'Accent line' });
  // Lines carry the operator field's title and the mask reveal channel.
  expect(bySelector['#f0']).toMatchObject({ kind: 'line', channel: 'mask', label: 'Name' });
  expect(bySelector['#f1']).toMatchObject({ kind: 'line', channel: 'mask', label: 'Title' });
  expect(parts.filter((p) => p.kind === 'line')).toHaveLength(2);
  // Single-token selectors only — the emitted-code parsers cannot round-trip anything else.
  for (const p of parts) expect(p.selector).toMatch(/^[.#][\w-]+$/);
});

test('a hand-edited region the parser cannot read gets an honest note plus a preset fallback', async ({ page }) => {
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
  // With the Motion tab retired, this state keeps its one remaining duty here: starting
  // over from a preset re-emits the whole marked region and brings the timeline back.
  await page.getByTestId('timeline-preset-reset').selectOption('slide-fade');
  await expect(page.getByTestId('timeline').locator('.timeline-tracks')).toBeVisible();
  await expect(page.getByTestId('timeline-seg-in')).toBeVisible();
  const js = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
  expect(js).toContain('// Preset: Slide + fade');
  expect(js).toContain('function buildInTimeline');
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
