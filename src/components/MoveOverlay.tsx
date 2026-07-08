import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { zoneDecls } from '../templates/shared/base';
import { setCssDeclaration } from '../blocks/edit';
import type { Zone9 } from '../model/wizard';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
  /** On-screen size of the canvas (template resolution × current scale), in CSS pixels. */
  width: number;
  height: number;
}

interface DragState {
  /** Pointer start, in screen px (overlay coordinates). */
  startX: number;
  startY: number;
  /** Current pointer delta, in screen px. */
  dx: number;
  dy: number;
  /** The graphic root's rect at drag start, in CANVAS px (the iframe's internal space). */
  root: { left: number; top: number; width: number; height: number };
}

/**
 * Era 6 · W1 — drag-to-position (docs/WYSIWYG_PLAN.md). A pointer layer over the preview:
 * drag the graphic and on release the nearest 9-zone anchor + pixel nudge is computed and
 * written as the SAME zone declarations the Style panel writes (zoneDecls → the root rule
 * in the CSS). No scene model, no hidden state — one deterministic, undoable code patch.
 */
export default function MoveOverlay({ iframeRef, width, height }: Props) {
  const template = useTemplateStore((s) => s.template);
  const setCss = useTemplateStore((s) => s.setCss);

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const res = template.resolution;
  const scale = width / res.width; // screen px per canvas px
  // The structure contract: every generated template has one root `.{prefix}` holding a
  // `.{prefix}-box` — the same detection the Motion panel uses (blocks/animPatch.ts).
  const prefix = (template.html.match(/class="(\w+)-box"/) || [])[1] ?? 'l3';
  const rootSelector = `.${prefix}`;

  const rootEl = () => iframeRef.current?.contentDocument?.querySelector<HTMLElement>(rootSelector) ?? null;

  // While move mode is on, keep the root VISIBLE (it sits at opacity 0 until play()).
  // Inline style on the preview DOM only — rebuilds reset it, so re-apply on every load.
  useEffect(() => {
    const iframe = iframeRef.current;
    const reveal = () => {
      const el = rootEl();
      if (el) el.style.opacity = '1';
    };
    reveal();
    iframe?.addEventListener('load', reveal);
    return () => {
      iframe?.removeEventListener('load', reveal);
      const el = rootEl();
      if (el) el.style.opacity = ''; // hand visibility back to the stylesheet/timeline
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, rootSelector]);

  // Escape cancels an active drag (standard direct-manipulation behavior).
  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrag(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = rootEl();
    if (!el) return;
    // The iframe renders at native resolution, so this rect is already in canvas px.
    const r = el.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      root: { left: r.left, top: r.top, width: r.width, height: r.height },
    });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setDrag({ ...d, dx: e.clientX - d.startX, dy: e.clientY - d.startY });
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    setDrag(null);
    if (!d || (d.dx === 0 && d.dy === 0)) return;

    // The dragged root rect in canvas px.
    const left = d.root.left + d.dx / scale;
    const top = d.root.top + d.dy / scale;
    const centerX = left + d.root.width / 2;
    const centerY = top + d.root.height / 2;

    // Nearest anchor: which third of the frame the root's center landed in.
    const h = centerX < res.width / 3 ? 'left' : centerX > (res.width * 2) / 3 ? 'right' : 'center';
    const v = centerY < res.height / 3 ? 'top' : centerY > (res.height * 2) / 3 ? 'bottom' : 'mid';
    const zone = `${v}-${h}` as Zone9;

    // Residual nudge: solve zoneDecls' equations backwards for the dragged position.
    const hInset = Math.round(res.width * 0.0625);
    const topInset = Math.round(res.height * 0.08);
    const bottomInset = Math.round(res.height * 0.11);
    const nudge = {
      x: Math.round(
        h === 'left' ? left - hInset
        : h === 'right' ? hInset - (res.width - (left + d.root.width))
        : centerX - res.width / 2,
      ),
      y: Math.round(
        v === 'top' ? top - topInset
        : v === 'bottom' ? bottomInset - (res.height - (top + d.root.height))
        : centerY - res.height / 2,
      ),
    };

    // The SAME patch the Style panel writes: every zone declaration onto the root rule
    // (including the explicit auto/none resets, so the previous anchor is fully overridden).
    let css = template.css;
    for (const decl of zoneDecls(zone, nudge, res)) {
      css = setCssDeclaration(css, rootSelector, decl.prop, decl.value);
    }
    setCss(css);
  };

  // Ghost rect (screen px) while dragging.
  const ghost = drag
    ? {
        left: drag.root.left * scale + drag.dx,
        top: drag.root.top * scale + drag.dy,
        width: drag.root.width * scale,
        height: drag.root.height * scale,
      }
    : null;
  // Which zone cell the ghost's center is over (for the highlight).
  const cell = ghost
    ? {
        col: Math.min(2, Math.max(0, Math.floor(((ghost.left + ghost.width / 2) / width) * 3))),
        row: Math.min(2, Math.max(0, Math.floor(((ghost.top + ghost.height / 2) / height) * 3))),
      }
    : null;

  return (
    <div
      className={`move-overlay${drag ? ' dragging' : ''}`}
      style={{ width, height }}
      data-testid="move-overlay"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      {/* The 9-zone grid — always visible in move mode so the anchors are learnable. */}
      <div className="move-grid" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={`move-cell${cell && cell.row * 3 + cell.col === i ? ' target' : ''}`}
          />
        ))}
      </div>
      {ghost && <div className="move-ghost" style={ghost} />}
      <div className="move-hint">
        {drag ? 'Release to place · Esc cancels' : 'Drag the graphic to reposition it'}
      </div>
    </div>
  );
}
