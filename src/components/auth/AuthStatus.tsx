import { signOut } from '../../backend/auth';
import { useAuthState } from './useAuthState';
import { useAuthUi } from './authUi';

/**
 * Topbar account control. Renders nothing in offline / self-host mode (no backend, no login UI).
 * In hosted mode: signed out → a "Sign in" button opening the SignInDialog; signed in → the
 * user's email + Sign out. The app itself is never gated — this is the only always-visible
 * entry point into an account.
 */
export default function AuthStatus() {
  const { backendConfigured, status, user } = useAuthState();
  const openSignIn = useAuthUi((s) => s.openSignIn);

  if (!backendConfigured || status === 'loading') return null;

  if (status === 'signed-out') {
    return (
      <button className="auth-signin" onClick={() => openSignIn()} title="Sign in to save your work, share to the community, and use AI">
        Sign in
      </button>
    );
  }

  const label = user?.email ?? 'Signed in';
  return (
    <span className="auth-status">
      <span className="muted" title={label}>{label}</span>
      <button className="auth-signout" onClick={() => void signOut()}>Sign out</button>
    </span>
  );
}
