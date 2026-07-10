import { useMemo, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { getTemplateParts } from '../model/structure';
import { parseAnimData } from '../blocks/animData';
import { importAnimData } from '../blocks/animImport';
import { activationStep, resolveValue, stepSeconds } from '../blocks/animEval';

// Timeline v2 Phase 2 (docs/TIMELINE_V2_PLAN.md) — the Inspector: the persistent,
// context-sensitive panel to the right of the preview. It is the third consumer of the
// shared selection (canvas ↔ timeline ↔ Inspector — select it to affect it). This phase
// is the READ shell: identity, resolved property values at the settled on-air state, and
// which steps animate the layer. Editing (diamonds, keyframes at the playhead) arrives
// with the keyframe timeline; until then the values are presented as text, not as
// disabled inputs, so nothing reads as broken.

/** The property rows the Inspector reports (the same vocabulary the drawer edits). */
const PROP_ROWS: { prop: string; label: string }[] = [
  { prop: 'x', label: 'Position X' },
  { prop: 'y', label: 'Position Y' },
  { prop: 'yPercent', label: 'Y (mask %)' },
  { prop: 'scale', label: 'Scale' },
  { prop: 'opacity', label: 'Opacity' },
  { prop: 'rotation', label: 'Rotation' },
  { prop: 'filter', label: 'Filter' },
];

const KIND_LABEL: Record<string, string> = {
  root: 'Graphic root',
  panel: 'Panel',
  accent: 'Accent',
  line: 'Text line',
  image: 'Image slot',
  block: 'Block element',
};

export default function Inspector() {
  const template = useTemplateStore((s) => s.template);
  const selectedPart = useTemplateStore((s) => s.selectedPart);
  const [tab, setTab] = useState<'properties' | 'animations'>('properties');

  const parts = useMemo(
    () => getTemplateParts(template.html, template.fields),
    [template.html, template.fields],
  );
  // Data-block templates parse directly; legacy regions go through the importer (read
  // view only). Null = blank/imported/hand-crafted — identity still shows, values don't.
  const data = useMemo(
    () => parseAnimData(template.js) ?? importAnimData(template),
    [template],
  );
  const part = parts.find((p) => p.selector === selectedPart) ?? null;

  if (!part) {
    return (
      <div className="inspector" data-testid="inspector">
        <div className="inspector-head">Inspector</div>
        <p className="inspector-empty" data-testid="inspector-empty">
          Select an element — click it on the canvas, or click its row in the timeline.
        </p>
      </div>
    );
  }

  // The settled on-air state: the end of the layer's activation step (for a press-revealed
  // layer that is the moment it has fully appeared, not the entrance's end).
  const settledAt = data ? activationStep(data, part.selector) : 0;
  const settledValue = (prop: string): string => {
    if (!data) return '—';
    const v = resolveValue(data, part.selector, prop, settledAt, data.steps[settledAt].duration);
    if (v === null) return '—';
    return typeof v === 'number' ? String(Math.round(v * 100) / 100) : v;
  };

  return (
    <div className="inspector" data-testid="inspector">
      <div className="inspector-head">Inspector</div>
      <div className="inspector-identity">
        <span className="inspector-label" data-testid="inspector-part-label">{part.label}</span>
        <span className="inspector-kind">{KIND_LABEL[part.kind] ?? part.kind}</span>
        <code className="inspector-selector">{part.selector}</code>
      </div>

      <div className="inspector-tabs">
        <button className={`tab ${tab === 'properties' ? 'active' : ''}`} onClick={() => setTab('properties')}>
          Properties
        </button>
        <button className={`tab ${tab === 'animations' ? 'active' : ''}`} onClick={() => setTab('animations')}>
          Animations
        </button>
      </div>

      {tab === 'properties' && (
        <div className="inspector-body" data-testid="inspector-properties">
          {data ? (
            <>
              {PROP_ROWS.map((row) => (
                <div className="inspector-row" key={row.prop}>
                  <span className="inspector-row-label">{row.label}</span>
                  <span
                    className="inspector-row-value"
                    title={settledValue(row.prop) === '—' ? 'The design value from the stylesheet' : undefined}
                    data-testid={`inspector-value-${row.prop}`}
                  >
                    {settledValue(row.prop)}
                  </span>
                </div>
              ))}
              <p className="hint inspector-hint">
                Values at the settled on-air state. — means the stylesheet's design value.
              </p>
            </>
          ) : (
            <p className="hint inspector-hint">
              This template's animation is hand-crafted code — there is no managed motion
              to inspect. The element itself is still selectable and editable in the code.
            </p>
          )}
        </div>
      )}

      {tab === 'animations' && (
        <div className="inspector-body" data-testid="inspector-animations">
          {data ? (
            (() => {
              const rows = data.steps
                .map((step, i) => ({ step, i, props: Object.keys(step.layers[part.selector] ?? {}) }))
                .filter(({ step, props }) => props.length > 0 || step.reveals?.includes(part.selector));
              if (rows.length === 0) {
                return (
                  <p className="hint inspector-hint">
                    This layer holds its design state through every step.
                  </p>
                );
              }
              return rows.map(({ step, i, props }) => (
                <div className="inspector-row" key={i}>
                  <span className="inspector-row-label">
                    {step.name} <span className="muted">· {stepSeconds(data, i).toFixed(2)}s</span>
                  </span>
                  <span className="inspector-row-value">
                    {step.reveals?.includes(part.selector) ? `appears here${props.length ? ' · ' : ''}` : ''}
                    {props.join(', ')}
                  </span>
                </div>
              ));
            })()
          ) : (
            <p className="hint inspector-hint">No managed animation in this template.</p>
          )}
        </div>
      )}
    </div>
  );
}
