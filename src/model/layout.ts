// Desktop layout preferences. The first PERSISTED UI preference in the app — everything else in
// localStorage is content (project/brand/packets/looks). Mirrors the load/save-over-a-key shape of
// ai/settings.ts. Only the desktop workspace reads this; the mobile layout ignores it. See
// src/components/AppShell.tsx.

const STORAGE_KEY = 'spx-gfx-layout';

/** Two desktop arrangements: the classic code-on-the-left split, or a full-width preview across the
 *  top with code + panels below it (a genuinely bigger preview). */
export type LayoutMode = 'code-left' | 'preview-top';

export interface LayoutPrefs {
  mode: LayoutMode;
  /** Whether the code-editor pane is collapsed (applies in both modes), giving its space to the rest. */
  codeCollapsed: boolean;
  /** code-left: the code column's width as a fraction of the workspace (0..1). */
  codeRatio: number;
  /** preview-top: the preview row's height as a fraction of the workspace (0..1). */
  previewRatio: number;
  /** preview-top: the code column's width as a fraction of the bottom row (0..1). */
  bottomRatio: number;
  /** Whether the Inspector column (right of the preview) is collapsed. */
  inspectorCollapsed: boolean;
  /** The Inspector column's width as a fraction of its row (0..1). */
  inspectorRatio: number;
}

export const DEFAULT_LAYOUT: LayoutPrefs = {
  mode: 'code-left',
  codeCollapsed: false,
  codeRatio: 0.5,     // ≈ today's 1.05fr / 1fr split
  previewRatio: 0.58, // a big preview up top, with room for code + panels below
  bottomRatio: 0.5,
  inspectorCollapsed: false,
  inspectorRatio: 0.2,
};

/** Clamp a split fraction to usable bounds so no region becomes unusable. Column splits use the tight
 *  default; the preview HEIGHT split passes wider bounds so the preview can get large. */
export function clampRatio(ratio: number, min = 0.2, max = 0.7): number {
  if (!Number.isFinite(ratio)) return 0.5;
  return Math.min(max, Math.max(min, ratio));
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' ? clampRatio(v, min, max) : fallback;
}

/** Load the saved layout, merged over defaults; falls back to defaults on missing/corrupt storage. */
export function loadLayout(): LayoutPrefs {
  let saved: Partial<LayoutPrefs> = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<LayoutPrefs>;
  } catch {
    // Corrupt storage — fall back to defaults.
  }
  return {
    mode: saved.mode === 'preview-top' ? 'preview-top' : DEFAULT_LAYOUT.mode,
    codeCollapsed: saved.codeCollapsed ?? DEFAULT_LAYOUT.codeCollapsed,
    codeRatio: num(saved.codeRatio, DEFAULT_LAYOUT.codeRatio, 0.2, 0.7),
    previewRatio: num(saved.previewRatio, DEFAULT_LAYOUT.previewRatio, 0.25, 0.85),
    bottomRatio: num(saved.bottomRatio, DEFAULT_LAYOUT.bottomRatio, 0.2, 0.7),
    // The Inspector defaults OPEN only where three columns genuinely fit (full-width
    // desktops); on laptop-width windows it starts collapsed — the ◨ toggle is one click
    // and the explicit preference always wins.
    inspectorCollapsed:
      saved.inspectorCollapsed ?? (typeof window !== 'undefined' ? window.innerWidth < 1500 : false),
    inspectorRatio: num(saved.inspectorRatio, DEFAULT_LAYOUT.inspectorRatio, 0.12, 0.35),
  };
}

/** Persist a partial update, merged over the current stored value. */
export function saveLayout(prefs: Partial<LayoutPrefs>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadLayout(), ...prefs }));
  } catch {
    // Storage full / unavailable — non-fatal (the live layout still works this session).
  }
}
