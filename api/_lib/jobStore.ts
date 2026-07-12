// The job ledger seam. MemoryJobStore backs local dev (and any deployment without
// Supabase); SupabaseJobStore (jobStoreSupabase.ts) is the durable production ledger.
// All writes go through these stores from the api handlers only — the browser never
// touches job rows directly.

import type { RenderFormatId } from '../../src/render/manifest.js';
import type { RenderTier } from '../../src/render/limits.js';
import type { JobError, JobOutput, JobState } from '../../src/render/types.js';
import { TERMINAL_STATES } from '../../src/render/types.js';

export interface JobProgressSnapshot {
  state: JobState;
  progress: number; // 0..1
  renderedFrames?: number;
  encodedFrames?: number;
  totalFrames?: number;
}

export interface JobRecord {
  id: string;
  /** Quota principal: 'user:<uuid>' or 'ip:<hash>'. */
  principal: string;
  userId: string | null;
  ipHash: string;
  tier: RenderTier;
  projectName: string;
  jobTokenHash: string;
  workerSecretHash: string;
  state: JobState;
  format: RenderFormatId;
  width: number;
  height: number;
  fps: number;
  scale: number;
  totalFrames: number;
  manifestHash: string;
  /** Executor handle: local job directory name / sandbox name. */
  executorRef: string | null;
  /** Past this (ms epoch) a silent job counts as lost. */
  deadlineAt: number;
  /** Output TTL (ms epoch); null until complete. */
  expiresAt: number | null;
  output: JobOutput | null;
  error: JobError | null;
  progress: JobProgressSnapshot | null;
  createdAt: number;
  updatedAt: number;
}

export function isTerminal(state: JobState): boolean {
  return TERMINAL_STATES.includes(state);
}

export interface JobStore {
  create(job: JobRecord): Promise<void>;
  get(id: string): Promise<JobRecord | null>;
  /** Patch a job. When guardNonTerminal is set, the update silently no-ops if the job
   *  already reached a terminal state (idempotent completion/failure). Returns the
   *  stored record. */
  update(id: string, patch: Partial<JobRecord>, opts?: { guardNonTerminal?: boolean }): Promise<JobRecord | null>;
  /** Job creations for a principal since a timestamp (rate windows). */
  countRecent(principal: string, sinceMs: number): Promise<number>;
  /** Non-terminal jobs for a principal (concurrency cap). */
  countActive(principal: string): Promise<number>;
  /** A non-terminal job with the same manifest hash (duplicate-click guard). */
  findActiveDuplicate(principal: string, manifestHash: string): Promise<JobRecord | null>;
  /** Non-terminal jobs past their deadline + terminal jobs past their output TTL. */
  listSweepable(nowMs: number): Promise<JobRecord[]>;
}

/** In-process store. Survives Vite HMR of api modules via a globalThis stash — good
 *  enough for dev; production uses the Supabase ledger. */
class MemoryJobStore implements JobStore {
  private jobs: Map<string, JobRecord>;

  constructor() {
    const g = globalThis as { __noacgRenderJobs?: Map<string, JobRecord> };
    g.__noacgRenderJobs ??= new Map();
    this.jobs = g.__noacgRenderJobs;
  }

  async create(job: JobRecord): Promise<void> {
    this.jobs.set(job.id, { ...job });
  }

  async get(id: string): Promise<JobRecord | null> {
    const j = this.jobs.get(id);
    return j ? { ...j } : null;
  }

  async update(id: string, patch: Partial<JobRecord>, opts?: { guardNonTerminal?: boolean }): Promise<JobRecord | null> {
    const j = this.jobs.get(id);
    if (!j) return null;
    if (opts?.guardNonTerminal && isTerminal(j.state)) return { ...j };
    const next = { ...j, ...patch, updatedAt: Date.now() };
    this.jobs.set(id, next);
    return { ...next };
  }

  async countRecent(principal: string, sinceMs: number): Promise<number> {
    let n = 0;
    for (const j of this.jobs.values()) if (j.principal === principal && j.createdAt >= sinceMs) n++;
    return n;
  }

  async countActive(principal: string): Promise<number> {
    let n = 0;
    for (const j of this.jobs.values()) if (j.principal === principal && !isTerminal(j.state)) n++;
    return n;
  }

  async findActiveDuplicate(principal: string, manifestHash: string): Promise<JobRecord | null> {
    for (const j of this.jobs.values()) {
      if (j.principal === principal && j.manifestHash === manifestHash && !isTerminal(j.state)) return { ...j };
    }
    return null;
  }

  async listSweepable(nowMs: number): Promise<JobRecord[]> {
    const out: JobRecord[] = [];
    for (const j of this.jobs.values()) {
      if (!isTerminal(j.state) && nowMs > j.deadlineAt) out.push({ ...j });
      else if (j.state === 'complete' && j.expiresAt !== null && nowMs > j.expiresAt) out.push({ ...j });
    }
    return out;
  }
}

/** The Supabase secret used for the render-jobs ledger. Supabase's new sb_secret_… secret
 *  key is preferred; the legacy service_role JWT is the fallback. Both are used identically
 *  — an opaque API key handed to createClient with full, RLS-bypassing access — so either
 *  works. Returns '' when neither is set (dev/self-host uses the in-memory store). */
export function supabaseSecretKey(): string {
  return (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
}

/** The store for this deployment: Supabase when the secret key is present, else memory. */
export async function getJobStore(): Promise<JobStore> {
  if (supabaseSecretKey()) {
    const { SupabaseJobStore } = await import('./jobStoreSupabase.js');
    return new SupabaseJobStore();
  }
  return new MemoryJobStore();
}
