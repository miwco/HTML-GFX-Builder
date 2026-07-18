import BrandLogo from '../../BrandLogo';

interface Props {
  onTemplates: () => void;
  onImportGraphic: () => void;
  onAi: () => void;
  onVideo: () => void;
  onBlank: () => void;
}

/**
 * Step 0 — the app's home moment. A branded hero states what NoaCG Studio is and who it's
 * for, then five ways to start. Template-first (the north star: create, no code required),
 * with the AI path (which also imports/converts existing templates), the video path, the
 * manual Import graphic path, and a pure code-first blank for pros.
 *
 * "Import graphic" is deliberately its own card and a MANUAL path — no AI anywhere in it.
 * A user who designed their graphic in Photoshop wants NoaCG to make it broadcast-ready
 * (fields, animation, export), not to regenerate it. Existing .html / SPX templates (and
 * logos to design around) go through Create with AI instead.
 */
export default function EntryStep({ onTemplates, onImportGraphic, onAi, onVideo, onBlank }: Props) {
  return (
    <div className="wz-entry-wrap">
      <div className="wz-hero">
        <BrandLogo size={44} />
        <h1 className="wz-hero-title">
          Broadcast graphics, <span>built in minutes.</span>
        </h1>
        <p className="wz-hero-sub">
          Premium, on-air lower thirds, tickers, scoreboards and more — made by choosing, not
          coding. Export working templates for the tools you already run.
        </p>
        <div className="wz-hero-tags mono">
          <span>SPX</span>
          <span>CasparCG</span>
          <span>OGraf</span>
        </div>
      </div>

      <div className="wz-entry">
        <button className="wz-entry-card wz-entry-card--primary" onClick={onTemplates} data-entry="template">
          <span className="wz-entry-icon">▤</span>
          <strong>Start from a template</strong>
          <span className="hint">Pick a design, choose your fields, style, and animation — then tweak the code it writes, or never open it.</span>
        </button>
        <button className="wz-entry-card" onClick={onAi} data-entry="ai">
          <span className="wz-entry-icon">✦</span>
          <strong>Create with AI</strong>
          <span className="hint">Describe what you need — drop in a logo, brand stills, or an existing .html / SPX template to convert. Every result is live-tested and lands as clean, editable code.</span>
        </button>
        <button className="wz-entry-card" onClick={onVideo} data-entry="video">
          <span className="wz-entry-icon">▶</span>
          <strong>Video or animation with AI</strong>
          <span className="hint">Describe a stinger, intro, logo reveal, or countdown — get a real video you can preview, refine by chat, edit as code, and render.</span>
        </button>
        <button className="wz-entry-card" onClick={onImportGraphic} data-entry="import-graphic">
          <span className="wz-entry-icon">▦</span>
          <strong>Import graphic</strong>
          <span className="hint">Already designed it? Bring the finished image in and add editable fields on top in the editor — drag, style, and animate each one. No AI — you place every piece.</span>
        </button>
        <button className="wz-entry-card" onClick={onBlank} data-entry="blank">
          <span className="wz-entry-icon">‹›</span>
          <strong>Blank project</strong>
          <span className="hint">A minimal valid SPX template — pure code-first, no training wheels.</span>
        </button>
      </div>
    </div>
  );
}
