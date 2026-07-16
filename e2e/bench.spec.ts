import { test, expect, type Page } from '@playwright/test';

// The runtime bench (src/validation/runtimeBench.ts) - the deterministic half of the AI
// harness's quality gate. Two halves here:
//  1. Detection fixtures: hand-built bad templates must trip the exact rule they violate.
//  2. The CALIBRATION TRIPWIRE: every catalog variant's create() output must pass its own
//     bench - the house catalog is the ground truth the thresholds are tuned against, so a
//     bench change that fails the catalog is a bench bug, not a catalog bug.

async function toApp(page: Page) {
  await page.goto('/app');
  await page.keyboard.press('Escape'); // close the creation wizard - these tests run in-page
}

// Runs in the page: the bench import + a minimal SpxTemplate factory for fixtures.
const HELPERS = `
  async function bench(tpl, opts) {
    const { benchTemplateRuntime } = await import('/src/validation/runtimeBench.ts');
    const res = await benchTemplateRuntime(tpl, opts);
    return { ok: res.ok, errors: res.errors, warnings: res.warnings };
  }
  function fixture(over) {
    return Object.assign({
      name: 'Bench fixture', type: 'blank',
      resolution: { width: 1920, height: 1080, label: '1080p' }, fps: 25,
      html: '', css: '', js: '', fields: [], settings: { steps: '1' }, assets: [], layers: [],
    }, over);
  }
  // The smallest honest runtime: root visibility toggles + field writes.
  const FIXTURE_JS =
    "window.update = function (data) {" +
    "  var v = JSON.parse(data);" +
    "  Object.keys(v).forEach(function (k) {" +
    "    var el = document.getElementById(k);" +
    "    if (el) el.textContent = v[k];" +
    "  });" +
    "};" +
    "window.play = function () { document.querySelector('.fx').style.visibility = 'visible'; };" +
    "window.stop = function () { document.querySelector('.fx').style.visibility = 'hidden'; };" +
    "window.next = function () {};";
  function doc(body) {
    return '<!DOCTYPE html><html><head></head><body>' + body + '</body></html>';
  }
`;

const rules = (issues: { rule: string }[]) => issues.map((i) => i.rule);

