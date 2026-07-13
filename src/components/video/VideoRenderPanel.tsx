// Render the video project to real media through the render service - the video-editor
// counterpart of the SPX RenderPanel. No measurement, no schedule, no HOLD model: the
// duration is fixed by the project; the manifest carries the SAME compiled module the
// preview runs plus assets as data URLs. Shares the format cards and the job lifecycle
// with the SPX panel; only mounted when isRenderConfigured().

import { useMemo, useState } from 'react';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { useAuthState } from '../auth/useAuthState';
import { compileTsx } from '../../video/compile';
import { describeAssets } from '../../video/types';
import { buildVideoManifest } from '../../render/buildVideoManifest';
import { formatNeedsSignIn, resolveTier, validateRenderRequest, RENDER_CONFIG } from '../../render/limits';
import { RENDER_FORMATS, type RenderFormatId } from '../../render/manifest';
import { useRenderJob } from '../../render/renderJobStore';
import RenderFormatPicker from '../render/RenderFormatPicker';
import RenderJobSection from '../render/RenderJobSection';

const SCALES = [0.5, 1, 2];
const fmtMb = (b: number) => `${(b / 1e6).toFixed(1)} MB`;

export default function VideoRenderPanel() {
  const project = useVideoProjectStore((s) => s.project);
  const patchSettings = useVideoProjectStore((s) => s.patchSettings);
  const { needsSignIn, signedIn, backendConfigured } = useAuthState();
  const { job, busy, start } = useRenderJob();

  const [format, setFormat] = useState<RenderFormatId>(
    (project.exportPrefs?.format as RenderFormatId) in RENDER_FORMATS
      ? (project.exportPrefs!.format as RenderFormatId)
      : 'mp4',
  );
  const [scale, setScale] = useState(project.exportPrefs?.scale ?? 1);
  const [bgColor, setBgColor] = useState('#000000');
  const [stillMode, setStillMode] = useState<'middle' | 'custom'>('middle');
  const [stillFrame, setStillFrame] = useState(0);
  const [startFailure, setStartFailure] = useState<string | null>(null);

  const pickFormat = (f: RenderFormatId) => {
    setFormat(f);
    patchSettings({ exportPrefs: { format: f, scale } });
  };

  // The manifest is cheap to build - do it for preflight so the size meter and the limit
  // checks run on the REAL payload.
  const preflight = useMemo(() => {
    const compiled = compileTsx(project.tsx);
    if (!compiled.ok) return { error: `The composition does not compile: ${compiled.error}`, manifest: null, bytes: 0 };
    const assetProps: Record<string, string> = {};
    for (const info of describeAssets(project.assets)) {
      const a = project.assets.find((x) => x.path === info.path);
      if (a && typeof a.data === 'string') assetProps[info.name] = a.data;
    }
    const manifest = buildVideoManifest(
      {
        name: project.name,
        width: project.width,
        height: project.height,
        fps: project.fps,
        durationInFrames: project.durationInFrames,
        compiledJs: compiled.js,
        inputProps: { assets: assetProps },
        transparent: project.transparent,
      },
      {
        format,
        scale,
        backgroundColor: format === 'mp4' ? bgColor : undefined,
        stillFrame: format === 'png-still' && stillMode === 'custom' ? stillFrame : undefined,
      },
    );
    return { error: null, manifest, bytes: JSON.stringify({ manifest }).length };
  }, [project, format, scale, bgColor, stillMode, stillFrame]);

  const tier = resolveTier(signedIn && backendConfigured);
  const limitIssues = useMemo(
    () =>
      validateRenderRequest(
        {
          kind: 'remotion',
          width: project.width,
          height: project.height,
          fps: project.fps,
          scale,
          durationInFrames: project.durationInFrames,
          output: { format },
        },
        tier,
      ),
    [project.width, project.height, project.fps, project.durationInFrames, scale, format, tier],
  );

  const overBudget = preflight.bytes > RENDER_CONFIG.manifestMaxBytes;
  const locked = formatNeedsSignIn(format) && needsSignIn;
  const canRender =
    !!preflight.manifest && !preflight.error && !overBudget && limitIssues.length === 0 && !locked && !busy && !job;

  // The largest assets, for the over-budget message.
  const largestAssets = [...project.assets]
    .map((a) => ({ path: a.path, bytes: typeof a.data === 'string' ? a.data.length : 0 }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 3);

  const outW = Math.round(project.width * scale);
  const outH = Math.round(project.height * scale);
  const isStill = format === 'png-still';

  return (
    <div className="panel-section" data-testid="video-render-panel">
      <h3>Render video</h3>
      <p className="hint">
        Render the composition to a finished media file — exactly what the preview plays.
      </p>

      <RenderFormatPicker format={format} onChange={pickFormat} />

      <div className="stack" style={{ marginTop: 10 }}>
        <label className="row" style={{ justifyContent: 'space-between' }}>
          <span>Resolution</span>
          <select
            value={scale}
            style={{ width: 170 }}
            onChange={(e) => {
              const s = Number(e.target.value);
              setScale(s);
              patchSettings({ exportPrefs: { format, scale: s } });
            }}
          >
            {SCALES.map((s) => (
              <option key={s} value={s}>
                {Math.round(project.width * s)}×{Math.round(project.height * s)}{s === 1 ? ' (project)' : ''}
              </option>
            ))}
          </select>
        </label>
        {!isStill && (
          <p className="hint" style={{ margin: 0 }}>
            Duration: {(project.durationInFrames / project.fps).toFixed(2)} s ({project.durationInFrames} frames
            at {project.fps} fps) — change it under Settings.
          </p>
        )}
        {format === 'mp4' && (
          <label className="row" style={{ justifyContent: 'space-between' }}>
            <span>Background color <span className="hint">(MP4 has no transparency)</span></span>
            <input type="color" value={bgColor} style={{ width: 48 }} onChange={(e) => setBgColor(e.target.value)} />
          </label>
        )}
        {isStill && (
          <label className="row" style={{ justifyContent: 'space-between' }}>
            <span>Capture frame</span>
            <span className="row" style={{ gap: 6 }}>
              <select value={stillMode} onChange={(e) => setStillMode(e.target.value as 'middle' | 'custom')}>
                <option value="middle">Middle frame</option>
                <option value="custom">Custom frame</option>
              </select>
              {stillMode === 'custom' && (
                <input
                  type="number"
                  min={0}
                  max={project.durationInFrames - 1}
                  value={stillFrame}
                  style={{ width: 80 }}
                  data-testid="video-still-frame"
                  onChange={(e) =>
                    setStillFrame(Math.max(0, Math.min(project.durationInFrames - 1, Number(e.target.value) || 0)))
                  }
                />
              )}
            </span>
          </label>
        )}
      </div>

      {/* Preflight: compile status, upload budget, tier limits */}
      <div style={{ marginTop: 8 }} data-testid="video-render-preflight">
        {preflight.error && <p className="status-bad">{preflight.error}</p>}
        {!preflight.error && (
          <p className="hint" style={{ margin: 0, color: overBudget ? 'var(--warn)' : undefined }}>
            Upload size: {fmtMb(preflight.bytes)} / {fmtMb(RENDER_CONFIG.manifestMaxBytes)}
            {overBudget ? ' — over the budget' : ''}
          </p>
        )}
        {overBudget && (
          <p className="status-bad">
            The render upload (code + assets) exceeds {fmtMb(RENDER_CONFIG.manifestMaxBytes)}. Remove or compress
            the largest assets:{' '}
            {largestAssets.map((a) => `${a.path} (${fmtMb(a.bytes)})`).join(', ')}
          </p>
        )}
        {limitIssues.map((i, k) => (
          <p className="status-bad" key={k}>{i.message}</p>
        ))}
        {startFailure && <p className="status-bad">{startFailure}</p>}
      </div>

      <RenderJobSection
        canRender={canRender}
        startLabel={`Render ${RENDER_FORMATS[format].label}`}
        onStart={async () => {
          setStartFailure(null);
          if (preflight.manifest) await start(preflight.manifest);
        }}
        outW={outW}
        outH={outH}
        onStartFailure={setStartFailure}
      />
    </div>
  );
}
