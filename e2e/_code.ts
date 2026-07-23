import { expect, type Page } from '@playwright/test';

/**
 * Open the code pane and wait for Monaco to mount.
 *
 * The workspace ships with the code panel CLOSED (model/layout.ts DEFAULT_LAYOUT): most people
 * who open this app are here to make a graphic by choosing, not by reading HTML, and the view
 * is optional even though the code never is. A spec whose SUBJECT is the code editor - comment
 * visibility, editor shortcuts, the code a canvas gesture writes - therefore has to ask for it,
 * the same way its user would.
 *
 * Say it explicitly rather than leaning on a default: the pane's presence is a precondition of
 * those specs, and a precondition that lives in a global default is one nobody notices until it
 * changes. Idempotent, so it is safe to call after a spec has already opened the pane itself.
 */
export async function showCode(page: Page): Promise<void> {
  const toggle = page.getByTestId('toggle-code');
  await expect(toggle).toBeVisible();
  if ((await toggle.innerText()).includes('Show code')) await toggle.click();
  await expect(page.getByTestId('dock-tab-code')).toBeVisible();
  await expect(page.locator('.editor-host .monaco-editor').first()).toBeVisible();
}
