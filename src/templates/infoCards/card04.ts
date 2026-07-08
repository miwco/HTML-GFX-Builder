// card04 "Quote Card" — the info-card sibling of lt01 "Hairline" (minimal family). The same
// restraint taken literary: no panel at all, a pair of large accent quotation marks PAINTED
// on .info-card-box::before (a layer no preset ever tweens), the quote itself set large and light,
// then a short accent hairline and a quiet two-line attribution. Whitespace does all the work.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineClass } from './shared';

export const card04: TemplateVariant = defineCardVariant(
  {
    id: 'card04',
    category: 'info-card',
    name: 'Quote Card',
    styleTag: 'minimal',
    description: 'A panel-free centered quote: large accent quote marks, light italic text, a short hairline, quiet attribution.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Quote', sample: 'The measure of intelligence is the ability to change.' },
      { title: 'Name', sample: 'Albert Einstein' },
      { title: 'Role', sample: 'Theoretical physicist' },
    ],
    hasLogoSlot: false,
    animationPresets: ['blur-in', 'slide-fade', 'line-reveal', 'fade', 'drop-in', 'flip-3d'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Quote Card',
    description:
      'The minimal family at its most literary: no panel, just a centered quotation under a ' +
      'pair of large accent quote marks, closed by a short hairline and a quiet attribution. ' +
      'Sibling of the lt01 Hairline lower third. Best over calm, dark footage.',
    uicolor: '3',
  },
  (o) => {
    // The hairline sits BETWEEN the quote (f0) and the attribution lines (f1+), so the
    // standard .info-card-mask > #fN lines are emitted one by one instead of via cardLineMasks().
    const mask = (i: number) =>
      `      <!-- ${o.lines[i].title} (f${i}) — SPX writes this field's value straight into the element. -->\n` +
      `      <div class="info-card-mask"><span id="f${i}" class="${cardLineClass(i)}">${o.lines[i].sample}</span></div>`;
    const attribution = o.lines
      .slice(1)
      .map((_, idx) => mask(idx + 1))
      .join('\n');

    return {
      html: `    <!-- Quote Card: painted quote marks above, the quote, a short hairline, then the attribution. -->
    <div class="info-card-box">
${mask(0)}
      <!-- The hairline — a short accent rule separating the quote from its attribution. -->
      <div class="info-card-accent"></div>${attribution ? '\n' + attribution : ''}
    </div>`,

      css: `/* The block — deliberately transparent: no panel, everything centers on one axis.
   Padding at the top reserves space for the painted quote marks so the quote text
   can never rise into them, whatever length the operator types. */
.info-card-box {
  position: relative;              /* anchors the painted quote marks (::before) */
  text-align: center;              /* a quotation reads as a centered composition */
  padding-top: calc(104px * var(--scale));  /* reserved room for the quote marks above */
}

/* The quote marks — large typographic decoration painted on a pseudo-layer no preset
   ever tweens, so they simply ride along with every entrance and exit of the box. */
.info-card-box::before {
  content: '\\201C';                /* a single opening double quote — the classic mark */
  position: absolute;              /* pinned inside the box, above the text */
  top: 0;                          /* sits at the very top of the reserved space */
  left: 0;                         /* stretched across the box… */
  right: 0;                        /* …so text-align can center the glyph */
  font-family: Georgia, 'Times New Roman', serif;  /* a serif mark reads as literary decoration */
  font-size: calc(150px * var(--scale));  /* oversized — the glyph is the design's hero */
  line-height: 1;                  /* one clean em box; the ink sits in its upper half */
  color: var(--accent);            /* the one loud dose of accent color */
}

/* The quote (f0) — large, light and slanted: the voice of the card. */
.info-card-name {
  font-size: calc(48px * var(--scale));  /* large — the quote carries the composition */
  font-weight: 300;                /* light weight keeps the size elegant, not loud */
  font-style: italic;              /* slanted — spoken words, not a headline */
  line-height: 1.3;                /* wrapped quote rows get generous leading */
  letter-spacing: 0;               /* light text needs no tightening */
  color: var(--text-color);        /* primary text color */
}

/* The hairline — a short centered accent rule; presets draw it in via scaleX. */
.info-card-accent {
  display: block;                  /* its own row between quote and attribution */
  width: calc(64px * var(--scale));   /* short on purpose — a pause, not a divider */
  height: calc(2px * var(--scale));   /* minimal-family hairline weight */
  margin: calc(30px * var(--scale)) auto 0;  /* clear break below the quote; auto centers it */
  background: var(--accent);       /* a second small dose of the same accent */
  will-change: transform;          /* hint the browser: presets animate this line */
}

/* The name (f1) — small and firm: the quote's anchor. */
.info-card-title {
  font-size: calc(26px * var(--scale));  /* well below the quote — clear hierarchy */
  font-weight: 700;                /* bold at small size reads confident, not heavy */
  line-height: 1.2;                /* a single tight line */
  letter-spacing: 0.01em;          /* a touch of air at bold small sizes */
  color: var(--text-color);        /* full strength — the name matters */
  margin-top: calc(24px * var(--scale));  /* breathing room below the hairline */
}

/* The role (f2) — quiet tracked caps, dimmed: the softest voice on the card. */
.info-card-extra {
  font-size: calc(17px * var(--scale));  /* small caps line under the name */
  font-weight: 600;                /* semibold keeps tiny caps legible */
  line-height: 1.2;                /* a single tight line */
  text-transform: uppercase;       /* caps — a label, not a sentence */
  letter-spacing: 0.16em;          /* small caps breathe (tracking-wide, family voice) */
  white-space: nowrap;             /* short caps labels never wrap mid-word */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(8px * var(--scale));  /* name + role read as one attribution unit */
}`,
      hasAccent: true,
    };
  },
);
