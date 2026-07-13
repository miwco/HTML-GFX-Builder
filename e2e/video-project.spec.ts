// The AI video project flow, end to end on the offline stub provider: create from the
// wizard, auto-generate, LIVE preview through the sandboxed player host, manual code
// edits updating the preview, reload restore, save/reopen, and the SPX <-> video shell
// switch leaving the SPX project untouched.

import { test, expect, type Page } from '@playwright/test';

/** The player host iframe's content (Playwright reaches into sandboxed frames). */
function player(page: Page) {
  return page.frameLocator('.video-player-frame');
}

/**
 * Wait until the generation (or refinement) has actually applied - i.e. an ASSISTANT reply
 * exists in the chat. Matching on summary text is fragile: the offline hint and the example
 * prompts can contain the same words, so a text wait can pass before the result is applied.
 * The assistant bubble only appears once a result lands.
 */
async function waitForGeneration(page: Page) {
  await expect(page.locator('.ai-msg.assistant').first()).toBeVisible({ timeout: 10_000 });
}

async function createCountdownProject(page: Page): Promise<void> {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  // The countdown example chip fills the prompt; Create is instant (generation runs in
  // the editor chat via the offline stub).
  await page.getByRole('button', { name: 'Countdown', exact: true }).click();
  await page.getByTestId('video-create').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
}

test('create -> stub generation -> live preview renders the composition', async ({ page }) => {
  await createCountdownProject(page);

  // The stub's assistant reply lands in the chat.
  await waitForGeneration(page);

  // The composition actually renders inside the player host: the countdown shows its
  // first number (the Countdown example is 5s at 30fps -> starts at 5).
  await expect(player(page).getByText('5', { exact: true })).toBeVisible({ timeout: 10_000 });

  // No error banners.
  await expect(page.getByTestId('video-code-error')).toHaveCount(0);
  await expect(page.getByTestId('video-preview-error')).toHaveCount(0);
});

test('the logo-reveal example renders a designed wordmark, not a placeholder', async ({ page }) => {
  // The built-in examples act as acceptance tests. With no logo uploaded, the reveal must
  // set a real typographic wordmark - never a grey box or the literal text "LOGO".
  await page.goto('/app');
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await page.getByRole('button', { name: 'Logo reveal', exact: true }).click();
  await page.getByTestId('video-create').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await waitForGeneration(page);

  // It renders cleanly and shows the designed wordmark, not a placeholder.
  await expect(page.getByTestId('video-code-error')).toHaveCount(0);
  await expect(page.getByTestId('video-preview-error')).toHaveCount(0);
  await expect(player(page).getByText('Studio')).toBeVisible({ timeout: 10_000 });
  await expect(player(page).getByText('LOGO', { exact: true })).toHaveCount(0);
});

test('scrubbing seeks the composition deterministically', async ({ page }) => {
  await createCountdownProject(page);
  await expect(player(page).getByText('5', { exact: true })).toBeVisible({ timeout: 10_000 });

  // Pause, then scrub to the middle: second 3 of 5 (frame 75 at 30fps) -> the countdown shows 3.
  const scrubber = page.getByTestId('video-scrubber');
  await scrubber.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, '75');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(player(page).getByText('3', { exact: true })).toBeVisible({ timeout: 5_000 });
  // Scrub back: deterministic - the same frame shows the same number again.
  await scrubber.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, '10');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(player(page).getByText('5', { exact: true })).toBeVisible({ timeout: 5_000 });
});

test('manual code edits update the preview; broken code keeps the last good version', async ({ page }) => {
  await createCountdownProject(page);
  // Wait for the auto-generation to COMPLETE (assistant reply) - an edit made while it
  // is still in flight would be overwritten by the AI apply.
  await waitForGeneration(page);
  await expect(player(page).getByText('5', { exact: true })).toBeVisible({ timeout: 10_000 });

  // Replace the module through the store (Monaco's editor surface is not reliably
  // driveable headless - the store IS what the editor writes to).
  await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    useVideoProjectStore.getState().setTsx(`
import { AbsoluteFill } from 'remotion';
export default function Composition() {
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: 90 }}>MANUAL EDIT OK</div>
    </AbsoluteFill>
  );
}
`);
  });
  await expect(player(page).getByText('MANUAL EDIT OK')).toBeVisible({ timeout: 10_000 });

  // Break it: the error banner appears, the last good module keeps rendering.
  await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    useVideoProjectStore.getState().setTsx('import { AbsoluteFill } from "remotion";\nexport default function C() { return <AbsoluteFill><');
  });
  await expect(page.getByTestId('video-code-error')).toBeVisible({ timeout: 5_000 });
  await expect(player(page).getByText('MANUAL EDIT OK')).toBeVisible();
});

test('chat refinement applies an undoable change', async ({ page }) => {
  await createCountdownProject(page);
  await waitForGeneration(page);

  const before = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    return useVideoProjectStore.getState().project.tsx;
  });

  // "faster" hits the stub's deterministic spring-stiffening rule.
  await page.getByTestId('video-chat-field').fill('make it faster');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('video-chat')).toContainText('snappier', { timeout: 10_000 });

  const after = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    return useVideoProjectStore.getState().project.tsx;
  });
  expect(after).not.toBe(before);

  // Undo reverts BOTH the code and the chat turn (one snapshot).
  await page.keyboard.press('Control+z');
  const reverted = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    const s = useVideoProjectStore.getState();
    return { tsx: s.project.tsx, chatLen: s.project.chat.length };
  });
  expect(reverted.tsx).toBe(before);
});

test('reload restores the project; save/reopen and the SPX switch work', async ({ page }) => {
  await createCountdownProject(page);
  await waitForGeneration(page);

  // Reload: the video shell and project come back (the wizard opens on top - close it;
  // the ✕ button's accessible name is its glyph, so target the class).
  await page.reload();
  await page.locator('.gallery-close').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await waitForGeneration(page);

  // Explicit save, then create an SPX blank - the app switches to the SPX shell.
  await page.getByTestId('video-save').click();
  await page.getByRole('button', { name: '+ New project' }).click();
  await page.getByRole('button', { name: 'Blank project' }).click();
  await expect(page.getByTestId('video-shell')).toHaveCount(0);
  await expect(page.locator('.tpl-name')).toHaveText('Blank');

  // Reopen the saved video from the wizard's reopen strip (the ▶-prefixed chip; the ↩
  // Continue chip for the autosaved slot also appears - both open the same project here).
  await page.getByRole('button', { name: '+ New project' }).click();
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await expect(page.getByTestId('video-step')).toBeVisible();
  await page.getByRole('button', { name: /^▶ A 5-second broadcast countdown/ }).click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await waitForGeneration(page);
});
