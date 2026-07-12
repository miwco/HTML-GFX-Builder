import { useEffect, useState, type FormEvent } from 'react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../../backend/auth';
import { useAuthState } from './useAuthState';
import { useAuthUi } from './authUi';
import BrandLogo from '../BrandLogo';

/**
 * The on-demand sign-in dialog (Era 5.6 — the open editor). The app is never walled behind it:
 * it opens over the workspace when the user clicks "Sign in" or hits an account-only feature
 * (cloud sync, community, AI). Google OAuth + email/password, with a sign-in / create-account
 * toggle. Signup is open (migration 0006); the server-side hook can re-close it to the
 * allowlist later without touching this dialog.
 */
export default function SignInDialog() {
  const open = useAuthUi((s) => s.signInOpen);
  const reason = useAuthUi((s) => s.reason);
  const close = useAuthUi((s) => s.closeSignIn);
  const { signedIn, backendConfigured } = useAuthState();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Close automatically the moment a session exists (email sign-in resolves in-page; the OAuth
  // path leaves the page entirely, so it never needs this).
  useEffect(() => {
    if (open && signedIn && backendConfigured) close();
  }, [open, signedIn, backendConfigured, close]);

  // Escape closes — signing in is always optional.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open || !backendConfigured) return null;

  const google = async () => {
    setBusy(true);
    setError(null);
    const { error } = await signInWithGoogle();
    // On success the page redirects to Google; only an error returns control here.
    if (error) {
      setError(error);
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    const fn = mode === 'signin' ? signInWithEmail : signUpWithEmail;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    // On sign-in, the auth subscription closes the dialog. On sign-up, confirm-email first.
    if (mode === 'signup') setNote('Check your email to confirm your account, then sign in.');
  };

  const toggle = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setNote(null);
  };

  return (
    <div className="auth-gate auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="auth-card" role="dialog" aria-modal="true" aria-label="Sign in">
        <button className="auth-close" onClick={close} title="Close (keep working without an account)">✕</button>
        <div className="auth-logo"><BrandLogo size={44} stacked /></div>
        <p className="auth-tag">{reason ?? 'Sign in to save your work across devices, share to the community, and use AI.'}</p>
        <p className="muted auth-sub">Creating and exporting graphics never needs an account.</p>

        <button className="primary auth-google" onClick={google} disabled={busy}>
          Continue with Google
        </button>

        <div className="auth-or"><span>or</span></div>

        <form onSubmit={submit}>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="auth-pass" style={{ marginTop: 10 }}>Password</label>
          <input
            id="auth-pass"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button type="submit" className="primary auth-submit" disabled={busy}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}
        {note && <p className="auth-note">{note}</p>}

        <button className="auth-toggle" onClick={toggle} disabled={busy}>
          {mode === 'signin' ? 'New here? Create a free account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
