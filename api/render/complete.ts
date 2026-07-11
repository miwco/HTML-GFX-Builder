// POST /api/render/complete — the WORKER's terminal callback, authorized by the per-job
// worker secret (distinct from the browser's job token: the browser can never forge
// completion, the worker can never cancel or probe). Makes completion durable even when
// no browser is polling — the sandbox path POSTs here after uploading to Blob.
// The local executor doesn't need it (the status reconciler reads its files directly),
// but the route works identically for both.

import { RENDER_CONFIG } from '../../src/render/limits';
import type { JobError } from '../../src/render/types';
import { apiError, json, methodGuard, readJson, secretMatches } from '../_lib/http';
import { getJobStore } from '../_lib/jobStore';

interface CompleteBody {
  jobId?: string;
  ok?: boolean;
  blobUrl?: string;
  blobDownloadUrl?: string;
  bytes?: number;
  contentType?: string;
  error?: JobError;
}

export default {
  async fetch(req: Request): Promise<Response> {
    const guard = methodGuard(req, 'POST');
    if (guard) return guard;

    let body: CompleteBody;
    try {
      body = await readJson<CompleteBody>(req, 100_000);
    } catch {
      return apiError('invalid', 'bad request body', 400);
    }
    if (!body.jobId) return apiError('invalid', 'missing jobId', 400);

    const store = await getJobStore();
    const job = await store.get(body.jobId);
    const secret = req.headers.get('x-render-worker-secret');
    if (!job || !secretMatches(secret, job.workerSecretHash)) {
      return apiError('not_found', 'unknown job', 404);
    }

    if (body.ok && body.blobUrl) {
      const expiresAt = Date.now() + RENDER_CONFIG.outputTtlMs[job.tier];
      await store.update(
        job.id,
        {
          state: 'complete',
          expiresAt,
          output: {
            url: body.blobUrl,
            downloadUrl: body.blobDownloadUrl ?? body.blobUrl,
            bytes: body.bytes ?? 0,
            contentType: body.contentType ?? 'application/octet-stream',
            expiresAt: new Date(expiresAt).toISOString(),
          },
        },
        { guardNonTerminal: true },
      );
    } else {
      await store.update(
        job.id,
        { state: 'failed', error: body.error ?? { code: 'render_failed', message: 'render failed' } },
        { guardNonTerminal: true },
      );
    }
    return json({ ok: true });
  },
};
