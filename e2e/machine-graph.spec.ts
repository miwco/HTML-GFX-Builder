import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';
import { awaitPreviewRebuild } from './_preview';

// Phase 4 of docs/noacg-master-goals.md — the node editor. The machine GRAPH surface in the
// bottom dock: inspect a template's states and arrows, snap the preview, edit transitions
// (trigger / event / timer / STYLE), draw and delete arrows, add branch states and parallel
// groups, drag boxes to persisted positions — and break it all fearlessly, because the
// topbar Reset restores the shipped template. The acceptance bar (goals doc): a
// non-programmer opens a template, sees its graph, changes a transition's style, breaks
// something, and restores the shipped state.

const FRAME = 'iframe.preview-frame';

async function openGraph(page: Page) {
  await page.getByTestId('timeline-surface-toggle').click();
  await expect(page.getByTestId('machine-graph')).toBeVisible();
}

/** The preview's machine pointers (the runtime's own introspection). */
async function machineState(page: Page): Promise<Record<string, string>> {
  return page.evaluate((frameSel) => {
    const f = document.querySelector(frameSel) as HTMLIFrameElement;
    const w = f.contentWindow as Window & { noacgMachineState?: () => { groups: Record<string, string> } };
    return w.noacgMachineState ? w.noacgMachineState().groups : {};
  }, FRAME);
}

async function templateJs(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.js;
  });
}

test('the dock toggles between the step timeline and the machine graph', async ({ page }) => {
  await createProject(page, { category: 'quiz' });
  await expect(page.locator('.tlv2-body')).toBeVisible();
  await openGraph(page);
  // The quiz board's authored machine: the default path as the amber spine plus the
  // select/lock branch — and no "derived" chip, this machine is authored.
  await expect(page.getByTestId('mg-state-main-off')).toBeVisible();
  await expect(page.getByTestId('mg-state-main-selected')).toBeVisible();
  await expect(page.locator('.mg-derived-chip')).toHaveCount(0);
  await page.getByTestId('timeline-surface-toggle').click();
  await expect(page.locator('.tlv2-body')).toBeVisible();
});

test('a machine-less template shows its derived walk, honestly labelled', async ({ page }) => {
  await createProject(page, { category: 'lower-third', index: 0 });
  await openGraph(page);
  await expect(page.getByTestId('mg-state-main-off')).toBeVisible();
  await expect(page.locator('.mg-derived-chip')).toBeVisible();
  // The walk's own labels: play into the entrance, stop (dashed) into the exit.
  await expect(page.locator('.mg-arrow-walk text', { hasText: 'play' })).toBeVisible();
  await expect(page.locator('.mg-arrow-stop text', { hasText: 'stop' })).toBeVisible();
});

test('clicking a state snaps the preview there and its card opens the timeline at its step', async ({ page }) => {
  await createProject(page, { category: 'quiz' });
  await openGraph(page);
  await page.getByTestId('mg-state-main-reveal').click();
  await expect.poll(() => machineState(page).then((s) => s.main)).toBe('reveal');
  // The card knows what the state IS, and leads to its timeline parked at its step.
  await expect(page.getByTestId('mg-state-card')).toContainText('step 2 of the default path');
  await page.getByTestId('mg-open-step').click();
  await expect(page.locator('.tlv2-body')).toBeVisible();
  const playhead = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().playhead;
  });
  expect(playhead).toEqual({ step: 1, t: 0 });
});

test('the transition card edits an arrow: event rename, illegal names refused, styles applied', async ({ page }) => {
  await createProject(page, { category: 'quiz' });
  await openGraph(page);
  // The lock arrow (selected → locked). dispatchEvent: the visible stroke is 1.5px and the
  // hit twin is a curve — a center click would miss both.
  await page.getByTestId('mg-arrow-main-t-2').dispatchEvent('click');
  await expect(page.getByTestId('mg-transition-card')).toContainText('selected → locked');

  // Rename the event; one undoable apply lands in the code.
  await awaitPreviewRebuild(page, async () => {
    await page.getByTestId('mg-event').fill('engage');
    await page.keyboard.press('Enter');
  });
  expect(await templateJs(page)).toContain('"event": "engage"');

  // A reserved name is refused and the input reverts to the real value.
  await page.getByTestId('mg-event').fill('play');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('mg-event')).toHaveValue('engage');
  expect(await templateJs(page)).not.toContain('"event": "play"');

  // Give the arrow a styled change: push-left with a custom duration.
  await awaitPreviewRebuild(page, () => page.getByTestId('mg-style').selectOption('push-left'));
  await awaitPreviewRebuild(page, async () => {
    await page.getByTestId('mg-style-duration').fill('0.4');
    await page.keyboard.press('Enter');
  });
  const js = await templateJs(page);
  expect(js).toContain('"style": "push-left"');
  expect(js).toContain('"duration": 0.4');
});

