// Small persisted user preferences (this browser's localStorage — not synced; they are
// device-level workflow defaults, not project data). Kept intentionally tiny: every entry
// must be a genuine default someone sets once, not hidden app state.

const PREFS_KEY = 'spx-gfx-prefs';

export interface UserPrefs {
  /** The export target preselected in the Export tab (also updated on every manual pick). */
  defaultExportTarget: string;
  /** The preview timeline strip's collapsed state. null = auto (expanded desktop, collapsed mobile). */
  timelineCollapsed: boolean | null;
}

const DEFAULTS: UserPrefs = {
  defaultExportTarget: '', // empty = the registry's first target
  timelineCollapsed: null,
};

export function loadPrefs(): UserPrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<UserPrefs>) };
  } catch {
    return { ...DEFAULTS }; // corrupt storage — fall back to defaults
  }
}

export function savePrefs(patch: Partial<UserPrefs>): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
}
