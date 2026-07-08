import type { TemplateVariant } from '../../../model/wizard';
import type { DraftPatch, WizardDraft } from '../draft';

interface Props {
  variant: TemplateVariant;
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
}

/** Step 3 — the data fields: 1–3 visible text lines (the design adapts to these). */
export default function FieldsStep({ variant, draft, onDraft }: Props) {
  const lines = draft.lines;

  const setLine = (i: number, key: 'title' | 'sample', value: string) => {
    const next = lines.map((l, k) => (k === i ? { ...l, [key]: value } : l));
    onDraft({ lines: next });
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Text lines <span className="muted">(the design adapts — {variant.maxLines} max for {variant.name})</span></h3>
        {lines.map((line, i) => (
          <div className="wz-line-row" key={i}>
            <span className="wz-fid">f{i}</span>
            <input
              placeholder="Label shown to the operator"
              value={line.title}
              onChange={(e) => setLine(i, 'title', e.target.value)}
            />
            {variant.suggestedLines[i]?.sample.includes('\n') ? (
              <textarea
                rows={5}
                placeholder="One entry per line — e.g.  Role | Name"
                value={line.sample}
                onChange={(e) => setLine(i, 'sample', e.target.value)}
              />
            ) : (
              <input
                placeholder="Sample text shown in the design"
                value={line.sample}
                onChange={(e) => setLine(i, 'sample', e.target.value)}
              />
            )}
            <button
              disabled={lines.length <= 1}
              title="Remove this line"
              onClick={() => onDraft({ lines: lines.filter((_, k) => k !== i) })}
            >
              ✕
            </button>
          </div>
        ))}
        {lines.length < variant.maxLines && (
          <button onClick={() => onDraft({ lines: [...lines, { title: `Line ${lines.length + 1}`, sample: 'More text' }] })}>
            + Add a line
          </button>
        )}
      </div>

      <div className="panel-section">
        <h3>Need more fields? <span className="muted">(after creating)</span></h3>
        <p className="hint">
          The wizard keeps to the lines this design actually shows. Extra fields and custom
          layouts are added after creating, where the design can adapt to them: the Data tab
          adds a field, and AI editing or the canvas editor works it into the graphic.
        </p>
      </div>
    </div>
  );
}
