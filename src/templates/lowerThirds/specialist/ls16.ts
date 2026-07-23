// ls16 "Service Speaker" — the worship strap for a ceremony rather than a sermon.
//
// Weddings, funerals, graduations and dedications are livestreamed by the same teams and the
// same kit as Sunday services, but they are not the same graphic: a ceremony has a PROGRAMME,
// so the useful fact is which part of it is happening — "Homily", "Eulogy", "Exchange of
// Vows" — and the person delivering it is named against that. A sermon strap (ls14) has no
// such slot, because a service has one sermon.
//
// Glass rather than light paper: over a warm, wide, softly lit ceremony picture a solid panel
// reads as an intrusion, while a frosted one belongs to the room. Same restraint as ls14 —
// the entrance is a blur, never a snap.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { slot } from './shared';

export const ls16: TemplateVariant = defineVariant(
  {
    id: 'ls16',
    category: 'lower-third',
    name: 'Service Speaker',
    styleTag: 'glass',
    roleTag: 'faith',
    keywords: ['church', 'ceremony', 'wedding', 'funeral', 'memorial', 'graduation', 'programme', 'order of service', 'faith'],
    description: 'The moment in the order of service, with the person delivering it named beneath.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Moment', sample: 'Homily' },
      { title: 'Name', sample: 'Rev. Miriam Adeyemi' },
      { title: 'Role', sample: 'Officiant · Grace Community Church' },
    ],
    logo: 'none',
    // Blur-in: it materialises rather than arrives. On a ceremony picture that is the whole
    // difference between a graphic that belongs and one that interrupts.
    animationPresets: ['blur-in', 'fade', 'slide-up', 'line-reveal', 'pop-spring', 'slide-down'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Service Speaker',
    description:
      'The ceremony strap: the moment in the order of service set as a small accent label ' +
      'above the name of whoever is delivering it, on a frosted panel that belongs to a warm, ' +
      'wide room rather than sitting on top of it. Built for weddings, memorials and ' +
      'graduations, where the programme — not the sermon — is what the graphic tracks.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- The card: a soft accent edge, then moment · name · role. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
      <div class="lower-third-text">
${slot(o, 0, 'lower-third-name', '        ')}
${slot(o, 1, 'lower-third-title', '        ')}
${slot(o, 2, 'lower-third-extra', '        ')}
      </div>
    </div>`,

    css: `/* The card — the glass family's surface: blurred, softly cornered, lightly lifted. */
.lower-third-box {
  display: flex;                    /* the accent edge leads the text */
  align-items: stretch;             /* the edge runs the card's full height */
  background: var(--panel-bg);      /* the family's translucent white */
  backdrop-filter: var(--panel-blur);  /* the frost itself */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
  overflow: hidden;                 /* the accent edge follows the rounded corner */
  max-width: calc(700px * var(--scale));  /* a ceremony strap stays modest */
}

/* The soft accent edge leading the card — lt15's motif, and the graphic's accent node. */
.lower-third-accent {
  flex: none;                       /* never squeezed by long text */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  transform-origin: center;         /* line-reveal scales it from the middle */
}

.lower-third-text {
  min-width: 0;                     /* let it shrink so long values wrap instead of overflowing */
  padding: calc(18px * var(--scale)) calc(34px * var(--scale)) calc(20px * var(--scale)) calc(26px * var(--scale));
}

/* The MOMENT (f0) leads — the part of the programme, as a small accent label. */
.lower-third-name {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* label size — the smallest voice */
  font-weight: 700;                 /* bold — small tracked caps need the weight */
  line-height: 1.2;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* HOMILY, whatever the operator types */
  color: var(--accent);             /* the label carries the colour */
}

/* The name (f1) — the card's headline. */
.lower-third-title {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.12;                /* room for an honorific and a wrapped surname */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
  margin-top: calc(7px * var(--scale));  /* tied to the label above it */
}

/* The role and church (f2) — the closing line. */
.lower-third-extra {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.3;                 /* room if the pairing wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(5px * var(--scale));  /* tied to the name above it */
}`,
    hasAccent: true,
  }),
);
