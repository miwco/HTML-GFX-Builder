/**
 * Park a composed graphic at its SETTLED on-air state inside a preview iframe.
 *
 * A graphic is hidden until `play()` runs, so any surface that shows one WITHOUT a playback
 * gesture - a Home card's thumbnail, the operator panel's preview before the first take - must
 * drive it to rest itself, or it reads as an empty black frame. This is that one recipe, shared
 * so those surfaces can never drift into a second render path (the editor canvas settles the
 * same way in PlayoutSimulator).
 *
 * The recipe: write the data, jump the house entrance builder to its end, write the data AGAIN.
 * The second `update()` is load-bearing - `progress(1, true)` suppresses GSAP callbacks, so
 * anything a callback writes (a counter's digits, a bar's fill) would otherwise be left at its
 * pre-entrance value while the layout around it sits at the end state.
 *
 * A template with no builder (blank, hand-written, foreign import) has no entrance to jump, so
 * it gets its own `play()` and is allowed to come to rest on its own clock.
 */

/** A settled timeline: the house entrance builder's return value. */
interface SettleTimeline {
  pause: () => void;
  progress: (value: number, suppressEvents?: boolean) => void;
}

/** The template globals this drives: the SPX contract plus the house entrance builder. */
export interface SettleWindow {
  update?: (json: string) => void;
  play?: () => void;
  buildInTimeline?: () => SettleTimeline;
}

/**
 * Settle `win` with `data` (a JSON string, the shape `update()` takes). Best-effort by design:
 * a template that throws still leaves its surface standing, because a preview is never worth
 * taking a page down for.
 */
export function settleGraphic(win: SettleWindow | null | undefined, data: string): void {
  if (!win) return;
  try {
    win.update?.(data);
    if (typeof win.buildInTimeline === 'function') {
      const tl = win.buildInTimeline();
      tl.pause();
      tl.progress(1, true);
      win.update?.(data);
    } else {
      win.play?.();
    }
  } catch {
    /* best-effort: a broken template still gets its frame */
  }
}

/**
 * Settle once the document's own fonts have loaded. A text graphic laid out in the fallback
 * face and then jumped to the end of its entrance would freeze the WRONG metrics into the
 * frame, so every caller that settles on iframe load should come through here.
 */
export function settleGraphicOnLoad(frame: HTMLIFrameElement | null, data: string): void {
  const win = frame?.contentWindow as SettleWindow | null | undefined;
  const run = () => settleGraphic(win, data);
  const fonts = (frame?.contentWindow as Window | null)?.document?.fonts;
  if (fonts?.ready) void fonts.ready.then(run, run);
  else run();
}
