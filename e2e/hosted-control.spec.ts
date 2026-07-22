import { test, expect } from '@playwright/test';
import { createProject } from './_create';

// Hosted control ENTRIES (docs/CONTROL_LAYER.md + docs/SAVED_CONTENT_MODEL.md §4): a show's
// published `panel` spec carries every graphic's saved entries, so the hosted ?control= page
// can offer them as a read-only switcher.
//
// Publishing and operating need a real backend, which this suite deliberately does not have
// (offline-pinned) — the hosted page itself is covered by the maintainer's live checklist.
// What is pinned here is the half that runs locally and decides whether an operator sees
// their rundown rows at all: which library record a show graphic's entries come from.

test('a saved graphic carries its entries into the show it is added to', async ({ page }) => {
  await createProject(page, 'Hairline');

  // Save it, then build two entries on its control panel — the operator's rundown rows.
  await page.getByTestId('save-graphic').click();
  await page.getByTestId('save-name').fill('Presenter lower third');
  await page.getByTestId('save-confirm').click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');

  await page.getByTestId('open-home').click();
  await page.getByTestId('home-nav-controls').click();
  await page
    .locator('.pk-graphic', { hasText: 'Presenter lower third' })
    .locator('button', { hasText: 'Open control panel' })
    .click();
  await expect(page.getByTestId('graphic-control-page')).toBeVisible();
  await page.getByTestId('add-entry').click();
  await page.getByTestId('entry-field-f0').fill('Anna Andersson');
  await page.getByTestId('entry-field-f1').fill('Presenter');
  await page.getByTestId('add-entry').click();
  await page.getByTestId('entry-field-f0').fill('Michael Smith');
  await expect(page.locator('.control-entry')).toHaveCount(2);

  // Back into the editor (the document keeps its library link) and into a show.
  await page.getByTestId('control-open-editor').click();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Presenter lower third');
  await page.getByTestId('dock-tab-control').click();
  const shows = page.locator('.panel-section', { hasText: 'Rundowns' });
  await shows.getByPlaceholder('New rundown name').fill('Evening Show');
  await shows.getByRole('button', { name: 'Create', exact: true }).click();
  await shows.getByRole('button', { name: '+ Add current' }).click();
  await expect(shows.locator('.status-ok')).toContainText('is in the rundown');

  // The show's copy records WHICH library graphic it came from — the link the panel follows
  // (a name match would pass here by luck; this pins the id).
  const link = await page.evaluate(async () => {
    const { loadShows } = await import('/src/model/shows.ts');
    const { graphicById } = await import('/src/model/library.ts');
    const id = loadShows()[0].graphics[0].graphicId ?? null;
    return { id, name: id ? graphicById(id)?.name : null };
  });
  expect(link.name).toBe('Presenter lower third');

  // The published panel spec — what the hosted page renders from — carries both entries.
  const panel = await page.evaluate(async () => {
    const { buildPanelSpec } = await import('/src/control/hostedControl.ts');
    const { loadShows } = await import('/src/model/shows.ts');
    return buildPanelSpec(loadShows()[0]);
  });
  expect(panel).toHaveLength(1);
  expect(panel[0].entries.map((e) => e.label)).toEqual(['Anna Andersson', 'Michael Smith']);
  expect(panel[0].entries[0].values.f1).toBe('Presenter');
  // Never the template payload — the spec stays the operator's view of the graphic.
  expect(Object.keys(panel[0])).toEqual(['name', 'fields', 'js', 'images', 'entries']);
});

test('entries resolve by library id, fall back to a unique name, and never guess', async ({ page }) => {
  await createProject(page, 'Hairline');

  const result = await page.evaluate(async () => {
    const { createGraphic, newEntry } = await import('/src/model/library.ts');
    const { buildPanelSpec } = await import('/src/control/hostedControl.ts');
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const template = useTemplateStore.getState().template;

    const linked = createGraphic(template, {
      name: 'Presenter lower third',
      entries: [newEntry('Anna Andersson', { f0: 'Anna Andersson' })],
    }).doc;
    // Two library graphics sharing a name: no unique match, so no entries may be guessed.
    createGraphic(template, { name: 'Twin', entries: [newEntry('Left', { f0: 'Left' })] });
    createGraphic(template, { name: 'Twin', entries: [newEntry('Right', { f0: 'Right' })] });

    const show = (graphics: unknown[]) =>
      ({ id: 'show-1', name: 'Evening Show', graphics, updatedAt: new Date().toISOString() });
    const copy = (name: string, graphicId?: string) => ({
      id: `copy-${name}-${graphicId ?? 'none'}`,
      name,
      type: template.type,
      savedAt: new Date().toISOString(),
      template,
      ...(graphicId ? { graphicId } : {}),
    });

    const spec = (graphics: unknown[]) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildPanelSpec(show(graphics) as any).map((g) => g.entries.map((e) => e.label));

    return {
      byId: spec([copy('Renamed in the show', linked.id)]),
      byName: spec([copy('Presenter lower third')]),
      ambiguous: spec([copy('Twin')]),
      staleLink: spec([copy('Presenter lower third', 'not-a-record')]),
      unknown: spec([copy('Never saved')]),
    };
  });

  // The id wins even when the show's copy was renamed…
  expect(result.byId).toEqual([['Anna Andersson']]);
  // …an older copy with no link resolves by its unique name…
  expect(result.byName).toEqual([['Anna Andersson']]);
  // …and an ambiguous name, a stale link, or an unsaved graphic publishes nothing.
  expect(result.ambiguous).toEqual([[]]);
  expect(result.staleLink).toEqual([[]]);
  expect(result.unknown).toEqual([[]]);
});
