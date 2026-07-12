// Data model for the choose-first creation wizard. A TemplateVariant is a tasteful, hand-tuned
// design that generates a complete SpxTemplate from the user's WizardOptions. Every option has a
// default so `variant.create({})` renders for live previews. The generated code is the source of
// truth afterwards — the wizard never runs again on an existing project.

import type { Resolution, SpxField, SpxTemplate, AssetFile } from './types';
import { RESOLUTIONS } from './types';
import type { CustomFont, StyleTag } from './fonts';
import type { EasingId } from './easings';

// ── Categories (the full catalog; lower thirds, info cards, end credits, and tickers live) ──

export interface CategoryInfo {
  id: TemplateCategory;
  name: string;
  /** How many designs this category will hold when complete. */
  plannedCount: number;
  /** False until the category's variants exist — shown as "coming soon" in the wizard. */
  available: boolean;
  description: string;
  /** Wizard grouping: the live-show must-haves vs the more specialised graphics. */
  group: 'essentials' | 'specials';
}

export type TemplateCategory =
  | 'lower-third'
  | 'info-card'
  | 'end-credits'
  | 'starting-soon'
  | 'game-timer'
  | 'scoreboard'
  | 'ticker'
  | 'infographic'
  | 'corner-bug'
  | 'quiz';

export const CATEGORIES: CategoryInfo[] = [
  // Essentials — the graphics almost every live show needs.
  { id: 'lower-third',   name: 'Lower thirds',            plannedCount: 13, available: true,  description: 'Names, titles, and straps over the action.', group: 'essentials' },
  { id: 'ticker',        name: 'Tickers',                 plannedCount: 6,  available: true , description: 'Scrolling news, info, and index strips.', group: 'essentials' },
  { id: 'scoreboard',    name: 'Scoreboards',             plannedCount: 2,  available: true , description: 'Two-team scores and match status.', group: 'essentials' },
  { id: 'info-card',     name: 'Info cards',              plannedCount: 5,  available: true,  description: 'Full / half screen cards — info and quotes.', group: 'essentials' },
  { id: 'starting-soon', name: 'Starting soon',           plannedCount: 3,  available: true , description: 'Pre-show holding loops with a timer.', group: 'essentials' },
  { id: 'end-credits',   name: 'End credits',             plannedCount: 4,  available: true , description: 'Rolling and card-based credit sequences.', group: 'essentials' },
  { id: 'corner-bug',    name: 'Corner bug',              plannedCount: 2,  available: true , description: 'A persistent corner logo (image placeholder).', group: 'essentials' },
  // Specials — for particular formats and moments.
  { id: 'infographic',   name: 'Infographics',            plannedCount: 6,  available: true , description: 'Stats, polls, leaderboards, schedules, counters.', group: 'specials' },
  { id: 'game-timer',    name: 'Game show timer',         plannedCount: 2,  available: true , description: 'Countdowns and clocks for game formats.', group: 'specials' },
  { id: 'quiz',          name: 'Quiz graphics',           plannedCount: 1,  available: true , description: 'Game-show questions with answer options.', group: 'specials' },
];

// ── Wizard options (every choice the flow collects) ─────────────────────────

/** One visible text line in the design (becomes data field fN + a styled element). */
export interface LineSpec {
  /** Operator-facing label in SPX, e.g. "Name". */
  title: string;
  /** Sample/default text shown in the design. */
  sample: string;
}

/**
 * An extra, non-visual data field added to the SPX definition only.
 * The offered types are the ones live broadcast graphics actually use: text, long text,
 * a number, or an image ("filelist" — the operator picks a file from the project's
 * images/ folder). SPX also knows dropdown/checkbox/color, but those are reserved for
 * designs with a genuinely constrained choice (e.g. the quiz's correct-answer dropdown).
 */
export interface ExtraFieldSpec {
  title: string;
  ftype: 'textfield' | 'textarea' | 'number' | 'filelist';
  value: string;
}

/** The nine anchor zones, snapped to safe areas. */
export type Zone9 =
  | 'top-left' | 'top-center' | 'top-right'
  | 'mid-left' | 'mid-center' | 'mid-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

/** A curated color set. `panel` is the box background; accent appears in small sharp doses. */
export interface Palette {
  id: string;
  name: string;
  styleTags: StyleTag[];
  accent: string;
  text: string;
  textDim: string;
  panel: string;
}

