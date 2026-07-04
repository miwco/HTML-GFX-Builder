interface Props {
  onTemplates: () => void;
  onBlank: () => void;
}

/** Step 0 — how do you want to start? */
export default function EntryStep({ onTemplates, onBlank }: Props) {
  return (
    <div className="wz-entry">
      <button className="wz-entry-card" onClick={onTemplates} data-entry="template">
        <span className="wz-entry-icon">▤</span>
        <strong>Start from a template</strong>
        <span className="hint">Pick a design, choose your fields, style, and animation — then learn from the code it writes.</span>
      </button>
      <button className="wz-entry-card" disabled title="Coming soon — drop in your images and the wizard builds around them" data-entry="import">
        <span className="wz-entry-icon">⬇</span>
        <strong>Import graphics</strong>
        <span className="hint">Drop in logos or images and build a template around them. <em>Coming soon.</em></span>
      </button>
      <button className="wz-entry-card" onClick={onBlank} data-entry="blank">
        <span className="wz-entry-icon">‹›</span>
        <strong>Blank project</strong>
        <span className="hint">A minimal valid SPX template — pure code-first, no training wheels.</span>
      </button>
    </div>
  );
}
