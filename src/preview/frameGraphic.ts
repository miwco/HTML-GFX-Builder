/**
 * FRAME A SETTLED GRAPHIC INSIDE A SMALL BOX.
 *
 * Most broadcast formats occupy a fraction of a 1920×1080 frame - a lower third is a band across
 * the bottom of it - so scaling the whole canvas into a card leaves most of the tile empty and
 * makes the designs nearly indistinguishable at picking size. Every small preview therefore
 * measures the graphic's OWN box and frames onto that, the same reframing the wizard preview's
 * "⌖ Zoom to graphic" performs.
 *
 * The rule lives here once because two surfaces show the same graphics at the same size - the
 * wizard's template cards (wizard/MiniPreview) and Home's library cards (home/GraphicThumb) - and
 * a card that framed differently from the picker card it came from would read as a different
 * design.
 */

/** The graphic's bounding box in CANVAS px (the iframe body is full-bleed and untransformed). */
export interface GraphicBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Breathing room kept around the framed graphic, as a fraction of the VIEW on each side.
 *
 * A fraction of the view, not canvas px: the same canvas-px margin reads as generous air on a
 * wizard card and as nothing at all on a 144px Home card, where it left an info card's title
 * touching the border on both sides. Measured in the box the graphic is being fitted INTO, the
 * gap looks the same at every preview size.
 */
const INSET = 0.05;

/** How far past the plain whole-canvas fit the zoom may go - so a tiny corner bug is not blown
 *  up past its own detail. */
const MAX_ZOOM = 4;

/**
 * Measure the graphic inside a settled preview iframe, or null when it cannot be read (a
 * cross-origin document, a template that throws, nothing rendered yet).
 *
 * Call it AFTER settling: mid-entrance a graphic can still sit off-canvas, and framing on that
 * would park the card on empty space.
 */
export function measureGraphicBox(frame: HTMLIFrameElement | null): GraphicBox | null {
  try {
    const root = frame?.contentDocument?.body?.querySelector('div');
    const r = root?.getBoundingClientRect();
    if (!r || r.width <= 0 || r.height <= 0) return null;
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  } catch {
    return null;
  }
}

/** What to apply to the canvas-sized iframe: a scale plus a canvas-px slide of the graphic's box
 *  to the middle. */
export interface GraphicFraming {
  scale: number;
  tx: number;
  ty: number;
}

/**
 * Frame `box` (canvas px, null until measured) from a `canvas` of the template's resolution into
 * a `view` of `w × h` CSS px.
 *
 * Whole canvas until measured, so a card never flashes something half-framed. A design that
 * already fills the canvas gains nothing from zooming, which is why the plain fit scale is the
 * FLOOR and never the starting point.
 */
export function frameGraphic(
  box: GraphicBox | null,
  canvas: { width: number; height: number },
  view: { w: number; h: number },
): GraphicFraming {
  const fit = view.w > 0 && view.h > 0 ? Math.min(view.w / canvas.width, view.h / canvas.height) : 0;
  if (!box || !fit) return { scale: fit, tx: 0, ty: 0 };
  const inner = 1 - 2 * INSET;
  const contain = Math.min((view.w * inner) / box.w, (view.h * inner) / box.h);
  return {
    scale: Math.min(Math.max(contain, fit), fit * MAX_ZOOM),
    tx: canvas.width / 2 - (box.x + box.w / 2),
    ty: canvas.height / 2 - (box.y + box.h / 2),
  };
}

/**
 * The CSS transform for a framing. The iframe is anchored at the box's CENTRE (top/left 50%,
 * `transform-origin: center`), so: pull it back by half its own size, scale, then slide the
 * graphic's box to the middle - that last translate runs in pre-scale (canvas) px, hence the
 * order.
 */
export function framingTransform({ scale, tx, ty }: GraphicFraming): string {
  return `translate(-50%, -50%) scale(${scale}) translate(${tx}px, ${ty}px)`;
}
