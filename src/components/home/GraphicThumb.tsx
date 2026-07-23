import { useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import {
  frameGraphic,
  framingTransform,
  measureGraphicBox,
  type GraphicBox,
} from '../../preview/frameGraphic';
import { settleGraphicOnLoad } from '../../preview/settleGraphic';
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

/**
 * FRAMED ON THE GRAPHIC, not on the canvas: preview/frameGraphic.ts, the same recipe the wizard's
 * picker cards use. At this size the whole-canvas view is not a small preview of a lower third,
 * it is an unreadable smear of one - the band occupies a fraction of a 1920×1080 frame, so the
 * card measures the graphic's own box and frames onto that.
 */

/** Card width in CSS px; the height follows the template's own aspect ratio. Sized so a band
 *  graphic (a lower third fills a fraction of the frame) still reads as its own shape. */
const THUMB_W = 144;

/** On a phone the row's text and actions need the width more than the preview does — the box
 *  shrinks and the iframe scale follows, so nothing crops. Matches the `@media (max-width: 480px)`
 *  home rules in styles.css; keep the two in sync. */
const THUMB_W_COMPACT = 96;
const COMPACT_QUERY = '(max-width: 480px)';

function useCompactThumb(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return compact;
}

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
  const compact = useCompactThumb();

  const [box, setBox] = useState<GraphicBox | null>(null);

  const boxW = compact ? THUMB_W_COMPACT : THUMB_W;
  const { width, height } = template.resolution;
  const boxH = Math.round(boxW * (height / width));

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

  /** Park the card at the settled on-air state — the shared recipe, so a card and the operator
   *  panel's preview can never disagree about what "at rest" looks like — then frame on the
   *  graphic it settled into. */
  const onLoad = () =>
    settleGraphicOnLoad(frameRef.current, data, () => setBox(measureGraphicBox(frameRef.current)));

  const framing = frameGraphic(box, { width, height }, { w: boxW, h: boxH });

  return (
    <div
      ref={boxRef}
      className="gfx-thumb"
      style={{ width: boxW, height: boxH }}
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
          style={{ width, height, transform: framingTransform(framing) }}
        />
      )}
    </div>
  );
}
