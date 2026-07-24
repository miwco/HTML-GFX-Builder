// The SAVE / OPEN actions over the graphics library (docs/SAVED_CONTENT_MODEL.md §2), plus
// the small UI store that sequences their dialogs. templateStore holds the live template and
// the save LINK (`saved`); this module owns the semantics: what Save writes, what opening a
// library graphic loads, and when the "unsaved changes" guard must interpose.
//
// The autosave slot (model/project.ts) is the crash-safety net and is never conflated with
// Save: replacing the WORKING DOCUMENT (open another graphic, create a new project) is the
// only destructive move, so that is the one moment the guard asks. Navigating to Home, a
// control panel, or the video shell never touches the working document and never asks.

import { create } from 'zustand';
import { useTemplateStore } from './templateStore';
import {
  createGraphic,
  graphicById,
  updateGraphic,
  type GraphicDoc,
} from '../model/library';
import { createPacketNamed } from '../model/packets';
import { saveProject } from '../model/project';
import { useDocKindStore } from './docKindStore';

/** Persist the working slot's save link NOW — the autosave subscription only fires on a
 *  template change, and a Save that changes nothing else must still survive a reload. */
function persistLink(): void {
  const s = useTemplateStore.getState();
  saveProject(s.template, s.baseline, { graphicId: s.saved.graphicId, dirty: s.saved.dirty }, s.aiSpec);
}

/** Where a first save / Save As puts the graphic. */
export type SaveDestination =
  | { kind: 'standalone' }
  | { kind: 'package'; id: string }
  | { kind: 'new-package'; name: string };

function destPackageId(dest: SaveDestination): string | null {
  if (dest.kind === 'standalone') return null;
  if (dest.kind === 'package') return dest.id;
  return createPacketNamed(dest.name).id;
}

/**
 * Save the working template into its linked library record. Returns 'needs-name' when the
 * document has never been saved — the caller opens the save dialog instead.
 */
export function saveCurrentGraphic(): 'saved' | 'needs-name' | 'failed' {
  const s = useTemplateStore.getState();
  if (!s.saved.graphicId) return 'needs-name';
  s.setSaved({ ...s.saved, status: 'saving' });
  const { doc, error } = updateGraphic(s.saved.graphicId, { template: s.template, baseline: s.baseline, aiSpec: s.aiSpec });
  if (!doc || error) {
    // The record vanished (deleted on another device): fall back to naming it fresh.
    if (!doc) {
      s.setSaved({ graphicId: null, dirty: true, status: 'idle' });
      return 'needs-name';
    }
    s.setSaved({ ...s.saved, status: 'failed' });
    return 'failed';
  }
  s.setSaved({ graphicId: doc.id, dirty: false, status: 'idle' });
  persistLink();
  return 'saved';
}

/** First save or Save As: mint a new library record and link the working document to it. */
export function saveGraphicAs(name: string, dest: SaveDestination): { ok: boolean; error: string | null } {
  const s = useTemplateStore.getState();
  const { doc, error } = createGraphic(s.template, {
    name,
    packageId: destPackageId(dest),
    baseline: s.baseline,
    aiSpec: s.aiSpec,
  });
  if (error) {
    s.setSaved({ ...s.saved, status: 'failed' });
    return { ok: false, error };
  }
  // The working template adopts the saved name so the topbar and the record agree.
  if (doc.template.name !== s.template.name) {
    useTemplateStore.setState({ template: { ...s.template, name: doc.name } });
  }
  useTemplateStore.getState().setSaved({ graphicId: doc.id, dirty: false, status: 'idle' });
  persistLink();
  return { ok: true, error: null };
}

/**
 * Load a library graphic into the editor as the working document. The caller has already
 * cleared the unsaved-changes guard. Applies the doc's ACTIVE control entry (if any) into
 * the sample data, so the active data reaches the editor preview.
 */
export function openGraphicDoc(doc: GraphicDoc): void {
  const store = useTemplateStore.getState();
  store.applyTemplate(doc.template, { resetSampleData: true });
  useDocKindStore.getState().setKind('spx');
  if (doc.baseline) useTemplateStore.setState({ baseline: doc.baseline });
  // The swap cleared the working spec; a saved AI creation brings its own back.
  useTemplateStore.setState({ aiSpec: doc.aiSpec ?? null });
  const entry = doc.activeEntryId ? doc.entries.find((e) => e.id === doc.activeEntryId) : null;
  if (entry) {
    for (const [field, value] of Object.entries(entry.values)) {
      useTemplateStore.getState().setSampleValue(field, value);
    }
  }
  useTemplateStore.getState().setSaved({ graphicId: doc.id, dirty: false, status: 'idle' });
  persistLink();
}

export function openGraphicById(id: string): boolean {
  const doc = graphicById(id);
  if (!doc) return false;
  openGraphicDoc(doc);
  return true;
}

// ── The save/guard UI store ──────────────────────────────────────────────────────────────────

export interface SaveUiState {
  /** The name-and-destination dialog: first save, or an explicit Save As. `then` runs after a
   *  successful save (the guard's "Save first, then continue" continuation). */
  saveDialog: { mode: 'first' | 'save-as'; then?: () => void } | null;
  /** The unsaved-changes guard: `proceed` performs the destructive switch when confirmed;
   *  `cancel` runs when the user backs out (e.g. a route-driven open rewinds the URL). */
  confirmSwitch: { proceed: () => void; cancel?: () => void } | null;
  openSaveDialog: (mode: 'first' | 'save-as', then?: () => void) => void;
  closeSaveDialog: () => void;
  /** Dismiss the guard without proceeding (runs its `cancel`, if any). */
  closeConfirm: () => void;
  /** Dismiss the guard because the switch happened (never runs `cancel`). */
  settleConfirm: () => void;
  /**
   * Run `proceed` (an action that REPLACES the working document) behind the guard: dirty
   * documents ask first, clean ones switch immediately.
   */
  requestSwitch: (proceed: () => void, cancel?: () => void) => void;
}

export const useSaveUi = create<SaveUiState>((set, get) => ({
  saveDialog: null,
  confirmSwitch: null,
  openSaveDialog: (mode, then) => set({ saveDialog: { mode, then } }),
  closeSaveDialog: () => set({ saveDialog: null }),
  closeConfirm: () => {
    const cancel = get().confirmSwitch?.cancel;
    set({ confirmSwitch: null });
    cancel?.();
  },
  settleConfirm: () => set({ confirmSwitch: null }),
  requestSwitch: (proceed, cancel) => {
    const { saved } = useTemplateStore.getState();
    if (saved.dirty) set({ confirmSwitch: { proceed, cancel } });
    else proceed();
  },
}));
