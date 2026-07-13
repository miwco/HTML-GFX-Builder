// Which editor world the app shows on load: SPX live graphics or the video editor.
// A tiny persisted flag - App.tsx branches on it between AppShell and VideoAppShell.

import type { DocKind } from './videoTypes';
import { loadCurrentVideoProject } from './videoProject';

const STORAGE_KEY = 'spx-gfx-doc-kind';

export function loadDocKind(): DocKind {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Guard the cleared-storage edge: never boot into an empty video editor.
    if (raw === 'video') return loadCurrentVideoProject() ? 'video' : 'spx';
    return 'spx';
  } catch {
    return 'spx';
  }
}

export function saveDocKind(kind: DocKind): void {
  try {
    localStorage.setItem(STORAGE_KEY, kind);
  } catch {
    // Non-fatal - the app just boots into SPX next time.
  }
}
