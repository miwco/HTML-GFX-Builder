// The single feature-detection point for the optional Supabase backend (Era 5).
//
// With the Supabase env vars unset, this reports "not configured" and the whole app runs in
// today's pure-offline localStorage mode: no login, no cloud sync, exports unchanged. This is the
// self-hostability contract — a clean clone with an empty .env behaves exactly like the offline
// tool. Nothing else in the app may branch on backend presence: features ask here (or receive a
// no-op provider), never sprinkle `if (supabaseConfigured)` through components.
//
// The anon key is a PUBLIC key (RLS is the real security boundary), so it is safe to ship in the
// client bundle as a VITE_ var — unlike the service_role key, which must NEVER appear here or in
// any VITE_-prefixed variable (those are bundled into the browser). See docs/ERA5_PLAN.md.

function env(name: string): string {
  return String((import.meta.env as Record<string, unknown>)[name] ?? '').trim();
}

export interface BackendConfig {
  /** Supabase project URL, e.g. https://xxxx.supabase.co. Empty = offline mode. */
  url: string;
  /** Supabase anon/publishable key (public; safe to ship). Empty = offline mode. */
  anonKey: string;
  /**
   * Hosted closed-beta gate: force login before the app is usable. Self-hosted / offline builds
   * leave this off so they run with no auth, exactly like today.
   */
  requireAuth: boolean;
}

/** Read the (optional) Supabase configuration from the build env. */
export function loadBackendConfig(): BackendConfig {
  return {
    url: env('VITE_SUPABASE_URL'),
    anonKey: env('VITE_SUPABASE_ANON_KEY'),
    requireAuth: env('VITE_REQUIRE_AUTH') === 'true',
  };
}

/** True when a Supabase backend is configured (both URL and anon key present). */
export function isBackendConfigured(cfg: BackendConfig = loadBackendConfig()): boolean {
  return Boolean(cfg.url && cfg.anonKey);
}

/**
 * True when the app should force login before use — only when a backend is configured AND the
 * hosted instance opted in via VITE_REQUIRE_AUTH. Self-hosted / offline builds always return
 * false, so they run with no login UI exactly like today.
 */
export function isAuthRequired(cfg: BackendConfig = loadBackendConfig()): boolean {
  return isBackendConfigured(cfg) && cfg.requireAuth;
}
