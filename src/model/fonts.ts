// Bundled open-source fonts (SIL Open Font License). The files live in public/fonts/ (served at
// /fonts/<file> in dev) and are copied into exported packages under fonts/<file>, so templates are
// fully offline at playout. Generated CSS contains a visible @font-face rule referencing the
// relative path "fonts/<file>" — teachable and 1:1 with the export.

/** The style families. 'noacg' is the house family — the product's own on-air look
 *  (dark control-room panels, one amber accent, mono technical labels). */
export type StyleTag = 'minimal' | 'sport' | 'glass' | 'noacg';

export interface BundledFont {
  id: string;
  /** CSS font-family name used in generated code. */
  family: string;
  /** File name under public/fonts/ (dev) and fonts/ (export). */
  file: string;
  /** Variable-font weight range covered by the file, e.g. [400, 800]. */
  weights: [number, number];
  /** Which style tags this font suits (used to order the wizard's font picker). */
  styleTags: StyleTag[];
  /** Fallback stack appended after the family in generated CSS. */
  fallback: string;
  /** Short flavor line shown in the wizard. */
  blurb: string;
}

export const FONTS: BundledFont[] = [
  {
    id: 'inter',
    family: 'Inter',
    file: 'inter.woff2',
    weights: [400, 800],
    styleTags: ['minimal', 'glass'],
    fallback: 'Arial, sans-serif',
    blurb: 'Neutral, crisp UI classic — never wrong.',
  },
  {
    id: 'space-grotesk',
    family: 'Space Grotesk',
    file: 'space-grotesk.woff2',
    weights: [400, 700],
    styleTags: ['noacg', 'minimal', 'glass'],
    fallback: 'Arial, sans-serif',
    blurb: 'Modern grotesque with a technical edge — the NoaCG house display face.',
  },
  {
    id: 'jetbrains-mono',
    family: 'JetBrains Mono',
    file: 'jetbrains-mono.woff2',
    weights: [400, 700],
    styleTags: ['noacg'],
    fallback: 'Consolas, "Courier New", monospace',
    blurb: 'Technical monospace — labels, data, timecode (the NoaCG house label face).',
  },
  {
    id: 'manrope',
    family: 'Manrope',
    file: 'manrope.woff2',
    weights: [400, 800],
    styleTags: ['glass', 'minimal'],
    fallback: 'Arial, sans-serif',
    blurb: 'Soft, rounded, friendly — social/stream feel.',
  },
  {
    id: 'archivo',
    family: 'Archivo',
    file: 'archivo.woff2',
    weights: [400, 900],
    styleTags: ['sport', 'minimal'],
    fallback: 'Arial, sans-serif',
    blurb: 'Sturdy grotesque; heavy weights hit hard.',
  },
  {
    id: 'oswald',
    family: 'Oswald',
    file: 'oswald.woff2',
    weights: [400, 700],
    styleTags: ['sport'],
    fallback: '"Arial Narrow", Arial, sans-serif',
    blurb: 'Condensed broadcast workhorse — big names, tight space.',
  },
  {
    id: 'bebas-neue',
    family: 'Bebas Neue',
    file: 'bebas-neue.woff2',
    weights: [400, 400],
    styleTags: ['sport'],
    fallback: '"Arial Narrow", Arial, sans-serif',
    blurb: 'All-caps display impact; pair with a quiet body font.',
  },
];

export function fontById(id: string): BundledFont {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

/** The visible @font-face rule generated into template CSS (exports 1:1). */
export function fontFaceCss(font: BundledFont): string {
  return `/* Bundled open-source font (the file ships with the export — no internet at playout). */
@font-face {
  font-family: "${font.family}";
  src: url("fonts/${font.file}") format("woff2");
  font-weight: ${font.weights[0]} ${font.weights[1]};  /* variable font: covers this weight range */
  font-display: swap;          /* show fallback text until the font loads */
}`;
}

/** Full font-family value for CSS (family + fallback stack). */
export function fontStack(font: BundledFont): string {
  return `"${font.family}", ${font.fallback}`;
}

/**
 * A design-owned SECOND typeface (e.g. the NoaCG house label mono). Deliberately worded
 * differently from fontFaceCss: the Style panel / looks swap the FIRST "Bundled open-source
 * font" block (the heading face), and this comment keeps a label face out of that match.
 */
export function labelFontFaceCss(font: BundledFont): string {
  return `/* Design-owned label font (bundled OFL file — ships with the export, offline at playout).
   The Style panel's font picker swaps the heading face above; this one belongs to the design. */
@font-face {
  font-family: "${font.family}";
  src: url("fonts/${font.file}") format("woff2");
  font-weight: ${font.weights[0]} ${font.weights[1]};  /* variable font: covers this weight range */
  font-display: swap;          /* show fallback text until the font loads */
}`;
}

/** License note written into exported packages that bundle a font. */
export const FONT_LICENSE_NOTE = `# Font licenses

Fonts under fonts/ that came from this builder's bundled set are licensed under the
SIL Open Font License 1.1 (OFL): they may be bundled, redistributed, and used commercially,
but not sold on their own. Full license text: https://openfontlicense.org
(Bundled fonts sourced from Google Fonts, https://fonts.google.com.)

Fonts you imported yourself are governed by their own licenses — make sure you have the
right to embed and distribute them.
`;

// ── User-imported fonts (embedded in the template + its export) ───────────────

import type { AssetFile } from './types';

export interface CustomFont {
  /** CSS font-family name (derived from the file name, user-editable). */
  family: string;
  /** @font-face format() string: woff2 | woff | truetype | opentype. */
  format: string;
  /** The font file as a data-URL asset at fonts/<file> — ships inside the export. */
  asset: AssetFile;
}

/** Map a font file extension to its @font-face format() string. */
export function fontFormatForExt(ext: string): string {
  return { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }[ext.toLowerCase()] ?? 'woff2';
}

/** A readable family name from a font file name ("Neue-Machina_Bold.otf" -> "Neue Machina Bold"). */
export function familyFromFileName(name: string): string {
  const base = name.replace(/\.(woff2|woff|ttf|otf)$/i, '');
  return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'My Font';
}

/** The visible @font-face rule for an imported font (the file ships with the export). */
export function customFontFaceCss(font: CustomFont): string {
  return `/* Imported font (your file — embedded in the template and its export). */
@font-face {
  font-family: "${font.family}";
  src: url("${font.asset.path}") format("${font.format}");
  font-display: swap;          /* show fallback text until the font loads */
  /* Single file: the browser synthesizes bold/italic. Add more @font-face rules
     with their own files for true weights. */
}`;
}

export function customFontStack(font: CustomFont): string {
  return `"${font.family}", Arial, sans-serif`;
}

/**
 * Make an imported font renderable in the builder UI itself (pickers, live preview host).
 * Best-effort; the template preview works regardless because it inlines the asset.
 */
export function registerAppFont(family: string, dataUrl: string): void {
  try {
    const face = new FontFace(family, `url(${dataUrl})`);
    void face.load().then((f) => (document as Document & { fonts: FontFaceSet }).fonts.add(f));
  } catch {
    /* non-fatal — UI falls back to the default font */
  }
}
