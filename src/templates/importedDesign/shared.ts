// The IMPORTED DESIGN category: artwork the user made elsewhere (a flat image), with the
// graphic's text fields placed on top of it.
//
// This category self-assembles from shared/base.ts rather than going through
// assembleStandard, for one concrete reason: the standard assembler gives .<prefix>-box
// `width: fit-content` plus the auto-fit wrap cap, which exists so a house design's panel
// hugs the operator's text. Here the ARTWORK decides the size and the text is placed on it,
// so the box must be exactly the artwork's width — a frame-sized design would otherwise be
// capped to the text safe area and shrink. Everything else (the :root contract, the reset,
// zones, the runtime scaffold, the data-block conversion) is the shared machinery, unchanged.
//
// What this buys, and the whole point of building it this way: the output is an ordinary
// standard-contract template. It has a .imported-design-box, so detectPrefix finds it, the
// TemplatePart registry names its parts, the canvas can select them, the timeline dock reads
// its NOACG_ANIM block, and all six export targets package it — with no changes to any of
// them. See docs/IMPORT_MVP.md.

import type { SpxTemplate } from '../../model/types';
import { definitionScriptBlock } from '../../model/spxDefinition';
import { resolveEasing } from '../../model/easings';
import { fontById, fontFaceCss, fontStack } from '../../model/fonts';
import {
  fieldsFromOptions,
  paletteById,
  resolveOptions,
  type DesignArt,
  type LineSpec,
  type LineStyle,
  type Palette,
  type ResolvedOptions,
  type TemplateVariant,
  type WizardOptions,
} from '../../model/wizard';
import {
  baseSettings,
  computeScale,
  documentHtml,
  resetCanvasCss,
  resolveHeadingFont,
  rootVarsCss,
  runtimeJs,
  zoneCssText,
} from '../shared/base';
import { convertToDataRegion } from '../shared/standard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';
import { DESIGN_PRESETS } from './designPresets';

/** The class prefix — this is what makes the output a standard-contract template. */
export const PREFIX = 'imported-design';

/** Stand-in size used only when a preview renders the variant before artwork exists. */
const NO_ART: DesignArt = { path: '', width: 960, height: 270 };

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Where a line starts life when the user has not placed it yet: stacked in the artwork's
 * lower-left, the lower-third convention, sized relative to the artwork's own height so the
 * defaults look sane on a frame-sized design and on a cropped strip alike. Every value here
 * is a starting point the user drags and restyles — it is not a layout the design imposes.
 */
export function defaultLineStyle(index: number, art: DesignArt, palette: Palette): LineStyle {
  const sizeRatio = [0.043, 0.028, 0.024][index] ?? 0.024;
  const yRatio = [0.74, 0.82, 0.88][index] ?? 0.88;
  return {
    x: Math.round(art.width * 0.06),
    y: Math.round(art.height * yRatio),
    align: 'left',
    fontSize: Math.round(art.height * sizeRatio),
    weight: index === 0 ? 700 : 400,
    color: index === 0 ? palette.text : palette.textDim,
    fontId: null,
  };
}

/** A line's placement + type, filling in the defaults for one the user has not touched. */
export function lineStyleOf(line: LineSpec, index: number, o: ResolvedOptions): LineStyle {
  return line.style ?? defaultLineStyle(index, o.designArt ?? NO_ART, o.palette);
}

/** A line's CSS font stack: its own bundled font, or the graphic's --font-heading. */
function lineFontStack(style: LineStyle): string {
  return style.fontId ? fontStack(fontById(style.fontId)) : 'var(--font-heading)';
}

/**
 * Every @font-face the template needs: the heading font plus each distinct font a line picked
 * for itself. Deduped by the emitted rule, so choosing the heading font on a line adds nothing.
 */
function fontFaces(o: ResolvedOptions): string {
  const faces = [resolveHeadingFont(o).face];
  o.lines.forEach((line, i) => {
    const id = lineStyleOf(line, i, o).fontId;
    if (!id) return;
    const face = fontFaceCss(fontById(id));
    if (!faces.includes(face)) faces.push(face);
  });
  return faces.join('\n\n');
}

