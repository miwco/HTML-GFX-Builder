// POST /api/render/cancel — { jobId }, Bearer <jobToken>. Stops the executor and marks
// the job cancelled. Idempotent: cancelling a finished job just reports its final state.

import { apiError, bearerToken, json, methodGuard, readJson, secretMatches } from '../_lib/http';
import { getJobStore, isTerminal } from '../_lib/jobStore';
import { getExecutor } from '../_lib/executor';
import { toStatus } from '../_lib/reconcile';

export default {
  async fetch(req: Request): Promise<Response> {
    const guard = methodGuard(req, 'POST');
    if (guard) return guard;

    let jobId: string | undefined;
    try {
      ({ jobId } = await readJson<{ jobId?: string }>(req, 10_000));
    } catch {
      return apiError('invalid', 'bad request body', 400);
    }
    if (!jobId) return apiError('invalid', 'missing jobId', 400);

    const store = await getJobStore();
    const job = await store.get(jobId);
    if (!job || !secretMatches(bearerToken(req), job.jobTokenHash)) {
      return apiError('not_found', 'unknown job', 404);
    }
    if (isTerminal(job.state)) return json(toStatus(job));

    const executor = await getExecutor();
    await executor.stop(job);
    const updated = await store.update(job.id, { state: 'cancelled' }, { guardNonTerminal: true });
    return json(toStatus(updated ?? job));
  },
};
