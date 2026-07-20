// card09 "Frost Title" — the GLASS title card, sibling of lt08 "Frosted Card" / card03
// "Frosted Panel". One translucent blurred panel holding a soft accent kicker, a large
// title, and a quiet subtitle. The glass family's soft pop is its default entrance.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineClass } from './shared';

export const card09: TemplateVariant = defineCardVariant(
  {
    id: 'card09',
    category: 'info-card',
    name: 'Frost Title',
    styleTag: 'glass',
    description: 'A frosted panel opener: a soft accent kicker over a large title and a subtitle.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Title', sample: 'Midnight Sessions' },
      { title: 'Kicker', sample: 'Tonight' },
      { title: 'Subtitle', sample: 'Live music until late' },
    ],
    logo: 'optional',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Title',
    description:
      'The glass show opener, sibling of lt08 Frosted Card and card03 Frosted Panel: one ' +
      'translucent blurred panel holding a soft accent kicker above a large title and a ' +
      'quiet subtitle. Pops in softly on the glass family back.out.',
    uicolor: '3',
  },
  (o) => {
    // Visual order kicker (f1) → title (f0) → subtitle (f2); field ids stay f0/f1/f2. The
    // optional logo slot is injected by the assembler above the block when the toggle is on.
    const mask = (i: number) =>
      `      <!-- ${o.lines[i].title} (f${i}) — SPX writes this field's value straight into the element. -->\n` +
      `      <div class="info-card-mask"><span id="f${i}" class="${cardLineClass(i)}">${o.lines[i].sample}</span></div>`;
    const kicker = o.lines.length > 1 ? mask(1) + '\n' : '';
    const subtitle = o.lines.length > 2 ? '\n' + mask(2) : '';

    return {
      html: `    <!-- Frost Title: one frosted panel — soft kicker, large title, quiet subtitle. -->
    <div class="info-card-box">
${kicker}${mask(0)}${subtitle}
    </div>`,
      css: `/* The frosted panel — translucent card, heavy backdrop blur, one soft lifting shadow. */
.info-card-box {
  text-align: center;              /* the opener centers under its mid anchor */
  padding: calc(34px * var(--scale)) calc(56px * var(--scale));  /* generous opener air */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the panel's authored radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The kicker (f1) — a soft tracked-caps label in the accent color, announcing the show. */
.info-card-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale — clearly subordinate */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.2;                /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* glass carries the accent in the label */
  margin-bottom: calc(18px * var(--scale));  /* clear air before the title lands */
}

/* The title (f0) — the large statement, the loudest thing on the panel. */
.info-card-name {
  font-size: calc(64px * var(--scale) * var(--type-scale));  /* opener headline scale */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.05;               /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);        /* primary text color */
}

/* The subtitle (f2) — the quiet closing line. */
.info-card-extra {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* well below the title — clear hierarchy */
  font-weight: 400;                /* regular — the title did the work */
  line-height: 1.3;                /* room if the subtitle wraps */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(18px * var(--scale));  /* clear break under the title */
}`,
      hasAccent: false, // the accent moment is the kicker color, not a drawn element
    };
  },
);