/** The artwork element — or, with no artwork yet, an empty box so previews still render. */
function artHtml(art: DesignArt): string {
  if (!art.path) {
    return `    <!-- No artwork imported yet — the design's own image belongs here. -->
    <div class="${PREFIX}-art"></div>`;
  }
  return `    <!-- The imported artwork. It IS the design: the text below sits on top of it. -->
    <img class="${PREFIX}-art" src="${art.path}" alt="" />`;
}

/** One masked text field per line, placed over the artwork by its own CSS rule below.
 *  A bare design (the normal create — fields are added in the editor's Data tab) gets a
 *  comment saying where they will land instead. */
function fieldsHtml(o: ResolvedOptions): string {
  if (o.lines.length === 0) {
    return `    <!-- No fields yet — add text, number, and image fields from the Data tab.
         Each lands here as its own masked, placed element. -->`;
  }
  return o.lines
    .map(
      (line, i) =>
        `    <!-- ${line.title} (f${i}) — SPX writes this field's value straight into the element. -->\n` +
        `    <div class="${PREFIX}-mask" id="fw${i}"><span id="f${i}">${escapeHtml(line.sample)}</span></div>`,
    )
    .join('\n');
}

/**
 * Per-line placement and type. The wrapper carries the POSITION (and the mask an entrance can
 * slide the text inside); the span carries the TYPE. They are separate elements because they
 * are separate decisions: the canvas drags the wrapper, the Fields step restyles the span.
 */
function fieldCss(o: ResolvedOptions): string {
  if (o.lines.length === 0) {
    return `/* None yet. Each field added from the Data tab gets its own placement rule here:
   the wrapper (#fwN) carries WHERE it sits, the field (#fN) carries HOW it looks. */`;
  }
  return o.lines
    .map((line, i) => {
      const st = lineStyleOf(line, i, o);
      // A free-placed line has no column to align inside, so "align" means which edge of the
      // text sits at x — expressed as a shift of the box, not text-align (which would do
      // nothing on a box that shrinks to its content).
      const shift =
        st.align === 'center' ? 'translateX(-50%)' : st.align === 'right' ? 'translateX(-100%)' : null;
      return `/* ${line.title} (f${i}) — drag it on the canvas to move it. */
#fw${i} {
  position: absolute;
  left: calc(${st.x}px * var(--scale));${' '.repeat(Math.max(1, 8 - String(st.x).length))}/* measured from the artwork's left edge */
  top: calc(${st.y}px * var(--scale));${' '.repeat(Math.max(1, 9 - String(st.y).length))}/* …and from its top edge */
${shift ? `  transform: ${shift};${' '.repeat(Math.max(1, 22 - shift.length))}/* the text's ${st.align} edge sits at the position */\n` : ''}  overflow: hidden;                 /* the line's mask — an entrance can slide the text within it */
}
#f${i} {
  display: inline-block;            /* so the line can move inside its mask */
  white-space: nowrap;              /* a placed line keeps its shape — it never reflows */
  font-family: ${lineFontStack(st)};
  font-size: calc(${st.fontSize}px * var(--scale));
  font-weight: ${st.weight};
  color: ${st.color};
}`;
    })
    .join('\n\n');
}

/** The preset to build with — always one of this category's, whatever a carried-over draft says. */
function designPreset(id: string): AnimPreset {
  return DESIGN_PRESETS.find((p) => p.id === id) ?? DESIGN_PRESETS[0];
}

