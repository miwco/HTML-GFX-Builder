import { test, expect, type Page, type Route } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';

// AI mode (Create with AI): the Anthropic API is mocked at the network level, so these
// specs verify the full app flow — settings gate, generation, the harness's validation +
// runtime bench, the repair round, polish, refine, and create — without a real key or cost.

// The fixture passes the FULL harness bar: house-shaped (a {prefix}-box structure, :root
// vars, a readable NOACG_ANIM data block) and live-bench-clean (binds f0, plays, hides on
// stop, replays, survives doubled text).
const VALID_TEMPLATE = {
  name: 'Test Slate',
  type: 'info-card',
  summary: 'A minimal test slate with one name field.',
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Test Slate</title>
  <script src="js/gsap.min.js"></script>
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>
  <script>window.SPXGCTemplateDefinition = {
    "description": "Test Slate",
    "playserver": "OVERLAY", "playchannel": "1", "playlayer": "7",
    "webplayout": "7", "out": "manual", "dataformat": "json",
    "DataFields": [ { "field": "f0", "ftype": "textfield", "title": "Name", "value": "Hello AI" } ]
  };</script>
</head>
<body>
  <div class="slate">
    <div class="slate-box"><span id="f0">Hello AI</span></div>
  </div>
</body>
</html>`,
  css: `:root { --accent: #e8c547; --text-color: #ffffff; --text-dim: rgba(255,255,255,0.7); --panel-bg: rgba(12,14,18,0.92); --font-heading: sans-serif; --scale: 1; }
.slate { position: absolute; left: 80px; bottom: 80px; opacity: 0; }
.slate-box { color: var(--text-color); background: var(--panel-bg); padding: calc(20px * var(--scale)); width: fit-content; max-width: calc(900px * var(--scale)); overflow-wrap: break-word; }`,
  js: `function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) { var el = document.getElementById(key); if (el) el.textContent = fields[key]; }
}
/* == ANIMATION (generated — the timeline edits the data block below) == */
var NOACG_ANIM = {
  "version": 1,
  "root": ".slate",
  "speed": 1,
  "steps": [
    { "name": "In", "duration": 0.5, "ease": "power2.out", "layers": { ".slate": { "opacity": [ { "time": 0, "value": 0 }, { "time": 0.5, "value": 1 } ] } } },
    { "name": "Out", "duration": 0.3, "ease": "power2.in", "layers": { ".slate": { "opacity": [ { "time": 0.3, "value": 0 } ] } } }
  ]
};
function buildInTimeline() { var tl = gsap.timeline(); tl.to('.slate', { opacity: 1, duration: 0.5, ease: 'power2.out' }); return tl; }
function buildOutTimeline() { var tl = gsap.timeline(); tl.to('.slate', { opacity: 0, duration: 0.3, ease: 'power2.in' }); return tl; }
/* == END ANIMATION == */
function play() { gsap.killTweensOf('*'); buildInTimeline(); }
function stop() { gsap.killTweensOf('*'); buildOutTimeline(); }
function next() {}`,
};

// Same template but with a broken runtime — the validator must reject it.
const INVALID_TEMPLATE = { ...VALID_TEMPLATE, js: 'var nothing = true;' };

// Design-stage fixtures: the harness's first call is emit_design_spec (the router).
// A 'custom' spec sends the flow to the free-form coder (the emit_template fixtures);
// a 'catalog' spec is assembled by the platform with NO further model calls.
const CUSTOM_SPEC = {
  fit: 'custom',
  reason: 'No catalog family carries this structure.',
  name: 'Test Slate',
  summary: 'A minimal test slate.',
  category: 'info-card',
  lines: [{ title: 'Name', sample: 'Hello AI' }],
};

const GROUNDED_SPEC = {
  fit: 'catalog',
  reason: 'A restrained lower third carries this brief.',
  name: 'Grounded Strap',
  summary: 'A clean lower third assembled from the catalog design system.',
  category: 'lower-third',
  variantId: 'lt01',
  lines: [
    { title: 'Name', sample: 'Ada Lovelace' },
    { title: 'Title', sample: 'Analyst' },
  ],
};

function toolUse(name: string, input: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      content: [{ type: 'tool_use', id: 'tu_1', name, input }],
      stop_reason: 'tool_use',
    }),
  };
}

/** Which forced tool the request asked for — the mock dispatches on it. */
function requestedTool(route: Route): string {
  const body = route.request().postDataJSON() as { tools?: { name: string }[] };
  return body.tools?.[0]?.name ?? '';
}

function toolResponse(route: Route, template: unknown) {
  const tool = requestedTool(route);
  if (tool === 'emit_design_alternatives') return toolUse(tool, { alternatives: [CUSTOM_SPEC] });
  if (tool === 'emit_design_spec') return toolUse(tool, CUSTOM_SPEC);
  return toolUse('emit_template', template);
}

// Every generation here runs the REAL quality gate: static validation plus a live runtime
// bench per result - and the bench spends genuine wall-clock (font readiness, settle waits,
// the doubled-text stress pass). One result costs ~2 s; the alternatives path benches three
// of them serially and lands at 5.5-7.5 s on an idle box, more under four parallel workers.
// The suite's default 7 s expect budget therefore has no margin at all, which showed up as
// whichever generation test lost the CPU race failing with "element(s) not found". These
// waits get an explicit, honest budget instead - needing longer than this IS a real bug.
const GENERATED = { timeout: 25_000 };

async function openAiStep(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="ai"]').click();
}

test.beforeEach(async ({ page }) => {
  // A generation plus its benches, then a project create with a preview rebuild, sits at
  // 10-15 s per test and was observed over 30 s under worker contention - the suite-wide
  // 30 s cap is the wrong ceiling for this file.
  test.setTimeout(60_000);
  // A fake key so aiConfigured() is true (requests never leave: the route below answers).
  // The harness is ON by default; specs that want it set it explicitly anyway so intent is
  // legible and a default flip can't silently change what a test exercises.
  await page.addInitScript(() =>
    localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: 'sk-ant-test', model: 'claude-sonnet-5', useHarness: true })),
  );
});

test('harness off (the toggle): one raw model call, no design stage', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: 'sk-ant-test', model: 'claude-sonnet-5', useHarness: false })),
  );
  const tools: string[] = [];
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => {
    tools.push(requestedTool(route));
    return route.fulfill(toolUse('emit_template', VALID_TEMPLATE));
  });
  await openAiStep(page);
  await expect(page.getByLabel(/Use NoaCG harness/)).not.toBeChecked();
  await page.locator('.wz-step textarea').fill('A simple test slate');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  await expect(page.locator('.wz-step .status-ok')).toContainText('Passes SPX validation', GENERATED);
  expect(tools).toEqual(['emit_template']); // one call, straight to the coder tool
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Test Slate');
});

test('the harness checkbox is on by default', async ({ page }) => {
  // Saved settings WITHOUT a useHarness key — the default must resolve to on.
  await page.addInitScript(() =>
    localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: 'sk-ant-test', model: 'claude-sonnet-5' })),
  );
  await openAiStep(page);
  await expect(page.getByLabel(/Use NoaCG harness/)).toBeChecked();
});

test('describe-it: prompt → validated template → create project', async ({ page }) => {
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => route.fulfill(toolResponse(route, VALID_TEMPLATE)));
  await openAiStep(page);
  await page.locator('.wz-step textarea').fill('A simple test slate');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  await expect(page.locator('.wz-step .status-ok')).toContainText('Passes SPX validation', GENERATED);
  // The result renders live in the wizard preview.
  await expect(page.locator('.wz-side iframe')).toBeVisible();
  await awaitPreviewRebuild(page, async () => {
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.locator('.wz-modal')).toBeHidden();
    await expect(page.locator('.topbar .tpl-name')).toHaveText('Test Slate');
  });
  await expect(page.frameLocator('iframe.preview-frame').locator('#f0')).toHaveText('Hello AI');
});

test('harness on: three grounded alternatives, zero coder calls, the pick is remembered', async ({ page }) => {
  let templateCalls = 0;
  const alts = [
    { ...GROUNDED_SPEC, variantId: 'lt01', name: 'Grounded One' },
    { ...GROUNDED_SPEC, variantId: 'lt02', name: 'Grounded Two' },
    { ...GROUNDED_SPEC, variantId: 'lt03', name: 'Grounded Three' },
  ];
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => {
    const tool = requestedTool(route);
    if (tool === 'emit_template') templateCalls += 1;
    if (tool === 'emit_design_alternatives') return route.fulfill(toolUse(tool, { alternatives: alts }));
    return route.fulfill(toolUse('emit_template', VALID_TEMPLATE));
  });
  await openAiStep(page);
  await page.locator('.wz-step textarea').fill('A clean news lower third');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  await expect(page.locator('.wz-step .status-ok')).toContainText('Passes SPX validation', GENERATED);
  expect(templateCalls).toBe(0); // grounded: the platform assembled all three, the model wrote no code
  await expect(page.locator('[data-alt]')).toHaveCount(3);

  // Pick option 2 — the preview and result card follow.
  await page.locator('[data-alt="2"]').click();
  await expect(page.locator('.change-preview strong')).toHaveText('Grounded Two');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Grounded Two');

  // The committed pick landed in the aggregated preference data (chosen 1 of 3 shown).
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('spx-gfx-ai-preferences') ?? '{}'));
  expect((prefs as { selections: number }).selections).toBe(1);
  expect((prefs as { chosen: Record<string, number> }).chosen['variantId:lt02']).toBe(1);
  expect((prefs as { shown: Record<string, number> }).shown['variantId:lt03']).toBe(1);
});

test('describe-it: a flourish runs the polish pass and lands as a marked override block', async ({ page }) => {
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => {
    const tool = requestedTool(route);
    if (tool === 'emit_design_alternatives')
      return route.fulfill(toolUse(tool, { alternatives: [{ ...GROUNDED_SPEC, flourish: 'a hairline accent edge on the panel' }] }));
    if (tool === 'emit_polish')
      return route.fulfill(
        toolUse('emit_polish', {
          summary: 'Added a hairline accent edge.',
          css: '.lower-third-box { box-shadow: 0 0 0 calc(1px * var(--scale)) var(--accent); }',
        }),
      );
    return route.fulfill(toolUse('emit_template', VALID_TEMPLATE));
  });
  await openAiStep(page);
  await page.locator('.wz-step textarea').fill('A lower third with a hairline edge');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  await expect(page.locator('.wz-step .status-ok')).toContainText('Passes SPX validation', GENERATED);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Grounded Strap');
  const css = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.css;
  });
  expect(css).toContain('Polish (AI flourish');
  expect(css).toContain('box-shadow: 0 0 0 calc(1px * var(--scale)) var(--accent)');
});

test('describe-it: a contract-breaking polish patch reverts to the assembled template', async ({ page }) => {
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => {
    const tool = requestedTool(route);
    if (tool === 'emit_design_alternatives')
      return route.fulfill(toolUse(tool, { alternatives: [{ ...GROUNDED_SPEC, flourish: 'repaint everything purple' }] }));
    if (tool === 'emit_polish')
      return route.fulfill(
        toolUse('emit_polish', {
          summary: 'Repainted the theme.',
          css: ':root { --accent: #a855f7; } @font-face { font-family: Hack; src: url(x); }',
        }),
      );
    return route.fulfill(toolUse('emit_template', VALID_TEMPLATE));
  });
  await openAiStep(page);
  await page.locator('.wz-step textarea').fill('A purple lower third');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  // The bad patch is rejected and the assembled template stands — still fully valid.
  await expect(page.locator('.wz-step .status-ok')).toContainText('Passes SPX validation', GENERATED);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Grounded Strap');
  const css = await page.evaluate(async () => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    return useTemplateStore.getState().template.css;
  });
  expect(css).not.toContain('Polish (AI flourish');
  expect(css).not.toContain('#a855f7');
});

test('describe-it: an invalid first answer triggers the automatic repair round', async ({ page }) => {
  let templateCalls = 0;
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => {
    if (requestedTool(route) !== 'emit_template') return route.fulfill(toolResponse(route, VALID_TEMPLATE));
    templateCalls += 1;
    return route.fulfill(toolUse('emit_template', templateCalls === 1 ? INVALID_TEMPLATE : VALID_TEMPLATE));
  });
  await openAiStep(page);
  await page.locator('.wz-step textarea').fill('A slate that needs a repair round');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  await expect(page.locator('.wz-step .status-ok')).toContainText('Passes SPX validation', GENERATED);
  expect(templateCalls).toBe(2); // the coder emit + one validated repair
});

test('describe-it: refine sends the current code back through modify', async ({ page }) => {
  const prompts: string[] = [];
  await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
    if (requestedTool(route) !== 'emit_template') return route.fulfill(toolResponse(route, VALID_TEMPLATE));
    const body = route.request().postDataJSON() as { messages: { content: { type: string; text?: string }[] }[] };
    const text = body.messages.map((m) => (Array.isArray(m.content) ? m.content.map((c) => c.text ?? '').join(' ') : '')).join(' ');
    prompts.push(text);
    return route.fulfill(toolUse('emit_template', { ...VALID_TEMPLATE, name: prompts.length > 1 ? 'Test Slate v2' : 'Test Slate' }));
  });
  await openAiStep(page);
  await page.locator('.wz-step textarea').fill('A simple test slate');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  await expect(page.locator('.wz-step .status-ok')).toBeVisible(GENERATED);
  await page.getByPlaceholder(/Refine it/).fill('make the name bigger');
  await page.getByRole('button', { name: 'Refine', exact: true }).click();
  await expect(page.locator('.change-preview strong')).toHaveText('Test Slate v2', GENERATED);
  // The refine request carried both the instruction and the current code.
  expect(prompts[1]).toContain('make the name bigger');
  expect(prompts[1]).toContain('Test Slate');
});

test('describe-it: without a key, generation is gated and settings open', async ({ page }) => {
  // An explicitly EMPTY saved key (not a removed one): the developer's own .env key would
  // otherwise configure the app through the env fallback and break the premise.
  await page.addInitScript(() =>
    localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: '', model: 'claude-sonnet-5', proxyUrl: '' })),
  );
  await openAiStep(page);
  await expect(page.getByRole('button', { name: '✦ Generate' })).toBeDisabled();
  await expect(page.locator('.wz-step input[type="password"]')).toBeVisible(); // key field auto-open
});