export type AnimPresetId =
  | 'slide-fade'
  | 'line-reveal'
  | 'mask-wipe'
  | 'pop-spring'
  | 'snap-stinger'
  | 'blur-in'
  | 'fade'
  | 'drop-in'
  | 'flip-3d'
  // End-credits motion formats (templates/endCredits/creditsPresets.ts):
  | 'credits-roll'
  | 'credits-pages'
  | 'credits-crawl'
  // Ticker motion formats (templates/tickers/tickerPresets.ts):
  | 'ticker-marquee'
  | 'ticker-flip'
  // Countdown-clock formats (templates/startingSoon + templates/gameTimers):
  | 'hold-loop'
  | 'timer-run'
  | 'timer-line-reveal'
  // Infographic motion formats (templates/infographics/igPresets.ts):
  | 'count-up'
  | 'bars-grow'
  | 'ring-fill'
  | 'rows-cascade'
  // Quiz format (templates/quiz/quizPresets.ts) — next() reveals the correct answer:
  | 'quiz-reveal';

export type AnimSpeed = 0.75 | 1 | 1.5;

export interface AnimationChoice {
  presetId: AnimPresetId;
  /** Multiplier on animSpeed: 0.75 slower · 1 normal · 1.5 faster. */
  speed: AnimSpeed;
  /** Easing preset ('auto' = the animation preset's hand-tuned pair). See model/easings.ts. */
  easing: EasingId;
  /** SPX multi-step: line 1 first, further lines revealed on Continue / next(). */
  steps: boolean;
}

export interface WizardOptions {
  resolution?: Resolution;
  fps?: number;
  /** 1–3 visible text lines (design adapts). Defaults to the variant's suggested lines. */
  lines?: LineSpec[];
  /** Extra non-visual fields appended to the SPX definition. */
  extraFields?: ExtraFieldSpec[];
  palette?: Palette;
  fontId?: string;
  /** A user-imported font (embedded as an asset) — takes precedence over fontId. */
  customFont?: CustomFont;
  /** Size multiplier written as --scale (S 0.85 · M 1 · L 1.2). */
  sizeScale?: number;
  zone?: Zone9;
  /** Pixel offsets added after zone anchoring. */
  nudge?: { x: number; y: number };
  animation?: Partial<AnimationChoice>;
  /** Images from the "Import graphics" entry (already stored as data-URL assets). */
  importedImages?: AssetFile[];
  /** Relative path of the imported image to place in the variant's logo slot. */
  logoAssetPath?: string;
}

/** WizardOptions with every default resolved — what variant builders actually receive. */
export interface ResolvedOptions {
  resolution: Resolution;
  fps: number;
  lines: LineSpec[];
  extraFields: ExtraFieldSpec[];
  palette: Palette;
  fontId: string;
  customFont: CustomFont | null;
  sizeScale: number;
  zone: Zone9;
  nudge: { x: number; y: number };
  animation: AnimationChoice;
  importedImages: AssetFile[];
  logoAssetPath: string | null;
}

// ── Template variants ────────────────────────────────────────────────────────

export interface TemplateVariant {
  /** e.g. "lt01". */
  id: string;
  category: TemplateCategory;
  name: string;
  styleTag: StyleTag;
  description: string;
  /** How many visible text lines the design supports. */
  maxLines: 1 | 2 | 3;
  /** Suggested lines used as the wizard's starting point (and preview defaults). */
  suggestedLines: LineSpec[];
  /** Whether the design has an image/logo slot (used by the import-graphics flow). */
  hasLogoSlot: boolean;
  /** Animation presets that suit this design (first = default). */
  animationPresets: AnimPresetId[];
  defaultPalette: Palette;
  defaultFontId: string;
  defaultZone: Zone9;
  /** Build the complete template. Every option is optional — defaults come from the variant. */
  create(options?: WizardOptions): SpxTemplate;
}

// ── Curated palettes (one accent + neutral system; see DESIGN_LANGUAGE.md) ──

