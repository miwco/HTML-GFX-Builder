// The Export tab's "Video & image" section — render the current graphic to real media
// (MP4 / WebM / PNG / PNG sequence / ProRes 4444) through the render API. Backend-agnostic:
// the panel talks to src/render/client.ts and never knows what executes the render.
// Rendered ONLY when isRenderConfigured() (VITE_RENDER_API) — offline builds without the
// flag grow zero new UI. Sign-in-gated formats follow the AIPromptPanel pattern
// (useAuthState().needsSignIn + openSignIn), and the server re-checks everything.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../../store/templateStore';
import { useAuthState } from '../auth/useAuthState';
import { useAuthUi } from '../auth/authUi';
import { loadPrefs, savePrefs } from '../../model/prefs';
import { FPS_OPTIONS } from '../../model/types';
import { composeRenderDocument } from '../../render/composeRenderDocument';
import { measureRenderDocument } from '../../render/measure';
import { buildRenderManifest } from '../../render/buildManifest';
import { computeSchedule, defaultStillTimeMs } from '../../render/schedule';
import { formatNeedsSignIn, resolveTier, validateRenderRequest, RENDER_LIMITS } from '../../render/limits';
import { RENDER_FORMATS, type MeasuredDurations, type RenderFormatId } from '../../render/manifest';
import { useRenderJob } from '../../render/renderJobStore';
import { downloadHref } from '../../render/client';
import type { JobState } from '../../render/types';

const FORMAT_ORDER: RenderFormatId[] = ['mp4', 'webm', 'png-still', 'png-sequence', 'prores4444'];
const SCALES = [0.5, 1, 2];

