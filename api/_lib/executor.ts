// The renderer seam. LocalExecutor runs render-worker/job.mjs as a child process on the
// dev machine (the full-loop dev story and the acceptance path); SandboxExecutor
// (executorSandbox.ts) runs the same worker inside Vercel Sandbox. The api handlers only
// ever talk to this interface — nothing above it knows which backend rendered.

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RENDER_FORMATS, type RenderManifest } from '../../src/render/manifest.js';
import type { JobError, JobOutput, JobState } from '../../src/render/types.js';
import type { JobRecord } from './jobStore.js';

export interface ExecutorProgress {
  state: Extract<JobState, 'provisioning' | 'rendering' | 'encoding' | 'uploading' | 'complete' | 'failed'>;
  progress: number; // 0..1
  renderedFrames?: number;
  encodedFrames?: number;
  totalFrames?: number;
  outputBytes?: number;
  error?: JobError;
  /** Executors that learn the final URL from their own progress channel (the sandbox's
   *  Blob upload) deliver it here; finalizeOutput() is the fallback. */
  output?: { url: string; bytes: number; contentType: string };
}

export interface ExecutorStartResult {
  executorRef: string;
  /** Set when the render finished inside start() itself (sandbox stills) — the launcher
   *  marks the job complete directly instead of waiting for progress polls. */
  immediateOutput?: { url: string; bytes: number; contentType: string };
}

export interface RenderExecutor {
  id: 'local' | 'sandbox';
  /** Launch the render detached; returns the executor handle stored on the job.
   *  Sandbox launches take minutes (VM provisioning) — api/render/start runs them under
   *  waitUntil AFTER answering 202, never on the request path. */
  start(job: JobRecord, manifest: RenderManifest, secrets: { workerSecret: string }): Promise<ExecutorStartResult>;
  /** The worker's latest progress snapshot; null when unreadable (booting or gone). */
  readProgress(job: JobRecord): Promise<ExecutorProgress | null>;
  /** Resolve the finished file's download info (called once when progress says complete). */
  finalizeOutput(job: JobRecord): Promise<JobOutput | null>;
  /** Hard-stop the render (cancel / timeout sweep). Idempotent. */
  stop(job: JobRecord): Promise<void>;
}

// ── Local executor ────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const JOBS_DIR = path.join(REPO_ROOT, '.render-dev', 'jobs');

function jobDir(jobId: string): string {
  return path.join(JOBS_DIR, jobId);
}

function outputName(format: keyof typeof RENDER_FORMATS): string {
  return `output.${RENDER_FORMATS[format].ext}`;
}

class LocalExecutor implements RenderExecutor {
  id = 'local' as const;

  async start(job: JobRecord, manifest: RenderManifest): Promise<{ executorRef: string }> {
    const dir = jobDir(job.id);
    mkdirSync(dir, { recursive: true });
    const manifestPath = path.join(dir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const child = spawn(
      process.execPath,
      [
        path.join(REPO_ROOT, 'render-worker', 'job.mjs'),
        manifestPath,
        path.join(dir, outputName(manifest.output.format)),
        path.join(dir, 'progress.json'),
      ],
      { cwd: path.join(REPO_ROOT, 'render-worker'), detached: false, stdio: 'ignore' },
    );
    child.unref();
    writeFileSync(path.join(dir, 'pid'), String(child.pid ?? ''));
    return { executorRef: job.id };
  }

  async readProgress(job: JobRecord): Promise<ExecutorProgress | null> {
    try {
      return JSON.parse(readFileSync(path.join(jobDir(job.id), 'progress.json'), 'utf8')) as ExecutorProgress;
    } catch {
      return null; // not written yet (still provisioning) or job dir gone
    }
  }

  async finalizeOutput(job: JobRecord): Promise<JobOutput | null> {
    const file = path.join(jobDir(job.id), outputName(job.format));
    try {
      const { size } = statSync(file);
      // Served by api/render/file (the dev middleware in local mode) — jobToken-gated.
      const url = `/api/render/file?id=${job.id}`;
      return {
        url,
        downloadUrl: url,
        bytes: size,
        contentType: RENDER_FORMATS[job.format].mime,
        expiresAt: job.expiresAt ? new Date(job.expiresAt).toISOString() : null,
      };
    } catch {
      return null;
    }
  }

  async stop(job: JobRecord): Promise<void> {
    try {
      const pid = Number(readFileSync(path.join(jobDir(job.id), 'pid'), 'utf8'));
      if (pid) process.kill(pid);
    } catch {
      // already exited — stop is idempotent
    }
  }
}

/** Absolute path of a local job's finished file (the file route streams it). */
export function localOutputPath(job: JobRecord): string {
  return path.join(jobDir(job.id), outputName(job.format));
}

/** The executor for this deployment: Vercel Sandbox when configured, else local. */
export async function getExecutor(): Promise<RenderExecutor> {
  if ((process.env.RENDER_EXECUTOR ?? '').trim() === 'sandbox') {
    const { SandboxExecutor } = await import('./executorSandbox.js');
    return new SandboxExecutor();
  }
  return new LocalExecutor();
}
