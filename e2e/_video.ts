// Shared harness for the video-editor specs that need the REAL Claude provider path (the
// offline stub can't express "the model emitted X"). The Anthropic API is mocked at the
// network level, so everything downstream - the staged harness, the forced tools, validation,
// the repair loop, the apply - runs exactly as in production, on emits we choose.

import { expect, type Page, type Route } from '@playwright/test';

/** The player host iframe's content (Playwright reaches into sandboxed frames). */
export function player(page: Page) {
  return page.frameLocator('.video-player-frame');
}

export interface EmittedModule {
  summary: string;
  tsx: string;
  inputs: { key: string; type: string; label: string; default: string | number }[];
}

const MOTION_PLAN = {
  concept: 'A headline holds centre.',
  visualDirection: 'Dark stage, centred type.',
  typography: 'One bold sans headline.',
  background: 'Near-black.',
  easingApproach: 'Clamped interpolate.',
  assetUsage: 'none',
  phases: [{ name: 'Hold', startSec: 0, endSec: 5, description: 'The headline holds centre.' }],
};

function toolResponse(name: string, input: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      content: [{ type: 'tool_use', id: 'tu_1', name, input }],
      stop_reason: 'tool_use',
    }),
  };
}

/**
 * Answer every Claude call by its forced tool. `modules` are handed out in order to successive
 * emit_remotion_module calls (the first is the generation, the next are refinements); the last
 * one repeats once the list runs out.
 *
 * `delayMs` holds each emit back before answering. Set it whenever the test depends on the
 * LIVE PROBE half of validation: a real generation takes seconds, by which time the preview
 * has mounted and registered its bridge, but an instantly-answered mock beats the player to
 * the screen and validation falls back to the static checks alone.
 */
export async function mockClaude(
  page: Page,
  modules: EmittedModule[],
  { delayMs = 0 }: { delayMs?: number } = {},
): Promise<{ emits: () => number }> {
  let emits = 0;
  await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
    const body = route.request().postDataJSON() as { tools?: { name: string }[] };
    const tool = body.tools?.[0]?.name ?? '';
    if (tool === 'emit_motion_plan') return route.fulfill(toolResponse(tool, MOTION_PLAN));
    if (tool === 'detect_skills') return route.fulfill(toolResponse(tool, { skills: [] }));
    const module = modules[Math.min(emits, modules.length - 1)];
    emits += 1;
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return route.fulfill(toolResponse('emit_remotion_module', module));
  });
  return { emits: () => emits };
}

/**
 * Fail loudly when the dev server carries a REAL AI key.
 *
 * The suite pins offline mode through `webServer.env`, but `reuseExistingServer` means a
 * server already running on this checkout's port is reused with whatever `.env` it started
 * from. Since the video bench wants a real key in `.env` (scripts/video-bench.mjs), a
 * hand-started server makes the stub-provider specs drive the REAL provider: they fail as a
 * baffling "no assistant turn in 10s", and - the part that actually matters - each one fires
 * a live generation and SPENDS MONEY. Observed six specs doing exactly that. Assert the
 * transport before touching the wizard, so the failure names its own cause on the first line
 * and no generation is ever started.
 *
 * Specs that mock the API at the network level (mockClaude + useFakeAiKey) seed their own
 * key into localStorage and are unaffected; this guard is for the stub-provider specs.
 */
export async function expectOfflineAi(page: Page): Promise<void> {
  const configured = await page.evaluate(async () => {
    const { aiConfigured } = await import('/src/ai/settings.ts');
    return aiConfigured();
  });
  expect(
    configured,
    'this spec needs the OFFLINE stub provider, but the dev server resolves AI as configured - ' +
      "a hand-started server on this checkout's port is being reused with a real key in .env. " +
      'Stop it and let the suite start its own (see CLAUDE.md "Verifying changes").',
  ).toBe(false);
}

/** A fake key, so the real provider runs and the route above answers it. */
export async function useFakeAiKey(page: Page): Promise<void> {
  await page.addInitScript(() =>
    localStorage.setItem('spx-gfx-ai', JSON.stringify({ apiKey: 'sk-ant-test', model: 'claude-sonnet-5' })),
  );
}

/** Create a video project through the wizard and wait for its first generation to land. */
export async function createVideoProject(page: Page): Promise<void> {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await page.getByRole('button', { name: 'Countdown', exact: true }).click();
  await page.getByTestId('video-create').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await expect(page.locator('.ai-msg.assistant').first()).toBeVisible({ timeout: 20_000 });
}
