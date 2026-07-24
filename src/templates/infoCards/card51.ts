// card51 "Lyric Line" — the song card: the line being sung now, with the line that comes next
// underneath it. Glass family, sibling of card03 (Frosted Panel) and lt08.
//
// Why two lines and not four: a congregation, a choir or a crowd needs to arrive at the next
// line before they have to sing it, and no more than that. Four lines makes the operator's job
// impossible (which one are we on?) and the singer's job harder (which one am I on?). Two
// lines — now, and next — is the format that has survived in every worship and karaoke system
// that people actually sing along to.
//
// It is anchored at the BOTTOM so the picture above it stays clear, and the "next" line is
// dimmed rather than smaller: it has to be legible enough to read ahead from.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card51: TemplateVariant = defineCardVariant(
  {
    id: 'card51',
    category: 'info-card',
    name: 'Lyric Line',
    styleTag: 'glass',
    description: 'The line being sung now, with the next line dimmed beneath it — the two-line singalong format.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Now', sample: 'Amazing grace, how sweet the sound' },
      { title: 'Next', sample: 'That saved a wretch like me' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'slide-up', 'blur-in', 'line-reveal'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Lyric Line',
    description:
      'A frosted two-line song card anchored low in frame: the current line bright and large, ' +
      'the next line dimmed but fully legible so singers can read ahead. Advance it by ' +
      'updating the two fields — one take per pair of lines.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Lyric Line: a frosted panel holding the current line and the next one. -->
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `/* The panel — the glass family's frosted card, wide and shallow: a lyric is a band of
   text across the bottom of the picture, never a block in the middle of it. */
.info-card-box {
  padding: calc(28px * var(--scale)) calc(52px * var(--scale));  /* comfortable band padding */
  text-align: center;              /* lyrics are centered — the line length changes every line */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* THE LINE BEING SUNG. Bright, large, and set in a real singing size — this has to be
   readable from the back of a room, on a phone, and on a stream, all at once. */
.info-card-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the size people sing from */
  font-weight: 600;                /* solid without shouting */
  line-height: 1.25;               /* a long line may wrap; keep the two rows readable */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* the brightest thing on the card */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* THE NEXT LINE. Dimmed, NOT shrunk. Making it smaller is the common mistake: the whole job
   of this row is to be read ahead of time, and small type cannot be read ahead of time. */
.info-card-title {
  display: block;                  /* its own row under the current line */
  margin-top: calc(12px * var(--scale));  /* close enough to read as the same verse */
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* only a step down — still singable */
  font-weight: 500;                /* a shade lighter than the live line */
  line-height: 1.25;               /* shares the card's rhythm */
  letter-spacing: var(--display-tracking);  /* matches the line above */
  color: var(--text-dim);          /* the dimming is what marks it as "not yet" */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* Any further line the operator adds — a section marker ("Chorus"), a translation credit. */
.info-card-extra {
  display: block;                  /* its own row */
  margin-top: calc(14px * var(--scale));  /* clear of the sung lines */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* clearly not something to sing */
  font-weight: 600;                /* firm enough for small caps to carry */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a marker, not as a lyric */
  color: var(--label-color);       /* the family's label color */
}`,
    hasAccent: false,
    tokens: { labelTracking: '0.18em' },
  }),
);
