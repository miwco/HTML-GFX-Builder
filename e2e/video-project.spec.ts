// The AI video project flow, end to end on the offline stub provider: create from the
// wizard, auto-generate, LIVE preview through the sandboxed player host, manual code
// edits updating the preview, reload restore, save/reopen, and the SPX <-> video shell
// switch leaving the SPX project untouched.

import { test, expect, type Page } from '@playwright/test';
import { expectOfflineAi } from './_video';
import { startNewProject } from './_create';

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
  // Offline-stub spec: a reused server carrying a real key would drive the real provider,
  // fail as a baffling timeout, and spend money doing it.
  await expectOfflineAi(page);
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  // The countdown example chip fills the prompt; Create is instant (generation runs in
  // the editor chat via the offline stub).
  await page.getByRole('button', { name: 'Countdown', exact: true }).click();
  await page.getByTestId('video-create').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
}

async function createStingerProject(page: Page): Promise<void> {
  await page.goto('/app');
  // Offline-stub spec: a reused server carrying a real key would drive the real provider,
  // fail as a baffling timeout, and spend money doing it.
  await expectOfflineAi(page);
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await page.getByRole('button', { name: 'Sports stinger', exact: true }).click();
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

  // The user gets an unambiguous completion signal (and the busy scrim has left the stage).
  await expect(page.getByTestId('video-ai-done')).toBeVisible();
  await expect(page.getByTestId('video-stage-busy')).toHaveCount(0);

  // No error banners.
  await expect(page.getByTestId('video-code-error')).toHaveCount(0);
  await expect(page.getByTestId('video-preview-error')).toHaveCount(0);
});

