import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';

// The SPECIALIST lower-third pack (src/templates/lowerThirds/specialist).
//
// What is worth pinning here is not that 32 designs exist — the catalog sweep covers each one
// mechanically — but the three contracts the pack introduced, each of which broke at least
// once while it was being built:
//
//   1. DISCOVERY: a production facet (`roleTag`) and a free-text search, sharing ONE predicate
//      with the insert dialog.
//   2. INDEPENDENT FIELDS: a two-person strap must emit one SPX field per person per value —
//      never one string an operator punctuates themselves.
//   3. DEGRADATION: removing a role line must never re-read the next person's NAME as a role,
//      and the split rule differs between peer designs and lead/support designs.

async function toTemplateStep(page: Page, category: string) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="template"]').click();
  await page.locator('.wz-cat', { hasText: category }).click();
}

/** Counts read from the live catalog, so the assertions track catalog growth rather than
 *  pinning totals that change whenever a design is added. */
async function counts(page: Page) {
  return page.evaluate(async () => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    const vs = variantsFor('lower-third') as { roleTag?: string; name: string }[];
    return {
      total: vs.length,
      interview: vs.filter((v) => v.roleTag === 'interview').length,
      faith: vs.filter((v) => v.roleTag === 'faith').length,
      roleless: vs.filter((v) => !v.roleTag).length,
    };
  });
}

test('the production chips narrow the grid, and generalist designs carry no role', async ({ page }) => {
  await toTemplateStep(page, 'Lower thirds');
  const n = await counts(page);
  const cards = page.locator('.wz-variant');
  await expect(cards).toHaveCount(n.total);

  // A role chip keeps exactly the designs drawn for that production.
  await page.locator('[data-testid="wz-role-interview"]').click();
  await expect(cards).toHaveCount(n.interview);
  await expect(page.locator('.wz-variant', { hasText: 'Split Interview' })).toBeVisible();

  // Picking another role replaces the first rather than intersecting with it.
  await page.locator('[data-testid="wz-role-faith"]').click();
  await expect(cards).toHaveCount(n.faith);
  await expect(page.locator('.wz-variant', { hasText: 'Pulpit' })).toBeVisible();

  // Clicking the active chip again clears it — the whole catalog comes back, which is also
  // the proof that the generalist designs were never filtered OUT by carrying no role.
  await page.locator('[data-testid="wz-role-faith"]').click();
  await expect(cards).toHaveCount(n.total);
  expect(n.roleless).toBeGreaterThan(0);
});

test('search matches a design by its field labels, not just its name', async ({ page }) => {
  await toTemplateStep(page, 'Lower thirds');
  const cards = page.locator('.wz-variant');
  const search = page.locator('[data-testid="wz-search"]');

  // "scripture" is in ls15's name and description.
  await search.fill('scripture');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('.wz-variant', { hasText: 'Scripture Reading' })).toBeVisible();

  // "post-nominals" appears ONLY as an operator-facing field label on ls17 — the case the
  // search predicate exists for: a user looks for the field they need, not the design's name.
  await search.fill('post-nominals');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('.wz-variant', { hasText: 'Lectern' })).toBeVisible();

  // Terms are ANDed, so adding a word always narrows.
  await search.fill('squad number');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('.wz-variant', { hasText: 'Squad Number' })).toBeVisible();

  await search.fill('nothingmatchesthis');
  await expect(cards).toHaveCount(0);
  await page.locator('.wz-filter-empty button', { hasText: 'Clear filters' }).click();
  await expect(cards.first()).toBeVisible();
});

