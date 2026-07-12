// GET /api/render/status?id=<jobId> — Bearer <jobToken>. Reads the job, pulls the
// executor's live progress through the reconciler (which also finalizes completion and
// times out lost jobs), and answers the RenderJobStatus DTO the UI polls on.

import { apiError, bearerToken, json, methodGuard, secretMatches } from '../_lib/http.js';
import { getJobStore } from '../_lib/jobStore.js';
import { getExecutor } from '../_lib/executor.js';
import { reconcileJob, toStatus } from '../_lib/reconcile.js';

export default {
  async fetch(req: Request): Promise<Response> {
    const guard = methodGuard(req, 'GET');
    if (guard) return guard;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError('invalid', 'missing id', 400);

    const store = await getJobStore();
    const job = await store.get(id);
    // Wrong token gets the same answer as a missing job — job ids are not probeable.
    if (!job || !secretMatches(bearerToken(req), job.jobTokenHash)) {
      return apiError('not_found', 'unknown job', 404);
    }

    const executor = await getExecutor();
    const fresh = await reconcileJob(job, store, executor);
    return json(toStatus(fresh));
  },
};