test('the logo-reveal example renders a designed wordmark, not a placeholder', async ({ page }) => {
  // The built-in examples act as acceptance tests. With no logo uploaded, the reveal must
  // set a real typographic wordmark - never a grey box or the literal text "LOGO".
  await page.goto('/app');
  // Offline-stub spec: a reused server carrying a real key would drive the real provider,
  // fail as a baffling timeout, and spend money doing it.
  await expectOfflineAi(page);
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

test('a generic prompt renders the default title sample without errors', async ({ page }) => {
  // Regression guard: a brief matching none of the sample keywords (countdown/stinger/
  // news/logo) falls through to the default title composition. The example chips never
  // exercise that path, and a duplicate `const title` once made it crash at load with
  // "Identifier 'title' has already been declared". It must compile and render.
  await page.goto('/app');
  // Offline-stub spec: a reused server carrying a real key would drive the real provider,
  // fail as a baffling timeout, and spend money doing it.
  await expectOfflineAi(page);
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await page.getByTestId('video-prompt').fill('a nice clean opener for my channel');
  await page.getByTestId('video-create').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await waitForGeneration(page);

  // The default sample renders its title, with no compile or runtime error banner.
  await expect(page.getByTestId('video-code-error')).toHaveCount(0);
  await expect(page.getByTestId('video-preview-error')).toHaveCount(0);
  await expect(player(page).getByText('Main Title')).toBeVisible({ timeout: 10_000 });
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

test('editable inputs: the Content panel edits the composition live', async ({ page }) => {
  // The AI (here the offline stub) declares editable inputs alongside the module; a
  // non-technical user changes the content in the Content panel without touching code, and
  // the preview updates LIVE through the player host's set-props channel (no recompile).
  await createStingerProject(page);
  await waitForGeneration(page);
  await expect(player(page).getByText('Game On')).toBeVisible({ timeout: 10_000 });

  // The Content tab exposes the declared inputs: a Title text field + an accent colour.
  await page.getByTestId('video-tab-content').click();
  await expect(page.getByTestId('video-content-panel')).toBeVisible();
  const titleField = page.getByTestId('video-input-title');
  await expect(titleField).toHaveValue('Game On');
  await expect(page.getByTestId('video-input-accent')).toBeVisible();

  // Editing the field flows into the mounted composition immediately.
  await titleField.fill('PLAYOFFS');
  await expect(player(page).getByText('PLAYOFFS')).toBeVisible({ timeout: 10_000 });
  await expect(player(page).getByText('Game On')).toHaveCount(0);
  await expect(page.getByTestId('video-code-error')).toHaveCount(0);
  await expect(page.getByTestId('video-preview-error')).toHaveCount(0);

  // The value lives on the project (so it rides into the render manifest too).
  const stored = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    return useVideoProjectStore.getState().project.inputs.find((i) => i.key === 'title')?.value;
  });
  expect(stored).toBe('PLAYOFFS');

  // The edit is one undoable checkpoint: undo restores the previous value + preview. Blur
  // the field first - the shell's global undo intentionally defers to native undo while a
  // text field is focused.
  await page.getByRole('heading', { name: 'Content' }).click();
  await page.keyboard.press('Control+z');
  await expect(titleField).toHaveValue('Game On');
  await expect(player(page).getByText('Game On')).toBeVisible({ timeout: 10_000 });

  // Per-field reset restores the default after another edit.
  await titleField.fill('OVERTIME');
  await expect(player(page).getByText('OVERTIME')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('video-input-reset-title').click();
  await expect(titleField).toHaveValue('Game On');
  await expect(player(page).getByText('OVERTIME')).toHaveCount(0);
});

test('image inputs: the Content panel picks an uploaded asset that renders in the preview', async ({ page }) => {
  // An image input is the video counterpart of an SPX filelist: it lets the operator choose
  // WHICH uploaded asset fills a slot (the logo) without touching code. Its value is the
  // asset's LOGICAL NAME, resolved against the assets prop the composition already receives -
  // so it adds no bytes to the render manifest. The reveal shows the wordmark until one is
  // picked, then swaps to the image LIVE (through set-props, no recompile).
  await page.goto('/app');
  // Offline-stub spec: a reused server carrying a real key would drive the real provider,
  // fail as a baffling timeout, and spend money doing it.
  await expectOfflineAi(page);
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await page.getByRole('button', { name: 'Logo reveal', exact: true }).click();
  await page.getByTestId('video-create').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await waitForGeneration(page);
  await expect(player(page).getByText('Studio')).toBeVisible({ timeout: 10_000 });

  // Upload an image the way the Assets panel does (a data-URL AssetFile on the project). Its
  // logical name comes from the file stem: images/brandlogo.png -> "brandlogo".
  await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    useVideoProjectStore.getState().addAsset({
      path: 'images/brandlogo.png',
      data:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });
  });

  // The Content tab's image control lists the uploaded asset by its logical name.
  await page.getByTestId('video-tab-content').click();
  const logoPicker = page.getByTestId('video-input-logo');
  await expect(logoPicker).toBeVisible();
  await expect(logoPicker.locator('option[value="brandlogo"]')).toHaveCount(1);
  // Nothing picked yet -> still the wordmark, not an image.
  await expect(player(page).getByText('Studio')).toBeVisible();

  // Pick it: the composition swaps the wordmark for the uploaded image, live.
  await logoPicker.selectOption('brandlogo');
  await expect(player(page).locator('img')).toBeVisible({ timeout: 10_000 });
  await expect(player(page).getByText('Studio')).toHaveCount(0);
  await expect(page.getByTestId('video-code-error')).toHaveCount(0);
  await expect(page.getByTestId('video-preview-error')).toHaveCount(0);

  // The stored value is the LOGICAL NAME (not a URL): it rides tiny into the render manifest,
  // resolving against inputProps.assets.
  const stored = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    return useVideoProjectStore.getState().project.inputs.find((i) => i.key === 'logo')?.value;
  });
  expect(stored).toBe('brandlogo');
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
    useVideoProjectStore.getState().setSource(`
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
    useVideoProjectStore.getState().setSource('import { AbsoluteFill } from "remotion";\nexport default function C() { return <AbsoluteFill><');
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
  await startNewProject(page);
  await page.getByRole('button', { name: 'Blank project' }).click();
  // Blank creation is ASYNC and the click does not wait for it: startBlank fires applyGenerated
  // without awaiting, and that formats the new template through Prettier - five lazy dynamic
  // imports (standalone + the html/postcss/babel/estree plugins) - BEFORE it flips the doc-kind
  // switch that unmounts the video shell. On a busy dev server those cold module graphs take
  // longer than the default expect timeout, so asserting that the video shell has VANISHED is
  // waiting on a clock rather than on a signal, and it loses whenever the box is loaded.
  // The SPX preview being stamped is the signal: PreviewFrame only sets data-doc-rev once its
  // rebuild has LOADED, and the frame itself cannot exist until the whole chain above has run.
  // `:not(.video-player-frame)` is load-bearing - the video player iframe carries the same
  // `preview-frame` class, so a bare `iframe.preview-frame` matches it too and would resolve
  // against the shell we are waiting to leave.
  await expect(page.locator('iframe.preview-frame:not(.video-player-frame)')).toHaveAttribute(
    'data-doc-rev',
    /\d/,
    { timeout: 30_000 },
  );
  await expect(page.getByTestId('video-shell')).toHaveCount(0);
  await expect(page.locator('.tpl-name')).toHaveText('Blank');

  // Reopen the saved video from the wizard's reopen strip (the ▶-prefixed chip; the ↩
  // Continue chip for the autosaved slot also appears - both open the same project here).
  // Back in the SPX shell now, holding a freshly created Blank - so this one raises the guard.
  await startNewProject(page);
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await expect(page.getByTestId('video-step')).toBeVisible();
  // The chip is labelled with the project's own brief, so match the countdown example's
  // opening words rather than the whole sentence (the example copy is product prose).
  await page.getByRole('button', { name: /^▶ A 5-second countdown/ }).click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await waitForGeneration(page);
});

test('an oversized project says so instead of losing the work silently', async ({ page }) => {
  // Video assets are data URLs inside the autosaved project, so a few big ones exhaust the
  // browser's storage. Each of these PASSES the 3 MB per-asset cap (a data URL runs about 4/3
  // of the raw bytes) but together they blow the ~5 MB localStorage ceiling. The save must fail
  // LOUDLY: the alternative is a project that looks saved and isn't, and a reload that quietly
  // throws away the last edits.
  await createCountdownProject(page);
  await waitForGeneration(page);

  await page.getByTestId('video-tab-assets').click();
  const bulky = (bytes: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#111"/><!--${'x'.repeat(bytes)}--></svg>`;
  await page.locator('input[type=file]').setInputFiles(
    ['a', 'b', 'c'].map((n) => ({
      name: `${n}.svg`,
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(bulky(1_500_000)),
    })),
  );
  await expect(page.locator('.video-asset-list li')).toHaveCount(3); // each one was accepted

  await expect(page.getByTestId('video-autosave-failed')).toBeVisible({ timeout: 10_000 });
});

