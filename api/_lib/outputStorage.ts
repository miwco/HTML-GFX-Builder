// Output-file lifecycle helpers. Local executor outputs live under .render-dev/jobs;
// sandbox outputs live in Vercel Blob (deleted with the RW token, which only the api
// functions hold).

import { rmSync } from 'node:fs';
import path from 'node:path';
import { localOutputPath } from './executor';
import type { JobRecord } from './jobStore';

/** Delete a finished job's output file (TTL expiry). Best-effort, never throws. */
export async function deleteOutput(job: JobRecord): Promise<void> {
  try {
    if (job.output?.url.startsWith('/api/render/file')) {
      rmSync(path.dirname(localOutputPath(job)), { recursive: true, force: true });
      return;
    }
    const token = (process.env.BLOB_READ_WRITE_TOKEN ?? '').trim();
    if (job.output?.url && token) {
      const { del } = await import('@vercel/blob');
      await del(job.output.url, { token });
    }
  } catch (err) {
    console.error('output delete failed for job', job.id, err);
  }
}
