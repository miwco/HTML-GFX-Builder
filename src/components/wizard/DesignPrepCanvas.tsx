import { useRef, useState, type ReactNode } from 'react';
import type { EraseRect } from '../../assets/eraseRegion';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The two draggable 9-slice guides for stretch mode, overlaid on DesignPrepCanvas: where
 * the LEFT cap ends and where the RIGHT cap starts, in DESIGN px from the artwork's left
 * edge (the same unit the emitted CSS carries — percentages of the artwork are identical
 * in design and source space, so the overlay needs no unit conversion).
 */
export function StretchGuides({
  left,
  right,
  artWidth,
  onChange,
}: {
  left: number;
  right: number;
  artWidth: number;
  onChange: (hz: { left: number; right: number }) => void;
}) {
  const MIN_GAP = 16; // design px the middle band may never shrink under
  // Window-level move/up listeners for the drag's lifetime: the guide is a 12px sliver, so
  // the pointer leaves it on the first frame of any real drag — tracking must not depend on
  // events still hitting the element.
  const startDrag = (which: 'left' | 'right') => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const surface = (e.currentTarget as HTMLElement).parentElement!;
    const move = (ev: PointerEvent) => {
      const box = surface.getBoundingClientRect();
      const x = Math.round(((ev.clientX - box.left) / box.width) * artWidth);
      if (which === 'left') onChange({ left: clamp(x, 8, right - MIN_GAP), right });
      else onChange({ left, right: clamp(x, left + MIN_GAP, artWidth - 8) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <>
      <div
        className="wz-prep-guide"
        data-prep-overlay
        data-testid="stretch-guide-left"
        style={{ left: `${(left / artWidth) * 100}%` }}
        onPointerDown={startDrag('left')}
        title="Where the left cap ends — everything left of this keeps its exact shape"
      >
        <span>cap ▸</span>
      </div>
      <div
        className="wz-prep-guide"
        data-prep-overlay
        data-testid="stretch-guide-right"
        style={{ left: `${(right / artWidth) * 100}%` }}
        onPointerDown={startDrag('right')}
        title="Where the right cap starts — everything between the guides stretches"
      >
        <span>◂ cap</span>
      </div>
    </>
  );
}

interface Props {
  /** The artwork to show (data URL) — the cleaned result once an erase is applied. */
  src: string;
  /** The artwork's SOURCE pixel size — every rect this surface reports is in these units. */
  sourceWidth: number;
  sourceHeight: number;
  /** The committed erase rectangle (source px), shown as a marked region. */
  rect: EraseRect | null;
  /** Fired when a drag commits a rectangle of at least MIN_RECT source px. */
  onRect: (rect: EraseRect) => void;
  /** When false the surface only displays — no rectangle drawing (mode overlays only). */
  drawEnabled: boolean;
  /** Extra overlays in the same source-px coordinate space (the stretch guides). */
  children?: ReactNode;
}

/** Smallest committable rectangle, in source px — anything under this is a stray click. */
const MIN_RECT = 6;

/**
 * The Prepare step's artwork surface: the design shown at fit size, with DOM overlays in the
 * artwork's own SOURCE pixel space. The erase rectangle is drawn here by pointer drag; the
 * mapping display px → source px happens in this one place, so everything downstream (the
 * erase engine, the auto-created field) works in real file pixels — a 2× retina export is
 * erased at 2×, never at the shrunken display size.
 *
 * Overlays are plain positioned divs (percentages of the artwork), not a <canvas> — they
 * resize with the surface for free and stay hit-testable in Playwright.
 */
export default function DesignPrepCanvas({
  src,
  sourceWidth,
  sourceHeight,
  rect,
  onRect,
  drawEnabled,
  children,
}: Props) {
  const surface = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<EraseRect | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  /** A pointer event's position in SOURCE px, clamped to the artwork. */
  const toSource = (e: React.PointerEvent): { x: number; y: number } => {
    const box = surface.current!.getBoundingClientRect();
    const k = sourceWidth / box.width;
    return {
      x: Math.max(0, Math.min(sourceWidth, Math.round((e.clientX - box.left) * k))),
      y: Math.max(0, Math.min(sourceHeight, Math.round((e.clientY - box.top) * k))),
    };
  };

  const rectFrom = (a: { x: number; y: number }, b: { x: number; y: number }): EraseRect => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!drawEnabled || e.button !== 0) return;
    // A press on an overlay child (a stretch guide) is that overlay's drag, not a new rect.
    if ((e.target as HTMLElement).closest('[data-prep-overlay]')) return;
    start.current = toSource(e);
    setDraft(null);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDraft(rectFrom(start.current, toSource(e)));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const r = rectFrom(start.current, toSource(e));
    start.current = null;
    setDraft(null);
    if (r.width >= MIN_RECT && r.height >= MIN_RECT) onRect(r);
  };

  /** Percent-of-artwork style for a source-px rectangle (resizes with the surface). */
  const pct = (r: EraseRect) => ({
    left: `${(r.x / sourceWidth) * 100}%`,
    top: `${(r.y / sourceHeight) * 100}%`,
    width: `${(r.width / sourceWidth) * 100}%`,
    height: `${(r.height / sourceHeight) * 100}%`,
  });

  const shown = draft ?? rect;

  return (
    <div
      ref={surface}
      className={`wz-prep-surface ${drawEnabled ? 'drawing' : ''}`}
      data-testid="erase-surface"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <img src={src} alt="" draggable={false} />
      {shown && <div className="wz-prep-rect" data-testid="erase-rect" style={pct(shown)} />}
      {children}
    </div>
  );
}
