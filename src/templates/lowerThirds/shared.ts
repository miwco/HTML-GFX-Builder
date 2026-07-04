// Shared scaffolding for all lower-third variants. A variant supplies only its unique design
// fragments (inner HTML + design CSS); this module assembles the complete, teachable template:
// document skeleton, SPX definition, :root style contract, @font-face, zone positioning,
// the auto-fit text pattern, the JS runtime scaffold, and the marked animation block.
//
// Standard structure contract (all variants; presets rely on it):
//   <div class="l3">            root — positioned by zone; opacity:0 until play()
//     [<div class="l3-accent">] optional accent shape
//     <div class="l3-box">      the panel; presets animate this
//       <div class="l3-mask"><span id="f0" class="l3-name">…</span></div>
//       <div class="l3-mask"><span id="f1" class="l3-title">…</span></div>
//     </div>
//   </div>

import { DEFAULT_SETTINGS, type Resolution, type SpxSettings, type SpxTemplate } from '../../model/types';
import { definitionScriptBlock } from '../../model/spxDefinition';
import { fontById, fontFaceCss, fontStack } from '../../model/fonts';
import { resolveEasing } from '../../model/easings';
import {
  fieldsFromOptions,
  resolveOptions,
  type ResolvedOptions,
  type TemplateVariant,
  type WizardOptions,
  type Zone9,
} from '../../model/wizard';
import { presetById, type PresetConfig } from './animPresets';

// ── What a variant author writes ─────────────────────────────────────────────

export interface L3Design {
  /** Inner HTML of the .l3 root (accent + box with masked lines). Use lineMasks(). */
  html: string;
  /** Variant-specific CSS for the box / lines / accent. Use var(--accent) etc. */
  css: string;
  /** Whether the design includes an .l3-accent element (presets animate it if present). */
  hasAccent: boolean;
}

export interface L3Meta {
  name: string;
  description: string;
  /** SPX UI color label, "1".."7". */
  uicolor: string;
}

// ── Small helpers for variant authors ────────────────────────────────────────

/** Class name for the Nth line (line 0 = name, 1 = title, 2 = kicker/extra). */
export function lineClass(index: number): string {
  return ['l3-name', 'l3-title', 'l3-extra'][index] ?? 'l3-extra';
}

/** The mask-wrapped line elements for the resolved options (SPX writes into id="fN"). */
export function lineMasks(o: ResolvedOptions, indent = '      '): string {
  return o.lines
    .map(
      (line, i) =>
        `${indent}<!-- ${line.title} (f${i}) — SPX writes this field's value straight into the element. -->\n` +
        `${indent}<div class="l3-mask"><span id="f${i}" class="${lineClass(i)}">${line.sample}</span></div>`,
    )
    .join('\n');
}

// ── Positioning: 9 zones snapped to safe areas ───────────────────────────────

interface ZoneCss {
  /** CSS declarations (commented) placed inside the .l3 rule. */
  decls: string;
}

function zoneCss(zone: Zone9, nudge: { x: number; y: number }, res: Resolution): ZoneCss {
  const hInset = Math.round(res.width * 0.0625); // ≈ classic 120 px side inset at 1920
  const topInset = Math.round(res.height * 0.08);
  const bottomInset = Math.round(res.height * 0.11);

  const [v, h] = zone.split('-') as ['top' | 'mid' | 'bottom', 'left' | 'center' | 'right'];
  const lines: string[] = [];
  const transforms: string[] = [];

  if (h === 'left') lines.push(`  left: ${hInset + nudge.x}px;           /* inset from the left edge (safe area) */`);
  if (h === 'right') lines.push(`  right: ${hInset - nudge.x}px;          /* inset from the right edge (safe area) */`);
  if (h === 'center') {
    lines.push(`  left: calc(50% + ${nudge.x}px);        /* anchored to the horizontal center */`);
    transforms.push('translateX(-50%)');
  }
  if (v === 'top') lines.push(`  top: ${topInset + nudge.y}px;            /* inset from the top edge */`);
  if (v === 'bottom') lines.push(`  bottom: ${bottomInset - nudge.y}px;         /* inset from the bottom — wrapped text grows upward */`);
  if (v === 'mid') {
    lines.push(`  top: calc(50% + ${nudge.y}px);         /* anchored to the vertical center */`);
    transforms.push('translateY(-50%)');
  }
  if (transforms.length > 0) {
    lines.push(`  transform: ${transforms.join(' ')};  /* center on the anchor point */`);
  }
  const align = h === 'right' ? 'right' : h === 'center' ? 'center' : 'left';
  lines.push(`  text-align: ${align};            /* lines align toward the anchor edge */`);
  return { decls: lines.join('\n') };
}

// ── The assembler ────────────────────────────────────────────────────────────

/**
 * Build the complete SpxTemplate from a variant's design + resolved options.
 * Everything generated here follows docs/DESIGN_LANGUAGE.md.
 */
