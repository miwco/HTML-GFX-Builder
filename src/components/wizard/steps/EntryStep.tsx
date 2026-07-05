interface Props {
  onTemplates: () => void;
  onImport: () => void;
  onAi: () => void;
  onBlank: () => void;
}

/** Step 0 — how do you want to start? */
export default function EntryStep({ onTemplates, onImport, onAi, onBlank }: Props) {
  return (
    <div className="wz-entry">
      <button className="wz-entry-card" onClick={onTemplates} data-entry="template">
        <span className="wz-entry-icon">▤</span>
        <strong>Start from a template</strong>
        <span className="hint">Pick a design, choose your fields, style, and animation — then learn from the code it writes.</span>
      </button>
      <button className="wz-entry-card" onClick={onAi} data-entry="ai">
        <span className="wz-entry-icon">✦</span>
        <strong>Describe it</strong>
        <span className="hint">Tell the AI what you need — add a logo, brand colors, or a still. Every result is validated and lands as readable code.</span>
      </button>
      <button className="wz-entry-card" onClick={onImport} data-entry="import">
        <span className="wz-entry-icon">⬇</span>
        <strong>Import</strong>
        <span className="hint">Logos/images to design around — or an existing .html/SPX template to edit and convert (SPX · CasparCG · OGraf).</span>
      </button>
      <button className="wz-entry-card" onClick={onBlank} data-entry="blank">
        <span className="wz-entry-icon">‹›</span>
        <strong>Blank project</strong>
        <span className="hint">A minimal valid SPX template — pure code-first, no training wheels.</span>
      </button>
    </div>
  );
}
