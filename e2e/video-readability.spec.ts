// Text clipping as a GENERATION gate, not just a bench observation.
//
// The failure this pins shipped twice before it was detectable: a hero headline cropped by
// its own card - "BROADCAST KITCHEN" painting as "BROADCAST KITCH" - passed compile, the
// static contract, and the runtime probe, because nothing throws when glyphs are cut. The
// player host now measures the glyph extent at the hold frames (src/video/textChecks.js,
// inlined into the host at build time) and the validator turns a persistent crop into a
// repair round.
//
// The Anthropic API is mocked at the network level, so the real provider path runs: motion
// plan, module emit, validation, repair, apply - on emits we choose.

import { test, expect } from '@playwright/test';
import { createVideoProject, mockClaude, player, useFakeAiKey, type EmittedModule } from './_video';

/** `boxWidth` decides the verdict: 420 crops the headline, 1600 gives it room. */
function moduleFor(summary: string, boxWidth: number): EmittedModule {
  return {
    summary,
    tsx: `import { AbsoluteFill } from 'remotion';

export default function Composition({ fields = {} }: { fields?: Record<string, string | number> }) {
  const headline = fields.headline ?? 'BROADCAST KITCHEN';
  return (
    <AbsoluteFill style={{ background: '#101318', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: ${boxWidth}, overflow: 'hidden' }}>
        <div style={{ color: '#fff', fontSize: 96, fontWeight: 800, whiteSpace: 'nowrap' }}>
          {headline}
        </div>
      </div>
    </AbsoluteFill>
  );
}
`,
    inputs: [{ key: 'headline', type: 'text', label: 'Headline', default: 'BROADCAST KITCHEN' }],
  };
}

test('the HyperFrames runtime runs the same checks as the Remotion host', async ({ page }) => {
  // Both engines inline ONE implementation (src/video/textChecks.js) - the Remotion host at
  // build time, the HyperFrames driver at compose time - because neither opaque-origin
  // runtime can import a module from the app. This pins that the HyperFrames half is
  // actually there and reaches the same verdict on the same two documents.
  await page.goto('/app');
  await page.getByRole('button', { name: 'Video or animation with AI' }).click();
  await page.getByTestId('video-engine-hyperframes').click();
  await page.getByRole('button', { name: 'Sports stinger', exact: true }).click();
  await page.getByTestId('video-create').click();
  await expect(page.getByTestId('video-shell')).toBeVisible();
  await expect(page.locator('.ai-msg.assistant').first()).toBeVisible({ timeout: 10_000 });

  const secs = await page.evaluate(async () => {
    const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
    const p = useVideoProjectStore.getState().project;
    return p.durationInFrames / p.fps;
  });

  const documentWith = (boxWidth: number) => `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /><title>t</title>
<style>
  body { margin: 0; }
  #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #101319; }
  .card { position: absolute; left: 200px; top: 480px; width: ${boxWidth}px; overflow: hidden; }
  .headline { color: #fff; font: 800 96px Arial; white-space: nowrap; }
</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${secs}">
  <section class="clip" data-start="0" data-duration="${secs}" data-track-index="1">
    <div class="card"><div class="headline">BROADCAST KITCHEN</div></div>
  </section>
</div>
<script>
  window.__timelines = window.__timelines || {};
  var tl = gsap.timeline({ paused: true });
  tl.to('#root', { opacity: 1, duration: 0.1 }, 0);
  window.__timelines['main'] = tl;
</script>
</body>
</html>`;

  const clipFindings = async (boxWidth: number) => {
    await page.evaluate(async (doc) => {
      const { useVideoProjectStore } = await import('/src/store/videoProjectStore.ts');
      useVideoProjectStore.getState().setSource(doc);
    }, documentWith(boxWidth));
    // The preview reloads on a debounce, and BOTH documents show the same headline - so
    // waiting on the text would read the PREVIOUS composition. Wait for this document's
    // own card width to reach the composed srcdoc instead.
    await expect
      .poll(
        () =>
          page
            .locator('.video-player-frame')
            .evaluate((el: HTMLIFrameElement) => el.getAttribute('srcdoc') ?? ''),
        { timeout: 10_000 },
      )
      .toContain(`width: ${boxWidth}px`);
    await expect(page.frameLocator('.video-player-frame').getByText('BROADCAST KITCHEN')).toBeVisible({
      timeout: 10_000,
    });
    return page
      .frameLocator('.video-player-frame')
      .locator('body')
      .evaluate(
        () =>
          (window as unknown as { __noacgTextChecks?: { clip: () => { message: string }[] } })
            .__noacgTextChecks?.clip() ?? null,
      );
  };

  const cropped = await clipFindings(420);
  expect(cropped).not.toBeNull();
  expect(cropped!.length).toBeGreaterThan(0);
  expect(cropped![0].message).toContain('BROADCAST KITCHEN');
  expect(cropped![0].message).toContain('CUT OFF');

  expect(await clipFindings(1600)).toEqual([]);
});

// Both cases hang on the LIVE probe, so the emits are delayed: an instant answer would beat
// the preview to the screen and validation would fall back to the static checks (see mockClaude).
const AS_SLOW_AS_REAL = { delayMs: 800 };

// These two need the real provider (mocked at the network level); the HyperFrames case above
// deliberately runs on the OFFLINE stub, so the fake key is scoped to this block.
test.describe('the generation gate', () => {
  test.beforeEach(async ({ page }) => {
    await useFakeAiKey(page);
  });

  test('a cropped headline is sent back for repair, and the fixed version applies', async ({ page }) => {
    const { emits } = await mockClaude(
      page,
      [moduleFor('Headline in a tight card.', 420), moduleFor('Headline given room.', 1600)],
      AS_SLOW_AS_REAL,
    );
    await createVideoProject(page);

    // Two emits: the generation plus exactly one repair round - the crop was caught and the
    // second, fitting composition passed.
    await expect.poll(() => emits(), { timeout: 20_000 }).toBe(2);
    await expect(page.locator('.ai-msg.assistant').last()).toContainText('Headline given room.');
    await expect(page.locator('.ai-msg.assistant').last()).not.toContainText('failed validation');
    await expect(player(page).getByText('BROADCAST KITCHEN')).toBeVisible({ timeout: 10_000 });
  });

  test('a crop that survives both repair rounds ships with a warning instead of being thrown away', async ({ page }) => {
    // The model never fixes it (mockClaude repeats its last module), so the finding outlives
    // the repair budget. A readability finding is not a broken composition: the user waited
    // for this, so it applies and the crop is surfaced as a warning - the SPX harness's rule
    // for its editability findings.
    const { emits } = await mockClaude(page, [moduleFor('Headline in a tight card.', 420)], AS_SLOW_AS_REAL);
    await createVideoProject(page);

    await expect.poll(() => emits(), { timeout: 40_000 }).toBe(3); // generation + 2 repair rounds
    const reply = page.locator('.ai-msg.assistant').last();
    await expect(reply).toContainText('Headline in a tight card.');
    await expect(reply).not.toContainText('failed validation');
    await expect(player(page).getByText('BROADCAST KITCHEN')).toBeVisible({ timeout: 10_000 });
  });
});
