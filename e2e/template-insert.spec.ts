import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';
import { awaitPreviewRebuild } from './_preview';

// "Add template graphic" (Assets panel ✚): insert a catalog graphic INTO the current
// project — namespaced classes, renumbered fields, the donor's :root scoped onto the
// inserted root, its In/Out merged into the host's timeline, its machine dropped — as ONE
// undo step, never replacing the project. blocks/templateInsert.ts is the merge under test.

async function openInsertDialog(page: Page) {
  await page.getByTestId('dock-tab-assets').click();
  await page.getByTestId('assets-insert-template').click();
  await expect(page.getByTestId('insert-tpl-dialog')).toBeVisible();
}

const state = (page: Page) =>
  page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { parseAnimData } = await import('/src/blocks/animData.ts');
    const t = useTemplateStore.getState().template;
    const data = parseAnimData(t.js);
    return {
      html: t.html,
      css: t.css,
      fields: t.fields.map((f) => ({ field: f.field, title: f.title })),
      steps: data?.steps.map((s) => ({ name: s.name, reveals: s.reveals ?? [], layers: Object.keys(s.layers) })) ?? null,
      spxSteps: t.settings.steps,
      selected: useTemplateStore.getState().selectedPart,
    };
  });

test('insert an info card into a lower third — project preserved, everything namespaced, one undo', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  const before = await state(page);

  await openInsertDialog(page);
  await page.locator('.insert-tpl-cats').getByRole('tab', { name: 'Info cards' }).click();
  await awaitPreviewRebuild(page, () => page.getByTestId('insert-tpl-card-card01').click());
  await expect(page.getByTestId('insert-tpl-dialog')).toBeHidden();

  const after = await state(page);
  // The host graphic survives untouched: its root, its fields, its steps.
  expect(after.html).toContain('class="lower-third');
  for (const f of before.fields) {
    expect(after.fields.map((x) => x.field)).toContain(f.field);
  }
  // The inserted graphic arrived namespaced: a data-gfx root, prefix rewritten, fields
  // renumbered after the host's and marked with the variant's name.
  expect(after.selected).toMatch(/^#gfx-/);
  const gfxId = after.selected!.slice(1);
  expect(after.html).toContain(`id="${gfxId}" data-gfx`);
  expect(after.html).toContain('info-card-2');
  const newFields = after.fields.slice(before.fields.length);
  expect(newFields.length).toBeGreaterThan(0);
  expect(newFields[0].field).toBe(`f${before.fields.length}`);
  expect(newFields[0].title).toContain('(');
  // The donor's style contract is SCOPED onto the inserted root, not the document.
  expect(after.css).toContain(`#${gfxId} {`);
  expect((after.css.match(/:root \{/g) ?? []).length).toBe((before.css.match(/:root \{/g) ?? []).length);
  // No second reset block.
  expect((after.css.match(/html,\s*body \{/g) ?? []).length).toBe(1);
  // Its In/Out merged into the host's entrance/exit (placement: from the start).
  expect(after.steps!.length).toBe(before.steps!.length);
  expect(after.steps![0].layers.some((k) => k.includes('info-card-2'))).toBe(true);
  expect(after.steps![after.steps!.length - 1].layers.some((k) => k.includes('info-card-2'))).toBe(true);

  // Both graphics render in the preview.
  const frame = page.frameLocator('iframe.preview-frame');
  await expect(frame.locator('.lower-third-box')).toHaveCount(1);
  await expect(frame.locator('.info-card-2-box')).toHaveCount(1);

  // The merged document still passes the export gate.
  const validation = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { validateTemplate } = await import('/src/validation/validateTemplate.ts');
    return validateTemplate(useTemplateStore.getState().template).errors;
  });
  expect(validation).toEqual([]);

  // ONE undo removes the whole insertion.
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await state(page)).html).not.toContain('info-card-2');
  const restored = await state(page);
  expect(restored.fields.length).toBe(before.fields.length);
  expect(restored.css).not.toContain(`#${gfxId}`);
});

test('insert as a NEW NEXT STEP — a named step reveals the graphic, retargetable afterwards', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  const before = await state(page);

  await openInsertDialog(page);
  await page.getByTestId('insert-tpl-placement').selectOption('new-step');
  await page.locator('.insert-tpl-cats').getByRole('tab', { name: 'Info cards' }).click();
  await awaitPreviewRebuild(page, () => page.getByTestId('insert-tpl-card-card01').click());

  const after = await state(page);
  const gfxSel = after.selected!;
  // A new step on the default path, named after the variant, revealing the inserted root.
  expect(after.steps!.length).toBe(before.steps!.length + 1);
  const step = after.steps![after.steps!.length - 2];
  expect(step.reveals).toContain(gfxSel);
  expect(after.spxSteps).toBe('2');

  // Participation stays a live choice: the inserted graphic is a normal part, so the
  // canvas chip can send it back to "appears with ▶ Play".
  const appears = page.getByTestId('canvas-appears');
  await expect(appears).toBeVisible();
  await expect(appears).toHaveValue('0');
  await appears.selectOption('-1');
  await expect
    .poll(async () => (await state(page)).steps!.every((s) => !s.reveals.includes(gfxSel)))
    .toBe(true);
});

test('the canvas context menu opens the same insert flow', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  const canvas = page.getByTestId('canvas-layer');
  await canvas.click({ button: 'right', position: { x: 200, y: 120 } });
  const menu = page.getByTestId('canvas-context-menu');
  await expect(menu).toBeVisible();
  await page.getByTestId('canvas-ctx-insert-template').click();
  await expect(menu).toBeHidden();
  await expect(page.getByTestId('insert-tpl-dialog')).toBeVisible();
  // Insert from here works end to end.
  await awaitPreviewRebuild(page, () => page.getByTestId('insert-tpl-card-lt02').click());
  await expect.poll(async () => (await state(page)).selected).toMatch(/^#gfx-/);
  // A plain left click closes an open menu without picking anything.
  await canvas.click({ button: 'right', position: { x: 200, y: 120 } });
  await expect(page.getByTestId('canvas-context-menu')).toBeVisible();
  await canvas.click({ position: { x: 400, y: 300 } });
  await expect(page.getByTestId('canvas-context-menu')).toBeHidden();
});

test('templates that need their own runtime are greyed with the reason, not hidden', async ({ page }) => {
  await createProject(page, { category: 'Lower thirds', name: 'Hairline' });
  await openInsertDialog(page);
  await page.locator('.insert-tpl-cats').getByRole('tab', { name: 'Tickers' }).click();
  const card = page.getByTestId('insert-tpl-card-tk01');
  await expect(card).toHaveClass(/blocked/);
  await card.click({ force: true });
  await expect(page.getByTestId('insert-tpl-error')).toContainText(/runtime|measured/);
  // The project was NOT touched.
  const st = await state(page);
  expect(st.html).not.toContain('ticker');
});