test.describe('runtime bench detection fixtures', () => {
  test('two overlapping text elements trip bench-overlap', async ({ page }) => {
    await toApp(page);
    const res = await page.evaluate(`(async () => { ${HELPERS}
      const tpl = fixture({
        html: doc('<div class="fx">' +
          '<div style="position:absolute;left:200px;top:200px;font-size:48px;color:#fff;">Alpha headline text</div>' +
          '<div style="position:absolute;left:210px;top:210px;font-size:48px;color:#fff;">Beta headline text</div>' +
          '</div>'),
        js: FIXTURE_JS,
      });
      return bench(tpl, { houseContract: false });
    })()`);
    expect((res as { ok: boolean }).ok).toBe(false);
    expect(rules((res as { errors: { rule: string }[] }).errors)).toContain('bench-overlap');
  });

  test('text escaping the canvas trips bench-overflow', async ({ page }) => {
    await toApp(page);
    const res = await page.evaluate(`(async () => { ${HELPERS}
      const tpl = fixture({
        html: doc('<div class="fx">' +
          '<div style="position:absolute;left:-300px;top:400px;width:500px;font-size:40px;color:#fff;">Half off the canvas</div>' +
          '</div>'),
        js: FIXTURE_JS,
      });
      return bench(tpl, { houseContract: false });
    })()`);
    expect(rules((res as { errors: { rule: string }[] }).errors)).toContain('bench-overflow');
  });

  test('a fixed box that clips doubled text trips bench-stress (and passes with defaults)', async ({ page }) => {
    await toApp(page);
    const res = await page.evaluate(`(async () => { ${HELPERS}
      const tpl = fixture({
        html: doc('<div class="fx">' +
          '<div style="position:absolute;left:200px;top:800px;width:260px;overflow:hidden;white-space:nowrap;">' +
          '<span id="f0" style="font-size:32px;color:#fff;">Short</span>' +
          '</div></div>'),
        js: FIXTURE_JS,
        fields: [{ field: 'f0', ftype: 'textfield', title: 'Name', value: 'Short' }],
      });
      return bench(tpl, { houseContract: false });
    })()`);
    const errs = (res as { errors: { rule: string }[] }).errors;
    expect(rules(errs)).toContain('bench-stress');
    // The default value fits - the failure must come from the stress pass only.
    expect(rules(errs)).not.toContain('bench-overflow');
    expect(rules(errs)).not.toContain('bench-binding');
  });

  test('a graphic that never hides on stop trips bench-hidden', async ({ page }) => {
    await toApp(page);
    const res = await page.evaluate(`(async () => { ${HELPERS}
      const tpl = fixture({
        html: doc('<div class="fx"><div style="position:absolute;left:200px;top:200px;font-size:40px;color:#fff;">Always on air</div></div>'),
        js: FIXTURE_JS.replace("window.stop = function () { document.querySelector('.fx').style.visibility = 'hidden'; };",
                               'window.stop = function () {};'),
      });
      return bench(tpl, { houseContract: false });
    })()`);
    expect(rules((res as { errors: { rule: string }[] }).errors)).toContain('bench-hidden');
  });

  test('update() that ignores a field trips bench-binding', async ({ page }) => {
    await toApp(page);
    const res = await page.evaluate(`(async () => { ${HELPERS}
      const tpl = fixture({
        html: doc('<div class="fx"><span id="f0" style="position:absolute;left:200px;top:200px;font-size:40px;color:#fff;">Static</span></div>'),
        js: FIXTURE_JS.replace('window.update = function (data) {', 'window.update = function (data) { return; '),
        fields: [{ field: 'f0', ftype: 'textfield', title: 'Name', value: 'Static' }],
      });
      return bench(tpl, { houseContract: false });
    })()`);
    expect(rules((res as { errors: { rule: string }[] }).errors)).toContain('bench-binding');
  });

  test('the house editability contract is enforced by default and waivable for imports', async ({ page }) => {
    await toApp(page);
    const res = await page.evaluate(`(async () => { ${HELPERS}
      const tpl = fixture({
        html: doc('<div class="fx"><div style="position:absolute;left:200px;top:200px;font-size:40px;color:#fff;">Plain graphic</div></div>'),
        js: FIXTURE_JS,
      });
      const strict = await bench(tpl);
      const waived = await bench(tpl, { houseContract: false });
      return { strict, waived };
    })()`);
    const { strict, waived } = res as {
      strict: { errors: { rule: string }[] };
      waived: { ok: boolean; errors: { rule: string }[] };
    };
    expect(rules(strict.errors)).toContain('bench-editability');
    expect(rules(waived.errors)).not.toContain('bench-editability');
    expect(waived.ok).toBe(true);
  });
});

// ── The calibration tripwire: the catalog must pass its own bench, always ─────────────
const CATEGORIES = [
  'lower-third',
  'info-card',
  'end-credits',
  'ticker',
  'starting-soon',
  'game-timer',
  'scoreboard',
  'corner-bug',
  'infographic',
  'quiz',
] as const;

test.describe('catalog calibration tripwire', () => {
  for (const category of CATEGORIES) {
    test(`every ${category} variant passes the bench`, async ({ page }) => {
      test.setTimeout(120_000);
      await toApp(page);
      const rows = await page.evaluate(`(async (category) => { ${HELPERS}
        const { CATALOG } = await import('/src/templates/catalog.ts');
        const out = [];
        for (const v of CATALOG[category] || []) {
          const res = await bench(v.create());
          out.push({ id: v.id, ok: res.ok, errors: res.errors.map((e) => e.rule + ': ' + e.message) });
        }
        return out;
      })(${JSON.stringify(category)})`);
      const failed = (rows as { id: string; ok: boolean; errors: string[] }[]).filter((r) => !r.ok);
      expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
    });
  }
});
