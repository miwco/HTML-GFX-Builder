import { useState, type FormEvent } from 'react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../../backend/auth';
import BrandLogo from '../BrandLogo';

/**
 * The full-screen login for the hosted closed beta: Google OAuth + email/password, with a
 * sign-in / request-access (sign-up) toggle. Account creation is gated server-side to allowlisted
 * emails (the enforce_allowlist hook), so a non-invitee's sign-up returns a clear message here.
 * Only rendered by AuthGate in hosted mode — the offline app never mounts it.
 */
export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
    // On sign-in, onAuthStateChange swaps in the app. On sign-up, confirm-email first.
    if (mode === 'signup') setNote('Check your email to confirm your account, then sign in.');
  };

  const toggle = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setNote(null);
  };

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <div className="auth-logo"><BrandLogo size={44} stacked /></div>
        <p className="auth-tag">Broadcast graphics, built in minutes.</p>
        <p className="muted auth-sub">Private beta — sign in to continue.</p>

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
            {mode === 'signin' ? 'Sign in' : 'Request access'}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}
        {note && <p className="auth-note">{note}</p>}

        <button className="auth-toggle" onClick={toggle} disabled={busy}>
          {mode === 'signin' ? 'Have an invite? Create your account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
