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
}

/** Read the (optional) Supabase configuration from the build env. */
export function loadBackendConfig(): BackendConfig {
  return {
    url: env('VITE_SUPABASE_URL'),
    anonKey: env('VITE_SUPABASE_ANON_KEY'),
  };
}

/**
 * True when a Supabase backend is configured (both URL and anon key present).
 *
 * There is deliberately NO "require auth" mode: the editor is open to everyone, always — anyone
 * can create, preview, and export without an account. Signing in only unlocks the account
 * features (cloud sync, community, AI); each of those gates itself via the auth state.
 */
export function isBackendConfigured(cfg: BackendConfig = loadBackendConfig()): boolean {
  return Boolean(cfg.url && cfg.anonKey);
}