/** Build the complete SpxTemplate for an imported design. */
export function assembleImportedDesign(o: ResolvedOptions): SpxTemplate {
  const art = o.designArt ?? NO_ART;
  const name = 'Imported design';
  const fields = fieldsFromOptions(o);
  // Steps are off: the whole design is one unit, so there is no sequence of lines to reveal
  // on a » press. A layer can still be given its own press later, from the timeline.
  const settings = baseSettings({ name, uicolor: '7' }, o, { steps: '1' });
  const scale = computeScale(o);

  // A frame-sized design covers the canvas, so it anchors at the origin: zone insets exist to
  // keep a house panel inside the text safe area, and applying them here would push the user's
  // own artwork off its own frame. A cropped design is a free-floating object and gets a zone.
  const fullFrame = art.width === o.resolution.width && art.height === o.resolution.height;
  const rootPosition = fullFrame
    ? `  left: 0;                         /* the artwork is frame-sized — it covers the canvas as drawn */
  top: 0;`
    : zoneCssText(o.zone, o.nudge, o.resolution);

  const html = documentHtml({
    title: name,
    definitionBlock: definitionScriptBlock(settings, fields),
    body: `  <!-- Imported design — the artwork, with this graphic's text fields on top of it. -->
  <div class="${PREFIX}">
    <div class="${PREFIX}-box">
${artHtml(art)}
${fieldsHtml(o)}
    </div>
  </div>`,
  });

  const css = `/* ${name} — generated by NoaCG Studio. Edit freely: this file is yours. */

${rootVarsCss(o, resolveHeadingFont(o).stack, scale)}

${fontFaces(o)}

${resetCanvasCss(o.resolution)}

/* ── Root position ── */
.${PREFIX} {
  position: absolute;
${rootPosition}
  opacity: 0;                      /* hidden until play() runs the entrance */
}

/* ── The design unit: the artwork and its text animate together as one box. ── */
.${PREFIX}-box {
  position: relative;              /* the text fields are placed against the artwork */
  width: calc(${art.width}px * var(--scale));  /* the artwork's own width drives the size */
  will-change: transform, opacity; /* hint the browser: this element animates */
}
.${PREFIX}-art {
  display: block;
  width: 100%;                     /* fills the box — so --scale resizes art and text together */
  height: ${art.path ? 'auto' : `calc(${art.height}px * var(--scale))`};${art.path ? '' : '\n  background: var(--panel-bg);      /* stand-in until the artwork is imported */'}
}

/* ── The text fields ── */
${fieldCss(o)}
`;

  const preset = designPreset(o.animation.presetId);
  const ease = resolveEasing(o.animation.easing, preset.autoEase);
  const cfg: PresetConfig = {
    prefix: PREFIX,
    lineCount: o.lines.length,
    hasAccent: false,
    steps: false,
    speed: o.animation.speed,
    easeIn: ease.easeIn,
    easeOut: ease.easeOut,
  };

  const template: SpxTemplate = {
    name,
    type: 'imported-design',
    resolution: o.resolution,
    fps: o.fps,
    html,
    css,
    js: runtimeJs(name, preset.emit(cfg)),
    fields,
    settings,
    assets: [...o.importedImages, ...(o.customFont ? [o.customFont.asset] : [])],
    layers: o.lines.map((line, i) => ({
      id: `f${i}`,
      type: 'text' as const,
      label: line.title,
      fieldId: `f${i}`,
      text: line.sample,
      styles: {},
    })),
  };

  return convertToDataRegion(template);
}

export const IMPORTED_DESIGN: TemplateVariant = {
  id: 'imp01',
  category: 'imported-design',
  name: 'Imported design',
  styleTag: 'minimal',
  description: 'Your own artwork, with editable text fields placed on top of it.',
  maxLines: 3,
  suggestedLines: [
    { title: 'Name', sample: 'Alexandra Riva' },
    { title: 'Title', sample: 'Chief Correspondent' },
  ],
  // The artwork IS the design — a logo drawn into it needs no slot from us.
  logo: 'none',
  animationPresets: ['design-fade', 'design-slide', 'design-pop', 'design-blur'],
  defaultPalette: paletteById('ivory'),
  defaultFontId: 'inter',
  defaultZone: 'bottom-left',
  create(options?: WizardOptions) {
    return assembleImportedDesign(resolveOptions(IMPORTED_DESIGN, options));
  },
};

export const IMPORTED_DESIGNS: TemplateVariant[] = [IMPORTED_DESIGN];
