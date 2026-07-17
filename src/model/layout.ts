// Desktop workspace layout (localStorage 'spx-gfx-layout'): a flexible dockable-panel model.
// The centre (canvas over timeline) is fixed; three docks — left, right, bottom — each host any
// panels as tabs and can be resized, and panels can be shown/hidden/moved between docks. The
// mobile layout ignores this (it stacks; see AppShell). Device-local UI only — never synced.

/** Every dockable panel. The six tool panels are the old SidePanel tabs; `code` and
 *  `inspector` join them as peers so any of them can share a dock. */
export type PanelId = 'code' | 'inspector' | 'data' | 'control' | 'style' | 'assets' | 'ai' | 'export';
export type DockId = 'left' | 'right' | 'bottom';

export const ALL_PANELS: PanelId[] = ['code', 'inspector', 'data', 'control', 'style', 'assets', 'ai', 'export'];
export const DOCK_IDS: DockId[] = ['left', 'right', 'bottom'];

export interface DockState {
  /** Panels placed in this dock, in tab order. */
  panels: PanelId[];
  /** The visible tab (null when the dock is empty). */
  active: PanelId | null;
  /** Fraction of the workspace: width for left/right, height for bottom. */
  size: number;
}

export interface WorkspaceLayout {
  version: 3;
  docks: Record<DockId, DockState>;
  /** Fraction of the centre column's height given to the timeline (the rest is the stage). */
  timelineSize: number;
}

const STORAGE_KEY = 'spx-gfx-layout';

/** The default framing: code on the left, the Inspector + tool panels on the right, and the
 *  canvas over a roomy timeline in the centre. The bottom dock starts empty. */
export const DEFAULT_LAYOUT: WorkspaceLayout = {
  version: 3,
  docks: {
    left: { panels: ['code'], active: 'code', size: 0.28 },
    right: { panels: ['inspector', 'data', 'control', 'style', 'assets', 'ai', 'export'], active: 'inspector', size: 0.26 },
    bottom: { panels: [], active: null, size: 0.3 },
  },
  timelineSize: 0.4,
};

export function clampRatio(ratio: number, min = 0.12, max = 0.8): number {
  if (!Number.isFinite(ratio)) return min;
  return Math.min(max, Math.max(min, ratio));
}

/** A panel lives in at most one dock; drop stray/duplicate ids and keep `active` valid. */
function normalizeDock(raw: unknown): DockState {
  const d = (raw ?? {}) as Partial<DockState>;
  const seen = new Set<PanelId>();
  const panels = (Array.isArray(d.panels) ? d.panels : []).filter(
    (p): p is PanelId => ALL_PANELS.includes(p as PanelId) && !seen.has(p as PanelId) && (seen.add(p as PanelId), true),
  );
  const active = d.active && panels.includes(d.active) ? d.active : panels[0] ?? null;
  const size = clampRatio(typeof d.size === 'number' ? d.size : 0.26);
  return { panels, active, size };
}

/** Load the layout, migrating anything that isn't the current dock schema to the default.
 *  Also repairs a saved layout so every panel appears in exactly one dock. */
export function loadLayout(): WorkspaceLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_LAYOUT);
    const parsed = JSON.parse(raw) as { version?: number } & Partial<Omit<WorkspaceLayout, 'version'>>;
    if ((parsed.version !== 2 && parsed.version !== 3) || !parsed.docks) return structuredClone(DEFAULT_LAYOUT);
    const docks: Record<DockId, DockState> = {
      left: normalizeDock(parsed.docks.left),
      right: normalizeDock(parsed.docks.right),
      bottom: normalizeDock(parsed.docks.bottom),
    };
    // v2 -> v3: the Assets panel is new. v2 semantics say "absent = intentionally closed",
    // so without this one-time insert no existing user would ever see the new tab. It goes
    // right after Style (it grew out of the Style panel), falling back to the right dock.
    if (parsed.version === 2 && !DOCK_IDS.some((d) => docks[d].panels.includes('assets'))) {
      const host = DOCK_IDS.find((d) => docks[d].panels.includes('style')) ?? 'right';
      const at = docks[host].panels.indexOf('style');
      docks[host].panels.splice(at >= 0 ? at + 1 : docks[host].panels.length, 0, 'assets');
      if (!docks[host].active) docks[host].active = 'assets';
    }
    // A panel that isn't in any dock is intentionally CLOSED — it stays closed and remains
    // available from a dock's "+" menu (AppShell computes the hidden set). We deliberately do
    // NOT re-add unplaced panels here, or closing a panel wouldn't survive a reload.
    const timelineSize = clampRatio(typeof parsed.timelineSize === 'number' ? parsed.timelineSize : 0.4, 0.15, 0.75);
    return { version: 3, docks, timelineSize };
  } catch {
    return structuredClone(DEFAULT_LAYOUT);
  }
}

export function saveLayout(layout: WorkspaceLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage full/unavailable — non-fatal (the layout just won't persist).
  }
}
