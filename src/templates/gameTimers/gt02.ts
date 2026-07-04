// gt02 "Power Clock" — a corner slab game timer, sibling of lt05 (Angle Slab) and
// lt06 (Split Bar). Same sport DNA: a near-black slab painted at the family's -8°
// lean (radius 0), a chunky 10px accent edge leaning with it, condensed heavy caps.
// The lean is PAINTED, never animated: the slab lives on .gt-box::before and the
// edge on .gt-box::after — the timer-run preset tweens .gt-box itself (scale + fade),
// and because the pseudo-layers are never touched by any preset, the lean survives
// every entrance and exit (the lt05 technique). When the countdown hits zero the
// shared clock runtime adds .gt-done: the clock flips to the accent and the edge
// flashes — pure CSS keyframes, no extra JS.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineGameTimerVariant } from './shared';

export const gt02: TemplateVariant = defineGameTimerVariant(
  {
    id: 'gt02',
    category: 'game-timer',
    name: 'Power Clock',
    styleTag: 'sport',
    description: 'A corner slab clock with a leaning accent edge — flips to the accent and flashes at zero.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'SHOT CLOCK' }],
    hasLogoSlot: false,
    animationPresets: ['timer-run'],
    defaultPalette: paletteById('inferno'),
    defaultFontId: 'archivo',
    defaultZone: 'top-right',
  },
  {
    name: 'Power Clock',
    description:
      'A corner slab timer in the sport family (sibling of lt05/lt06): a dimmed caps ' +
      'label over a big heavy clock on a dark slab painted at the family -8° lean, with ' +
      'a chunky accent edge fused to the leaning left side — slab and edge both live on ' +
      'pseudo-layers. At zero the clock flips to the accent and the edge flashes.',
    uicolor: '6',
  },
  (o) => ({
    // Structure contract: .gt-box > .gt-mask > #f0 (the label) + .gt-clock (JS paints M:SS).
    html: `    <!-- Power Clock: dimmed caps label over the big clock, on one leaning dark slab. -->
    <div class="gt-box">
      <!-- The label line — the span sits inside the mask so it can be revealed. -->
      <div class="gt-mask"><span id="f0" class="gt-label">${o.lines[0]?.sample || 'SHOT CLOCK'}</span></div>
      <!-- The clock — the countdown runtime repaints this every second as M:SS. -->
      <div class="gt-clock">3:00</div>
    </div>`,
    css: `/* The box: the preset tweens THIS element (scale + fade), so it carries no lean of
   its own — the family skew lives on the pseudo-layers below. */
.gt-box {
  position: relative;              /* anchors the painted slab (::before) and edge (::after) */
  padding: calc(18px * var(--scale)) calc(34px * var(--scale));  /* tight vertical, wide horizontal */
}

/* The painted slab: the sport lean lives HERE, on a background layer no preset ever
   tweens — the scale tween on .gt-box moves it along, but can never flatten the skew. */
.gt-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the box exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* paints behind the label and the clock */
  background: var(--panel-bg);     /* near-black slab — never pure #000 */
  border-radius: 0;                /* hard corners — sport shape language */
  transform: skewX(-8deg);         /* SKEW: the whole slab leans forward, mid-sprint */
}

/* The accent edge: a chunky 10px slab fused to the painted slab's left side. It leans
   the same -8° from the same spot, so slab and edge displace together and stay fused. */
.gt-box::after {
  content: '';                     /* second pseudo-layer — the color moment */
  position: absolute;              /* pinned over the slab's left edge ... */
  left: 0;                         /* ... flush with the box's left side */
  top: 0;                          /* full height, top ... */
  bottom: 0;                       /* ... to bottom */
  width: calc(10px * var(--scale));  /* chunky 10px slab, not a hairline */
  background: var(--accent);       /* the one loud color moment */
  transform: skewX(-8deg);         /* SKEW: matches the slab, so the two fuse seamlessly */
}

/* The label: dimmed spaced-out caps (lt05's secondary treatment) — the leaning edge
   stays the single accent dose while the clock runs. */
.gt-label {
  color: var(--text-dim);          /* secondary line dims — one accent dose per graphic */
  font-size: calc(19px * var(--scale));  /* kicker scale — clearly a label, not a headline */
  font-weight: 700;                /* bold so the small caps carry */
  letter-spacing: 0.1em;           /* spaced-out caps read as a tag */
  text-transform: uppercase;       /* sport graphics shout, whatever the operator types */
}

/* The clock: the loudest thing on screen — big, heavy, dead straight. */
.gt-clock {
  margin-top: calc(10px * var(--scale));  /* small gap: chip + clock read as one unit */
  font-size: calc(76px * var(--scale));  /* headline scale — readable from the back row */
  font-weight: 900;                /* maximum impact weight (sport hits hard) */
  line-height: 1.05;               /* tight — big digits need little leading */
  letter-spacing: 0.02em;          /* a touch of air between the heavy digits */
  color: var(--text-color);        /* primary text while the clock runs */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jiggle each tick */
}

/* ── Time's up: the clock runtime adds .gt-done on the root at zero. ── */

/* The clock flips to the accent — the whole slab suddenly reads "ZERO". */
.gt-done .gt-clock {
  color: var(--accent);            /* the accent takes over the headline at zero */
}

/* The leaning edge flashes — opacity only, so the painted skew is never disturbed. */
.gt-done .gt-box::after {
  animation: gt-flash 0.4s ease-in-out 6;  /* six quick blinks, then steady */
}
@keyframes gt-flash {
  50% { opacity: 0.15; }           /* dip to near-off mid-blink; ends back at full */
}`,
  }),
);
