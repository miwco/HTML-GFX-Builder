// The canvas selection/hover overlay (Era 6): an amber outline + naming chip for the
// selected element, and a subtler outline + tag for the element under the pointer.
// Presentational — selection is editor UI state only; nothing here is ever written into
// the template or the export. Every label comes from the TemplatePart registry
// (model/structure.ts), so the canvas speaks exactly the same names as the timeline strip
// ("Whole graphic", "Panel", field titles, …). Outlines and tags are pointer-events: none;
// the chip takes pointer input ONLY when it carries an action (e.g. the "appears on press"
// control) and swallows those events so they never fall through to the gesture layer.

import type { ReactNode } from 'react';

/** A rect in the preview iframe's internal space (doc px — canvas px offset by the pasteboard
 *  pad; both share the same pixel grid, so × scale positions it in the doc-space overlay). */
export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  /** Screen px per doc px (= fit × zoom). */
  scale: number;
  /** The overlay's on-screen width — keeps the chip/tag inside the stage. */
  width: number;
  selection: { rect: CanvasRect; label: string; hint?: string; action?: ReactNode } | null;
  hover: { rect: CanvasRect; label: string } | null;
}

export default function CanvasSelection({ scale, width, selection, hover }: Props) {
  const toScreen = (r: CanvasRect) => ({
    left: r.left * scale,
    top: r.top * scale,
    width: r.width * scale,
    height: r.height * scale,
  });

  let hoverEls = null;
  if (hover) {
    const h = toScreen(hover.rect);
    hoverEls = (
      <>
        <div className="canvas-hover-outline" data-testid="canvas-hover" style={h} />
        <div
          className="canvas-hover-tag"
          data-testid="hover-tag"
          style={{ left: Math.max(2, Math.min(h.left, width - 120)), top: Math.max(2, h.top - 22) }}
        >
          {hover.label}
        </div>
      </>
    );
  }

  let selectionEls = null;
  if (selection) {
    const s = toScreen(selection.rect);
    // The chip prefers the spot just above the outline's top-left corner; when the
    // selection touches the top edge it flips below, and it never leaves the stage sideways.
    const chipTop = s.top > 34 ? s.top - 28 : s.top + s.height + 8;
    // Containment on narrow stages: the chip gets at most the room between its spot and the
    // stage's right edge (its CSS caps it at 340px anyway), and slides left when that room
    // falls under a readable minimum — so it can never overflow the canvas, whatever the
    // label/hint length. The label/hint ellipsize inside this cap (styles.css).
    const chipMax = Math.min(340, Math.max(96, width - 4));
    const chipLeft = Math.max(2, Math.min(s.left, width - chipMax - 2));
    selectionEls = (
      <>
        <div className="canvas-selection-outline" data-testid="canvas-selection" style={s} />
        <div
          className={`canvas-chip${selection.action ? ' interactive' : ''}`}
          data-testid="selection-chip"
          style={{ left: chipLeft, top: chipTop, maxWidth: chipMax }}
          // An interactive chip must never leak its pointer input into the gesture layer
          // below (that would deselect or start a drag mid-interaction with the control).
          onPointerDown={selection.action ? (e) => e.stopPropagation() : undefined}
          onPointerUp={selection.action ? (e) => e.stopPropagation() : undefined}
          onDoubleClick={selection.action ? (e) => e.stopPropagation() : undefined}
        >
          <span className="canvas-chip-label">{selection.label}</span>
          {selection.hint && <span className="canvas-chip-hint">{selection.hint}</span>}
          {selection.action}
        </div>
      </>
    );
  }

  return (
    <>
      {hoverEls}
      {selectionEls}
    </>
  );
}
