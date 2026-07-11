// Server-side auth for the render API: verify a Supabase JWT into a user id.
// Verification goes through supabase.auth.getUser(token) — two lines, revocation-aware,
// key-rotation-proof (recommended over local JWKS verification; the request already
// makes Supabase round-trips for quota, so the extra ~50 ms is noise).
//
// No backend configured = every caller is anonymous — the render feature still works,
// gated formats simply stay locked.

export interface AuthedUser {
  userId: string;
}

function supabaseEnv(): { url: string; anonKey: string } | null {
  // Vercel exposes env vars to functions verbatim; the VITE_ prefix only matters for
  // client baking, so the server reuses the same two vars (no duplication).
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  return url && anonKey ? { url, anonKey } : null;
}

/** Resolve a Bearer JWT to a user id; null = anonymous (absent/invalid token or no backend). */
export async function verifyUser(token: string | null): Promise<AuthedUser | null> {
  if (!token) return null;
  const env = supabaseEnv();
  if (!env) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id };
  } catch {
    return null; // verification infrastructure down — fail closed to anonymous
  }
}