test('a styled transition plays the arrow\'s change and lands exactly on the target pose', async ({ page }) => {
  await createProject(page, { category: 'quiz' });
  await openGraph(page);
  // Style the enter → selected arrow (fade), then fire it in the live preview.
  await page.getByTestId('mg-arrow-main-t-1').dispatchEvent('click');
  await expect(page.getByTestId('mg-transition-card')).toContainText('enter → selected');
  await awaitPreviewRebuild(page, () => page.getByTestId('mg-style').selectOption('fade'));

  const result = await page.evaluate(async (frameSel) => {
    const f = document.querySelector(frameSel) as HTMLIFrameElement;
    const w = f.contentWindow as Window & {
      play?: () => void;
      noacgDispatch?: (e: string) => unknown;
      noacgMachineState?: () => { groups: Record<string, string> };
    };
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    w.play?.();
    await sleep(900); // the entrance settles
    w.noacgDispatch?.('select');
    const pointerMovedSynchronously = w.noacgMachineState?.().groups.main === 'selected';
    // The styled change is 0.6 s total; give it time plus slack, then read the pose.
    await sleep(1400);
    const doc = f.contentDocument!;
    const root = doc.querySelector('.quiz') as HTMLElement;
    const opacity = Number(w.getComputedStyle(root).opacity);
    return { pointerMovedSynchronously, opacity, state: w.noacgMachineState?.().groups.main };
  }, FRAME);

  expect(result.pointerMovedSynchronously).toBe(true);
  expect(result.state).toBe('selected');
  // The fade ends ON the pose: fully visible again, never stuck half-faded.
  expect(result.opacity).toBeGreaterThan(0.99);
});

test('drawing an arrow from a port creates a transition; the walk\'s only edge refuses deletion', async ({ page }) => {
  await createProject(page, { category: 'quiz' });
  await openGraph(page);

  // Port drag: Enter → Locked in becomes a real operator arrow, selected for renaming.
  await page.hover('[data-testid="mg-state-main-enter"]');
  const port = await page.getByTestId('mg-port-main-enter').boundingBox();
  const target = await page.getByTestId('mg-state-main-locked').boundingBox();
  await awaitPreviewRebuild(page, async () => {
    await page.mouse.move(port!.x + port!.width / 2, port!.y + port!.height / 2);
    await page.mouse.down();
    await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 8 });
    await page.mouse.up();
  });
  expect(await templateJs(page)).toContain('"from": "enter", "to": "locked", "trigger": "operator", "event": "go"');
  await expect(page.getByTestId('mg-transition-card')).toContainText('enter → locked');

  // Delete it again through its card.
  await awaitPreviewRebuild(page, () => page.getByTestId('mg-delete-transition').click());
  expect(await templateJs(page)).not.toContain('"from": "enter", "to": "locked"');

  // The only arrow behind a default-path edge cannot go — the walk must stay connected.
  await page.getByTestId('mg-arrow-main-walk-1').dispatchEvent('click');
  await expect(page.getByTestId('mg-transition-card')).toContainText('enter → reveal');
  await page.getByTestId('mg-delete-transition').click();
  await page.waitForTimeout(300);
  expect(await templateJs(page)).toContain('"from": "enter", "to": "reveal"');
});