export function assembleLowerThird(meta: L3Meta, design: L3Design, o: ResolvedOptions): SpxTemplate {
  const font = fontById(o.fontId);
  const fields = fieldsFromOptions(o);

  const settings: SpxSettings = {
    ...DEFAULT_SETTINGS,
    description: meta.name,
    playlayer: '7', // lower thirds sit high in the stack (docs use 7)
    webplayout: '7',
    // SPX: 1 = normal in/out; ≥2 enables the Continue button (one phase per revealed line).
    steps: o.animation.steps && o.lines.length > 1 ? String(o.lines.length) : '1',
    uicolor: meta.uicolor,
  };

  // One knob drives size choice AND resolution scaling (variants author px at 1080p).
  const resFactor = Math.min(o.resolution.width / 1920, o.resolution.height / 1080);
  const scale = +(o.sizeScale * resFactor).toFixed(3);

  // The panel never grows past this — text wraps to new rows instead (auto-fit pattern).
  const maxTextWidth = Math.round(Math.min(o.resolution.width * 0.42, o.resolution.width - 2 * (o.resolution.width * 0.0625)));

  const zone = zoneCss(o.zone, o.nudge, o.resolution);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${meta.name}</title>

  <!-- GSAP animation library (bundled locally — no internet needed at playout). -->
  <script src="js/gsap.min.js"></script>

  <!-- Template styles and logic. -->
  <link rel="stylesheet" href="css/template.css" />
  <script src="js/template.js"></script>

  <!-- SPX template definition: the data fields shown to the operator. -->
  ${definitionScriptBlock(settings, fields)}
</head>
<body>
  <!-- ${meta.name}. Hidden until play(); positioned by the .l3 rule in the CSS. -->
  <div class="l3">
${design.html}
  </div>
</body>
</html>
`;

  const css = `/* ${meta.name} — generated by SPX GFX Builder. Edit freely: this file is yours. */

/* ── Style contract: change these variables to retint the whole graphic. ── */
:root {
  --accent: ${o.palette.accent};           /* the one accent color */
  --text-color: ${o.palette.text};          /* primary text */
  --text-dim: ${o.palette.textDim};  /* secondary text (title line) */
  --panel-bg: ${o.palette.panel};  /* the panel behind the text */
  --font-heading: ${fontStack(font)};  /* the graphic's typeface */
  --scale: ${scale};                  /* size multiplier (also handles resolution) */
}

${fontFaceCss(font)}

/* Reset and a transparent canvas (broadcast graphics render over video). */
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: ${o.resolution.width}px;
  height: ${o.resolution.height}px;
  overflow: hidden;                /* nothing ever scrolls on air */
  background: transparent;
  font-family: var(--font-heading);
}

/* ── Root position (anchor zone) ── */
.l3 {
  position: absolute;
${zone.decls}
  opacity: 0;                      /* hidden until play() runs the entrance */
}

/* ── Auto-fit: the panel hugs its text and wraps instead of overflowing. ── */
.l3-box {
  width: fit-content;              /* the panel hugs the text */
  max-width: ${maxTextWidth}px;              /* never wider than this — text wraps instead */
  will-change: transform, opacity; /* hint the browser: this element animates */
}
.l3-mask {
  overflow: hidden;                /* lines animate in from behind this mask */
}
.l3-mask > span {
  display: inline-block;           /* so the line can move inside its mask */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* ── Design ── */
${design.css}
`;

  const preset = presetById(o.animation.presetId);
  // 'auto' uses the preset's hand-tuned ease pair; a named easing preset overrides both phases
  // with its direction-correct curves (Out-flavored in, In-flavored out).
  const ease = resolveEasing(o.animation.easing, preset.autoEase);
  const presetCfg: PresetConfig = {
    lineCount: o.lines.length,
    hasAccent: design.hasAccent,
    steps: o.animation.steps && o.lines.length > 1,
    speed: o.animation.speed,
    easeIn: ease.easeIn,
    easeOut: ease.easeOut,
  };
  const animationBlock = preset.emit(presetCfg);

  const js = `// ${meta.name} — generated by SPX GFX Builder. SPX calls update(), play(), stop(), next().

// update(data): SPX sends field values as JSON, e.g. {"f0":"Ada","f1":"Engineer"}.
// Each value is written into the element whose id matches the field name (f0 -> id="f0").
function update(data) {
  var fields = (typeof data === 'string') ? JSON.parse(data) : data;
  for (var key in fields) {
    var el = document.getElementById(key);
    if (el) el.innerHTML = fields[key];
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

  return {
    name: meta.name,
    type: 'lower-third',
    resolution: o.resolution,
    fps: o.fps,
    html,
    css,
    js,
    fields,
    settings,
    assets: o.importedImages,
    layers: o.lines.map((line, i) => ({
      id: `f${i}`,
      type: 'text' as const,
      label: line.title,
      fieldId: `f${i}`,
      text: line.sample,
      styles: {},
    })),
  };
}

/**
 * The authoring API for variant modules: metadata + a design builder in, a complete
 * TemplateVariant out (create() resolves defaults → builds the design → assembles).
 */
export function defineVariant(
  spec: Omit<TemplateVariant, 'create'>,
  meta: L3Meta,
  buildDesign: (o: ResolvedOptions) => L3Design,
): TemplateVariant {
  const variant: TemplateVariant = {
    ...spec,
    create(options?: WizardOptions) {
      const o = resolveOptions(variant, options);
      return assembleLowerThird(meta, buildDesign(o), o);
    },
  };
  return variant;
}
