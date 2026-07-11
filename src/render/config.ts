// Render feature detection — the ONE place the app asks "does cloud rendering exist here?"
// (mirrors backend/config.ts isBackendConfigured). Unset VITE_RENDER_API = the Export tab
// grows zero render UI: offline/self-hosted builds stay exactly as they are.

export function isRenderConfigured(): boolean {
  const flag = (import.meta.env.VITE_RENDER_API ?? '').trim();
  return flag !== '' && flag !== '0';
}
