// Auth (Era 5.1) — a thin, framework-agnostic wrapper over Supabase Auth: Google OAuth +
// email/password. Everything no-ops when no backend is configured, so the offline app never calls
// it. The invite-only gate is enforced SERVER-side (the enforce_allowlist hook, see
// supabase/migrations/0002_auth_allowlist.sql); this module just surfaces the resulting 403 to the
// user. The UI gate is UX only — RLS + the hook are the real security boundary.

import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
}

// Return to wherever the app itself is served from (/app hosted, /app.html raw self-host) —
// NOT the bare origin: that is the public landing page, which runs no Supabase client.
const OAUTH_REDIRECT =
  typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined;

/** Start Google OAuth. On success the page redirects, so a resolved value with no error means
 * "redirecting"; an error means it never left. */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'No backend configured.' };
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: OAUTH_REDIRECT },
  });
  return { error: error?.message ?? null };
}

/** Sign in with email + password (existing account). */
export async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'No backend configured.' };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

/**
 * Create an account with email + password. Signup is open (migration 0006); the server-side
 * Before-User-Created hook is the switch if it ever needs to re-close to the allowlist — any
 * rejection message it returns surfaces here.
 */
export async function signUpWithEmail(email: string, password: string): Promise<{ error: string | null }> {
  const sb = await getSupabase();
  if (!sb) return { error: 'No backend configured.' };
  const { error } = await sb.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  const sb = await getSupabase();
  await sb?.auth.signOut();
}

/**
 * The current user's access token (JWT), or null. Used to authorize the metered AI gateway —
 * callClaude attaches it as a Bearer header in proxy mode. Reads the live session so the client
 * refreshes an expired token first. Returns null offline / logged out, so self-hosters with their
 * own proxy (and no login) are unaffected.
 */
export async function getAccessToken(): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Subscribe to auth state. Calls back once with the initial state (after reading the stored
 * session / completing an OAuth redirect), then on every change. Returns an unsubscribe fn. With
 * no backend it reports 'signed-in' so a misconfigured gate can never trap the user.
 */
export function subscribeAuth(cb: (state: AuthState) => void): () => void {
  let unsub = () => {};
  let cancelled = false;
  void (async () => {
    const sb = await getSupabase();
    if (cancelled) return;
    if (!sb) {
      cb({ status: 'signed-in', user: null });
      return;
    }
    const { data } = await sb.auth.getSession();
    if (cancelled) return;
    cb(data.session ? { status: 'signed-in', user: data.session.user } : { status: 'signed-out', user: null });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      cb(session ? { status: 'signed-in', user: session.user } : { status: 'signed-out', user: null });
    });
    unsub = () => sub.subscription.unsubscribe();
  })();
  return () => {
    cancelled = true;
    unsub();
  };
}
