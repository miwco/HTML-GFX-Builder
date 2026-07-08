import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { zoneDecls } from '../templates/shared/base';
import { setCssDeclaration, setFieldDefault } from '../blocks/edit';
import type { Zone9 } from '../model/wizard';

interface Props {
  iframeRef: RefObject<HTMLIFrameElement>;
  /** On-screen size of the canvas (template resolution × current scale), in CSS pixels. */
  width: number;
  height: number;
}

interface DragState {
  /** Pointer start, in screen px. */
  startX: number;
  startY: number;
  /** Current pointer delta, in screen px. */
  dx: number;
  dy: number;
  /** Past the threshold — the ghost + zone grid show and release commits. */
  active: boolean;
  /** The graphic root's rect at drag start, in CANVAS px (the iframe's internal space). */
  root: { left: number; top: number; width: number; height: number };
}

interface EditState {
  field: string;
  multiline: boolean;
  value: string;
  /** The text element's rect in CANVAS px (scaled to screen px at render time). */
  rect: { left: number; top: number; width: number; height: number };
}

// A real drag, not a shaky click (screen px).
const DRAG_THRESHOLD = 4;

/**
 * The direct-manipulation layer over the preview (Era 6 — no modes): hover shows what's
 * grabbable (hand cursor on the graphic, text cursor on editable text), dragging the graphic
 * re-anchors it (nearest 9-zone + residual nudge — the SAME zoneDecls patch the Style panel
 * writes), and double-clicking a text line edits it in place (live sample value + the field's
 * SPX-definition default, one undoable patch). Broadcast templates take no pointer input of
 * their own, so this layer never competes with the graphic.
 */
export default function CanvasInteraction({ iframeRef, width, height }: Props) {
  const template = useTemplateStore((s) => s.template);
  const setCss = useTemplateStore((s) => s.setCss);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setSampleValue = useTemplateStore((s) => s.setSampleValue);
  const sampleData = useTemplateStore((s) => s.sampleData);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [cursor, setCursor] = useState<'default' | 'grab' | 'text'>('default');
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  // Mirror of `editing` so blur-after-Escape can't commit a cancelled edit (the blur handler
  // would otherwise close over the pre-Escape state).
  const editingRef = useRef<EditState | null>(null);
  editingRef.current = editing;
  const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const res = template.resolution;
  const scale = width / res.width; // screen px per canvas px
  // The structure contract: every generated template has one root `.{prefix}` holding a
  // `.{prefix}-box` — the same detection the Motion panel uses (blocks/animPatch.ts).
  const prefix = (template.html.match(/class="(\w+)-box"/) || [])[1] ?? 'l3';
  const rootSelector = `.${prefix}`;

  const doc = () => iframeRef.current?.contentDocument ?? null;
  const rootEl = () => doc()?.querySelector<HTMLElement>(rootSelector) ?? null;

  /** Pointer event → canvas px (the iframe renders at native resolution). */
  const toCanvas = (e: React.PointerEvent | React.MouseEvent) => {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: (e.clientX - box.left) / scale, y: (e.clientY - box.top) / scale };
  };

  const inRect = (p: { x: number; y: number }, r: DOMRect) =>
    p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;

  /** The VISIBLE editable text element under the point (hidden #fN source divs excluded). */
  const textFieldAt = (p: { x: number; y: number }) => {
    const d = doc();
    if (!d) return null;
    for (const f of template.fields) {
      const el = d.getElementById(f.field);
      // Editable = a rendered text element. Images have their own field UX (Data panel);
      // hidden source divs (credits/tickers/timers/quiz) are consumed by the template JS.
      if (!el || el.tagName === 'IMG' || el.offsetParent === null) continue;
      if (inRect(p, el.getBoundingClientRect())) return { field: f.field, ftype: f.ftype, el };
    }
    return null;
  };

  // Focus the inline editor as soon as it opens.
  useEffect(() => {
    if (editing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editing?.field]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (editing) return; // the editor overlay handles its own events
    const el = rootEl();
    if (!el) return;
    const p = toCanvas(e);
    const r = el.getBoundingClientRect();
    if (!inRect(p, r)) return; // drags start ON the graphic only
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      active: false,
      root: { left: r.left, top: r.top, width: r.width, height: r.height },
    });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setDrag({ ...d, dx, dy, active: d.active || Math.hypot(dx, dy) > DRAG_THRESHOLD });
      return;
    }
    if (editing) return;
    // Hover affordances: hand on the graphic, text cursor on an editable line.
    const p = toCanvas(e);
    const r = rootEl()?.getBoundingClientRect();
    if (r && inRect(p, r)) setCursor(textFieldAt(p) ? 'text' : 'grab');
    else setCursor('default');
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    setDrag(null);
    if (!d || !d.active) return; // a click (below the threshold) is not a move

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

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editing) return;
    const p = toCanvas(e);
    const hit = textFieldAt(p);
    if (!hit) return;
    const r = hit.el.getBoundingClientRect();
    setEditing({
      field: hit.field,
      multiline: hit.ftype === 'textarea',
      value: sampleData[hit.field] ?? hit.el.textContent ?? '',
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    });
  };

  /** Commit the inline edit: live sample value + the field's definition default (undoable). */
  const commitEdit = () => {
    const ed = editingRef.current;
    editingRef.current = null;
    setEditing(null);
    if (!ed) return;
    if ((sampleData[ed.field] ?? '') === ed.value) return; // nothing changed
    applyTemplate(setFieldDefault(template, ed.field, ed.value)); // definition + static text
    setSampleValue(ed.field, ed.value); // the live operator value follows the edit
  };

  const cancelEdit = () => {
    editingRef.current = null;
    setEditing(null);
  };

  // Ghost rect (screen px) while an ACTIVE drag is under way.
  const ghost = drag?.active
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
      className={`canvas-layer${ghost ? ' dragging' : ''} cursor-${cursor}`}
      style={{ width, height }}
      data-testid="canvas-layer"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      onDoubleClick={onDoubleClick}
    >
      {/* The 9-zone grid + ghost — only while a real drag is under way. */}
      {ghost && (
        <>
          <div className="move-grid" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className={`move-cell${cell && cell.row * 3 + cell.col === i ? ' target' : ''}`} />
            ))}
          </div>
          <div className="move-ghost" style={ghost} />
          <div className="move-hint">Release to place · Esc cancels</div>
        </>
      )}

      {/* The inline text editor — positioned over the text element it edits. */}
      {editing && (
        <div className="inline-edit" style={{
          left: editing.rect.left * scale - 6,
          top: editing.rect.top * scale - 6,
          minWidth: Math.max(160, editing.rect.width * scale + 12),
        }}>
          {editing.multiline ? (
            <textarea
              ref={(el) => { editInputRef.current = el; }}
              data-testid="inline-editor"
              rows={4}
              value={editing.value}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelEdit();
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitEdit();
              }}
            />
          ) : (
            <input
              ref={(el) => { editInputRef.current = el; }}
              data-testid="inline-editor"
              value={editing.value}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelEdit();
                if (e.key === 'Enter') commitEdit();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
