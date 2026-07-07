// Core data model for NoaCG Studio.
//
// The *template* is the single source of truth. The editor edits html / css / js
// directly; `fields` and `settings` are parsed from the SPXGCTemplateDefinition that
// lives inside the HTML (see model/spxDefinition.ts). Exporters transform this clean
// template into a packaged SPX zip without changing how the graphic behaves.

// ── Project metadata ────────────────────────────────────────────────────────

/** High-level graphic category, used for gallery grouping and future visual tools. */
export type TemplateType =
  | 'lower-third'
  | 'info-card'
  | 'end-credits'
  | 'ticker'
  | 'fullscreen'
  | 'bug'
  | 'countdown'
  | 'scoreboard'
  | 'info-box'
  | 'starting-soon'
  | 'infographic'
  | 'quiz'
  | 'blank';

/** Canvas resolution (1920×1080, 4K, 720p…). Drives the preview scale and base CSS. */
export interface Resolution {
  width: number;
  height: number;
  label: string;
}

export const RESOLUTIONS: Resolution[] = [
  { width: 1920, height: 1080, label: '1080p (1920×1080)' },
  { width: 3840, height: 2160, label: '4K (3840×2160)' },
  { width: 1280, height: 720,  label: '720p (1280×720)' },
];

/** Aspect-ratio presets shown at project creation, each offering a few resolutions. */
export interface AspectPreset {
  id: string;
  label: string;
  resolutions: Resolution[];
}

export const ASPECTS: AspectPreset[] = [
  { id: '16:9', label: '16:9 Landscape', resolutions: RESOLUTIONS },
  {
    id: '9:16',
    label: '9:16 Vertical',
    resolutions: [
      { width: 1080, height: 1920, label: 'Vertical (1080×1920)' },
      { width: 720, height: 1280, label: 'Vertical (720×1280)' },
    ],
  },
  {
    id: '1:1',
    label: '1:1 Square',
    resolutions: [{ width: 1080, height: 1080, label: 'Square (1080×1080)' }],
  },
];

export const FPS_OPTIONS = [25, 30, 50, 60] as const;

// ── Layer model (structural foundation for future visual editing) ─────────────
//
// Layers describe the visual elements in structured form so building blocks and
// AI can reason about the template without parsing the HTML string. The code
// editor remains the primary editing interface; these are metadata only.

export type LayerType = 'text' | 'image' | 'container' | 'rect';

export interface TemplateLayer {
  /** Matches the HTML element id (e.g. "f0", "logo"). */
  id: string;
  type: LayerType;
  /** Human-readable label shown in future visual tools ("Name field", "Logo"). */
  label: string;
  /** Links to SpxField.field when the element displays a data field value. */
  fieldId?: string;
  /** Initial / static text content (for text layers). */
  text?: string;
  /** Key CSS properties as a plain object (for seeding future inspector panels). */
  styles: Record<string, string>;
  animIn?: 'fade' | 'slide' | 'none';
  animOut?: 'fade' | 'slide' | 'none';
}

// ── SPX field model ──────────────────────────────────────────────────────────

/** All SPX DataField types ("ftype"). Verified against docs.spxgraphics.com. */
export type Ftype =
  | 'textfield'
  | 'textarea'
  | 'dropdown'
  | 'filelist'
  | 'number'
  | 'checkbox'
  | 'color'
  | 'button'
  | 'instruction'
  | 'caption'
  | 'hidden'
  | 'divider'
  | 'spacer';

/** ftypes that actually carry editable operator data we feed to update(). */
export const DATA_FTYPES: Ftype[] = [
  'textfield',
  'textarea',
  'dropdown',
  'filelist',
  'number',
  'checkbox',
  'color',
  'hidden',
];

export interface SpxDropdownItem {
  text: string;
  value: string;
}

/** A single SPX DataField definition entry. */
export interface SpxField {
  field: string; // unique id, e.g. "f0"
  ftype: Ftype;
  title: string;
  value: string; // default / sample value
  prvar?: string; // project variable (shared across templates)
  items?: SpxDropdownItem[]; // dropdown
  assetfolder?: string; // filelist
  extension?: string; // filelist
  fcall?: string; // button
  descr?: string; // button
}

/** Playout / display settings from SPXGCTemplateDefinition (minus DataFields). */
export interface SpxSettings {
  description: string;
  playserver: string;
  playchannel: string;
  playlayer: string;
  webplayout: string;
  out: string; // "manual" | "none" | milliseconds
  steps: string; // number of animation phases
  dataformat: string; // "json" (default) | "xml"
  uicolor: string; // "1".."7"
}

/** A binary/relative asset bundled with the template (image, font, video...). */
export interface AssetFile {
  path: string; // relative path inside the package, e.g. "assets/logo.png"
  data: Blob | string; // bytes, or a data URL / text
}

// ── Main template type ───────────────────────────────────────────────────────

/** The full template — the source of truth edited in the app. */
export interface SpxTemplate {
  name: string;
  type: TemplateType;
  resolution: Resolution;
  fps: number;
  html: string; // body structure + <script id="spx-template-definition"> block
  css: string;
  js: string; // clean play(), stop(), update(data), next()
  fields: SpxField[]; // parsed view of the definition (source of truth = the code)
  settings: SpxSettings;
  assets: AssetFile[];
  /** Structured element descriptions — metadata for building blocks and future visual tools. */
  layers: TemplateLayer[];
}

/** A proposed change to the template (from AI or building blocks). */
export interface TemplateChange {
  summary: string; // human-readable description of what changed
  template: SpxTemplate; // the resulting template if applied
  explanation?: string; // optional teaching note ("explain" action)
}

export const DEFAULT_SETTINGS: SpxSettings = {
  description: 'Lower third',
  playserver: 'OVERLAY',
  playchannel: '1',
  playlayer: '1',
  webplayout: '1',
  out: 'manual',
  steps: '0',
  dataformat: 'json',
  uicolor: '7',
};
