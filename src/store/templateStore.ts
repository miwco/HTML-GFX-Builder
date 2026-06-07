// Central app state (zustand). The template is the source of truth; editing the HTML
// re-parses the SPXGCTemplateDefinition so fields stay in sync with the visible code.

import { create } from 'zustand';
import { createDefaultTemplate } from '../model/defaultTemplate';
import { parseDefinition } from '../model/spxDefinition';
import type { AssetFile, SpxTemplate } from '../model/types';
import { DATA_FTYPES } from '../model/types';
import type { ValidationResult } from '../validation/validateTemplate';

export type EditorTab = 'html' | 'css' | 'js';
export type PreviewBg = 'checkerboard' | 'black' | 'video';
export type SidePanel = 'data' | 'blocks' | 'brand' | 'learn' | 'ai' | 'validate' | 'export';

/** What the cursor is currently on in the code editor (drives the Learn panel). */
export interface EditorContext {
  tab: EditorTab;
  token: string;
  line: string;
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
  /** Whether the template gallery / new-project screen is open. */
  galleryOpen: boolean;

  setActiveTab: (tab: EditorTab) => void;
  setPreviewBg: (bg: PreviewBg) => void;
  setActivePanel: (panel: SidePanel) => void;

  setHtml: (html: string) => void;
  setCss: (css: string) => void;
  setJs: (js: string) => void;

  /** Replace the whole template (used by building blocks, AI, and template gallery). */
  applyTemplate: (template: SpxTemplate, summary?: string) => void;
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

const initialTemplate = createDefaultTemplate();

export const useTemplateStore = create<TemplateState>((set) => ({
  template: initialTemplate,
  activeTab: 'html',
  previewBg: 'checkerboard',
  activePanel: 'data',
  sampleData: syncSampleData(initialTemplate, {}),
  validation: null,
  previewError: null,
  editorContext: null,
  galleryOpen: true, // Show the template chooser on first load.

  setActiveTab: (tab) => set({ activeTab: tab }),
  setPreviewBg: (bg) => set({ previewBg: bg }),
  setActivePanel: (panel) => set({ activePanel: panel }),

  setHtml: (html) =>
    set((s) => {
      const template = withParsedFields({ ...s.template, html });
      return { template, sampleData: syncSampleData(template, s.sampleData), validation: null };
    }),
  setCss: (css) => set((s) => ({ template: { ...s.template, css }, validation: null })),
  setJs: (js) => set((s) => ({ template: { ...s.template, js }, validation: null })),

  applyTemplate: (template) =>
    set((s) => {
      const synced = withParsedFields(template);
      return {
        template: synced,
        sampleData: syncSampleData(synced, s.sampleData),
        validation: null,
        galleryOpen: false,
      };
    }),

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

  openGallery: () => set({ galleryOpen: true }),
  closeGallery: () => set({ galleryOpen: false }),
}));
