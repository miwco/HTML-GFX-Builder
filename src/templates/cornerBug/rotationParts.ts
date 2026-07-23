// The shared CSS for a ROTATING sponsor bug: one stage, several slots, one visible at a time.
//
// The rotation itself is the machine's (templates/types/identityBugs.ts) plus the runtime in
// bugRuntimes.ts; all this file owns is the stacking, which is identical in every family. The
// runtime puts `is-showing` on exactly one slot, so the CSS never has to know how many there
// are or which one is up.

/**
 * The stage and the stacking overrides. `width`/`height` are the logo area in design px.
 *
 * EMIT THIS AFTER `bugSlotCss` — it deliberately overrides the slot's own positioning
 * (a slot normally sits in the flow; on a stage every slot occupies the same box).
 */
export function rotationStageCss(width: number, height: number): string {
  return `/* The stage — the one place a sponsor appears. Every slot occupies it; the runtime
   shows exactly one, so the graphic's footprint never changes as partners cycle. */
.corner-bug-stage {
  position: relative;              /* the slots position against this box */
  width: calc(${width}px * var(--scale));   /* stage width */
  height: calc(${height}px * var(--scale));  /* stage height */
}

/* Rotation stacking: every sponsor slot fills the stage, and only the showing one renders. */
.corner-bug-stage .corner-bug-media {
  position: absolute;              /* all slots share the stage's box */
  inset: 0;                        /* all four edges */
  width: 100%;                     /* fill the stage… */
  height: 100%;                    /* …both ways */
  display: none;                   /* out of the rotation's way until it is this slot's turn */
}
.corner-bug-stage .corner-bug-media.is-showing {
  display: block;                  /* the sponsor currently on air */
}`;
}
