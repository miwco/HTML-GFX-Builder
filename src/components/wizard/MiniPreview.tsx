import { useEffect, useMemo, useRef, useState } from 'react';
import { composeDocument } from '../../preview/composeDocument';
import type { TemplateVariant } from '../../model/wizard';

/**
 * A small settled-state render of a variant for the template picker cards.
 * Loads the real template and jumps the entrance timeline to its end (no animation),
 * so every card shows the true on-air look without ten timelines running at once.
 *
 * FRAMED ON THE GRAPHIC, not on the canvas. Most formats occupy a fraction of a 1920×1080
 * frame — a lower third is a band across the bottom of it — so scaling the whole canvas into
 * a card left most of the tile empty and made the designs nearly indistinguishable from one
 * another at picking size. The card measures the graphic's own box and frames onto that, the
 * same reframing the wizard preview's "⌖ Zoom to graphic" performs (WizardPreview.tsx), so a
 * picker card and the big preview agree about what a design looks like.
 */

/** Canvas-px breathing room kept around the framed graphic. */
const MARGIN = 40;

interface MiniWindow extends Window {
  buildInTimeline?: () => { progress: (n: number) => void };
}

export default function MiniPreview({ variant }: { variant: TemplateVariant }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const template = useMemo(() => variant.create(), [variant]);
  const doc = useMemo(() => composeDocument(template), [template]);
  const { width, height } = template.resolution;
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
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
    // Measure AFTER settling — mid-entrance a graphic can still sit off-canvas. The body is
    // full-bleed and untransformed, so getBoundingClientRect gives plain canvas px.
    try {
      const root = ref.current?.contentDocument?.body?.querySelector('div');
      const r = root?.getBoundingClientRect();
      setBox(r && r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null);
    } catch {
      setBox(null); // cross-origin or a template that throws: keep the whole-canvas view
    }
  };

  // Whole canvas until measured (never a flash of something half-framed), then framed on the
  // graphic. A design that already fills the canvas gains nothing from zooming, so the fit
  // scale is the floor; the cap stops a tiny corner bug being blown up past its own detail.
  const fit = card.w ? Math.min(card.w / width, card.h / height) : 0;
  let scale = fit;
  let tx = 0;
  let ty = 0;
  if (box && card.w) {
    const contain = Math.min(card.w / (box.w + MARGIN), card.h / (box.h + MARGIN));
    scale = Math.min(Math.max(contain, fit), fit * 4);
    tx = width / 2 - (box.x + box.w / 2);
    ty = height / 2 - (box.y + box.h / 2);
  }

  return (
    <div className="wz-mini" ref={cardRef}>
      <iframe
        ref={ref}
        title={`${variant.name} preview`}
        sandbox="allow-scripts allow-same-origin"
        srcDoc={doc}
        onLoad={() => setTimeout(settle, 40)}
        tabIndex={-1}
        style={{
          width,
          height,
          // Centre the canvas in the card, scale it, then slide the graphic's own box to the
          // middle. The last translate runs in pre-scale (canvas) px, hence the order.
          transform: `translate(-50%, -50%) scale(${scale}) translate(${tx}px, ${ty}px)`,
        }}
      />
    </div>
  );
}
