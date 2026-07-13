// Step 1 (Video mode) - "Video or animation with AI": describe the animation, set the
// canvas (duration/aspect/fps/transparency), optionally upload assets, and create. The
// create itself is instant - generation runs in the video editor's chat, where iteration
// continues. A reopen strip surfaces saved video projects (open needs no account).

import { useRef, useState } from 'react';
import { AI_MODELS, aiConfigured, loadAiSettings, saveAiSettings } from '../../../ai/settings';
import { useAuthState } from '../../auth/useAuthState';
import SignInPrompt from '../../auth/SignInPrompt';
import { fileToDataUrl, uniqueAssetPath } from '../../../assets/assetUtils';
import { ASPECTS, FPS_OPTIONS, type AssetFile } from '../../../model/types';
import { createDefaultVideoProject, type VideoProject } from '../../../model/videoTypes';
import { listSavedVideoProjects, loadCurrentVideoProject } from '../../../model/videoProject';
import { useDocKindStore } from '../../../store/docKindStore';

const ASSET_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.mov';
/** Same hard cap as the Assets panel - assets ride in the render upload + autosave. */
const MAX_ASSET_BYTES = 3_000_000;

const EXAMPLES: { label: string; prompt: string }[] = [
  {
    label: 'Sports stinger',
    prompt:
      'A fast 3-second sports stinger with sharp geometric shapes in team colors and a dramatic title reveal.',
  },
  {
    label: 'News intro',
    prompt:
      'A clean, modern 5-second news intro with elegant typography and abstract blue shapes sweeping through.',
  },
  {
    label: 'Logo reveal',
    prompt: 'A transparent 2-second logo reveal - the mark scales in with a light sweep across it.',
  },
  {
    label: 'Countdown',
    prompt: 'A 10-second countdown from 10 to 1 with strong broadcast typography and a pulse on every beat.',
  },
];

interface Props {
  onCreate: (project: VideoProject) => void;
  onOpen: (project: VideoProject) => void;
}

