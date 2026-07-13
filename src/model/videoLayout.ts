// The video editor shell's own layout prefs (localStorage 'spx-gfx-video-layout').
// Deliberately separate from model/layout.ts: the SPX editor has a full dockable-panel
// workspace, while the video shell only needs its code pane's width and collapsed state.
// Keeping them apart is the same parallel-world principle as the stores. Device-local, not
// synced.

import { clampRatio } from './layout';

const STORAGE_KEY = 'spx-gfx-video-layout';

export interface VideoLayout {
  /** The code column's width as a fraction of the workspace (0..1). */
  codeRatio: number;
  /** Whether the code pane is collapsed, giving its space to the preview + panels. */
  codeCollapsed: boolean;
}

export const DEFAULT_VIDEO_LAYOUT: VideoLayout = {
  codeRatio: 0.45,
  codeCollapsed: false,
};

/** Load the saved video layout, merged over defaults; defaults on missing/corrupt storage. */
export function loadVideoLayout(): VideoLayout {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<VideoLayout>;
    return {
      codeRatio: typeof saved.codeRatio === 'number' ? clampRatio(saved.codeRatio, 0.2, 0.7) : DEFAULT_VIDEO_LAYOUT.codeRatio,
      codeCollapsed: saved.codeCollapsed ?? DEFAULT_VIDEO_LAYOUT.codeCollapsed,
    };
  } catch {
    return { ...DEFAULT_VIDEO_LAYOUT };
  }
}

/** Persist a partial update, merged over the current stored value. */
export function saveVideoLayout(patch: Partial<VideoLayout>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadVideoLayout(), ...patch }));
  } catch {
    // Storage full / unavailable — non-fatal (the live layout still works this session).
  }
}
