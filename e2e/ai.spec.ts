import { test, expect, type Page, type Route } from '@playwright/test';

// AI mode (Describe it): the Anthropic API is mocked at the network level, so these specs
// verify the full app flow — settings gate, generation, validation, repair round, refine,
// and create — without a real key or cost.

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
  <div class="slate"><span id="f0">Hello AI</span></div>
</body>
</html>`,
  css: `:root { --accent: #e8c547; --text-color: #ffffff; --text-dim: rgba(255,255,255,0.7); --panel-bg: rgba(12,14,18,0.92); --font-heading: sans-serif; --scale: 1; }
.slate { position: absolute; left: 80px; bottom: 80px; opacity: 0; color: var(--text-color); background: var(--panel-bg); padding: calc(20px * var(--scale)); }`,
  js: `function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) { var el = document.getElementById(key); if (el) el.textContent = fields[key]; }
}
/* == ANIMATION (generated — the Animation panel rewrites this block) == */
var animSpeed = 1;
var easeIn = 'power2.out';
var easeOut = 'power2.in';
function buildInTimeline() { var tl = gsap.timeline(); tl.to('.slate', { opacity: 1, duration: 0.5 / animSpeed, ease: easeIn }); return tl; }
function buildOutTimeline() { var tl = gsap.timeline(); tl.to('.slate', { opacity: 0, duration: 0.3 / animSpeed, ease: easeOut }); return tl; }
/* == END ANIMATION == */
function play() { gsap.killTweensOf('*'); buildInTimeline(); }
function stop() { gsap.killTweensOf('*'); buildOutTimeline(); }
function next() {}`,
};

// Same template but with a broken runtime — the validator must reject it.
const INVALID_TEMPLATE = { ...VALID_TEMPLATE, js: 'var nothing = true;' };

function toolResponse(input: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      content: [{ type: 'tool_use', id: 'tu_1', name: 'emit_template', input }],
      stop_reason: 'tool_use',
    }),
  };
}

async function openAiStep(page: Page) {
  await page.goto('/');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="ai"]').click();
}

test.beforeEach(async ({ page }) => {
  // A fake key so aiConfigured() is true (requests never leave: the route below answers).
  await page.addInitScript(() =>
    localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: 'sk-ant-test', model: 'claude-sonnet-5' })),
  );
});

test('describe-it: prompt → validated template → create project', async ({ page }) => {
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => route.fulfill(toolResponse(VALID_TEMPLATE)));
  await openAiStep(page);
  await page.locator('.wz-step textarea').fill('A simple test slate');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  await expect(page.locator('.wz-step .status-ok')).toContainText('Passes SPX validation');
  // The result renders live in the wizard preview.
  await expect(page.locator('.wz-side iframe')).toBeVisible();
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.locator('.wz-modal')).toBeHidden();
  await expect(page.locator('.topbar .tpl-name')).toHaveText('Test Slate');
  await page.waitForTimeout(650); // preview rebuild
  await expect(page.frameLocator('iframe.preview-frame').locator('#f0')).toHaveText('Hello AI');
});

test('describe-it: an invalid first answer triggers the automatic repair round', async ({ page }) => {
  let calls = 0;
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) => {
    calls += 1;
    return route.fulfill(toolResponse(calls === 1 ? INVALID_TEMPLATE : VALID_TEMPLATE));
  });
  await openAiStep(page);
  await page.locator('.wz-step textarea').fill('A slate that needs a repair round');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  await expect(page.locator('.wz-step .status-ok')).toContainText('Passes SPX validation');
  expect(calls).toBe(2); // generate + one repair
});

test('describe-it: refine sends the current code back through modify', async ({ page }) => {
  const prompts: string[] = [];
  await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
    const body = route.request().postDataJSON() as { messages: { content: { type: string; text?: string }[] }[] };
    const text = body.messages.map((m) => (Array.isArray(m.content) ? m.content.map((c) => c.text ?? '').join(' ') : '')).join(' ');
    prompts.push(text);
    return route.fulfill(toolResponse({ ...VALID_TEMPLATE, name: prompts.length > 1 ? 'Test Slate v2' : 'Test Slate' }));
  });
  await openAiStep(page);
  await page.locator('.wz-step textarea').fill('A simple test slate');
  await page.getByRole('button', { name: '✦ Generate' }).click();
  await expect(page.locator('.wz-step .status-ok')).toBeVisible();
  await page.getByPlaceholder(/Refine it/).fill('make the name bigger');
  await page.getByRole('button', { name: 'Refine', exact: true }).click();
  await expect(page.locator('.change-preview strong')).toHaveText('Test Slate v2');
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