export default function VideoStep({ onCreate, onOpen }: Props) {
  const { needsSignIn } = useAuthState();
  const [settings, setSettings] = useState(loadAiSettings);
  const [showSettings, setShowSettings] = useState(!aiConfigured());
  const [prompt, setPrompt] = useState('');
  const [aspectId, setAspectId] = useState(ASPECTS[0].id);
  const [resIndex, setResIndex] = useState(0);
  const [fps, setFps] = useState(30);
  const [durationSec, setDurationSec] = useState(6);
  const [transparent, setTransparent] = useState(false);
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [assetError, setAssetError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const saved = listSavedVideoProjects();
  // The autosaved working video project - offered as "continue" when the user is currently
  // in the SPX shell (from the video shell it's already what they're editing).
  const docKind = useDocKindStore((s) => s.kind);
  const current = docKind === 'spx' ? loadCurrentVideoProject() : null;

  const aspect = ASPECTS.find((a) => a.id === aspectId) ?? ASPECTS[0];
  const resolution = aspect.resolutions[Math.min(resIndex, aspect.resolutions.length - 1)];

  const saveSetting = (patch: Parameters<typeof saveAiSettings>[0]) => {
    saveAiSettings(patch);
    setSettings(loadAiSettings());
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setAssetError(null);
    const next = [...assets];
    for (const file of Array.from(files)) {
      const data = await fileToDataUrl(file);
      if (data.length > MAX_ASSET_BYTES) {
        setAssetError(`"${file.name}" is too large (3 MB per asset) - compress or trim it.`);
        continue;
      }
      next.push({ path: uniqueAssetPath(file.name, next), data });
    }
    setAssets(next);
  };

  const create = () => {
    const brief = prompt.trim();
    if (!brief) return;
    onCreate(
      createDefaultVideoProject({
        name: brief.length > 42 ? `${brief.slice(0, 42)}…` : brief,
        prompt: brief,
        chat: [{ role: 'user', text: brief, at: new Date().toISOString() }],
        fps,
        width: resolution.width,
        height: resolution.height,
        durationInFrames: Math.max(1, Math.round(durationSec * fps)),
        transparent,
        assets,
      }),
    );
  };

  return (
    <div data-testid="video-step">
      {/* Reopen strip - above any gate: opening a saved local project needs no account. */}
      {(saved.length > 0 || current) && (
        <div className="panel-section">
          <h3>Your videos</h3>
          <div className="row wrap" style={{ gap: 6 }}>
            {current && !saved.some((r) => r.id === current.id) && (
              <button
                className="wz-example"
                onClick={() => onOpen(current)}
                title="Continue the video project you were working on"
                data-testid="video-continue"
              >
                ↩ Continue: {current.name}
              </button>
            )}
            {saved.slice(0, 6).map((r) => (
              <button key={r.id} className="wz-example" onClick={() => onOpen(r.project)} title={`Open "${r.name}"`}>
                ▶ {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {needsSignIn ? (
        <SignInPrompt
          feature="Video or animation with AI"
          reason="Sign in to use AI - describe any animation and get a real, editable Remotion video."
        />
      ) : (
        <>
          <div className="panel-section">
            <h3>Describe your video</h3>
            <p className="hint">
              What is it, how should it move, what should it feel like? You get real
              React/Remotion code - previewed live, refined by chat, rendered to video.
            </p>
          </div>

          <div className="row wrap" style={{ marginBottom: 6, gap: 6 }}>
            {EXAMPLES.map((ex) => (
              <button key={ex.label} className="wz-example" title={ex.prompt} onClick={() => setPrompt(ex.prompt)}>
                {ex.label}
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            placeholder={'e.g. "A fast 3-second sports stinger with sharp geometric shapes and a dramatic reveal of my uploaded logo."'}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            data-testid="video-prompt"
          />

          <div className="row wrap" style={{ marginTop: 10, gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label>Duration (s)</label>
              <input
                type="number"
                min={1}
                max={60}
                step={0.5}
                value={durationSec}
                onChange={(e) => setDurationSec(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
                style={{ width: 90 }}
                data-testid="video-step-duration"
              />
            </div>
            <div>
              <label>Format</label>
              <select
                value={aspectId}
                onChange={(e) => {
                  setAspectId(e.target.value);
                  setResIndex(0);
                }}
              >
                {ASPECTS.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Resolution</label>
              <select value={resIndex} onChange={(e) => setResIndex(Number(e.target.value))}>
                {aspect.resolutions.map((r, i) => (
                  <option key={r.label} value={i}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label>FPS</label>
              <select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                {FPS_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <label className="row" style={{ gap: 6, alignItems: 'center', paddingBottom: 6 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={transparent}
                onChange={(e) => setTransparent(e.target.checked)}
              />
              Transparent
            </label>
          </div>

          <div className="row wrap" style={{ marginTop: 10, alignItems: 'center' }}>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={ASSET_ACCEPT}
              style={{ display: 'none' }}
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button onClick={() => fileInput.current?.click()}>🖼 Add logo / images / video…</button>
            {assets.map((a) => (
              <span key={a.path} className="wz-fid" title={a.path}>
                {a.path.replace(/^(images|assets)\//, '')}
                <button
                  style={{ marginLeft: 6, padding: '0 6px' }}
                  onClick={() => setAssets(assets.filter((x) => x.path !== a.path))}
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          {assetError && <p className="status-bad" style={{ marginTop: 6 }}>✗ {assetError}</p>}

          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="primary"
              disabled={!prompt.trim()}
              onClick={create}
              data-testid="video-create"
              title={aiConfigured(settings) ? undefined : 'No AI key configured - the project starts from an offline sample you can edit'}
            >
              ✦ Create video
            </button>
            <button onClick={() => setShowSettings((s) => !s)}>⚙ AI settings</button>
          </div>
          {!aiConfigured(settings) && (
            <p className="hint" style={{ marginTop: 6 }}>
              No AI key configured - creation works, using an offline sample generator. Add a
              key for real AI generation.
            </p>
          )}

          {showSettings && (
            <div className="panel-section" style={{ marginTop: 10 }}>
              <h3>AI settings</h3>
              {!settings.proxyUrl && (
                <>
                  <label>Anthropic API key</label>
                  <input
                    type="password"
                    placeholder="sk-ant-…"
                    value={settings.apiKey}
                    onChange={(e) => saveSetting({ apiKey: e.target.value.trim() })}
                  />
                  <p className="hint">
                    Stored only in this browser (localStorage) and sent only to Anthropic.
                  </p>
                </>
              )}
              <label style={{ marginTop: 8 }}>Model</label>
              <select value={settings.model} onChange={(e) => saveSetting({ model: e.target.value })}>
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id} title={m.blurb}>{m.label}</option>
                ))}
                {!AI_MODELS.some((m) => m.id === settings.model) && (
                  <option value={settings.model}>{settings.model}</option>
                )}
              </select>
              <p className="hint">{AI_MODELS.find((m) => m.id === settings.model)?.blurb ?? 'Custom model id (from .env).'}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
