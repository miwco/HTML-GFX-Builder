// The render API client — the backend-agnostic seam the Export UI talks through. The UI
// never knows WHAT renders (local executor in dev/self-host, Vercel Sandbox hosted): it
// starts a job, polls status, cancels, downloads. Attaches the Supabase JWT when signed
// in (the server resolves the tier; client checks are UX only).

import { getAccessToken } from '../backend/auth';
import { RENDER_CONFIG } from './limits';
import type { RenderManifest } from './manifest';
import type { RenderApiError, RenderJobStatus, StartRenderResponse } from './types';

export class RenderRequestError extends Error {
  code: RenderApiError['error']['code'];
  issues?: string[];
  existingJobId?: string;

  constructor(err: RenderApiError['error']) {
    super(err.message);
    this.code = err.code;
    this.issues = err.issues;
    this.existingJobId = err.existingJobId;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function throwApiError(res: Response): Promise<never> {
  let body: RenderApiError | null = null;
  try {
    body = (await res.json()) as RenderApiError;
  } catch {
    // non-JSON error (proxy page, network hiccup)
  }
  throw new RenderRequestError(
    body?.error ?? { code: 'internal', message: `render service error (HTTP ${res.status})` },
  );
}

export async function startRender(manifest: RenderManifest): Promise<StartRenderResponse> {
  const body = JSON.stringify({ manifest });
  if (body.length > RENDER_CONFIG.manifestMaxBytes) {
    throw new RenderRequestError({
      code: 'too_large',
      message: `This graphic's embedded assets exceed the ${Math.round(RENDER_CONFIG.manifestMaxBytes / 1e6)} MB upload limit — remove or shrink images/fonts.`,
    });
  }
  const res = await fetch('/api/render/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeaders()) },
    body,
  });
  if (res.status !== 202) return throwApiError(res);
  return (await res.json()) as StartRenderResponse;
}

export async function fetchStatus(jobId: string, jobToken: string): Promise<RenderJobStatus> {
  const res = await fetch(`/api/render/status?id=${encodeURIComponent(jobId)}`, {
    headers: { authorization: `Bearer ${jobToken}` },
  });
  if (!res.ok) return throwApiError(res);
  return (await res.json()) as RenderJobStatus;
}

export async function cancelRender(jobId: string, jobToken: string): Promise<RenderJobStatus> {
  const res = await fetch('/api/render/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${jobToken}` },
    body: JSON.stringify({ jobId }),
  });
  if (!res.ok) return throwApiError(res);
  return (await res.json()) as RenderJobStatus;
}

/** The browser-navigable download URL. Local-executor outputs are token-gated by query
 *  param (the URL is opened as a navigation, not a fetch); Blob URLs pass through. */
export function downloadHref(status: RenderJobStatus, jobToken: string): string | null {
  const url = status.output?.downloadUrl ?? status.output?.url ?? null;
  if (!url) return null;
  return url.startsWith('/api/render/file') ? `${url}&token=${encodeURIComponent(jobToken)}` : url;
}
