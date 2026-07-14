// The generic template assembler — everything that is the SAME for every category
// (lower thirds, info cards, end credits, tickers, …): heading font resolution
// (imported font wins over bundled), the :root style contract, the reset/canvas CSS,
// scale + max-text-width math, 9-zone positioning, the document skeleton, the SPX
// settings, and the JS runtime scaffold around the marked ANIMATION region.
//
// A category module (e.g. templates/lowerThirds/shared.ts) composes these pieces and
// adds its own structure contract (.lower-third / .info-card / .credits / .ticker) and motion module.

import { DEFAULT_SETTINGS, type Resolution, type SpxSettings } from '../../model/types';
import { customFontFaceCss, customFontStack, fontById, fontFaceCss, fontStack } from '../../model/fonts';
import type { ResolvedOptions, Zone9 } from '../../model/wizard';

// ── Fonts ────────────────────────────────────────────────────────────────────

/** The heading font's @font-face rule + CSS stack (imported font wins over bundled). */
export function resolveHeadingFont(o: ResolvedOptions): { face: string; stack: string } {
  if (o.customFont) {
    return { face: customFontFaceCss(o.customFont), stack: customFontStack(o.customFont) };
  }
  const bundled = fontById(o.fontId);
  return { face: fontFaceCss(bundled), stack: fontStack(bundled) };
}

// ── Size math ────────────────────────────────────────────────────────────────

/** One knob drives size choice AND resolution scaling (designs author px at 1080p). */
export function computeScale(o: ResolvedOptions): number {
  const resFactor = Math.min(o.resolution.width / 1920, o.resolution.height / 1080);
  return +(o.sizeScale * resFactor).toFixed(3);
}

/** The auto-fit cap: boxes never grow past this — text wraps to new rows instead. */
export function computeMaxTextWidth(res: Resolution): number {
  return Math.round(Math.min(res.width * 0.42, res.width - 2 * (res.width * 0.0625)));
}

/**
 * The auto-fit cap as emitted CSS. The measure follows --scale, so resizing the graphic
 * (Style panel size, canvas corner handle) widens the box instead of wrapping the same
 * pixel width tighter — but it never grows past the frame's horizontal safe area.
 * `maxPx` is the category cap at this resolution's default scale; dividing by the
 * resolution factor normalizes it to "px per unit of --scale" (--scale already carries
 * that factor, see computeScale).
 */
export function maxTextWidthCss(res: Resolution, maxPx: number): string {
  const resFactor = Math.min(res.width / 1920, res.height / 1080);
  const perScaleUnit = Math.round(maxPx / resFactor);
  const safeMax = Math.round(res.width - 2 * (res.width * 0.0625));
  return `min(calc(${perScaleUnit}px * var(--scale)), ${safeMax}px)`;
}

// ── Positioning: 9 zones snapped to safe areas ───────────────────────────────

export interface ZoneDecl {
  prop: string;
  value: string;
  comment: string;
}

/**
 * The full set of positioning declarations for an anchor zone (unused sides explicitly
 * reset so re-positioning an existing template fully overrides the previous zone).
 */
export function zoneDecls(zone: Zone9, nudge: { x: number; y: number }, res: Resolution): ZoneDecl[] {
  const hInset = Math.round(res.width * 0.0625); // ≈ classic 120 px side inset at 1920
  const topInset = Math.round(res.height * 0.08);
  const bottomInset = Math.round(res.height * 0.11);

  const [v, h] = zone.split('-') as ['top' | 'mid' | 'bottom', 'left' | 'center' | 'right'];
  const decls: ZoneDecl[] = [];
  const transforms: string[] = [];

  if (h === 'left') decls.push({ prop: 'left', value: `${hInset + nudge.x}px`, comment: 'inset from the left edge (safe area)' });
  if (h === 'right') decls.push({ prop: 'right', value: `${hInset - nudge.x}px`, comment: 'inset from the right edge (safe area)' });
  if (h === 'center') {
    decls.push({ prop: 'left', value: `calc(50% + ${nudge.x}px)`, comment: 'anchored to the horizontal center' });
    transforms.push('translateX(-50%)');
  }
  if (v === 'top') decls.push({ prop: 'top', value: `${topInset + nudge.y}px`, comment: 'inset from the top edge' });
  if (v === 'bottom') decls.push({ prop: 'bottom', value: `${bottomInset - nudge.y}px`, comment: 'inset from the bottom — wrapped text grows upward' });
  if (v === 'mid') {
    decls.push({ prop: 'top', value: `calc(50% + ${nudge.y}px)`, comment: 'anchored to the vertical center' });
    transforms.push('translateY(-50%)');
  }
  // Explicitly reset whatever this zone doesn't use, so zone changes fully override.
  const used = new Set(decls.map((d) => d.prop));
  for (const side of ['left', 'right', 'top', 'bottom']) {
    if (!used.has(side)) decls.push({ prop: side, value: 'auto', comment: 'not used by this anchor zone' });
  }
  decls.push({
    prop: 'transform',
    value: transforms.length > 0 ? transforms.join(' ') : 'none',
    comment: transforms.length > 0 ? 'center on the anchor point' : 'no centering needed',
  });
  const align = h === 'right' ? 'right' : h === 'center' ? 'center' : 'left';
  decls.push({ prop: 'text-align', value: align, comment: 'lines align toward the anchor edge' });
  return decls;
}

