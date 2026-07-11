// The durable production job ledger over supabase (table render_jobs, migration 0007).
// Placeholder until the persistence phase lands — getJobStore() only selects this class
// when SUPABASE_SERVICE_ROLE_KEY is set.

import type { JobRecord, JobStore } from './jobStore';

export class SupabaseJobStore implements JobStore {
  constructor() {
    throw new Error('SupabaseJobStore is not implemented yet — unset SUPABASE_SERVICE_ROLE_KEY to use the in-memory store');
  }
  create(_job: JobRecord): Promise<void> { return Promise.reject(new Error('unimplemented')); }
  get(_id: string): Promise<JobRecord | null> { return Promise.reject(new Error('unimplemented')); }
  update(): Promise<JobRecord | null> { return Promise.reject(new Error('unimplemented')); }
  countRecent(): Promise<number> { return Promise.reject(new Error('unimplemented')); }
  countActive(): Promise<number> { return Promise.reject(new Error('unimplemented')); }
  findActiveDuplicate(): Promise<JobRecord | null> { return Promise.reject(new Error('unimplemented')); }
  listSweepable(): Promise<JobRecord[]> { return Promise.reject(new Error('unimplemented')); }
}
