// ss03 "Frost Hold" — glass style, sibling of lt08 (Frosted Card) and lt09 (Gradient Pill).
// One centered frosted card holds the whole wait: title caps on top, the show name as the
// headline, and the countdown sitting inside a soft glass capsule (lt09's pill shape) that
// breathes with the hold-loop. Calm, luminous, late-night.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss03: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss03',
    category: 'starting-soon',
    name: 'Frost Hold',
    styleTag: 'glass',
    description: 'A centered frosted card with the countdown breathing inside a soft glass pill.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'STARTING SOON' },
      { title: 'Show name', sample: 'Midnight Sessions' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Hold',
    description:
      'The glass holding screen: one centered frosted card (lt08’s blur-and-keyline glass) ' +
      'with the title caps, the show name, and the countdown resting in a soft capsule that ' +
      'breathes gently — lt09’s pill, slowed down for the wait. Calm and late-night.',
    uicolor: '2',
  },
  (o) => ({
    // Card = kicker mask + headline mask + the clock capsule. The capsule carries
    // starting-soon-pulse, so the hold-loop preset breathes it while the clock ticks inside.
    html: `    <!-- Frost Hold: one frosted card — title caps, show name, clock in a glass pill. -->
    <div class="starting-soon-box">
      <!-- Title caps — the small accent kicker (mask-wrapped for reveals). -->
      <div class="starting-soon-mask"><span id="f0" class="starting-soon-title">${o.lines[0]?.sample || 'STARTING SOON'}</span></div>
      <!-- Show name — the headline (mask-wrapped like the title). -->
      <div class="starting-soon-mask"><span id="f1" class="starting-soon-show">${o.lines[1]?.sample || 'Midnight Sessions'}</span></div>
      <!-- The clock capsule — starting-soon-pulse is the hold-loop's breath target. -->
      <div class="starting-soon-pill starting-soon-pulse">
        <span class="starting-soon-clock">5:00</span>
      </div>
    </div>`,

    css: `/* The frosted card — lt08's glass card grown into a full holding screen. */
.starting-soon-box {
  padding: calc(48px * var(--scale)) calc(76px * var(--scale));  /* front-door air, not strap padding */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* Stack rhythm: a small breath between the kicker and the headline. */
.starting-soon-mask + .starting-soon-mask {
  margin-top: calc(14px * var(--scale));  /* kicker and name still read as one unit */
}

/* Title caps — the quiet accent kicker above the headline. */
.starting-soon-title {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* label scale — announces, never competes */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.2;                /* compact single-line label */
  letter-spacing: var(--label-tracking);  /* the title's authored tracking */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);        /* the family's label color */
}

/* Show name — the headline the audience is waiting for. */
.starting-soon-show {
  font-size: calc(66px * var(--scale) * var(--type-scale));  /* holding screens carry lower-third headline size and more */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight leading — big text needs less */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The clock capsule — lt09's glass pill, slowed down for the wait (the breath target). */
.starting-soon-pill {
  display: inline-flex;            /* hug the clock; centered by the card's text-align */
  align-items: center;             /* the time sits on the capsule's centerline */
  margin-top: calc(32px * var(--scale));  /* clear air — the clock is its own moment */
  padding: calc(14px * var(--scale)) calc(46px * var(--scale));  /* generous capsule padding */
  border-radius: 999px;            /* full pill — a cap, not a size, so it is not scaled */
  background: var(--panel-bg);     /* a second layer of the same glass reads slightly denser */
  box-shadow: var(--panel-keyline);  /* the family keyline, again */
  position: relative;              /* anchors the ::after accent ring to the capsule */
  will-change: transform;          /* hint the browser: the hold-loop breathes its scale */
}

/* Accent ring — a softened halo drawn by a pseudo-element, so the border stays pure
   var(--accent) (the Style panel retints it) and opacity does the late-night softening. */
.starting-soon-pill::after {
  content: '';                     /* pseudo-elements need content to render */
  position: absolute;              /* pinned over the capsule, out of the flex flow */
  inset: 0;                        /* cover the whole pill */
  border: calc(2px * var(--scale)) solid var(--accent);  /* the accent-tinted edge */
  border-radius: inherit;          /* follow the capsule's full rounding */
  opacity: 0.4;                    /* a glow at rest — .starting-soon-done brings it to full */
  pointer-events: none;            /* purely decorative overlay */
}

/* The countdown — painted by the clock runtime every second. */
.starting-soon-clock {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* clearly the second-biggest thing on the card */
  font-weight: 600;                /* solid digits without going heavy */
  line-height: 1;                  /* the capsule's padding sets the height */
  letter-spacing: 0.04em;          /* digits get a little air */
  font-variant-numeric: tabular-nums;  /* every digit same width — no jiggle as seconds tick */
  color: var(--text-color);        /* primary text — the accent stays in its small doses */
}

/* Time's up — the clock runtime adds .starting-soon-done to the root at 0:00. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* the zero moment borrows the accent */
}
.starting-soon-done .starting-soon-pill::after {
  opacity: 1;                      /* the halo comes to full strength */
}`,
    tokens: { labelTracking: '0.18em' },
  }),
);