/** Pretty CSS text for the zone declarations (used in freshly generated templates). */
export function zoneCssText(zone: Zone9, nudge: { x: number; y: number }, res: Resolution): string {
  return zoneDecls(zone, nudge, res)
    // Freshly generated code omits the explicit "auto"/"none" resets for readability.
    .filter((d) => !(d.value === 'auto' || (d.prop === 'transform' && d.value === 'none')))
    .map((d) => `  ${d.prop}: ${d.value};`.padEnd(35) + `/* ${d.comment} */`)
    .join('\n');
}

// ── CSS building blocks ──────────────────────────────────────────────────────

/** The :root style contract — the variables the Style panel (and the user) retint. */
export function rootVarsCss(o: ResolvedOptions, headingStack: string, scale: number): string {
  return `/* ── Style contract: change these variables to retint the whole graphic. ── */
:root {
  --accent: ${o.palette.accent};           /* the one accent color */
  --text-color: ${o.palette.text};          /* primary text */
  --text-dim: ${o.palette.textDim};  /* secondary text (title line) */
  --panel-bg: ${o.palette.panel};  /* the panel behind the text */
  --font-heading: ${headingStack};  /* the graphic's typeface */
  --scale: ${scale};                  /* size multiplier (also handles resolution) */
}`;
}

/** Reset + transparent canvas at the output resolution. */
export function resetCanvasCss(res: Resolution): string {
  return `/* Reset and a transparent canvas (broadcast graphics render over video). */
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: ${res.width}px;
  height: ${res.height}px;
  overflow: hidden;                /* nothing ever scrolls on air */
  background: transparent;
  font-family: var(--font-heading);
}`;
}

// ── Document + runtime skeletons ─────────────────────────────────────────────

/** The full HTML document around a category's body markup. */
export function documentHtml(args: { title: string; definitionBlock: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${args.title}</title>

  <!-- GSAP animation library (bundled locally — no internet needed at playout). -->
  <script src="js/gsap.min.js"></script>

  <!-- Template styles and logic. -->
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <!-- SPX template definition: the data fields shown to the operator. -->
  ${args.definitionBlock}
</head>
<body>
${args.body}
</body>
</html>
`;
}

/** SPX playout settings shared by generated templates. */
export function baseSettings(meta: { name: string; uicolor: string }, o: ResolvedOptions, extra?: Partial<SpxSettings>): SpxSettings {
  return {
    ...DEFAULT_SETTINGS,
    description: meta.name,
    playlayer: '7',
    webplayout: '7',
    steps: o.animation.steps && o.lines.length > 1 ? String(o.lines.length) : '1',
    uicolor: meta.uicolor,
    ...extra,
  };
}

/**
 * The speed knob, read from wherever the template keeps it. Design-owned runtime code lives
 * OUTSIDE the marked ANIMATION region, so it must never reach for the region's `animSpeed`
 * variable directly — that variable only exists in a legacy emit. This helper is the one
 * sanctioned reader (src/templates/CLAUDE.md, "Template runtime rule").
 */
export const motionSpeedJs = `// motionSpeed(): the template's speed knob. The NOACG_ANIM data block owns it; a legacy
// animSpeed variable is honored too, and hand-written animation code defaults to 1.
function motionSpeed() {
  if (typeof NOACG_ANIM !== 'undefined' && NOACG_ANIM.speed) return NOACG_ANIM.speed;
  if (typeof animSpeed !== 'undefined' && animSpeed) return animSpeed;
  return 1;
}`;

/**
 * The teachable field writer shared by every category's update(): text into text elements,
 * image PATHS into <img id="fN"> elements (SPX image fields — ftype "filelist" — send the
 * picked file's path, e.g. "images/logo.png").
 */
export const setFieldValueJs = `// Write one field value into its element. Text fields get plain
// text (operator input never runs as HTML); an <img id="fN"> gets the value as its image path.
function setFieldValue(el, value) {
  if (el.tagName === 'IMG') {
    if (value) { el.src = value; el.style.display = ''; }
    else { el.removeAttribute('src'); el.style.display = 'none'; }  // empty = show the design's placeholder
    // The img's parent gets .has-image so the CSS can hide a placeholder mark, resize, etc.
    if (el.parentNode && el.parentNode.classList) el.parentNode.classList.toggle('has-image', !!value);
  } else {
    el.textContent = value;
  }
}`;

/** The JS runtime scaffold: SPX entry points around the marked ANIMATION region. */
export function runtimeJs(name: string, animationBlock: string): string {
  return `// ${name} — generated by NoaCG Studio. SPX calls update(), play(), stop(), next().

${setFieldValueJs}

// update(data): SPX sends field values as JSON, e.g. {"f0":"Ada","f1":"Engineer"}.
// Each value is written into the element whose id matches the field name (f0 -> id="f0").
function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) {
    var el = document.getElementById(key);
    if (el) setFieldValue(el, fields[key]);
  }
}

// play(): take the graphic on air — run the entrance timeline.
function play() {
  gsap.killTweensOf('*');          // stop any animation that is still running
  buildInTimeline();
}

// stop(): take the graphic off air — run the exit timeline.
function stop() {
  gsap.killTweensOf('*');
  buildOutTimeline();
}

// next(): SPX Continue — reveals the next step on multi-step graphics (no-op otherwise).
function next() {
  if (typeof revealNextStep === 'function') revealNextStep();
}

${animationBlock}
`;
}
