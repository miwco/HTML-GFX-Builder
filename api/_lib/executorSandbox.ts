// The Vercel Sandbox executor — the hosted rendering backend, built on the official
// @remotion/vercel integration: createSandbox() provisions an ephemeral Firecracker VM
// with Chrome + FFmpeg + the pinned renderer, addBundleToSandbox() uploads the PREBUILT
// composition bundle (render-worker/bundle, built at deploy time — no npm install of our
// code in the sandbox), renderMediaOnVercel() runs DETACHED and uploads the finished file
// to Vercel Blob itself, getRenderProgress() polls across function invocations.
// Selected by RENDER_EXECUTOR=sandbox. @vercel/sandbox is pinned to the version
// @remotion/vercel is developed against (its compiled code uses the sandboxId API).
//
// Because provisioning takes minutes, api/render/start launches this executor UNDER
// waitUntil after answering 202 — no request ever waits on a sandbox boot.
//
// Formats: mp4/webm/prores4444 = renderMediaOnVercel detached; png-still = inline
// renderStillOnVercel + uploadToVercelBlob (seconds once provisioned, completes within
// the launch); png-sequence = a custom detached command (render-worker/seq-job.mjs:
// renderFrames + store-only zip + Blob REST upload) reporting through a progress file —
// the least field-proven path, first on the deployment checklist (docs/RENDER.md).

import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RENDER_FORMATS, type RenderManifest } from '../../src/render/manifest';
import { slug } from '../../src/export/slug';
import type { JobOutput } from '../../src/render/types';
import type { JobRecord } from './jobStore';
import type { ExecutorProgress, ExecutorStartResult, RenderExecutor } from './executor';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BUNDLE_DIR = path.join(REPO_ROOT, 'render-worker', 'bundle');
const SEQ_PROGRESS = 'noacg-job/progress.json';

function blobToken(): string {
  const token = (process.env.BLOB_READ_WRITE_TOKEN ?? '').trim();
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required for sandbox rendering');
  return token;
}

/** The job id is the unguessable path capability; the TTL cron bounds exposure. */
function blobPathFor(job: JobRecord): string {
  return `renders/${job.id}/${slug(job.projectName)}_${job.format}.${RENDER_FORMATS[job.format].ext}`;
}

/** executorRef formats: `media:<sandboxId>:<cmdId>` | `seq:<sandboxId>` | `done:<sandboxId>`. */
function parseRef(job: JobRecord): { kind: string; sandboxId: string; cmdId?: string } | null {
  const parts = job.executorRef?.split(':') ?? [];
  if (parts.length < 2) return null;
  return { kind: parts[0], sandboxId: parts[1], cmdId: parts[2] };
}

export class SandboxExecutor implements RenderExecutor {
  id = 'sandbox' as const;

  async start(job: JobRecord, manifest: RenderManifest): Promise<ExecutorStartResult> {
    const { createSandbox, addBundleToSandbox, renderMediaOnVercel, renderStillOnVercel, uploadToVercelBlob } =
      await import('@remotion/vercel');
    const timeoutMs = Math.max(60_000, job.deadlineAt - Date.now());
    const sandbox = await createSandbox({ resources: { vcpus: 4 }, timeoutInMilliseconds: timeoutMs });
    await addBundleToSandbox({ sandbox, bundleDir: BUNDLE_DIR });
    const inputProps = manifest as unknown as Record<string, unknown>;

    if (manifest.output.format === 'png-still') {
      // Stills are seconds once the sandbox is up — render inline, upload, release the VM.
      const stillMs = manifest.output.stillTimeMs ?? manifest.timing.totalDurationMs / 2;
      const frame = Math.max(0, Math.round((stillMs / 1000) * manifest.fps));
      const { sandboxFilePath, contentType } = await renderStillOnVercel({
        sandbox, compositionId: 'noacg', inputProps, frame, imageFormat: 'png', scale: manifest.scale,
      });
      const { url, size } = await uploadToVercelBlob({
        sandbox, sandboxFilePath, blobPath: blobPathFor(job), contentType, blobToken: blobToken(), access: 'public',
      });
      await sandbox.stop();
      return {
        executorRef: `done:${sandbox.sandboxId}`,
        immediateOutput: { url, bytes: size, contentType },
      };
    }

    if (manifest.output.format === 'png-sequence') {
      const script = readFileSync(path.join(REPO_ROOT, 'render-worker', 'seq-job.mjs'), 'utf8');
      await sandbox.writeFiles([
        { path: 'noacg-job/manifest.json', content: Buffer.from(JSON.stringify(manifest)) },
        { path: 'noacg-job/seq-job.mjs', content: Buffer.from(script) },
      ]);
      await sandbox.runCommand({
        cmd: 'node',
        args: ['noacg-job/seq-job.mjs', 'noacg-job/manifest.json', SEQ_PROGRESS, blobPathFor(job)],
        env: { BLOB_READ_WRITE_TOKEN: blobToken() },
        detached: true,
      });
      return { executorRef: `seq:${sandbox.sandboxId}` };
    }

    const codecOpts =
      manifest.output.format === 'mp4'
        ? { codec: 'h264' as const, crf: manifest.output.crf ?? null }
        : manifest.output.format === 'webm'
          ? { codec: (manifest.output.vp9 ? 'vp9' : 'vp8') as 'vp8' | 'vp9', pixelFormat: 'yuva420p' as const, crf: manifest.output.crf ?? null }
          : { codec: 'prores' as const, proResProfile: '4444' as const, pixelFormat: 'yuva444p10le' as const };

    const { sandboxId, cmdId } = await renderMediaOnVercel({
      sandbox,
      compositionId: 'noacg',
      inputProps,
      imageFormat: 'png', // parity beats speed: broadcast gradients band under jpeg capture
      scale: manifest.scale,
      detached: true,
      detachedSandboxTimeoutInMilliseconds: timeoutMs,
      vercelBlob: { blobToken: blobToken(), access: 'public', blobPath: blobPathFor(job) },
      ...codecOpts,
    });
    return { executorRef: `media:${sandboxId}:${cmdId}` };
  }

