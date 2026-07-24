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
  // Monaco is LAZY (React.lazy + a dynamic import): opening the pane starts a chunk fetch that
  // the dev server transforms on demand, so the wait here is a module load, not a render. The
  // default expect budget is tuned for renders and has no business bounding a download — under
  // worker contention this helper was the suite's most reliable false red. Same reasoning, and
  // the same number, as awaitPreviewRebuild's REBUILT budget: a mount that never happens is
  // still caught, just by the test timeout instead of by a tighter one that lies.
  await expect(page.locator('.editor-host .monaco-editor').first()).toBeVisible({ timeout: 20_000 });
}
