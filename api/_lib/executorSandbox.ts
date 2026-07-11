// The Vercel Sandbox executor — placeholder until the production-path phase lands.
// getExecutor() only selects this class when RENDER_EXECUTOR=sandbox.

import type { RenderManifest } from '../../src/render/manifest';
import type { JobOutput } from '../../src/render/types';
import type { JobRecord } from './jobStore';
import type { ExecutorProgress, RenderExecutor } from './executor';

export class SandboxExecutor implements RenderExecutor {
  id = 'sandbox' as const;
  constructor() {
    throw new Error('SandboxExecutor is not implemented yet — unset RENDER_EXECUTOR to render locally');
  }
  start(_job: JobRecord, _manifest: RenderManifest): Promise<{ executorRef: string }> {
    return Promise.reject(new Error('unimplemented'));
  }
  readProgress(): Promise<ExecutorProgress | null> { return Promise.reject(new Error('unimplemented')); }
  finalizeOutput(): Promise<JobOutput | null> { return Promise.reject(new Error('unimplemented')); }
  stop(): Promise<void> { return Promise.reject(new Error('unimplemented')); }
}
