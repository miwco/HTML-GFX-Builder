import { useMemo } from 'react';
import BrandLogo from '../../BrandLogo';
import { loadGraphics, type GraphicDoc } from '../../../model/library';
import { loadPackets } from '../../../model/packets';
import { hasCurrentVideoProject, listSavedVideoProjects } from '../../../model/videoProject';

interface Props {
  onTemplates: () => void;
  onImportGraphic: () => void;
  onAi: () => void;
  onVideo: () => void;
  onBlank: () => void;
  /** Go to Home (all saved work: graphics, packages, control panels, videos). */
  onHome: () => void;
  /** Open one recent graphic straight from the wizard. */
  onOpenGraphic: (g: GraphicDoc) => void;
}

/**
 * Step 0 — the app's home moment. A branded hero states what NoaCG Studio is and who it's
 * for, then two halves: CONTINUE WORKING (recent saved graphics + the door to Home) and
 * ways to start something new. Broadcast-graphics paths sit together; "Video or animation
 * with AI" is visually separated and marked Beta, because it creates a STANDALONE video —
 * not a live broadcast graphic.
 *
 * "Import graphic" is deliberately its own card and a MANUAL path — no AI anywhere in it.
 * A user who designed their graphic in Photoshop wants NoaCG to make it broadcast-ready
 * (fields, animation, export), not to regenerate it. Existing .html / SPX templates (and
 * logos to design around) go through Create with AI instead.
 */
export default function EntryStep({ onTemplates, onImportGraphic, onAi, onVideo, onBlank, onHome, onOpenGraphic }: Props) {
  const recent = useMemo(
    () => loadGraphics().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3),
    [],
  );
  /** Is there anything to continue? Home holds graphics, packages and videos, so any of them
   *  counts. On a first-ever visit there is nothing, and offering the loudest card on the
   *  screen as a door to an empty room is a false lead - creation leads instead. */
  const hasSavedWork = useMemo(
    () =>
      recent.length > 0 ||
      loadPackets().length > 0 ||
      listSavedVideoProjects().length > 0 ||
      hasCurrentVideoProject(),
    [recent],
  );

  return (
    <div className="wz-entry-wrap">
      <div className="wz-hero">
        <BrandLogo size={36} />
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

      {/* ── Continue working: saved work first — creation is not the only door. Shown only
             when there IS work to continue; see hasSavedWork. ── */}
      {hasSavedWork && (
      <div className="wz-continue" data-testid="wz-continue">
        <button className="wz-entry-card wz-continue-card" onClick={onHome} data-entry="continue">
          <span className="wz-entry-icon">🏠</span>
          <strong>Continue working</strong>
          <span className="hint">
            Your saved graphics, packages, control panels, and videos — pick up where you left
            off.
          </span>
        </button>
        {recent.length > 0 && (
          <div className="wz-recent">
            <span className="wz-recent-label mono">Recent</span>
            {recent.map((g) => (
              <button key={g.id} className="wz-recent-chip" onClick={() => onOpenGraphic(g)} title={`Open "${g.name}"`}>
                ↩ {g.name}
              </button>
            ))}
            <button className="link-inline" onClick={onHome} data-testid="wz-view-all">
              View everything →
            </button>
          </div>
        )}
      </div>
      )}

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
        <button className="wz-entry-card" onClick={onImportGraphic} data-entry="import-graphic">
          <span className="wz-entry-icon">▦</span>
          <strong>Import graphic</strong>
          <span className="hint">Already designed it? Bring the finished image in, place editable text on it, pick fonts and animation — no AI, you place every piece.</span>
        </button>
        <button className="wz-entry-card" onClick={onBlank} data-entry="blank">
          <span className="wz-entry-icon">‹›</span>
          <strong>Blank project</strong>
          <span className="hint">A minimal valid SPX template — pure code-first, no training wheels.</span>
        </button>
      </div>

      {/* ── The video world, clearly apart: a standalone rendered video, not a live graphic. ── */}
      <div className="wz-video-strip" data-testid="wz-video-strip">
        <span className="wz-video-strip-label mono">Not a live graphic?</span>
        <button className="wz-entry-card wz-entry-card--video" onClick={onVideo} data-entry="video">
          <span className="wz-entry-icon">▶</span>
          <strong>
            Video or animation with AI <span className="wz-beta-tag">Beta</span>
          </strong>
          <span className="hint">
            Makes a standalone video or animation — a stinger, intro, logo reveal, countdown —
            that you render to a file. It opens in the separate Video workspace, not the
            broadcast-graphics editor.
          </span>
        </button>
      </div>
    </div>
  );
}