test('the Remotion static rules read code, not comments', async ({ page }) => {
  // The engine-neutral half of the HyperFrames finding (docs/HYPERFRAMES_QUALITY.md): the
  // FORBIDDEN patterns used to scan raw source, so a module commenting that it avoids an API
  // was rejected for using it - and the repair message quotes that comment, which reads as
  // nonsense and makes the round unwinnable. It fired on HyperFrames in the bench because
  // only that engine bans `repeat: -1`, but the defect was shared; this pins the fix here.
  await page.goto('/app');
  const results = await page.evaluate(async () => {
    const { staticValidate } = await import('/src/video/compile.ts');
    const rules = (tsx: string) => staticValidate(tsx, []).map((i) => i.rule);
    return {
      lineComment: rules('export default function C(){\n  // seeded, never Math.random()\n  return null;\n}'),
      blockComment: rules('export default function C(){\n  /* no fetch( ) at render time */\n  return null;\n}'),
      commentUrl: rules('export default function C(){\n  // see https://remotion.dev/docs\n  return null;\n}'),
      realRandom: rules('export default function C(){\n  const r = Math.random();\n  return r;\n}'),
      realUrl: rules('export default function C(){\n  return "https://cdn.example.com/x.png";\n}'),
    };
  });
  expect(results.lineComment).not.toContain('forbidden-api');
  expect(results.blockComment).not.toContain('forbidden-api');
  expect(results.commentUrl).not.toContain('network-url');
  expect(results.realRandom).toContain('forbidden-api');
  expect(results.realUrl).toContain('network-url');
});