test('a two-person strap gives each person independent fields', async ({ page }) => {
  await createProject(page, 'Split Interview');

  const fields = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const t = useTemplateStore.getState().template;
    return t.fields.map((f) => ({ field: f.field, title: f.title }));
  });

  // Four fields, one per person per value — not two fields holding "Name, Role" strings.
  expect(fields).toEqual([
    { field: 'f0', title: 'Left name' },
    { field: 'f1', title: 'Left role' },
    { field: 'f2', title: 'Right name' },
    { field: 'f3', title: 'Right role' },
  ]);

  // Each is a separately addressable element the runtime writes into, so an operator can
  // change one person without touching the other.
  const written = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { composeDocument } = await import('/src/preview/composeDocument.ts');
    const t = useTemplateStore.getState().template;
    return new Promise<Record<string, string>>((resolve) => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:absolute;left:-9999px;width:1920px;height:1080px';
      f.onload = () => {
        const w = f.contentWindow as unknown as { update: (s: string) => void };
        const d = f.contentDocument!;
        w.update(JSON.stringify({ f0: 'Bo Li', f1: 'Analyst', f2: 'Elena Marchetti', f3: 'Correspondent' }));
        resolve({
          f0: d.getElementById('f0')!.textContent!,
          f1: d.getElementById('f1')!.textContent!,
          f2: d.getElementById('f2')!.textContent!,
          f3: d.getElementById('f3')!.textContent!,
        });
        f.remove();
      };
      f.srcdoc = composeDocument(t);
      document.body.appendChild(f);
    });
  });
  expect(written).toEqual({ f0: 'Bo Li', f1: 'Analyst', f2: 'Elena Marchetti', f3: 'Correspondent' });
});

test('dropping the role lines degrades by the design\'s own split rule', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.topbar')).toBeVisible();

  const shapes = await page.evaluate(async () => {
    const { variantById } = await import('/src/templates/catalog.ts');
    const read = (id: string, n: number) => {
      const v = variantById(id)!;
      const tpl = v.create({ lines: v.suggestedLines.slice(0, n) });
      const doc = new DOMParser().parseFromString(tpl.html, 'text/html');
      // Which column does each surviving field land in?
      return [...doc.querySelectorAll('.lower-third-person')].map((col) =>
        [...col.querySelectorAll('[id^="f"]')].map((el) => el.id),
      );
    };
    return {
      // ls01 is a PEER design: two lines must still name TWO people, one per column.
      peer4: read('ls01', 4),
      peer2: read('ls01', 2),
      // ls04 is a LEAD design: two lines are the guest AND the guest's own chip, one column —
      // never the guest's role re-read as the host's name.
      led4: read('ls04', 4),
      led2: read('ls04', 2),
    };
  });

  expect(shapes.peer4).toEqual([['f0', 'f1'], ['f2', 'f3']]);
  expect(shapes.peer2).toEqual([['f0'], ['f1']]);
  expect(shapes.led4).toEqual([['f0', 'f1'], ['f2', 'f3']]);
  expect(shapes.led2).toEqual([['f0', 'f1']]);
});

test('every specialist design passes the export gate on all targets', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.topbar')).toBeVisible();

  const result = await page.evaluate(async () => {
    const { variantsFor } = await import('/src/templates/catalog.ts');
    const { validateTemplate } = await import('/src/validation/validateTemplate.ts');
    const { EXPORT_TARGETS } = await import('/src/export/registry.ts');
    const list = variantsFor('lower-third').filter((v) => /^ls\d\d$/.test(v.id));
    const failures: string[] = [];
    for (const v of list) {
      const tpl = v.create();
      const val = validateTemplate(tpl);
      if (!val.ok) failures.push(`${v.id}: ${val.errors.map((e) => e.rule).join(',')}`);
      for (const t of EXPORT_TARGETS) {
        try {
          const zip = await t.build(tpl, {});
          if (Object.keys(zip.files).length === 0) failures.push(`${v.id}/${t.id}: empty package`);
        } catch (e) {
          failures.push(`${v.id}/${t.id}: ${(e as Error).message}`);
        }
      }
    }
    return { count: list.length, targets: EXPORT_TARGETS.length, failures };
  });

  expect(result.count).toBeGreaterThanOrEqual(32);
  expect(result.failures).toEqual([]);
});
