import { paletteById, type LineStyle, type TemplateVariant } from '../../../model/wizard';
import { FONTS } from '../../../model/fonts';
import { defaultLineStyle } from '../../../templates/importedDesign/shared';
import type { DraftPatch, WizardDraft } from '../draft';

interface Props {
  variant: TemplateVariant;
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
}

/** Step 3 — the data fields: 1–3 visible text lines (the design adapts to these). */
export default function FieldsStep({ variant, draft, onDraft }: Props) {
  const lines = draft.lines;
  // An imported design carries its own look, so its text is placed and styled to match the
  // artwork instead of inheriting a house layout. Every catalog design lays its own lines out.
  const placed = variant.category === 'imported-design';
  const art = draft.designArt;
  const palette =
    draft.customPalette ?? (draft.paletteId ? paletteById(draft.paletteId) : variant.defaultPalette);

  const setLine = (i: number, key: 'title' | 'sample', value: string) => {
    onDraft({ lines: lines.map((l, k) => (k === i ? { ...l, [key]: value } : l)) });
  };

  const styleOf = (i: number): LineStyle =>
    lines[i].style ?? defaultLineStyle(i, art ?? { path: '', width: 1920, height: 1080 }, palette);

  const setStyle = (i: number, patch: Partial<LineStyle>) => {
    onDraft({
      lines: lines.map((l, k) => (k === i ? { ...l, style: { ...styleOf(i), ...patch } } : l)),
    });
  };

  return (
    <div>
      <div className="panel-section">
        <h3>
          {placed ? 'Text on your design' : 'Text lines'}{' '}
          <span className="muted">
            {placed
              ? `(${variant.maxLines} max — place each one where your artwork has room for it)`
              : `(the design adapts — ${variant.maxLines} max for ${variant.name})`}
          </span>
        </h3>
        {placed && (
          <p className="hint" style={{ marginTop: -4, marginBottom: 10 }}>
            Each line becomes an editable field the operator fills in on air. Position is measured
            in your artwork's own pixels{art ? ` (${art.width} × ${art.height})` : ''}, from its
            top-left corner — the live preview shows exactly where each one lands.
          </p>
        )}
        {lines.map((line, i) => (
          <div className={`wz-line-row ${placed ? 'wz-line-row--placed' : ''}`} key={i}>
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

            {placed && (
              <div className="wz-place-grid">
                <label>
                  X
                  <input
                    type="number"
                    value={styleOf(i).x}
                    onChange={(e) => setStyle(i, { x: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={styleOf(i).y}
                    onChange={(e) => setStyle(i, { y: Number(e.target.value) })}
                  />
                </label>
                <label title="Which edge of the text sits at X">
                  Anchor
                  <select
                    value={styleOf(i).align}
                    onChange={(e) => setStyle(i, { align: e.target.value as LineStyle['align'] })}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label>
                  Font
                  <select
                    value={styleOf(i).fontId ?? ''}
                    onChange={(e) => setStyle(i, { fontId: e.target.value || null })}
                  >
                    <option value="">Design font</option>
                    {FONTS.map((f) => (
                      <option key={f.id} value={f.id}>{f.family}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Size
                  <input
                    type="number"
                    min={4}
                    value={styleOf(i).fontSize}
                    onChange={(e) => setStyle(i, { fontSize: Math.max(4, Number(e.target.value)) })}
                  />
                </label>
                <label>
                  Weight
                  <select
                    value={styleOf(i).weight}
                    onChange={(e) => setStyle(i, { weight: Number(e.target.value) })}
                  >
                    <option value={400}>Regular</option>
                    <option value={500}>Medium</option>
                    <option value={700}>Bold</option>
                  </select>
                </label>
                <label className="wz-place-color">
                  Color
                  <span className="row" style={{ gap: 6 }}>
                    <input
                      type="color"
                      value={hexOf(styleOf(i).color)}
                      onChange={(e) => setStyle(i, { color: e.target.value })}
                    />
                    <input
                      value={styleOf(i).color}
                      onChange={(e) => setStyle(i, { color: e.target.value })}
                    />
                  </span>
                </label>
              </div>
            )}
          </div>
        ))}
        {lines.length < variant.maxLines && (
          <button
            onClick={() =>
              onDraft({ lines: [...lines, { title: `Line ${lines.length + 1}`, sample: 'More text' }] })
            }
          >
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

/** A hex the native color input accepts — it rejects rgba()/named colors, which the text
 *  field beside it still takes (the design's own color may well be one). */
function hexOf(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#ffffff';
}
