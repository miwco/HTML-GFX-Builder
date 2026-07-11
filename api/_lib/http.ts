// Shared HTTP plumbing for the render API. Handlers are standard fetch-style
// (Request -> Response), so the same modules run on Vercel and under the Vite dev
// middleware (scripts/renderDevPlugin.mjs). Files under api/_lib are not routed.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RenderApiError } from '../../src/render/types';

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function apiError(
  code: RenderApiError['error']['code'],
  message: string,
  status: number,
  extra: Partial<RenderApiError['error']> = {},
): Response {
  return json({ error: { code, message, ...extra } } satisfies RenderApiError, status);
}

export function methodGuard(req: Request, method: string): Response | null {
  return req.method === method ? null : apiError('invalid', `${req.method} not allowed`, 405);
}

export async function readJson<T>(req: Request, maxBytes: number): Promise<T> {
  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    throw Object.assign(new Error(`request body exceeds ${Math.round(maxBytes / 1e6)} MB`), { code: 'too_large' });
  }
  return JSON.parse(new TextDecoder().decode(buf)) as T;
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

// ── Secrets ───────────────────────────────────────────────────────────────────

export function newSecret(): string {
  return randomBytes(32).toString('hex');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Constant-time compare of a presented secret against a stored sha256 hash. */
export function secretMatches(presented: string | null, storedHash: string): boolean {
  if (!presented) return false;
  const a = Buffer.from(sha256(presented), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Salted hash of the caller's IP — the anonymous quota principal. Never store raw IPs. */
export function ipHash(req: Request): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'local';
  return sha256(ip + (process.env.IP_HASH_SALT ?? 'noacg-dev-salt'));
}
