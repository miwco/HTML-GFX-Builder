import { test, expect, type Page } from '@playwright/test';

// Timeline v2 Phase 3 — the read-first step timeline behind the dock toggle: step clips
// with cue markers on a time ruler, a click/drag playhead that scrubs the real preview
// without creating history, layer rows with aggregate keyframe diamonds, zoom.

async function createHairline(page: Page, steps = false) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  if (steps) {
    await page.getByRole('button', { name: 'Next ›' }).click();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await page.locator('.wz-step input[type="checkbox"]').check();
  }
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await page.waitForTimeout(650);
  await page.getByTestId('timeline-v2-toggle').click(); // opt in (read view)
  await expect(page.getByTestId('timeline-v2')).toBeVisible();
}

test('v2: step clips on a ruler with cue markers — steps are the clips', async ({ page }) => {
  await createHairline(page, true); // Hairline + step reveal: Enter · Step 2 · Out
  await expect(page.getByTestId('tlv2-clip-0')).toContainText('▶');
  await expect(page.getByTestId('tlv2-clip-0')).toContainText('Enter');
  await expect(page.getByTestId('tlv2-clip-1')).toContainText('»');
  await expect(page.getByTestId('tlv2-clip-1')).toContainText('Step 2');
  await expect(page.getByTestId('tlv2-clip-2')).toContainText('■');
  await expect(page.getByTestId('tlv2-clip-2')).toContainText('Out');
  // The hold break sits between the last content step and Out.
  const hold = (await page.getByTestId('tlv2-hold').boundingBox())!;
  const step2 = (await page.getByTestId('tlv2-clip-1').boundingBox())!;
  const out = (await page.getByTestId('tlv2-clip-2').boundingBox())!;
  expect(hold.x).toBeGreaterThanOrEqual(step2.x + step2.width - 2);
  expect(out.x).toBeGreaterThanOrEqual(hold.x + hold.width - 2);
  // Layer rows carry aggregate keyframe diamonds (the Name line animates in Enter).
  expect(await page.getByTestId('tlv2-kf-f0').count()).toBeGreaterThanOrEqual(2);
});

test('v2: clicking the timeline moves the playhead and scrubs the preview — no history', async ({ page }) => {
  await createHairline(page);
  const frame = page.frameLocator('iframe.preview-frame');
  const historyLen = () =>
    page.evaluate(async () => {
      const { useTemplateStore } = await import('/src/store/templateStore.ts');
      return useTemplateStore.getState().history.length;
    });
  const before = await historyLen();
  // Click at the very start of the entrance clip: the graphic parks near its FROM state.
  const clip = (await page.getByTestId('tlv2-clip-0').boundingBox())!;
  await page.mouse.click(clip.x + 2, clip.y + 40); // inside the rows area under the clip
  await expect
    .poll(async () => frame.locator('#f0').evaluate((el) => getComputedStyle(el).transform))
    .not.toBe('none'); // the mask offset (yPercent 110) is applied — mid-scrub truth
  // …and the playhead followed the click.
  const head = (await page.getByTestId('tlv2-playhead').boundingBox())!;
  expect(Math.abs(head.x - (clip.x + 2))).toBeLessThan(6);
  // Scrubbing and playhead moves never write history.
  expect(await historyLen()).toBe(before);
  await expect(page.getByTestId('tlv2-time')).toContainText('s');
});

test('v2: zoom scales the clips; row labels drive the shared selection', async ({ page }) => {
  await createHairline(page);
  const width = async () => (await page.getByTestId('tlv2-canvas').boundingBox())!.width;
  const before = await width();
  await page.getByTestId('tlv2-zoom-in').click();
  await page.getByTestId('tlv2-zoom-in').click();
  expect(await width()).toBeGreaterThan(before * 1.4);
  // The label column is the same shared-selection handle as the classic strip.
  await page.locator('.tlv2-labels .timeline-label[data-part="#f0"]').click();
  await expect(page.locator('.tlv2-labels .timeline-label[data-part="#f0"]')).toHaveClass(/selected/);
  const selected = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().selectedPart;
  });
  expect(selected).toBe('#f0');
});

test('v2: the dock toggle swaps surfaces and persists; classic remains the default', async ({ page }) => {
  await createHairline(page); // helper already toggled INTO v2
  await expect(page.getByTestId('timeline-v2')).toBeVisible();
  await expect(page.getByTestId('timeline')).toHaveCount(0);
  await page.getByTestId('timeline-v2-toggle').click(); // back to classic
  await expect(page.getByTestId('timeline')).toBeVisible();
  await expect(page.getByTestId('timeline-v2')).toHaveCount(0);
});
