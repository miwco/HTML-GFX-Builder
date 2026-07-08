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
    .poll(async () => frame(page).locator('.l3').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
  await expect(frame(page).locator('#f0')).toHaveText('Alexandra Riva');
});

test('timeline strip lives under the preview and renders the preset structure', async ({ page }) => {
  await createHairline(page); // lt01 default preset: line-reveal (set + accent + lines)
  // Under the preview (inside .preview-wrap), NOT in the Motion tab.
  const timeline = page.locator('.preview-wrap [data-testid="timeline"]');
  await expect(timeline).toBeVisible();
  await expect(timeline).toContainText('expo.out'); // line-reveal's auto ease pair
  const rows = timeline.locator('.timeline-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('.l3');
  await expect(rows.nth(1)).toContainText('.l3-accent');
  await expect(rows.nth(2)).toContainText('#f0, #f1');
  // Both phases offered, with real durations; idle playhead parks at the END of In.
  await expect(timeline.locator('button.tab', { hasText: /^In/ })).toContainText('s');
  await expect(timeline.locator('button.tab', { hasText: /^Out/ })).toContainText('s');
  const inLabel = (await timeline.locator('button.tab', { hasText: /^In/ }).textContent())!;
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
    .poll(async () => frame(page).locator('.l3').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');
});

test('scrubbing pauses the preview mid-animation', async ({ page }) => {
  await createHairline(page);
  // Scrub the OUT phase to its end: the graphic leaves and HOLDS there (paused).
  await page.locator('[data-testid="timeline"] button.tab', { hasText: /^Out/ }).click();
  const scrub = page.getByTestId('timeline-scrub');
  await scrub.focus();
  for (let i = 0; i < 80; i++) await page.keyboard.press('ArrowRight'); // well past the 0.60s out
  await expect
    .poll(async () => frame(page).locator('.l3').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('0');
  await page.waitForTimeout(400); // paused means paused
  await expect(frame(page).locator('.l3').first()).toHaveCSS('opacity', '0');
  // Play reclaims the playhead and brings the graphic back.
  await page.getByRole('button', { name: '▶ Play' }).click();
  await expect
    .poll(async () => frame(page).locator('.l3').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
});

test('T2: stretching a bar rewrites the duration literal in the marked region', async ({ page }) => {
  await createHairline(page); // line-reveal: bar 1 = .l3-accent, duration 0.45 / animSpeed
  const inTab = page.locator('[data-testid="timeline"] button.tab', { hasText: /^In/ });
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
  const accentDuration = js.match(/l3-accent[\s\S]*?duration:\s*([\d.]+)\s*\/\s*animSpeed/)?.[1];
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
    .poll(async () => frame(page).locator('.l3').evaluate((el) => getComputedStyle(el).opacity))
    .toBe('1');
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
