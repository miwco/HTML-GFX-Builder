// ls04 "Host & Guest" — two people, DELIBERATELY UNEQUAL.
//
// The talk-show strap is not a symmetric interview strap with different words in it. The
// guest is the story and the host is the furniture: audiences already know who is presenting,
// so the graphic that gives both names the same weight spends its hierarchy on the one
// person who doesn't need it. Every panel show does the same thing — the visitor's name is
// set large, the presenter's is a footnote beside it, and each carries a small chip saying
// which is which.
//
// So: column one is the guest at full size, column two the host at roughly half, dimmed, and
// the roles render as filled chips rather than as another line of type. The chips are real
// fields — an operator retitles them for a co-host, a stand-in, or a second guest.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { duoSplitLed, personColumn } from './shared';

export const ls04: TemplateVariant = defineVariant(
  {
    id: 'ls04',
    category: 'lower-third',
    name: 'Host & Guest',
    styleTag: 'glass',
    roleTag: 'talk',
    keywords: ['talk show', 'panel', 'podcast', 'presenter', 'visitor', 'interview', 'two people'],
    description: 'The guest set large beside a quieter host — unequal by design, with role chips.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Guest name', sample: 'Amara Osei' },
      { title: 'Guest role', sample: 'Guest' },
      { title: 'Host name', sample: 'Daniel Reyes' },
      { title: 'Host role', sample: 'Host' },
    ],
    logo: 'none',
    // Slide-up: the pair arrives as one card and the lines follow in document order —
    // guest first, host after. The stagger does the hierarchy a second time, in time.
    animationPresets: ['slide-up', 'blur-in', 'fade', 'pop-spring', 'mask-wipe', 'line-reveal'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Host & Guest',
    description:
      'The talk-show pairing: the guest set at full headline size, the host beside them at ' +
      'roughly half and dimmed, each with a small filled chip naming their part. All four ' +
      'values are independent SPX fields, so the chips retitle for a co-host or a second ' +
      'guest, and the columns size to their own names.',
    uicolor: '5',
  },
  (o) => {
    // The LED split, not the balanced one: dropping to two lines here means "just the
    // guest, with their chip" — never the guest's own role re-read as the host's name.
    const { left, right } = duoSplitLed(o);

    return {
      html: `    <!-- One frosted card, two unequal columns: the guest leads, the host supports. -->
    <div class="lower-third-box">
${personColumn(o, left, { column: 'lower-third-person lower-third-lead', name: 'lower-third-name', role: 'lower-third-title' })}
${personColumn(o, right, { column: 'lower-third-person lower-third-support', name: 'lower-third-extra', role: 'lower-third-support-role' })}
    </div>`,

      css: `/* The card. Content-sized columns so the two names never fight for a fixed half;
   the hierarchy is carried entirely by type size and colour, not by column width. */
.lower-third-box {
  display: grid;                    /* guest and host side by side… */
  grid-auto-flow: column;           /* …as columns, in document order */
  grid-auto-columns: auto;          /* each tracks its own name */
  align-items: end;                 /* both sit on the card's floor — the guest's extra
                                       height then reads as prominence, not as offset */
  column-gap: calc(30px * var(--scale));
  padding: calc(20px * var(--scale)) calc(32px * var(--scale)) calc(22px * var(--scale));
  background: var(--panel-bg);      /* the family's translucent white */
  backdrop-filter: var(--panel-blur);  /* the frost itself */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
}

.lower-third-person {
  display: flex;                    /* chip under name */
  flex-direction: column;           /* top to bottom */
  align-items: flex-start;          /* chips hug the left edge of their own column */
  min-width: 0;                     /* allow shrinking — long names wrap instead of overflowing */
}
.lower-third-lead {
  max-width: calc(470px * var(--scale));  /* the guest gets the room */
}
.lower-third-support {
  max-width: calc(320px * var(--scale));  /* the host gets less — deliberately */
  padding-left: calc(30px * var(--scale));  /* set off from the guest… */
  border-left: 1px solid rgba(255, 255, 255, 0.16);  /* …by a whisper of an edge */
}

/* The guest's name — the graphic's one headline. */
.lower-third-name {
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                 /* room for a wrapped surname */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The host's name — the same voice at roughly half, and dimmed. Two signals, not one:
   size alone reads as "further away", size plus dimming reads as "secondary". */
.lower-third-extra {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈ 0.57 of the guest */
  font-weight: 600;                 /* still a name — semibold keeps it from going limp */
  line-height: 1.2;                 /* a touch more air than the headline */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-dim);           /* dimmed — never pure white twice */
}

/* The role chips. Filled for the guest (the accent's one moment), outlined for the host —
   the same component at two volumes, which is how the pair states its own hierarchy. */
.lower-third-title,
.lower-third-support-role {
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* chip type is small by definition */
  font-weight: 700;                 /* bold — a chip has to hold its own at this size */
  line-height: 1;                   /* the chip's height comes from its padding */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* GUEST / HOST, whatever the operator types */
  padding: calc(5px * var(--scale)) calc(11px * var(--scale));
  border-radius: calc(999px * var(--scale));  /* fully rounded — a pill, not a box */
  margin-top: calc(10px * var(--scale));  /* clear of the name above it */
}
.lower-third-title {
  background: var(--accent);        /* the graphic's single filled accent surface */
  color: var(--accent-ink);         /* the family's ink for text ON accent */
}
.lower-third-support-role {
  color: var(--text-dim);           /* the quiet twin: no fill… */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);  /* …just an outline */
}`,
      // The accent lives in the guest's chip, not in a bar: this design's accent moment is a
      // filled surface behind text, which is not a node a timeline could usefully move.
      hasAccent: false,
    };
  },
);
