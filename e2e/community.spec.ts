import { test, expect, type Page } from '@playwright/test';
import { createProject } from './_create';

// Era 5.5 community sharing. The E2E dev server is pinned OFFLINE (playwright.config webServer.env),
// so this suite proves two things without a backend:
//   1. Offline-invariance — the offline app shows NONE of the community UI (no topbar button, no
//      publish section). This is the non-negotiable pillar.
//   2. The publish gate — a pure, offline transform — passes a real generated template and blocks an
//      unsafe one.
// The authenticated publish / browse / import paths are live-server paths, verified by the maintainer
// against a real Supabase (supabase/README.md checklist), never from a green build.

async function create(page: Page, categoryName: string, variantName: string) {
  await createProject(page, { category: categoryName, name: variantName });
}

test('offline: no community affordances anywhere', async ({ page }) => {
  await page.goto('/app');
  await create(page, 'Lower thirds', 'Hairline');

  // No Community or Moderate buttons in the topbar.
  await expect(page.getByRole('button', { name: /Community/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Moderate/ })).toHaveCount(0);

  // The Packets modal shows no "Share to community" section and no publish buttons.
  await page.getByRole('button', { name: '📦 Packets' }).click();
  await expect(page.locator('.pk-modal')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Share to community/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Publish this graphic/ })).toHaveCount(0);
});

test('the publish gate passes a real template and blocks an unsafe one', async ({ page }) => {
  await page.goto('/app');
  await create(page, 'Lower thirds', 'Hairline');

  const result = await page.evaluate(async () => {
    const { publishGate } = await import('/src/community/gate.ts');
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const tpl = useTemplateStore.getState().template;

    const good = publishGate(tpl);

    // Poison a copy: a CDN dependency (must be promoted to a blocking error) + a Blob asset that would
    // silently serialize to "{}" and lose the image.
    const badTpl = {
      ...tpl,
      html: tpl.html + '\n<script src="https://cdn.example.com/x.js"></script>',
      assets: [...tpl.assets, { path: 'images/x.png', data: new Blob([new Uint8Array([1, 2, 3])]) }],
    };
    const bad = publishGate(badTpl);

    return {
      goodOk: good.ok,
      goodErrors: good.errors.map((e) => `${e.rule}: ${e.message}`),
      badOk: bad.ok,
      badRules: bad.errors.map((e) => e.rule),
    };
  });

  // A freshly generated, export-ready lower third must be publishable.
  expect(result.goodOk, `unexpected gate errors: ${result.goodErrors.join(' | ')}`).toBe(true);
  // The poisoned copy is refused, on both counts.
  expect(result.badOk).toBe(false);
  expect(result.badRules).toContain('external-dependency');
  expect(result.badRules).toContain('asset-not-serializable');
});
