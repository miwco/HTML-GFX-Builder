// Central app state (zustand). The template is the source of truth; editing the HTML
// re-parses the SPXGCTemplateDefinition so fields stay in sync with the visible code.

import { create } from 'zustand';
import { createDefaultTemplate } from '../model/defaultTemplate';
import { parseDefinition } from '../model/spxDefinition';
import type { AssetFile, SpxTemplate } from '../model/types';
import { DATA_FTYPES } from '../model/types';
import type { ValidationResult } from '../validation/validateTemplate';
import { loadProject, saveProject } from '../model/project';

export type EditorTab = 'html' | 'css' | 'js';
export type PreviewBg = 'checkerboard' | 'black' | 'video';
export type SidePanel = 'data' | 'control' | 'style' | 'ai' | 'export';

/** A live playout action the Control panel asks the simulator to run on the preview. */
export type PlayoutAction = 'update' | 'play' | 'stop' | 'next';

/** What the cursor is currently on in the code editor (drives the hover explanations). */
export interface EditorContext {
  tab: EditorTab;
  token: string;
  line: string;
}

/** The lines the last panel/AI apply changed, per tab — the editor highlights them. */
export interface LastChange {
  ranges: Partial<Record<EditorTab, { start: number; end: number }>>;
  /** Bumped per apply so an identical follow-up change still re-triggers the highlight. */
  nonce: number;
}

/**
 * Cheap per-tab line diff: trim the common prefix and suffix lines, report the changed
 * span in the NEW text. Good enough for the targeted patches panels and AI produce.
 */
function changedRange(before: string, after: string): { start: number; end: number } | null {
  if (before === after) return null;
  const a = before.split('\n');
  const b = after.split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) {
    endA--;
    endB--;
  }
  // Monaco lines are 1-based; a pure deletion still highlights the seam line.
  return { start: start + 1, end: Math.max(endB + 1, start + 1) };
}

/** Diff all three files of a template apply into a LastChange (null when nothing changed). */
function diffTemplates(before: SpxTemplate, after: SpxTemplate, nonce: number): LastChange | null {
  const ranges: LastChange['ranges'] = {};
  const html = changedRange(before.html, after.html);
  const css = changedRange(before.css, after.css);
  const js = changedRange(before.js, after.js);
  if (html) ranges.html = html;
  if (css) ranges.css = css;
  if (js) ranges.js = js;
  return Object.keys(ranges).length ? { ranges, nonce } : null;
}

interface TemplateState {
  template: SpxTemplate;
  activeTab: EditorTab;
  previewBg: PreviewBg;
  activePanel: SidePanel;
  /** Runtime test values keyed by field id (f0, f1...). Fed to update(). */
  sampleData: Record<string, string>;
  validation: ValidationResult | null;
  /** Latest runtime error reported by the live preview iframe, if any. */
  previewError: string | null;
  /** What the code-editor cursor is currently on (drives the Learn panel). */
  editorContext: EditorContext | null;
  /** Preview canvas guides: broadcast safe areas and a rule-of-thirds grid. */
  guides: { safeAreas: boolean; grid: boolean };
  /** Whether the template gallery / new-project screen is open. */
  galleryOpen: boolean;
  /** Snapshots taken before each panel / AI / gallery apply, for one-click undo. */
  history: SpxTemplate[];
  /** Undone snapshots, for redo. Any NEW edit clears it (the classic undo-tree cut). */
  future: SpxTemplate[];
  /** The lines the last apply changed (drives the editor's change highlight). */
  lastChange: LastChange | null;
  /** Bumped by panels after an apply to make the playout simulator replay the graphic. */
  replayNonce: number;
  /** The Control panel's latest live command (executed immediately by the simulator). */
  controlCommand: { action: PlayoutAction; nonce: number } | null;
  /** The timeline view's scrub position (Era 6) — the simulator seeks the live preview.
   *  Phase: 'in' | 'out' | 'step-N' (a Continue segment, N is the 2-based step number). */
  scrubCommand: { phase: string; time: number; nonce: number } | null;
  /** The selected element (Era 6 shared selection): a TemplatePart selector, or null.
   *  Canvas and timeline highlight the SAME element through this. Editor UI state only —
   *  it is never written into the template and takes no history snapshot. */
  selectedPart: string | null;

