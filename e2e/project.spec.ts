import { test, expect } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';
import { showCode } from './_code';

// Era 5.2b: the working graphic autosaves locally and survives a reload. Startup follows from
// it: only a first-ever visit (no autosaved project) opens the wizard; a returning user lands
// straight back in the restored graphic, and "+ New project" / #/new open the wizard on demand.

test('project autosave: the working graphic survives a reload', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: 'Lower thirds' }).click();
  await page.locator('.wz-variant', { hasText: 'Hairline' }).click();
  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
  });

  // A distinctive edit into the code (the pane ships closed — open it as a user would).
  await showCode(page);
  await page.locator('.editor-host .monaco-editor').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('<!-- autosave-marker-42 -->');
  await page.waitForTimeout(1200); // let the 800ms autosave debounce fire

  // It persisted to localStorage.
  const saved = await page.evaluate(() => localStorage.getItem('spx-gfx-project'));
  expect(saved).toContain('autosave-marker-42');

  // Reload → the working template is restored, and the user lands STRAIGHT in it: no wizard
  // over a returning user's work (the wizard auto-opens only when there is no project).
  await page.reload();
  await awaitPreviewRebuild(page);
  await expect(page.locator('.wz-modal')).toBeHidden();
  const restored = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.html;
  });
  expect(restored).toContain('autosave-marker-42');

  // The wizard stays one step away: the routed #/new opens it, and leaving the route (the
  // in-app ✕) rewinds cleanly back to the editor.
  await page.goto('/app#/new');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('.gallery-close').click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await expect(page).toHaveURL(/\/app$/);
});
