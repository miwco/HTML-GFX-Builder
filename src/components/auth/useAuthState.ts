import { useEffect, useState } from 'react';
import { isBackendConfigured } from '../../backend/config';
import { subscribeAuth, type AuthState } from '../../backend/auth';

export interface AuthUiState extends AuthState {
  /** True when a Supabase backend is configured (hosted / self-hosted-with-server mode). */
  backendConfigured: boolean;
  /** True once a real session exists. Offline (no backend) this is true — nothing is gated. */
  signedIn: boolean;
  /**
   * True when a feature that needs an account should show its sign-in prompt: a backend is
   * configured but the visitor has no session. Always false offline, so the offline app never
   * grows login UI.
   */
  needsSignIn: boolean;
}

/**
 * The one auth-state hook for feature gating (Era 5.6 — the open editor). The app itself is never
 * gated: anyone can create, preview, and export. Account features (cloud sync, community, AI)
 * read `needsSignIn` from here and show a SignInPrompt instead of walling the whole app.
 */
export function useAuthState(): AuthUiState {
  const backendConfigured = isBackendConfigured();
  const [state, setState] = useState<AuthState>(
    // Offline: report signed-in immediately (nothing is gated, no Supabase library is loaded).
    backendConfigured ? { status: 'loading', user: null } : { status: 'signed-in', user: null },
  );

  useEffect(() => {
    if (!backendConfigured) return;
    return subscribeAuth(setState);
  }, [backendConfigured]);

  return {
    ...state,
    backendConfigured,
    signedIn: state.status === 'signed-in',
    needsSignIn: backendConfigured && state.status === 'signed-out',
  };
}
