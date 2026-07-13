// The render job lifecycle block (start button -> progress + cancel -> download / retry),
// shared by the SPX RenderPanel and the video editor's VideoRenderPanel. Reads the shared
// job store itself: one render job per session, whichever editor started it.

import { useRenderJob } from '../../render/renderJobStore';
import { downloadHref } from '../../render/client';
import { RENDER_FORMATS } from '../../render/manifest';
import type { JobState } from '../../render/types';

export const STATE_LABEL: Record<JobState, string> = {
  pending: 'Starting…',
  provisioning: 'Preparing the render environment…',
  rendering: 'Rendering frames',
  encoding: 'Encoding',
  uploading: 'Uploading',
  complete: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const fmtBytes = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} kB`);

interface Props {
  canRender: boolean;
  startLabel: string;
  onStart: () => Promise<void>;
  /** Output pixel size, shown with the finished file. */
  outW: number;
  outH: number;
  /** Surfaced when onStart throws outside the job store's own error handling. */
  onStartFailure?: (message: string) => void;
}

export default function RenderJobSection({ canRender, startLabel, onStart, outW, outH, onStartFailure }: Props) {
  const { job, startError, busy, cancel, clear } = useRenderJob();
  const status = job?.status ?? null;

  return (
    <>
      {!job && (
        <>
          <button
            className="primary"
            style={{ marginTop: 8, width: '100%' }}
            disabled={!canRender || busy}
            data-testid="render-start"
            onClick={() => void onStart().catch((err) => onStartFailure?.(String(err)))}
          >
            {busy ? 'Starting…' : startLabel}
          </button>
          {startError && (
            <p className="status-bad" data-testid="render-error" style={{ marginTop: 8 }}>
              {startError.message}
            </p>
          )}
        </>
      )}

      {job && status && !['complete', 'failed', 'cancelled', 'expired'].includes(status.state) && (
        <div style={{ marginTop: 10 }} data-testid="render-progress">
          <p style={{ margin: '0 0 6px' }}>
            {STATE_LABEL[status.state]}
            {status.frames ? ` — frame ${status.frames.rendered}/${status.frames.total}` : ''}
          </p>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)' }}>
            <div style={{ height: 6, borderRadius: 3, width: `${status.percent}%`, background: 'var(--accent)', transition: 'width .4s' }} />
          </div>
          <button style={{ marginTop: 8 }} data-testid="render-cancel" onClick={() => void cancel()}>
            Cancel render
          </button>
        </div>
      )}
      {job && !status && (
        <p className="hint" style={{ marginTop: 10 }} data-testid="render-progress">Checking render status…</p>
      )}

      {status?.state === 'complete' && status.output && (
        <div style={{ marginTop: 10 }} data-testid="render-result">
          <p className="status-ok" style={{ margin: '0 0 6px' }}>
            ✓ {RENDER_FORMATS[status.format].label} ready — {fmtBytes(status.output.bytes)}, {outW}×{outH}
            {status.output.expiresAt ? ` · link expires ${new Date(status.output.expiresAt).toLocaleString()}` : ''}
          </p>
          <a
            className="primary"
            role="button"
            data-testid="render-download"
            style={{ display: 'block', textAlign: 'center', padding: '8px 0', borderRadius: 6, textDecoration: 'none' }}
            href={downloadHref(status, job!.jobToken) ?? '#'}
            download
          >
            Download
          </a>
          <button style={{ marginTop: 8 }} onClick={clear}>Render another</button>
        </div>
      )}
      {(status?.state === 'failed' || status?.state === 'cancelled' || status?.state === 'expired') && (
        <div style={{ marginTop: 10 }} data-testid="render-error">
          <p className={status.state === 'cancelled' ? 'hint' : 'status-bad'} style={{ margin: '0 0 6px' }}>
            {status.state === 'cancelled' ? 'Render cancelled.' :
             status.state === 'expired' ? 'This file has expired — render again.' :
             `Render failed: ${status.error?.message ?? 'unknown error'}`}
          </p>
          <button onClick={clear}>Try again</button>
        </div>
      )}
    </>
  );
}
