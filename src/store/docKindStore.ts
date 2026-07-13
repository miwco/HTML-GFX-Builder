// The document-kind switch: which editor shell App.tsx renders (SPX graphics or video).
// Persisted so a reload restores the world you were working in.

import { create } from 'zustand';
import type { DocKind } from '../model/videoTypes';
import { loadDocKind, saveDocKind } from '../model/docKind';

interface DocKindState {
  kind: DocKind;
  setKind: (kind: DocKind) => void;
}

export const useDocKindStore = create<DocKindState>((set) => ({
  kind: loadDocKind(),
  setKind: (kind) => {
    saveDocKind(kind);
    set({ kind });
  },
}));
