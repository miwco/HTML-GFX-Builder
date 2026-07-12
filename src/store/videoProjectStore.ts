// Central state for the video editor (zustand), mirroring templateStore's contracts:
// applyProject is the undoable mutation choke point (AI results, settings patches, asset
// changes all snapshot for undo), setTsx is manual typing (no history spam - Monaco's own
// undo covers keystrokes), and an 800 ms-debounced subscription autosaves the project.
// Completely parallel to templateStore: the SPX store never sees video state or vice versa.

import { create } from 'zustand';
import type { AssetFile } from '../model/types';
import type { VideoChatMessage, VideoProject } from '../model/videoTypes';
import { createDefaultVideoProject } from '../model/videoTypes';
import { loadCurrentVideoProject, saveCurrentVideoProject } from '../model/videoProject';

export type VideoPanelTab = 'chat' | 'settings' | 'assets' | 'export';

interface VideoProjectState {
  project: VideoProject;
  /** Snapshots taken before each apply, for undo (30-cap, like templateStore). */
  history: VideoProject[];
  /** Undone snapshots for redo; any NEW edit clears it (the classic undo-tree cut). */
  future: VideoProject[];
  /** The side panel's active tab in the video shell. */
  activePanel: VideoPanelTab;
  /** Latest compile/runtime error from the preview pipeline (null = healthy). */
  previewError: string | null;
  /** Bumped after an AI apply so the player restarts from frame 0. */
  replayNonce: number;
  /** Label of the AI stage in flight ('Planning motion…'), or null. Blocks concurrent sends. */
  busy: string | null;
  /** True when the last autosave failed (storage quota) - the shell shows a warning. */
  autosaveFailed: boolean;

  /** Replace the whole document (wizard create, reopen). Clears history - a clean break. */
  loadProject: (project: VideoProject) => void;
  /** Undoable apply - AI results (tsx + plan + chat in ONE snapshot), asset changes. */
  applyProject: (next: VideoProject) => void;
  /** Undoable settings change (duration/fps/size/name/transparent/model/exportPrefs). */
  patchSettings: (patch: Partial<VideoProject>) => void;
  /** Manual code typing: no history snapshot (Monaco native undo), clears redo. */
  setTsx: (tsx: string) => void;
  /** Append a chat message without a snapshot (optimistic user turns, error notes). */
  appendChat: (msg: VideoChatMessage) => void;
  /** Drop the last chat message (roll back an optimistic user turn on failure). */
  dropLastChat: () => void;
  addAsset: (asset: AssetFile) => void;
  removeAsset: (path: string) => void;
  undo: () => void;
  redo: () => void;
  setActivePanel: (tab: VideoPanelTab) => void;
  setPreviewError: (error: string | null) => void;
  requestReplay: () => void;
  setBusy: (label: string | null) => void;
  setAutosaveFailed: (failed: boolean) => void;
}

const initialProject = loadCurrentVideoProject() ?? createDefaultVideoProject();

export const useVideoProjectStore = create<VideoProjectState>((set) => ({
  project: initialProject,
  history: [],
  future: [],
  activePanel: 'chat',
  previewError: null,
  replayNonce: 0,
  busy: null,
  autosaveFailed: false,

  loadProject: (project) =>
    set({ project, history: [], future: [], previewError: null, busy: null, activePanel: 'chat' }),

  applyProject: (next) =>
    set((s) => ({
      project: next,
      history: [...s.history, s.project].slice(-30),
      future: [],
    })),

  patchSettings: (patch) =>
    set((s) => ({
      project: { ...s.project, ...patch },
      history: [...s.history, s.project].slice(-30),
      future: [],
    })),

  setTsx: (tsx) =>
    set((s) => ({ project: { ...s.project, tsx }, future: [] })),

  appendChat: (msg) =>
    set((s) => ({ project: { ...s.project, chat: [...s.project.chat, msg] } })),

  dropLastChat: () =>
    set((s) => ({ project: { ...s.project, chat: s.project.chat.slice(0, -1) } })),

  addAsset: (asset) =>
    set((s) => ({
      project: {
        ...s.project,
        assets: [...s.project.assets.filter((a) => a.path !== asset.path), asset],
      },
      history: [...s.history, s.project].slice(-30),
      future: [],
    })),

  removeAsset: (path) =>
    set((s) => ({
      project: { ...s.project, assets: s.project.assets.filter((a) => a.path !== path) },
      history: [...s.history, s.project].slice(-30),
      future: [],
    })),

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return {};
      const prev = s.history[s.history.length - 1];
      return {
        project: prev,
        history: s.history.slice(0, -1),
        future: [...s.future, s.project].slice(-30),
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[s.future.length - 1];
      return {
        project: next,
        history: [...s.history, s.project].slice(-30),
        future: s.future.slice(0, -1),
      };
    }),

  setActivePanel: (activePanel) => set({ activePanel }),
  setPreviewError: (previewError) => set({ previewError }),
  requestReplay: () => set((s) => ({ replayNonce: s.replayNonce + 1 })),
  setBusy: (busy) => set({ busy }),
  setAutosaveFailed: (autosaveFailed) => set({ autosaveFailed }),
}));

// Autosave the working video project (debounced) whenever the document changes, mirroring
// templateStore's autosaver. A failed save (quota - video assets are big) raises a visible
// flag instead of losing work silently.
let videoSaveTimer: ReturnType<typeof setTimeout> | null = null;
useVideoProjectStore.subscribe((state, prev) => {
  if (state.project === prev.project) return;
  if (videoSaveTimer) clearTimeout(videoSaveTimer);
  videoSaveTimer = setTimeout(() => {
    const ok = saveCurrentVideoProject(useVideoProjectStore.getState().project);
    const failedNow = !ok;
    if (useVideoProjectStore.getState().autosaveFailed !== failedNow) {
      useVideoProjectStore.getState().setAutosaveFailed(failedNow);
    }
  }, 800);
});