  setActiveTab: (tab: EditorTab) => void;
  setPreviewBg: (bg: PreviewBg) => void;
  setActivePanel: (panel: SidePanel) => void;

  setHtml: (html: string) => void;
  setCss: (css: string) => void;
  setJs: (js: string) => void;
  /** A deterministic panel patch to the CSS: updates + highlights, no history snapshot. */
  patchCss: (css: string) => void;

  /** Replace the whole template (used by the panels, AI, and the wizard). */
  applyTemplate: (template: SpxTemplate, opts?: { resetSampleData?: boolean }) => void;
  /** Restore the template from before the last apply. No-op when history is empty. */
  undo: () => void;
  /** Re-apply the last undone snapshot. No-op when nothing was undone (or a new edit
   *  happened since — new edits clear the redo stack). */
  redo: () => void;
  /** Ask the playout simulator to replay the graphic (used after Motion applies). */
  requestReplay: () => void;
  /** Drive the live preview from the Control panel (update/play/stop/next), immediately. */
  sendControl: (action: PlayoutAction) => void;
  /** Seek the live preview's in/out/step timeline to a time (the timeline view's scrubber). */
  sendScrub: (phase: string, time: number) => void;
  /** Select an element by its TemplatePart selector (null deselects) — see selectedPart. */
  setSelectedPart: (selector: string | null) => void;
  resetToDefault: () => void;

  setSampleValue: (field: string, value: string) => void;
  resetSampleData: () => void;

  /** Add an uploaded asset (image/font) to the template. */
  addAsset: (asset: AssetFile) => void;
  /** Remove an asset by its relative path. */
  removeAsset: (path: string) => void;

  setValidation: (result: ValidationResult | null) => void;
  setPreviewError: (error: string | null) => void;
  setEditorContext: (ctx: EditorContext | null) => void;
  setGuide: (key: 'safeAreas' | 'grid', value: boolean) => void;

  openGallery: () => void;
  closeGallery: () => void;
}

/** Build the sample-data map from a template's fields, preserving existing edited values. */
function syncSampleData(template: SpxTemplate, existing: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of template.fields) {
    if (!DATA_FTYPES.includes(field.ftype)) continue;
    next[field.field] = field.field in existing ? existing[field.field] : field.value;
  }
  return next;
}

/** Re-parse fields/settings from the template HTML (the definition is the source of truth). */
function withParsedFields(template: SpxTemplate): SpxTemplate {
  const parsed = parseDefinition(template.html);
  if (!parsed) return template;
  return { ...template, fields: parsed.fields, settings: parsed.settings };
}

// Restore the last autosaved working project (Era 5.2b) so a reload doesn't lose it; fall back to
// a fresh blank on first-ever load. The wizard still opens on top (galleryOpen below is unchanged) —
// closing it reveals this restored graphic.
const initialTemplate = loadProject()?.template ?? createDefaultTemplate();