export const PALETTES: Palette[] = [
  // NoaCG house (the brand system: void panel, one amber accent — BRAND-MANUAL §3)
  { id: 'noacg',    name: 'NoaCG Amber',  styleTags: ['noacg'],   accent: '#f6a623', text: '#ffffff', textDim: 'rgba(183,188,196,0.95)', panel: 'rgba(10, 12, 16, 0.86)' },
  // Minimal
  { id: 'ivory',    name: 'Ivory',        styleTags: ['minimal'], accent: '#e8c547', text: '#ffffff', textDim: 'rgba(255,255,255,0.72)', panel: 'rgba(12, 14, 18, 0.92)' },
  { id: 'porcelain',name: 'Porcelain',    styleTags: ['minimal'], accent: '#0f1115', text: '#0f1115', textDim: 'rgba(15,17,21,0.65)',    panel: 'rgba(250, 250, 248, 0.96)' },
  { id: 'signal',   name: 'Signal Red',   styleTags: ['minimal', 'sport'], accent: '#e63946', text: '#ffffff', textDim: 'rgba(255,255,255,0.7)', panel: 'rgba(10, 12, 16, 0.92)' },
  // Sport
  { id: 'volt',     name: 'Volt',         styleTags: ['sport'],   accent: '#c8f31d', text: '#ffffff', textDim: 'rgba(255,255,255,0.75)', panel: 'rgba(8, 10, 14, 0.94)' },
  { id: 'inferno',  name: 'Inferno',      styleTags: ['sport'],   accent: '#ff5a1f', text: '#ffffff', textDim: 'rgba(255,255,255,0.75)', panel: 'rgba(12, 8, 8, 0.94)' },
  { id: 'royal',    name: 'Royal',        styleTags: ['sport', 'glass'], accent: '#3d6bff', text: '#ffffff', textDim: 'rgba(255,255,255,0.72)', panel: 'rgba(8, 10, 20, 0.94)' },
  // Glass
  { id: 'frost',    name: 'Frost',        styleTags: ['glass'],   accent: '#7dd3fc', text: '#ffffff', textDim: 'rgba(255,255,255,0.7)',  panel: 'rgba(255, 255, 255, 0.10)' },
  { id: 'orchid',   name: 'Orchid',       styleTags: ['glass'],   accent: '#c084fc', text: '#ffffff', textDim: 'rgba(255,255,255,0.7)',  panel: 'rgba(255, 255, 255, 0.10)' },
  { id: 'mint',     name: 'Mint',         styleTags: ['glass', 'minimal'], accent: '#34d399', text: '#ffffff', textDim: 'rgba(255,255,255,0.7)', panel: 'rgba(255, 255, 255, 0.10)' },
];

export function paletteById(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

// ── Defaults resolver ────────────────────────────────────────────────────────

/** Fill every missing option with the variant's tasteful default. */
export function resolveOptions(variant: TemplateVariant, options: WizardOptions = {}): ResolvedOptions {
  const lines = (options.lines && options.lines.length > 0 ? options.lines : variant.suggestedLines)
    .slice(0, variant.maxLines);
  return {
    resolution: options.resolution ?? RESOLUTIONS[0],
    fps: options.fps ?? 25,
    lines,
    extraFields: options.extraFields ?? [],
    palette: options.palette ?? variant.defaultPalette,
    fontId: options.fontId ?? variant.defaultFontId,
    customFont: options.customFont ?? null,
    sizeScale: options.sizeScale ?? 1,
    zone: options.zone ?? variant.defaultZone,
    nudge: options.nudge ?? { x: 0, y: 0 },
    animation: {
      presetId: options.animation?.presetId ?? variant.animationPresets[0],
      speed: options.animation?.speed ?? 1,
      easing: options.animation?.easing ?? 'auto',
      steps: options.animation?.steps ?? false,
    },
    importedImages: options.importedImages ?? [],
    logoAssetPath: options.logoAssetPath ?? null,
  };
}

/** Fields (fN ids) generated from lines + extras — lines first (rundown preview uses f0/f1). */
export function fieldsFromOptions(o: ResolvedOptions): SpxField[] {
  const fields: SpxField[] = o.lines.map((line, i) => ({
    field: `f${i}`,
    ftype: 'textfield',
    title: line.title,
    value: line.sample,
  }));
  o.extraFields.forEach((extra, i) => {
    fields.push({
      field: `f${o.lines.length + i}`,
      ftype: extra.ftype,
      title: extra.title,
      value: extra.value,
      // Image fields ("filelist") list the project's images/ folder in SPX.
      ...(extra.ftype === 'filelist' ? { assetfolder: './images/', extension: 'png' } : {}),
    });
  });
  return fields;
}