  async readProgress(job: JobRecord): Promise<ExecutorProgress | null> {
    const ref = parseRef(job);
    if (!ref) return null;
    if (ref.kind === 'done') return null; // stills complete inside start(); nothing to poll
    if (ref.kind === 'seq') return this.readSeqProgress(ref.sandboxId, job);

    const { getRenderProgress } = await import('@remotion/vercel');
    try {
      const p = await getRenderProgress({ sandboxId: ref.sandboxId, cmdId: ref.cmdId! });
      switch (p.stage) {
        case 'starting':
        case 'opening-browser':
        case 'selecting-composition':
          return { state: 'provisioning', progress: p.overallProgress };
        case 'render-progress':
          return {
            state: p.progress.stitchStage === 'muxing' ? 'encoding' : 'rendering',
            progress: p.progress.progress,
            renderedFrames: p.progress.renderedFrames,
            encodedFrames: p.progress.encodedFrames,
            totalFrames: job.totalFrames,
          };
        case 'uploading':
          return { state: 'uploading', progress: p.overallProgress };
        case 'done':
          return {
            state: 'complete',
            progress: 1,
            outputBytes: p.size,
            output: { url: p.url, bytes: p.size, contentType: p.contentType },
          };
        case 'error':
          return { state: 'failed', progress: 0, error: { code: 'render_failed', message: p.message.slice(0, 2000) } };
        case 'expired':
          return { state: 'failed', progress: 0, error: { code: 'sandbox_lost', message: 'The render environment expired.' } };
      }
    } catch {
      return null; // sandbox unreachable — the reconciler's deadline logic decides
    }
  }

  private async readSeqProgress(sandboxId: string, job: JobRecord): Promise<ExecutorProgress | null> {
    try {
      const { Sandbox } = await import('@vercel/sandbox');
      const sandbox = await Sandbox.get({ sandboxId });
      const buf = await sandbox.readFileToBuffer({ path: SEQ_PROGRESS });
      if (!buf) return null;
      const p = JSON.parse(buf.toString('utf8')) as ExecutorProgress & { blobUrl?: string; contentType?: string };
      if (p.state === 'complete' && p.blobUrl) {
        return { ...p, output: { url: p.blobUrl, bytes: p.outputBytes ?? 0, contentType: p.contentType ?? RENDER_FORMATS[job.format].mime } };
      }
      return p;
    } catch {
      return null;
    }
  }

  async finalizeOutput(job: JobRecord): Promise<JobOutput | null> {
    // Every sandbox path delivers the final URL through readProgress().output or
    // immediateOutput — reaching this means the progress channel already had it.
    const progress = await this.readProgress(job);
    return progress?.output
      ? { url: progress.output.url, downloadUrl: progress.output.url, bytes: progress.output.bytes, contentType: progress.output.contentType, expiresAt: null }
      : null;
  }

  async stop(job: JobRecord): Promise<void> {
    const ref = parseRef(job);
    if (!ref || ref.kind === 'done') return;
    try {
      const { Sandbox } = await import('@vercel/sandbox');
      const sandbox = await Sandbox.get({ sandboxId: ref.sandboxId });
      await sandbox.stop();
    } catch {
      // already stopped/expired — stop is idempotent
    }
  }
}
