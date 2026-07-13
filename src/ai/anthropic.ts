// The thin Anthropic Messages API client behind the AI provider. Two transports:
//   - Direct: the browser calls api.anthropic.com with the user's own key. Anthropic
//     explicitly supports this via the anthropic-dangerous-direct-browser-access header —
//     safe HERE because the key is the user's own, entered on their machine. Never ship a
//     shared key this way.
//   - Proxy: POST the same body to `${proxyUrl}/messages`; the gateway adds the real key
//     server-side (and does auth/quotas). This is the seam a hosted version plugs into.

import { loadAiSettings } from './settings';
import { getAccessToken } from '../backend/auth';

/** One content block in a user message (text or a base64 image for vision). */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeRequest {
  system: string;
  messages: { role: 'user' | 'assistant'; content: ContentBlock[] | string }[];
  maxTokens?: number;
  /** Force a specific tool call (structured output). */
  tool?: ClaudeTool;
  /** Override the settings model for this call (cheap classification stages pin Haiku;
   *  a video project can pin its own model). */
  model?: string;
}

interface ClaudeResponse {
  content: ({ type: 'text'; text: string } | { type: 'tool_use'; name: string; input: unknown })[];
  stop_reason: string;
}

/** Call Claude. Returns the forced tool's input (when a tool is given) or the text. */
export async function callClaude(req: ClaudeRequest): Promise<unknown> {
  const s = loadAiSettings();

  const body = {
    model: req.model ?? s.model,
    max_tokens: req.maxTokens ?? 16000,
    system: req.system,
    messages: req.messages,
    ...(req.tool
      ? { tools: [req.tool], tool_choice: { type: 'tool', name: req.tool.name } }
      : {}),
  };

  const url = s.proxyUrl ? `${s.proxyUrl.replace(/\/$/, '')}/messages` : 'https://api.anthropic.com/v1/messages';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (s.proxyUrl) {
    // Hosted gateway: authorize with the signed-in user's JWT so the gateway can meter per user.
    // No session (a self-hoster's own proxy, or logged out) → no header, and the proxy still works.
    const token = await getAccessToken();
    if (token) headers['authorization'] = `Bearer ${token}`;
  } else {
    if (!s.apiKey) throw new Error('No API key set. Add one under AI settings (or VITE_ANTHROPIC_API_KEY in .env).');
    headers['x-api-key'] = s.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    let detail = '';
    try {
      const err = (await res.json()) as { error?: { message?: string } };
      detail = err.error?.message ?? '';
    } catch {
      // Non-JSON error body — the status alone will have to do.
    }
    throw new Error(`AI request failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }

  const data = (await res.json()) as ClaudeResponse;
  if (req.tool) {
    // A response cut off at max_tokens leaves the tool input incomplete — partial JSON
    // parses into an object with missing keys and causes confusing downstream crashes.
    // Fail loudly with the real cause instead.
    if (data.stop_reason === 'max_tokens') {
      throw new Error('The AI response was cut off (too long) — try again, or simplify the request.');
    }
    const call = data.content.find((c) => c.type === 'tool_use');
    if (!call || call.type !== 'tool_use') throw new Error('The model did not return the expected structured result.');
    return call.input;
  }
  return data.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
}
