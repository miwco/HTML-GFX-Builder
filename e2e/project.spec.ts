import { test, expect } from '@playwright/test';

// Era 5.2b: the working graphic autosaves locally and survives a reload. The wizard-first startup
// is unchanged — closing it reveals the restored graphic.

test('project autosave: the working graphic survives a reload', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForTimeout(650);

  // A distinctive edit into the code.
  await page.locator('.editor-host .monaco-editor').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('<!-- autosave-marker-42 -->');
  await page.waitForTimeout(1200); // let the 800ms autosave debounce fire

  // It persisted to localStorage.
  const saved = await page.evaluate(() => localStorage.getItem('spx-gfx-project'));
  expect(saved).toContain('autosave-marker-42');

  // Reload → the working template is restored; the wizard still opens on top (startup unchanged).
  await page.reload();
  await page.waitForTimeout(650);
  await expect(page.locator('.wz-modal')).toBeVisible();
  const restored = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.html;
  });
  expect(restored).toContain('autosave-marker-42');
});
