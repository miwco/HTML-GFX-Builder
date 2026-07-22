import { useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import { fieldDescriptors } from '../../control/controlModel';
import type { SpxTemplate } from '../../model/types';

/**
 * A Home card's THUMBNAIL: the real graphic, rendered small and parked at its settled on-air
 * state (docs/SAVED_CONTENT_MODEL.md §3).
 *
 * It is a LIVE render, not a stored picture. A thumbnail baked onto the GraphicDoc would be a
 * persisted-format change (with its migration) that also rides every cloud sync as a second
 * copy of the artwork — and it would go stale the moment the template is edited on another
 * device, which is exactly when a preview must be trusted. Rendering from the template instead
 * means the card cannot disagree with the graphic, and costs nothing to store or migrate.
 *
 * The price is re-rendering per Home visit, paid down two ways: the iframe mounts only once the
 * card is actually scrolled into view, and the composed document is memoized per template. Both
 * the composition (preview/composeDocument) and the settle recipe below are the editor's own —
 * there is no second render path.
 */

/** The template globals a thumbnail drives: the SPX contract plus the house entrance builder. */
interface ThumbTimeline {
  pause: () => void;
  progress: (value: number, suppressEvents?: boolean) => void;
}
interface ThumbWindow {
  update?: (json: string) => void;
  play?: () => void;
  buildInTimeline?: () => ThumbTimeline;
}

/** Card width in CSS px; the height follows the template's own aspect ratio. Sized so a band
 *  graphic (a lower third fills a fraction of the frame) still reads as its own shape. */
const THUMB_W = 144;

export default function GraphicThumb({
  template,
  values,
  label,
}: {
  template: SpxTemplate;
  /** Field values to show (an entry's row); anything missing falls back to the definition default. */
  values?: Record<string, string>;
  label: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);

  const { width, height } = template.resolution;
  const scale = THUMB_W / width;

  // Mount the iframe only when the card reaches the viewport — a library of a hundred graphics
  // must not parse a hundred copies of GSAP to show the eight rows a user can actually see.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || visible) return;
    if (typeof IntersectionObserver !== 'function') {
      setVisible(true); // no observer (older engines, some test runtimes): render eagerly
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: '200px' },
    );
    io.observe(box);
    return () => io.disconnect();
  }, [visible]);

  const doc = useMemo(() => (visible ? composeDocument(template) : ''), [visible, template]);

  // The data the thumbnail shows: the graphic's own field defaults, overlaid with whatever the
  // caller passes (the active entry) — the same merge the control panel's Play does.
  const data = useMemo(() => {
    const merged: Record<string, string> = {};
    for (const d of fieldDescriptors(template.fields, { includeHidden: true })) {
      merged[d.key] = String(values?.[d.key] ?? d.defaultValue ?? '');
    }
    return JSON.stringify(merged);
  }, [template, values]);

  /** The editor canvas's design view, small: data in, jump the entrance to its end, data again
   *  (PlayoutSimulator.settle — suppressed callbacks skip callback-written text, so the second
   *  update() is what makes counters and bar fills truthful). */
  const settle = () => {
    const w = frameRef.current?.contentWindow as ThumbWindow | null;
    if (!w) return;
    try {
      w.update?.(data);
      if (typeof w.buildInTimeline === 'function') {
        const tl = w.buildInTimeline();
        tl.pause();
        tl.progress(1, true);
        w.update?.(data);
      } else {
        // No builder contract (a blank, hand-written, or foreign-imported template). The editor
        // canvas leaves those blank because it has a Play button beside it; a card does not, so
        // it runs the template's own play() and lets the graphic come to rest on its own.
        w.play?.();
      }
    } catch {
      /* a thumbnail is best-effort — a template that throws still gets its card */
    }
  };

  /** Settle once the document's fonts have loaded: a text graphic laid out in the fallback face
   *  and then jumped to the end of its entrance would freeze the wrong metrics into the card. */
  const onLoad = () => {
    const w = frameRef.current?.contentWindow;
    const fonts = w?.document?.fonts;
    if (fonts?.ready) void fonts.ready.then(settle, settle);
    else settle();
  };

  return (
    <div
      ref={boxRef}
      className="gfx-thumb"
      style={{ width: THUMB_W, height: Math.round(THUMB_W * (height / width)) }}
      data-testid="graphic-thumb"
      aria-hidden="true"
    >
      {visible && (
        <iframe
          ref={frameRef}
          title={`${label} preview`}
          sandbox="allow-scripts allow-same-origin"
          srcDoc={doc}
          onLoad={onLoad}
          tabIndex={-1}
          style={{ width, height, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}
