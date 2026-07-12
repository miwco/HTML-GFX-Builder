import { create } from 'zustand';

/**
 * Tiny UI store for the on-demand sign-in dialog. Any feature gate (topbar button, AI panel,
 * community, publish) calls openSignIn(reason) and the dialog opens over the app — the app itself
 * is never walled. The optional reason line tells the user WHY they are being asked to sign in.
 */
interface AuthUiStore {
  signInOpen: boolean;
  /** One short sentence shown under the logo, e.g. "Sign in to browse the community gallery." */
  reason: string | null;
  openSignIn: (reason?: string) => void;
  closeSignIn: () => void;
}

export const useAuthUi = create<AuthUiStore>((set) => ({
  signInOpen: false,
  reason: null,
  openSignIn: (reason) => set({ signInOpen: true, reason: reason ?? null }),
  closeSignIn: () => set({ signInOpen: false, reason: null }),
}));
