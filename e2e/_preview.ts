import { expect, type Page } from '@playwright/test';

// The deterministic replacement for `waitForTimeout(650)` after a template-changing action.
// PreviewFrame stamps `data-doc-rev` on the preview iframe once each debounced rebuild has
// LOADED, so waiting for the revision to advance waits exactly as long as the rebuild takes —
// no tuned sleep, no flakiness when a parallel run loads the CPU.

const FRAME = 'iframe.preview-frame';

/**
 * Wait for the debounced preview rebuild to finish loading. Two shapes:
 *
 * - `awaitPreviewRebuild(page, () => doTheChange())` — snapshots the revision BEFORE the
 *   action, so even an instant rebuild can't slip past the check. Prefer this form.
 * - `awaitPreviewRebuild(page)` — right after a change was made. Safe as long as it is called
 *   within the 350 ms debounce window of the change (i.e. immediately after the action, with
 *   no long awaits in between).
 */
export async function awaitPreviewRebuild(
  page: Page,
  action?: () => Promise<unknown>,
): Promise<void> {
  const frame = page.locator(FRAME);
  if (action) {
    // Settle any in-flight initial build first, so "the revision changed" can only mean
    // the ACTION's rebuild — never the initial document stamping late.
    await expect(frame).toHaveAttribute('data-doc-rev', /\d/);
    const before = await frame.getAttribute('data-doc-rev');
    await action();
    await expect(frame).not.toHaveAttribute('data-doc-rev', before!);
    return;
  }
  const before = await frame.getAttribute('data-doc-rev');
  if (before === null) {
    await expect(frame).toHaveAttribute('data-doc-rev', /\d/);
  } else {
    await expect(frame).not.toHaveAttribute('data-doc-rev', before);
  }
}
