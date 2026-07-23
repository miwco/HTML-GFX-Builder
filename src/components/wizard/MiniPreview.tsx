import { useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import {
  frameGraphic,
  framingTransform,
  measureGraphicBox,
  type GraphicBox,
} from '../../preview/frameGraphic';
import type { TemplateVariant } from '../../model/wizard';

/**
 * A small settled-state render of a variant for the template picker cards.
 * Loads the real template and jumps the entrance timeline to its end (no animation),
 * so every card shows the true on-air look without ten timelines running at once.
 *
 * FRAMED ON THE GRAPHIC, not on the canvas — the shared recipe in preview/frameGraphic.ts, so a
 * picker card, Home's library card and the big preview's "⌖ Zoom to graphic" (WizardPreview.tsx)
 * all agree about what a design looks like.
 */

interface MiniWindow extends Window {
  buildInTimeline?: () => { progress: (n: number) => void };
}

export default function MiniPreview({ variant }: { variant: TemplateVariant }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const template = useMemo(() => variant.create(), [variant]);
  const doc = useMemo(() => composeDocument(template), [template]);
  const { width, height } = template.resolution;
  const [box, setBox] = useState<GraphicBox | null>(null);
  // The card's own size, MEASURED: the grid reflows with the wizard's width, and a hard-coded
  // guess here silently mis-frames every tile the day the layout changes.
  const [card, setCard] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCard({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const settle = () => {
    const w = ref.current?.contentWindow as MiniWindow | null;
    try {
      w?.buildInTimeline?.().progress(1); // jump straight to the settled on-air state
    } catch {
      /* preview is best-effort */
    }
    // Measure AFTER settling — mid-entrance a graphic can still sit off-canvas.
    setBox(measureGraphicBox(ref.current));
  };

  const framing = frameGraphic(box, { width, height }, card);

  return (
    <div className="wz-mini" ref={cardRef}>
      <iframe
        ref={ref}
        title={`${variant.name} preview`}
        sandbox="allow-scripts allow-same-origin"
        srcDoc={doc}
        onLoad={() => setTimeout(settle, 40)}
        tabIndex={-1}
        style={{ width, height, transform: framingTransform(framing) }}
      />
    </div>
  );
}