const STATE_LABEL: Record<JobState, string> = {
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

const fmtSec = (ms: number) => (Math.round(ms / 100) / 10).toString().replace(/\.0$/, '');
const fmtBytes = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} kB`);

export default function RenderPanel() {
  const template = useTemplateStore((s) => s.template);
  const sampleData = useTemplateStore((s) => s.sampleData);
  const validation = useTemplateStore((s) => s.validation);
  const { needsSignIn, signedIn, backendConfigured } = useAuthState();
  const openSignIn = useAuthUi((s) => s.openSignIn);
  const { job, startError, busy, start, cancel, clear } = useRenderJob();

  // ── Render settings (last-used remembered in prefs) ─────────────────────────
  const prefs = useRef(loadPrefs().renderSettings);
  const [format, setFormat] = useState<RenderFormatId>(() =>
    FORMAT_ORDER.includes(prefs.current?.format as RenderFormatId) ? (prefs.current!.format as RenderFormatId) : 'mp4');
  const [durationSec, setDurationSec] = useState(() => prefs.current?.durationSec ?? 6);
  const [fps, setFps] = useState<number>(() => prefs.current?.fps ?? template.fps);
  const [scale, setScale] = useState(() => prefs.current?.scale ?? 1);
  const [playOut, setPlayOut] = useState(true);
  const [bgColor, setBgColor] = useState('#000000');
  const [stillMode, setStillMode] = useState<'auto' | 'custom'>('auto');
  const [stillSec, setStillSec] = useState(2);

  useEffect(() => {
    savePrefs({ renderSettings: { format, scale, fps, durationSec } });
  }, [format, scale, fps, durationSec]);

  // ── Measurement: real durations from the composed render document (debounced;
  // re-measured whenever the template changes while the panel is open) ─────────
  const [measured, setMeasured] = useState<MeasuredDurations | null>(null);
  const [measureError, setMeasureError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setMeasured(null);
    setMeasureError(null);
    const handle = setTimeout(async () => {
      try {
        const html = await composeRenderDocument(template);
        const m = await measureRenderDocument(html, template.resolution, template.fps, sampleData);
        if (alive) setMeasured(m);
      } catch (err) {
        if (alive) setMeasureError(err instanceof Error ? err.message : String(err));
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
    // sampleData affects layout-sized phases (credit rolls), so it re-measures too.
  }, [template, sampleData]);

  // ── Derived schedule + limit checks (client-side UX; the server re-validates) ─
  const outMode: 'auto' | 'none' =
    playOut && measured?.hasBuilders && template.settings.out !== 'none' ? 'auto' : 'none';
  const timing = useMemo(
    () => ({ totalDurationMs: Math.max(1, durationSec) * 1000, outMode, minHoldMs: 500, epochMs: 0 }),
    [durationSec, outMode],
  );
  const scheduleResult = useMemo(
    () => (measured ? computeSchedule(measured, timing, fps, '{}') : null),
    [measured, timing, fps],
  );
  const tier = resolveTier(signedIn && backendConfigured);
  const limitIssues = useMemo(
    () =>
      validateRenderRequest(
        { width: template.resolution.width, height: template.resolution.height, fps, scale, timing, output: { format } },
        tier,
      ),
    [template.resolution, fps, scale, timing, format, tier],
  );

  const locked = (f: RenderFormatId) => formatNeedsSignIn(f) && needsSignIn;
  const info = RENDER_FORMATS[format];
  const scheduleErrors = scheduleResult?.issues.filter((i) => i.level === 'error') ?? [];
  const scheduleWarnings = scheduleResult?.issues.filter((i) => i.level === 'warning') ?? [];
  const canRender =
    validation?.ok !== false &&
    !!measured &&
    !!scheduleResult?.schedule &&
    limitIssues.length === 0 &&
    !locked(format) &&
    !busy &&
    !job;

  const startRenderJob = async () => {
    const stillTimeMs =
      format === 'png-still'
        ? stillMode === 'custom'
          ? Math.max(0, stillSec) * 1000
          : measured
            ? defaultStillTimeMs(measured, timing)
            : undefined
        : undefined;
    const { manifest } = await buildRenderManifest(template, sampleData, {
      format,
      scale,
      fps,
      totalDurationMs: timing.totalDurationMs,
      outMode,
      backgroundColor: format === 'mp4' ? bgColor : undefined,
      stillTimeMs,
    });
    await start(manifest);
  };

  const status = job?.status ?? null;
  const isStill = format === 'png-still';
  const outW = Math.round(template.resolution.width * scale);
  const outH = Math.round(template.resolution.height * scale);

  return (
    <div className="panel-section" style={{ marginTop: 14 }} data-testid="render-panel">
      <h3>Video &amp; image</h3>
      <p className="hint">
        Render this graphic to a finished media file — transparent where the format supports it.
      </p>

      {/* Format cards */}
      <div className="stack">
        {FORMAT_ORDER.map((f) => {
          const fi = RENDER_FORMATS[f];
          const isLocked = locked(f);
          return (
            <label
              key={f}
              className="issue"
              data-testid={`render-format-${f}`}
              style={{ display: 'block', cursor: 'pointer', opacity: isLocked ? 0.66 : 1, borderColor: format === f ? 'var(--accent)' : undefined }}
              onClick={(e) => {
                if (isLocked) {
                  e.preventDefault();
                  openSignIn(`Sign in to export ${fi.label}.`);
                }
              }}
            >
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <input
                  type="radio"
                  name="render-format"
                  style={{ width: 'auto', marginTop: 3 }}
                  checked={format === f}
                  disabled={isLocked}
                  onChange={() => setFormat(f)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {fi.label}
                    {isLocked && <span className="hint" style={{ marginLeft: 8 }}>🔒 sign in</span>}
                  </div>
                  <div className="hint">{fi.note}</div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Settings */}
      <div className="stack" style={{ marginTop: 10 }}>
        {!isStill && (
          <label className="row" style={{ justifyContent: 'space-between' }}>
            <span>Total duration (s)</span>
            <input
              type="number"
              min={1}
              max={RENDER_LIMITS[tier].maxDurationSec}
              step={0.5}
              value={durationSec}
              style={{ width: 90 }}
              data-testid="render-duration"
              onChange={(e) => setDurationSec(Number(e.target.value) || 1)}
            />
          </label>
        )}
        {!isStill && (
          <label className="row" style={{ justifyContent: 'space-between' }}>
            <span>Frame rate</span>
            <select value={fps} style={{ width: 90 }} onChange={(e) => setFps(Number(e.target.value))}>
              {FPS_OPTIONS.filter((f) => f <= RENDER_LIMITS[tier].maxFps).map((f) => (
                <option key={f} value={f}>{f} fps</option>
              ))}
            </select>
          </label>
        )}
        <label className="row" style={{ justifyContent: 'space-between' }}>
          <span>Resolution</span>
          <select value={scale} style={{ width: 170 }} onChange={(e) => setScale(Number(e.target.value))}>
            {SCALES.map((s) => (
              <option key={s} value={s}>
                {Math.round(template.resolution.width * s)}×{Math.round(template.resolution.height * s)}{s === 1 ? ' (project)' : ''}
              </option>
            ))}
          </select>
        </label>
        {format === 'mp4' && (
          <label className="row" style={{ justifyContent: 'space-between' }}>
            <span>Background color <span className="hint">(MP4 has no transparency)</span></span>
            <input type="color" value={bgColor} style={{ width: 48 }} onChange={(e) => setBgColor(e.target.value)} />
          </label>
        )}
        {!isStill && measured?.hasBuilders && template.settings.out !== 'none' && (
          <label className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={playOut} onChange={(e) => setPlayOut(e.target.checked)} />
            <span>Play the out animation at the end</span>
          </label>
        )}
        {isStill && (
          <label className="row" style={{ justifyContent: 'space-between' }}>
            <span>Capture moment</span>
            <span className="row" style={{ gap: 6 }}>
              <select value={stillMode} onChange={(e) => setStillMode(e.target.value as 'auto' | 'custom')}>
                <option value="auto">Settled on-air look</option>
                <option value="custom">Custom time</option>
              </select>
              {stillMode === 'custom' && (
                <input type="number" min={0} step={0.1} value={stillSec} style={{ width: 70 }}
                  onChange={(e) => setStillSec(Number(e.target.value) || 0)} />
              )}
            </span>
          </label>
        )}
      </div>

      {/* Timing breakdown + preflight */}
      <div style={{ marginTop: 8 }} data-testid="render-breakdown">
        {measureError && <p className="status-bad">Could not measure this graphic: {measureError}</p>}
        {!measured && !measureError && <p className="hint">Measuring animation durations…</p>}
        {measured && !isStill && scheduleResult?.schedule && (
          <p className="hint">
            {scheduleResult.schedule.segments
              .map((s) => `${s.label} ${s.continuous ? '(runs through)' : fmtSec(s.durationMs) + ' s'}`)
              .join(' · ')}
          </p>
        )}
        {scheduleErrors.map((i, k) => <p className="status-bad" key={`se${k}`}>{i.message}</p>)}
        {!isStill && scheduleWarnings.map((i, k) => <p className="hint" key={`sw${k}`}>⚠ {i.message}</p>)}
        {limitIssues.map((i, k) => <p className="status-bad" key={`li${k}`}>{i.message}</p>)}
        {/* Template validation errors are already listed above by the Export section; the
            render button simply stays disabled until they clear. */}
      </div>

      {/* Action / progress / result */}
      {!job && (
        <>
          <button
            className="primary"
            style={{ marginTop: 8, width: '100%' }}
            disabled={!canRender}
            data-testid="render-start"
            onClick={() => void startRenderJob().catch((err) => setMeasureError(String(err)))}
          >
            {busy ? 'Starting…' : `Render ${info.label}`}
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
    </div>
  );
}
