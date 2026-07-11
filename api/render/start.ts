// POST /api/render/start — validate a render job, enforce tier limits and quotas, launch
// the executor DETACHED, answer 202 immediately. No function invocation ever waits for a
// render; progress flows through /api/render/status.

import { randomUUID } from 'node:crypto';
import { durationInFrames, RENDER_MANIFEST_VERSION, type RenderManifest } from '../../src/render/manifest';
import { jobTimeoutMs, RENDER_CONFIG, resolveTier, RENDER_LIMITS, validateRenderRequest } from '../../src/render/limits';
import type { StartRenderResponse } from '../../src/render/types';
import { apiError, bearerToken, ipHash, json, methodGuard, newSecret, readJson, sha256 } from '../_lib/http';
import { verifyUser } from '../_lib/auth';
import { getJobStore, type JobRecord } from '../_lib/jobStore';
import { getExecutor } from '../_lib/executor';

export default {
  async fetch(req: Request): Promise<Response> {
    const guard = methodGuard(req, 'POST');
    if (guard) return guard;

    let manifest: RenderManifest;
    try {
      const body = await readJson<{ manifest?: RenderManifest }>(req, RENDER_CONFIG.manifestMaxBytes);
      if (!body?.manifest) return apiError('invalid', 'missing manifest', 400);
      manifest = body.manifest;
    } catch (err) {
      const code = (err as { code?: string }).code === 'too_large' ? 'too_large' : 'invalid';
      return apiError(code as 'too_large' | 'invalid', (err as Error).message, code === 'too_large' ? 413 : 400);
    }
    if (manifest.version !== RENDER_MANIFEST_VERSION) {
      return apiError('invalid', `unsupported manifest version ${manifest.version}`, 400);
    }
    if (typeof manifest.documentHtml !== 'string' || manifest.documentHtml.length === 0) {
      return apiError('invalid', 'manifest has no document', 400);
    }

    // Tier + authoritative limit re-check (client-side checks are UX only).
    const user = await verifyUser(bearerToken(req));
    const tier = resolveTier(Boolean(user));
    const issues = validateRenderRequest(manifest, tier);
    if (issues.length > 0) {
      const signin = issues.find((i) => i.code === 'format-signin');
      if (signin) return apiError('format_requires_signin', signin.message, 403);
      return apiError('limit_exceeded', issues[0].message, 422, { issues: issues.map((i) => i.message) });
    }

    // Quotas. Duplicate detection runs FIRST: an accidental double-submit should point at
    // the already-running job (the client resumes polling it), not burn a quota answer.
    const store = await getJobStore();
    const ip = ipHash(req);
    const principal = user ? `user:${user.userId}` : `ip:${ip}`;
    const caps = RENDER_LIMITS[tier];
    const now = Date.now();
    const manifestHash = sha256(JSON.stringify(manifest));
    const dup = await store.findActiveDuplicate(principal, manifestHash);
    if (dup) {
      return apiError('duplicate', 'An identical render is already running.', 409, { existingJobId: dup.id });
    }
    if ((await store.countActive(principal)) >= caps.maxConcurrent) {
      return apiError('concurrent', `You already have ${caps.maxConcurrent} render(s) running — wait for them to finish.`, 409);
    }
    if ((await store.countRecent(principal, now - 3600_000)) >= caps.perHour) {
      return apiError('quota', `Hourly render limit reached (${caps.perHour}/h). Try again later.`, 429);
    }
    if ((await store.countRecent(principal, now - 86_400_000)) >= caps.perDay) {
      return apiError('quota', `Daily render limit reached (${caps.perDay}/day). Try again tomorrow.`, 429);
    }

    // The two per-job secrets: the browser's status/cancel token and the worker's
    // completion secret. Only their hashes are stored.
    const jobToken = newSecret();
    const workerSecret = newSecret();
    const totalFrames = durationInFrames(manifest);
    const job: JobRecord = {
      id: randomUUID(),
      principal,
      userId: user?.userId ?? null,
      ipHash: ip,
      tier,
      projectName: String(manifest.projectName || 'graphic').slice(0, 120),
      jobTokenHash: sha256(jobToken),
      workerSecretHash: sha256(workerSecret),
      state: 'pending',
      format: manifest.output.format,
      width: manifest.width,
      height: manifest.height,
      fps: manifest.fps,
      scale: manifest.scale,
      totalFrames,
      manifestHash,
      executorRef: null,
      deadlineAt: now + jobTimeoutMs(manifest) + RENDER_CONFIG.abandonedSlackMs,
      expiresAt: null,
      output: null,
      error: null,
      progress: null,
      createdAt: now,
      updatedAt: now,
    };
    await store.create(job);

    try {
      const executor = await getExecutor();
      const { executorRef } = await executor.start(job, manifest, { workerSecret });
      await store.update(job.id, { state: 'provisioning', executorRef });
    } catch (err) {
      await store.update(job.id, {
        state: 'failed',
        error: { code: 'provision_error', message: 'Could not start the render service — try again in a minute.' },
      });
      console.error('render start failed:', err);
      return apiError('unavailable', 'Could not start the render service — try again in a minute.', 503);
    }

    const resBody: StartRenderResponse = {
      jobId: job.id,
      jobToken,
      pollIntervalMs: RENDER_CONFIG.pollIntervalMs,
      totalFrames,
    };
    return json(resBody, 202);
  },
};