test('a declared input the module never reads is rejected as a control that would do nothing', async ({ page }) => {
  // The HyperFrames half has enforced this since a benchmark caught it shipping; Remotion
  // declares its inputs in the emit tool rather than in the code, so nothing was handed them
  // and nothing checked. Measured at 0 occurrences across 21 real generations - which is the
  // argument for adding it, not against: it costs nothing today and catches the defect the
  // moment model behaviour drifts. The corpus spec guards the false-positive side.
  await page.goto('/app');
  const results = await page.evaluate(async () => {
    const { staticValidate } = await import('/src/video/compile.ts');
    const mod = (body: string) =>
      `export default function C({ fields = {} }: { fields?: Record<string, string | number> }) {\n  ${body}\n  return null;\n}`;
    const rules = (tsx: string, keys: string[]) =>
      staticValidate(tsx, [], keys.map((key) => ({ key }))).map((i) => i.rule);
    return {
      unread: rules(mod("const t = 'hard-coded';"), ['headline']),
      dotted: rules(mod("const t = String(fields.headline ?? 'x');"), ['headline']),
      bracket: rules(mod("const t = fields['headline'] ?? 'x';"), ['headline']),
      destructured: rules(mod('const { headline } = fields;'), ['headline']),
      // Handing `fields` on wholesale means a key may never appear literally - flagging then
      // would invent a defect, and a false positive costs a repair round.
      spread: rules(mod('const el = <Inner {...fields} />;'), ['headline']),
      none: rules(mod("const t = 'x';"), []),
    };
  });
  expect(results.unread).toContain('inputs');
  expect(results.dotted).not.toContain('inputs');
  expect(results.bracket).not.toContain('inputs');
  expect(results.destructured).not.toContain('inputs');
  expect(results.spread).not.toContain('inputs');
  expect(results.none).toEqual([]);
});

test('video: a modal takes the shortcuts - Ctrl+Z behind My videos leaves the project alone', async ({ page }) => {
  await createCountdownProject(page);
  // The first generation auto-runs and lands as its OWN undoable snapshot. Until it does,
  // every edit below races it: a generation that arrives after the fps change becomes the
  // newest undo target, so the Ctrl+Z after the dialog closes rewinds the generation and
  // leaves fps alone - the test failing on ordering, not on the guard.
  await waitForGeneration(page);

  // Make something UNDOABLE: patchSettings snapshots history (setSource deliberately does
  // not - Monaco owns keystroke undo). Without a real undo target this test would pass no
  // matter what the guard did.
  const state = () =>
    page.evaluate(async () => {
      const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
      const s = useVideoProjectStore.getState();
      return { fps: s.project.fps, depth: s.history.length };
    });
  const original = await state();
  expect(original.fps).not.toBe(50); // the premise: 50 is a real change, so undo has something to rewind
  await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    useVideoProjectStore.getState().patchSettings({ fps: 50 });
  });
  const patched = await state();
  expect(patched.fps).toBe(50);
  // The fps change is the NEWEST undo target and nothing has landed on top of it - the
  // premise the assertion after the dialog closes rests on.
  expect(patched.depth).toBe(original.depth + 1);

  // The video shell binds undo/redo globally, exactly like the SPX one. Both stand down while
  // a dialog is up (src/components/spaceKey.ts) - a keystroke aimed at the dialog must never
  // rewind the project behind it.
  await page.getByTestId('video-my-videos').click();
  await expect(page.getByTestId('saved-videos')).toBeVisible();
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(200);
  expect((await state()).fps).toBe(50);

  // Standing down is not the same as breaking: closing the dialog hands the key back, and
  // the same keystroke now rewinds the change it was aimed at all along.
  await page.getByTestId('saved-videos').getByTitle('Close').click();
  await expect(page.getByTestId('saved-videos')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await state()).fps).toBe(original.fps);
});
