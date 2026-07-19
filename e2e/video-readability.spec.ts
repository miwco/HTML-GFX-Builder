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

import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  createHyperframesProject,
  createVideoProject,
  mockClaude,
  player,
  useFakeAiKey,
  type EmittedModule,
} from './_video';

/** A benched lower-third whose hero text sits ~3300px left of the frame for its whole hold -
 *  nothing in it is readable, so the runtime checks must flag it at every hold frame. Read
 *  from disk, not fetched: the dev server injects its HMR client into any .html it serves,
 *  which would trip the external-script rule before the live probe ever ran. */
const OFF_FRAME_LOWER_THIRD = readFileSync(
  new URL('./fixtures/hf-transparent-lower-third.html', import.meta.url),
  'utf8',
);
const FIXTURE_SETTINGS = { width: 1920, height: 1080, fps: 30, durationInFrames: 120, transparent: true };

/**
 * `boxWidth` decides the verdict: 420 crops the headline, 1600 gives it room. `shiftX` slides
 * the text inside that box - large negative values push it entirely outside, which is a TOTAL
 * crop (nothing painted) rather than a partial one, and the two are gated differently.
 */
function moduleFor(summary: string, boxWidth: number, shiftX = 0): EmittedModule {
  return {
    summary,
    tsx: `import { AbsoluteFill } from 'remotion';

export default function Composition({ fields = {} }: { fields?: Record<string, string | number> }) {
  const headline = fields.headline ?? 'BROADCAST KITCHEN';
  return (
    <AbsoluteFill style={{ background: '#101318', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: ${boxWidth}, overflow: 'hidden' }}>
        <div style={{ color: '#fff', fontSize: 96, fontWeight: 800, whiteSpace: 'nowrap', marginLeft: ${shiftX} }}>
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

  test('a TOTAL crop is kept failed instead of shipping with a warning', async ({ page }) => {
    // The counterpart of the test above, and the line between them is the whole point. That
    // one survives its repair rounds and ships, because a partial crop might be a false
    // positive or still legible. This one paints NOTHING - the headline sits far outside its
    // own clipping box at every hold frame - which cannot be a false positive, so the
    // demotion must not rescue it. Measured shipping for real before this rule existed
    // (docs/HYPERFRAMES_QUALITY.md, the re-measurement's r1).
    const { emits } = await mockClaude(page, [moduleFor('Headline pushed off its card.', 1600, -4000)], AS_SLOW_AS_REAL);
    await createVideoProject(page);

    await expect.poll(() => emits(), { timeout: 40_000 }).toBe(3); // generation + 2 repair rounds
    const reply = page.locator('.ai-msg.assistant').last();
    await expect(reply, 'a composition with no visible text must not be presented as done').toContainText(
      'failed validation',
    );
    // The previous working composition is kept, and the failure names the total crop.
    await expect(page.getByText(/CUT OFF - 100%/)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('the gate reports whether it actually ran', () => {
  // The findings above exist ONLY when a preview is mounted to measure them. A validation
  // with no player attached has therefore checked NOTHING - but it used to return an empty
  // error list, which is indistinguishable from a clean result. Since the repair loop only
  // fires on !ok, a composition whose text sits permanently off-frame sailed through
  // untouched, and the same input passed or failed purely on whether the preview happened to
  // be mounted: stable within a session, contradictory across them. `probed` is what makes
  // "not checked" legible, and both halves of that contract are pinned here.

  test('a validation that could not measure anything says so instead of reporting clean', async ({ page }) => {
    await page.goto('/app');
    const results = await page.evaluate(
      async ([html, settings]) => {
        const { validateHyperframesComposition } = await import('/src/video/hyperframes/validate.ts');
        const { HyperframesBridge } = await import('/src/video/hyperframes/bridge.ts');
        const sum = (r: { ok: boolean; probed: boolean; errors: { rule: string }[] }) => ({
          ok: r.ok,
          probed: r.probed,
          rules: r.errors.map((e) => e.rule),
        });
        return {
          // No preview at all - the offline stub's shape, and every headless caller.
          nullBridge: sum(await validateHyperframesComposition(html, settings, [], null)),
          // A bridge exists but its iframe was never attached: the panel had not mounted yet.
          neverAttached: sum(
            await validateHyperframesComposition(html, settings, [], new HyperframesBridge({})),
          ),
        };
      },
      [OFF_FRAME_LOWER_THIRD, FIXTURE_SETTINGS] as const,
    );

    for (const [name, r] of Object.entries(results)) {
      expect(r.probed, `${name}: nothing was measured, so probed must say so`).toBe(false);
      expect(r.rules, `${name}: no runtime finding of any kind can exist without a probe`).toEqual([]);
    }
  });

  test('with a preview mounted the checks run - and a bridge that died mid-validation recovers onto the live one', async ({
    page,
  }) => {
    await createHyperframesProject(page);
    await expect(page.locator('.ai-msg.assistant').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.video-player-frame')).toBeVisible();
    // Deliberately NOT waiting for the preview to go quiet. The panel rebuilds this same
    // frame on a debounce after a generation applies, so validating right now races that
    // rebuild - which is the point: validation mounts its candidate and probes it as ONE
    // bridge chain entry, so a rebuild cannot land in between and have the checks measure
    // the project's composition instead. Waiting here would hide a regression in exactly
    // that guarantee.

    const results = await page.evaluate(
      async ([html, settings]) => {
        const { validateHyperframesComposition } = await import('/src/video/hyperframes/validate.ts');
        const { HyperframesBridge } = await import('/src/video/hyperframes/bridge.ts');
        const { getActiveHyperframesBridge } = await import('/src/video/bridgeRegistry.ts');
        const sum = (r: { ok: boolean; probed: boolean; errors: { rule: string }[] }) => ({
          ok: r.ok,
          probed: r.probed,
          rules: r.errors.map((e) => e.rule),
        });
        const live = getActiveHyperframesBridge();
        // A bridge disposed under a remount must not take the checks down with it: the
        // validator retries against whatever preview is mounted NOW.
        const dead = new HyperframesBridge({});
        dead.dispose();
        // Whether the fixture is still the mounted document when the probe finishes. If a
        // preview rebuild raced in and replaced it, the findings describe some other
        // composition and a "clean" verdict means nothing - so the assertions check this
        // rather than silently trusting an empty list.
        const fixtureStillMounted = () =>
          (document.querySelector('.video-player-frame') as HTMLIFrameElement | null)
            ?.getAttribute('srcdoc')
            ?.includes('name-mask') ?? false;
        const a = live ? sum(await validateHyperframesComposition(html, settings, [], live)) : null;
        const aMounted = fixtureStillMounted();
        const b = sum(await validateHyperframesComposition(html, settings, [], dead));
        const bMounted = fixtureStillMounted();
        return {
          mountedPreview: a ? { ...a, fixtureStillMounted: aMounted } : null,
          deadBridgeRecovers: { ...b, fixtureStillMounted: bMounted },
        };
      },
      [OFF_FRAME_LOWER_THIRD, FIXTURE_SETTINGS] as const,
    );

    expect(results.mountedPreview, 'the mounted preview registers itself for sibling validators').not.toBeNull();
    for (const [name, r] of Object.entries(results)) {
      expect(r!.probed, `${name}: the checks must have actually run`).toBe(true);
      expect(
        r!.fixtureStillMounted,
        `${name}: the probe measured whatever was mounted - if a rebuild replaced the fixture, ` +
          'its verdict is about the wrong composition',
      ).toBe(true);
      // Nothing of this fixture's text is painted, so it escalates past the soft rule.
      expect(r!.rules, `${name}: text painted nowhere is a TOTAL clip`).toContain('text-clip-total');
      expect(r!.ok, `${name}: an unreadable composition must not validate`).toBe(false);
    }
  });
});
