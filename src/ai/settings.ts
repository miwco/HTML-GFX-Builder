// AI settings: which model, and how to reach it. Two modes share one interface:
//   - Direct (bring your own key): the browser calls Anthropic with YOUR key. The key is
//     stored in localStorage (or read from .env) and never leaves your machine except to
//     Anthropic itself. Never commit a key to the repo.
//   - Proxy (hosted): VITE_AI_PROXY_URL points at a backend gateway that holds the real key
//     server-side (auth/billing live there). The app sends the same request body, minus keys.

const STORAGE_KEY = 'spx-gfx-ai';

export interface AiSettings {
  /** Anthropic API key (direct mode). Empty when unset. */
  apiKey: string;
  /** Model id, e.g. "claude-sonnet-5". */
  model: string;
  /** Gateway base URL (hosted mode). Empty = direct mode. */
  proxyUrl: string;
  /**
   * Generate through the NoaCG harness (design-spec routing, grounded assembly, the live
   * bench, three alternatives) instead of the plain one-shot generation. ON by default:
   * the benchmark (scripts/ai-compare.mjs) showed the harness a clean win on reliability,
   * editability, overlaps, and cost. The checkbox still turns it off for the raw one-shot.
   */
  useHarness: boolean;
}

export const DEFAULT_MODEL = 'claude-sonnet-5';

/** The models offered in the settings dropdown (any id can be typed via .env instead). */
export const AI_MODELS: { id: string; label: string; blurb: string }[] = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', blurb: 'Recommended — strong design + code, fast, low cost.' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', blurb: 'Maximum quality; slower and several times the cost.' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', blurb: 'Cheapest and fastest; simpler results.' },
];

function env(name: string): string {
  return String((import.meta.env as Record<string, unknown>)[name] ?? '');
}

/** Load settings: values saved in the app win, .env fills the gaps. */
export function loadAiSettings(): AiSettings {
  let saved: Partial<AiSettings> = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<AiSettings>;
  } catch {
    // Corrupt storage — fall back to env/defaults.
  }
  return {
    apiKey: saved.apiKey ?? env('VITE_ANTHROPIC_API_KEY'),
    model: saved.model || env('VITE_AI_MODEL') || DEFAULT_MODEL,
    proxyUrl: saved.proxyUrl ?? env('VITE_AI_PROXY_URL'),
    useHarness: saved.useHarness ?? true,
  };
}

export function saveAiSettings(settings: Partial<AiSettings>): void {
  const merged = { ...loadAiSettings(), ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

/** True when generation can actually run (a key for direct mode, or a gateway URL). */
export function aiConfigured(s: AiSettings = loadAiSettings()): boolean {
  return Boolean(s.proxyUrl || s.apiKey);
}
