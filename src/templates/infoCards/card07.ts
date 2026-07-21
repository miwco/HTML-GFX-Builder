// card07 "Clean Title" — the MINIMAL title card, sibling of lt01 "Hairline" / lt02
// "Underline". No panel: a small tracked-caps kicker in the accent color, one large title,
// and a quiet subtitle, with a short accent underline drawn between the kicker and title —
// the lt02 underline motif at opener scale. Whitespace does the work.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineClass } from './shared';

export const card07: TemplateVariant = defineCardVariant(
  {
    id: 'card07',
    category: 'info-card',
    name: 'Clean Title',
    styleTag: 'minimal',
    description: 'A panel-free opener: a caps kicker over a large title and a quiet subtitle.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Title', sample: 'The Long Road Back' },
      { title: 'Kicker', sample: 'Episode 4' },
      { title: 'Subtitle', sample: 'A documentary in three parts' },
    ],
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-left',
  },
  {
    name: 'Clean Title',
    description:
      'The minimal show opener, sibling of lt01/lt02: no panel at all — a small tracked-caps ' +
      'kicker in the accent color, a short accent underline, then a large confident title and ' +
      'a dimmed subtitle. Best over calm, well-lit footage.',
    uicolor: '1',
  },
  (o) => {
    // Visual order is kicker (f1) → underline → title (f0) → subtitle (f2), so the masks are
    // emitted by hand; field ids stay f0/f1/f2 whatever the visual order.
    const mask = (i: number) =>
      `      <!-- ${o.lines[i].title} (f${i}) — SPX writes this field's value straight into the element. -->\n` +
      `      <div class="info-card-mask"><span id="f${i}" class="${cardLineClass(i)}">${o.lines[i].sample}</span></div>`;
    const kicker = o.lines.length > 1 ? mask(1) + '\n      <div class="info-card-accent"></div>\n' : '';
    const subtitle = o.lines.length > 2 ? '\n' + mask(2) : '';

    return {
      html: `    <!-- Clean Title: kicker, a short accent underline, the large title, a quiet subtitle. -->
    <div class="info-card-box">
${kicker}${mask(0)}${subtitle}
    </div>`,
      css: `/* The block — deliberately transparent: no panel, whitespace does the work. */
.info-card-box {
  display: flex;                    /* stack the pieces so the underline can slot between them */
  flex-direction: column;           /* kicker, underline, title, subtitle — top to bottom */
  align-items: flex-start;          /* everything hugs the same left edge */
}

/* The kicker (f1) — a small tracked-caps label in the accent color, announcing the show. */
.info-card-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale — clearly subordinate */
  font-weight: 600;                 /* semibold keeps small caps legible */
  line-height: 1.2;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;        /* reads as a label, whatever the operator types */
  color: var(--accent);             /* the kicker carries the one accent dose */
}

/* The accent underline — short on purpose (the lt02 motif); presets grow it in first. */
.info-card-accent {
  width: calc(72px * var(--scale));   /* a short stroke — never the full title width */
  height: var(--accent-weight);       /* the family's hairline weight */
  background: var(--accent);          /* the one accent color */
  margin: calc(16px * var(--scale)) 0;  /* air above and below the underline */
  will-change: transform;             /* hint the browser: line-reveal scales this */
}

/* The title (f0) — the large confident statement, the loudest thing on screen. */
.info-card-name {
  font-size: calc(72px * var(--scale) * var(--type-scale));  /* opener headline scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}

/* The subtitle (f2) — the quiet closing line. */
.info-card-extra {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* well below the title — clear hierarchy */
  font-weight: 400;                 /* regular — the title did the work */
  line-height: 1.3;                 /* room if the subtitle wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(18px * var(--scale));  /* clear break under the title */
}`,
      hasAccent: true,
    };
  },
);
