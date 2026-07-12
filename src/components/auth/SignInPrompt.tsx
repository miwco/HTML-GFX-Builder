import { useAuthUi } from './authUi';

/**
 * The inline gate shown where an account-only feature would render (AI panel, community, …):
 * one line of copy + a Sign in button that opens the SignInDialog. Render it only when
 * useAuthState().needsSignIn is true — offline builds never show it.
 */
export default function SignInPrompt({ feature, reason }: { feature: string; reason: string }) {
  const openSignIn = useAuthUi((s) => s.openSignIn);
  return (
    <div className="panel-section signin-prompt" data-testid="signin-prompt">
      <h3>{feature}</h3>
      <p className="hint">{reason}</p>
      <button className="primary" onClick={() => openSignIn(reason)}>Sign in</button>
    </div>
  );
}
