import { useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

export interface Splitter {
  dragging: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

/** A hand-rolled drag splitter (no library, per offline-first). Computes a raw 0..1 ratio from the
 *  pointer position within `containerRef` along `axis`, calls `onChange` live and `onCommit` on
 *  release (persist there). Callers clamp. Uses pointer capture so the drag survives the cursor
 *  outrunning the thin handle; no window-level listeners needed. */
export function useSplitter(
  axis: 'x' | 'y',
  containerRef: RefObject<HTMLElement | null>,
  onChange: (ratio: number) => void,
  onCommit: (ratio: number) => void,
): Splitter {
  const [dragging, setDragging] = useState(false);
  const bodyClass = axis === 'x' ? 'resizing-cols' : 'resizing-rows';

  const ratioAt = (e: ReactPointerEvent): number | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const raw = axis === 'x' ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height;
    return Number.isFinite(raw) ? raw : null;
  };

  return {
    dragging,
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      document.body.classList.add(bodyClass);
    },
    onPointerMove: (e) => {
      if (!dragging) return;
      const r = ratioAt(e);
      if (r !== null) onChange(r);
    },
    onPointerUp: (e) => {
      const r = ratioAt(e);
      if (r !== null) {
        onChange(r);
        onCommit(r);
      }
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);
      document.body.classList.remove(bodyClass);
    },
  };
}
