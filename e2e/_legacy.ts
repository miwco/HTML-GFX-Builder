import { expect, type Page } from '@playwright/test';
import { awaitPreviewRebuild } from './_preview';

// LEGACY TEMPLATES, for the specs that cover what Phase 8 deliberately KEPT.
//
// Every category creates as a NOACG_ANIM data block, so no wizard path produces a legacy marked
// region any more. Legacy regions still exist in the wild, though — a project saved before the
// migration, an import, hand-written GSAP — and the dock picks the editing surface from the
// CODE, never from the category. These helpers build each of the three shapes it must handle.

const OPEN = '/* == ANIMATION';
const CLOSE = '/* == END ANIMATION == */';

/** Swap the current template's marked region for `region`, and apply it (one undoable apply). */
async function spliceRegion(page: Page, region: string) {
  await page.evaluate(async (body) => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const store = useTemplateStore.getState();
    const tpl = store.template;
    const start = tpl.js.indexOf('/* == ANIMATION');
    const end = tpl.js.indexOf('/* == END ANIMATION == */');
    store.applyTemplate({
      ...tpl,
      js: tpl.js.slice(0, start) + body + tpl.js.slice(end + '/* == END ANIMATION == */'.length),
    });
  }, region);
  await awaitPreviewRebuild(page);
}

/**
 * A legacy region the importer CAN read — the ordinary case: a project saved before the
 * migration. Its motion is shown on the step timeline, READ-ONLY, with "use keyframes" one
 * click away; there is no second editing surface for it.
 */
export async function applyLegacyRegion(
  page: Page,
  opts: { prefix: string; presetId: string; steps?: boolean },
) {
  const region = await page.evaluate(async ({ prefix, presetId, steps }) => {
    const { useTemplateStore } = await import('/src/store/templateStore.ts');
    const { anyPresetById } = await import('/src/blocks/presetRegistry.ts');
    const { countLines } = await import('/src/model/structure.ts');
    const tpl = useTemplateStore.getState().template;
    const preset = anyPresetById(presetId as Parameters<typeof anyPresetById>[0]);
    return preset.emit({
      prefix,
      lineCount: Math.max(1, countLines(tpl.html)),
      hasAccent: tpl.html.includes(`${prefix}-accent`),
      hasBars: tpl.html.includes(`${prefix}-bar-fill`),
      steps: !!steps,
      stepOutsideParts: [],
      speed: 1,
      easeIn: preset.autoEase.easeIn,
      easeOut: preset.autoEase.easeOut,
    });
  }, opts);
  await spliceRegion(page, region);
  await expect(page.getByTestId('timeline-v2')).toBeVisible();
  await expect(page.getByTestId('timeline-v2-convert')).toBeVisible();
}

/**
 * A legacy region the importer REFUSES: its motion is MEASURED inline (`x: -el.scrollWidth`),
 * so no static keyframe can hold it and the converter will not guess. This is the case
 * DYNAMIC_MOTION_SCOPE §8.1 keeps a read-only chart for — regenerating it would throw away the
 * owner's tuning, so it must still render truthfully somewhere.
 */
export async function applyUnconvertibleRegion(page: Page, prefix: string) {
  await spliceRegion(
    page,
    `${OPEN}
// Hand-written marquee: the travel is measured from the DOM, so the keyframe model cannot
// hold it and the importer refuses it rather than guessing.
var animSpeed = 1;
var easeIn = 'power3.out';
var easeOut = 'power2.in';

function buildInTimeline() {
  var tl = gsap.timeline();
  tl.fromTo('.${prefix}-box', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 / animSpeed, ease: easeIn });
  tl.to('#f0', { x: -document.querySelector('#f0').scrollWidth, duration: 6 / animSpeed, ease: 'none', repeat: -1 });
  return tl;
}

function buildOutTimeline() {
  var tl = gsap.timeline();
  tl.to('.${prefix}-box', { opacity: 0, duration: 0.3 / animSpeed, ease: easeOut });
  return tl;
}
${CLOSE}`,
  );
  await expect(page.getByTestId('timeline-overview')).toBeVisible();
}

/** A marked region the parser cannot read at all — hand-crafted past every known shape. */
export async function applyUnreadableRegion(page: Page) {
  await spliceRegion(page, `${OPEN}\n// hand-rolled beyond anything we emit\nvar tl = makeMagic();\n${CLOSE}`);
  await expect(page.getByTestId('timeline-unreadable')).toBeVisible();
}
