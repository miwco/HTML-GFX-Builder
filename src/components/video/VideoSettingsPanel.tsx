// Video project settings: name, duration, fps, aspect/resolution, transparency, AI model.
// Every commit is ONE undoable patchSettings. Duration is edited in seconds (the natural
// unit) and stored in frames; changing fps keeps the duration in seconds constant.

import { useState } from 'react';
import { ASPECTS, FPS_OPTIONS } from '../../model/types';
import { AI_MODELS } from '../../ai/settings';
import { useVideoProjectStore } from '../../store/videoProjectStore';

export default function VideoSettingsPanel() {
  const project = useVideoProjectStore((s) => s.project);
  const patchSettings = useVideoProjectStore((s) => s.patchSettings);

  const durationSec = project.durationInFrames / project.fps;
  // While the field is being edited it holds a raw string (which may be temporarily empty);
  // when not editing it mirrors the stored value. Committing on blur/Enter both clamps the
  // value and keeps duration edits to ONE undoable step instead of one per keystroke.
  const [durationDraft, setDurationDraft] = useState<string | null>(null);
  const durationShown = durationDraft ?? String(Number(durationSec.toFixed(2)));
  const commitDuration = () => {
    if (durationDraft === null) return;
    const sec = Math.min(600, Math.max(0.5, Number(durationDraft) || 0.5));
    patchSettings({ durationInFrames: Math.max(1, Math.round(sec * project.fps)) });
    setDurationDraft(null);
  };
  const aspect =
    ASPECTS.find((a) =>
      a.resolutions.some((r) => r.width === project.width && r.height === project.height),
    ) ?? ASPECTS[0];

  return (
    <div className="video-settings">
      <div className="panel-section">
        <h3>Project</h3>
        <label>Name</label>
        <input
          value={project.name}
          onChange={(e) => patchSettings({ name: e.target.value })}
          data-testid="video-name"
        />
      </div>

      <div className="panel-section">
        <h3>Timing</h3>
        <label>Duration (seconds)</label>
        <input
          type="number"
          min={0.5}
          max={600}
          step={0.5}
          value={durationShown}
          onChange={(e) => setDurationDraft(e.target.value)}
          onBlur={commitDuration}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDuration();
          }}
          data-testid="video-duration"
        />
        <label style={{ marginTop: 8 }}>Frame rate</label>
        <select
          value={project.fps}
          onChange={(e) => {
            const fps = Number(e.target.value);
            // Keep the duration in SECONDS stable across an fps change.
            patchSettings({
              fps,
              durationInFrames: Math.max(1, Math.round(durationSec * fps)),
            });
          }}
        >
          {FPS_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f} fps
            </option>
          ))}
        </select>
        <p className="hint">
          {project.durationInFrames} frames at {project.fps} fps
        </p>
      </div>

      <div className="panel-section">
        <h3>Canvas</h3>
        <label>Aspect</label>
        <select
          value={aspect.id}
          onChange={(e) => {
            const next = ASPECTS.find((a) => a.id === e.target.value);
            if (!next) return;
            const r = next.resolutions[0];
            patchSettings({ width: r.width, height: r.height });
          }}
        >
          {ASPECTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <label style={{ marginTop: 8 }}>Resolution</label>
        <select
          value={`${project.width}x${project.height}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            patchSettings({ width: w, height: h });
          }}
        >
          {aspect.resolutions.map((r) => (
            <option key={r.label} value={`${r.width}x${r.height}`}>
              {r.label}
            </option>
          ))}
        </select>
        <label className="row" style={{ marginTop: 10, gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={project.transparent}
            onChange={(e) => patchSettings({ transparent: e.target.checked })}
          />
          Transparent background (for overlays - WebM/ProRes/PNG keep the alpha)
        </label>
      </div>

      <div className="panel-section">
        <h3>AI model</h3>
        <select
          value={project.aiModel}
          onChange={(e) => patchSettings({ aiModel: e.target.value })}
        >
          <option value="">Use the global AI setting</option>
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id} title={m.blurb}>
              {m.label}
            </option>
          ))}
        </select>
        <p className="hint">The model this project's chat uses for generation and edits.</p>
      </div>
    </div>
  );
}
