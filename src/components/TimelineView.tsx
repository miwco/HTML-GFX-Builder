import { useMemo, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { parseTimeline } from '../blocks/timelineModel';

/**
 * Era 6 · T1 — the read-only timeline view (docs/TIMELINE_PLAN.md): the marked ANIMATION
 * region rendered as tracks (one row per tween, bars for start/duration), with a scrubber
 * that pauses the live preview's timeline at any moment. The code is the truth: this view
 * is parsed from the emitted region, and a hand-edited region it can't recognize simply
 * says so. Editing (timing knobs) is T2 — nothing here writes code.
 */
export default function TimelineView() {
  const template = useTemplateStore((s) => s.template);
  const sendScrub = useTemplateStore((s) => s.sendScrub);

  const model = useMemo(() => parseTimeline(template.js), [template.js]);
  const [phaseId, setPhaseId] = useState<'in' | 'out'>('in');
  const [time, setTime] = useState(0);

  if (!model) {
    return (
      <div className="panel-section">
        <h3>Timeline</h3>
        <p className="hint">
          The timeline view reads the generated ANIMATION region. This one has been
          hand-edited into a shape it doesn't recognize — which is fine: the code is the
          truth, and it lives in the JS tab.
        </p>
      </div>
    );
  }

  const phase = model.phases.find((p) => p.id === phaseId) ?? model.phases[0];
  const total = Math.max(phase.duration, 0.001);

  const scrubTo = (t: number) => {
    setTime(t);
    sendScrub(phase.id, t);
  };

  const label = (targets: string[]) => targets.join(', ');

  return (
    <div className="panel-section" data-testid="timeline">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h3>Timeline</h3>
        <span className="hint" style={{ marginLeft: 8 }}>
          read-only · speed ×{model.animSpeed} · in {model.easeIn} · out {model.easeOut}
        </span>
      </div>

      <div className="row" style={{ marginTop: 6, alignItems: 'center' }}>
        {model.phases.map((p) => (
          <button
            key={p.id}
            className={`tab ${p.id === phase.id ? 'active' : ''}`}
            onClick={() => { setPhaseId(p.id); setTime(0); sendScrub(p.id, 0); }}
          >
            {p.label} {p.infinite ? '∞' : `${p.duration.toFixed(2)}s`}
          </button>
        ))}
        <input
          className="grow timeline-scrub"
          type="range"
          min={0}
          max={total}
          step={0.01}
          value={Math.min(time, total)}
          onChange={(e) => scrubTo(Number(e.target.value))}
          title="Scrub — pauses the preview at this moment (press ▶ Play to run it again)"
          data-testid="timeline-scrub"
        />
        <span className="mono muted" style={{ fontSize: 11, minWidth: 44, textAlign: 'right' }}>
          {Math.min(time, total).toFixed(2)}s
        </span>
      </div>

      <div className="timeline-tracks">
        {phase.tweens.map((tw, i) => (
          <div className="timeline-row" key={i}>
            <span className="timeline-label" title={label(tw.targets)}>{label(tw.targets)}</span>
            <div className="timeline-lane">
              <div
                className={`timeline-bar ${tw.kind}`}
                style={{
                  left: `${(tw.start / total) * 100}%`,
                  width: tw.kind === 'set' ? undefined : `${Math.max(1.5, ((tw.end - tw.start) / total) * 100)}%`,
                }}
                title={
                  tw.kind === 'set'
                    ? `set · ${tw.props.join(', ')}`
                    : `${tw.props.join(', ')} · ${tw.start.toFixed(2)}–${tw.end.toFixed(2)}s${tw.stagger ? ` · stagger ${tw.stagger.toFixed(2)}s` : ''}`
                }
              />
            </div>
          </div>
        ))}
        {/* The playhead — spans the lane area (past the fixed label column). */}
        <div
          className="timeline-playhead"
          style={{ left: `calc(110px + (100% - 110px) * ${Math.min(time, total) / total})` }}
          aria-hidden="true"
        />
      </div>
      <p className="hint" style={{ marginTop: 6 }}>
        One row per tween in the marked region (JS tab). Timing edits land in T2 — for now,
        change the feel with the preset, speed, and easing controls above.
      </p>
    </div>
  );
}