export const useTemplateStore = create<TemplateState>((set) => ({
  template: initialTemplate,
  activeTab: 'html',
  previewBg: 'checkerboard',
  activePanel: 'data',
  sampleData: syncSampleData(initialTemplate, {}),
  validation: null,
  previewError: null,
  editorContext: null,
  guides: { safeAreas: false, grid: false },
  galleryOpen: true, // Show the template chooser on first load.
  history: [],
  future: [],
  lastChange: null,
  replayNonce: 0,
  controlCommand: null,
  scrubCommand: null,
  selectedPart: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setPreviewBg: (bg) => set({ previewBg: bg }),
  setActivePanel: (panel) => set({ activePanel: panel }),

  // A deterministic CSS patch from the Style panel: highlight what changed (no history
  // snapshot — color drags fire dozens of these per second).
  patchCss: (css) =>
    set((s) => {
      const next = { ...s.template, css };
      return {
        template: next,
        validation: null,
        future: [],
        lastChange: diffTemplates(s.template, next, (s.lastChange?.nonce ?? 0) + 1),
      };
    }),

  // Manual typing clears the change highlight — the user is editing, not reviewing.
  setHtml: (html) =>
    set((s) => {
      const template = withParsedFields({ ...s.template, html });
      return { template, sampleData: syncSampleData(template, s.sampleData), validation: null, future: [], lastChange: null };
    }),
  setCss: (css) => set((s) => ({ template: { ...s.template, css }, validation: null, future: [], lastChange: null })),
  setJs: (js) => set((s) => ({ template: { ...s.template, js }, validation: null, future: [], lastChange: null })),

  applyTemplate: (template, opts) =>
    set((s) => {
      const synced = withParsedFields(template);
      return {
        template: synced,
        // In-place edits (panels, AI) keep typed sample values; creating a NEW project
        // must not leak the previous template's values into matching field ids.
        sampleData: syncSampleData(synced, opts?.resetSampleData ? {} : s.sampleData),
        validation: null,
        galleryOpen: false,
        // Snapshot the pre-apply template so the action can be undone; a fresh edit
        // discards whatever was undone before it (the redo branch is gone).
        history: [...s.history, s.template].slice(-30),
        future: [],
        // Highlight what changed in the editor — but not for whole-project swaps
        // (a new project changes everything; a highlight would just be noise).
        lastChange: opts?.resetSampleData
          ? null
          : diffTemplates(s.template, synced, (s.lastChange?.nonce ?? 0) + 1),
      };
    }),

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return {};
      const prev = s.history[s.history.length - 1];
      return {
        template: prev,
        sampleData: syncSampleData(prev, s.sampleData),
        validation: null,
        history: s.history.slice(0, -1),
        future: [...s.future, s.template].slice(-30),
        lastChange: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[s.future.length - 1];
      return {
        template: next,
        sampleData: syncSampleData(next, s.sampleData),
        validation: null,
        history: [...s.history, s.template].slice(-30),
        future: s.future.slice(0, -1),
        lastChange: null,
      };
    }),

  requestReplay: () => set((s) => ({ replayNonce: s.replayNonce + 1 })),

  sendControl: (action) => set((s) => ({ controlCommand: { action, nonce: (s.controlCommand?.nonce ?? 0) + 1 } })),

  sendScrub: (phase, time) => set((s) => ({ scrubCommand: { phase, time, nonce: (s.scrubCommand?.nonce ?? 0) + 1 } })),

  setSelectedPart: (selectedPart) => set({ selectedPart }),

  resetToDefault: () =>
    set(() => {
      const template = createDefaultTemplate();
      return { template, sampleData: syncSampleData(template, {}), validation: null };
    }),

  setSampleValue: (field, value) => set((s) => ({ sampleData: { ...s.sampleData, [field]: value } })),
  resetSampleData: () => set((s) => ({ sampleData: syncSampleData(s.template, {}) })),

  addAsset: (asset) =>
    set((s) => ({
      template: {
        ...s.template,
        assets: [...s.template.assets.filter((a) => a.path !== asset.path), asset],
      },
    })),
  removeAsset: (path) =>
    set((s) => ({
      template: { ...s.template, assets: s.template.assets.filter((a) => a.path !== path) },
    })),

  setValidation: (validation) => set({ validation }),
  setPreviewError: (previewError) => set({ previewError }),
  setEditorContext: (editorContext) => set({ editorContext }),
  setGuide: (key, value) => set((s) => ({ guides: { ...s.guides, [key]: value } })),

  openGallery: () => set({ galleryOpen: true }),
  closeGallery: () => set({ galleryOpen: false }),
}));

// Autosave the working project (debounced) whenever the template actually changes, so a reload
// restores it instead of a blank default. Covers every mutation that touches the template — panels,
// AI, wizard, and manual edits — in one place. Local only for now; cloud sync of this single
// 'project' record lands with the singleton work.
let projectSaveTimer: ReturnType<typeof setTimeout> | null = null;
useTemplateStore.subscribe((state, prev) => {
  if (state.template === prev.template) return;
  if (projectSaveTimer) clearTimeout(projectSaveTimer);
  projectSaveTimer = setTimeout(() => saveProject(useTemplateStore.getState().template), 800);
});
