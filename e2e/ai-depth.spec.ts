import { test, expect, type Page, type Route } from '@playwright/test';

// Era 3: the Describe-it step's example prompts + brainstorm chat (Anthropic mocked).

async function openAiStep(page: Page) {
  await page.goto('/app');
  await expect(page.locator('.wz-modal')).toBeVisible();
  await page.locator('[data-entry="ai"]').click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: 'sk-ant-test', model: 'claude-sonnet-5' })),
  );
});

test('example prompts fill the brief with one click', async ({ page }) => {
  await openAiStep(page);
  await expect(page.locator('.wz-example')).toHaveCount(8);
  await page.locator('.wz-example', { hasText: 'Election results' }).click();
  await expect(page.locator('.wz-step textarea')).toHaveValue(/Election results panel/);
});

test('brainstorm chat: replies render and the BRIEF line becomes the prompt', async ({ page }) => {
  await page.route('https://api.anthropic.com/v1/messages', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [{
          type: 'text',
          text:
            'A substitution graphic works best as a two-line lower third: player off (red arrow), player on (green arrow). Want the club crest in it?\n' +
            'BRIEF: A football substitution lower third: two fields (player off, player on) with red/green direction arrows, club crest image field on the left, sport family, bottom-left, snap-fast entrance.',
        }],
        stop_reason: 'end_turn',
      }),
    }),
  );
  await openAiStep(page);
  await page.getByRole('button', { name: /Brainstorm with AI/ }).click();
  await page.getByPlaceholder('Talk it through…').fill('halftime of a local derby, we need something for substitutions');
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  // The reply shows WITHOUT the BRIEF line; the brief is offered separately.
  await expect(page.locator('.ai-msg.assistant')).toContainText('two-line lower third');
  await expect(page.locator('.ai-msg.assistant')).not.toContainText('BRIEF:');
  await expect(page.locator('.ai-brief')).toContainText('substitution lower third');

  await page.getByRole('button', { name: 'Use as brief' }).click();
  await expect(page.locator('.wz-step textarea')).toHaveValue(/football substitution lower third/);
});