test('branch states and parallel groups add and delete; a dragged box parks and persists', async ({ page }) => {
  await createProject(page, { category: 'quiz' });
  await openGraph(page);

  // A new branch state, born selected; deleting it drops its arrows with it.
  await awaitPreviewRebuild(page, () => page.getByTestId('mg-add-state-main').click());
  expect(await templateJs(page)).toContain('"id": "new-state"');
  await page.getByTestId('mg-delete-state').click();
  await awaitPreviewRebuild(page);
  expect(await templateJs(page)).not.toContain('"id": "new-state"');

  // A parallel group with its rest state; delete it again from its lane.
  await awaitPreviewRebuild(page, () => page.getByTestId('mg-add-group').click());
  expect(await templateJs(page)).toContain('"id": "group"');
  await awaitPreviewRebuild(page, () => page.getByTestId('mg-del-group-group').click());
  expect(await templateJs(page)).not.toContain('"id": "group"');

  // Dragging a box persists its position as the additive `at` field.
  const box = await page.getByTestId('mg-state-main-selected').boundingBox();
  await awaitPreviewRebuild(page, async () => {
    await page.mouse.move(box!.x + 40, box!.y + 15);
    await page.mouse.down();
    await page.mouse.move(box!.x + 40, box!.y + 75, { steps: 6 });
    await page.mouse.up();
  });
  expect(await templateJs(page)).toMatch(/"at": \[\d+, \d+\]/);
});

test('editing a derived machine materializes it, and Reset restores the shipped template', async ({ page }) => {
  await createProject(page, { category: 'lower-third', index: 0 });
  await openGraph(page);
  await expect(page.locator('.mg-derived-chip')).toBeVisible();

  // The first structural edit writes the derived machine into the code — with the edit.
  const box = await page.getByTestId('mg-state-main-enter').boundingBox();
  await awaitPreviewRebuild(page, async () => {
    await page.mouse.move(box!.x + 30, box!.y + 15);
    await page.mouse.down();
    await page.mouse.move(box!.x + 30, box!.y + 85, { steps: 6 });
    await page.mouse.up();
  });
  const parsed = await page.evaluate(async () => {
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return !!parseAnimData(useTemplateStore.getState().template.js)?.machine;
  });
  expect(parsed).toBe(true);
  await expect(page.locator('.mg-derived-chip')).toHaveCount(0);

  // Break fearlessly: the topbar Reset (two-click confirm) restores the shipped template.
  await page.getByTestId('reset-project').click();
  await awaitPreviewRebuild(page, () => page.getByTestId('reset-project').click());
  const afterReset = await page.evaluate(async () => {
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return !!parseAnimData(useTemplateStore.getState().template.js)?.machine;
  });
  expect(afterReset).toBe(false);
  await expect(page.locator('.mg-derived-chip')).toBeVisible();
});

test('a style write under a pre-styles interpreter re-emits the region (the pairing rule)', async ({ page }) => {
  await page.goto('/app');
  await page.keyboard.press('Escape');
  const result = await page.evaluate(async () => {
    const { variantById } = await import('/src/templates/catalog.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const { setTransitionStyle } = await import('/src/blocks/machineEdit.ts');
    const { writeAnimData, hasTransitionStyleRuntime } = await import('/src/templates/shared/animRuntime.ts');
    const { validateTemplate } = await import('/src/validation/validateTemplate.ts');
    const tpl = variantById('qz01')!.create({});
    // Simulate a saved template whose frozen interpreter predates transition styles.
    const oldJs = tpl.js.replace(/function noacgStyleTimeline/g, 'function noacgFrozenStyleTimeline');
    const data = parseAnimData(oldJs)!;
    const styled = setTransitionStyle(data, 'main', 1, 'fade')!;
    const written = writeAnimData(oldJs, styled)!;
    // The write re-emitted the whole region, so the styled arrow can actually play…
    const reEmitted = hasTransitionStyleRuntime(written);
    // …while validation catches the broken pairing if someone hand-splices instead.
    const spliced = { ...tpl, js: oldJs.replace('"trigger": "operator", "event": "select"', '"trigger": "operator", "event": "select", "style": "fade"') };
    const verdict = validateTemplate(spliced);
    const pairingError = verdict.errors.some((e) => e.message.includes('predates transition styles'));
    return { reEmitted, pairingError };
  });
  expect(result.reEmitted).toBe(true);
  expect(result.pairingError).toBe(true);
});
