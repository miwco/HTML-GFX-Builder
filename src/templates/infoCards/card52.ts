// card52 "Quotation" — the pull-quote card: something a speaker just said, held on screen
// while it lands. Minimal family, sibling of card01 and lt02 (Underline).
//
// A quote card lives or dies on the attribution being subordinate. The quote is the content;
// the name is the receipt. So the quote is set at reading size with a real measure, and the
// name and role sit under a short rule at label scale — close enough to be read as belonging
// to the words, small enough never to be mistaken for them.
//
// The oversized opening quote mark is a pseudo-element, so it is never a text node the
// operator can type into, and it never lands in a data field.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card52: TemplateVariant = defineCardVariant(
  {
    id: 'card52',
    category: 'info-card',
    name: 'Quotation',
    styleTag: 'minimal',
    description: 'A pull quote with a subordinate attribution — the quote reads, the name receipts.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Quote', sample: 'We built the whole thing in a week, and then spent a year making it simple.' },
      { title: 'Name', sample: 'Ada Fenwick' },
      { title: 'Role', sample: 'Head of Broadcast Design' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'fade', 'slide-up', 'blur-in', 'mask-wipe'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Quotation',
    description:
      'A pull-quote card: an oversized accent quote mark, the words at reading size and ' +
      'measure, then a short rule with the speaker’s name and role beneath it at label ' +
      'scale. The attribution never competes with what was said.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Quotation: an accent quote mark, the words, then a rule and the attribution. -->
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `/* The text block — no panel; the quote mark and the rule are the only furniture. */
.info-card-box {
  position: relative;              /* anchors the oversized quote mark to the block */
  padding-top: calc(46px * var(--scale));  /* room above the words for the quote mark */
  text-align: center;              /* a pull quote is centered */
}

/* The opening quote mark — decoration, so it is drawn by a pseudo-element and never sits in
   a data field where an operator could type over it. */
.info-card-box::before {
  content: '\\201C';                /* a real left double quotation mark, not a straight " */
  position: absolute;              /* pinned above the words, out of the text flow */
  top: 0;                          /* at the top of the block… */
  left: 50%;                       /* …centered over the quote */
  transform: translateX(-50%);     /* true centering on its own width */
  font-size: calc(96px * var(--scale) * var(--type-scale));  /* set large; the glyph itself
                                      draws far smaller than its em, which is the point — it
                                      reads as a mark opening the quote, not as punctuation */
  line-height: 0.8;                /* the glyph's own body is mostly empty space */
  color: var(--accent);            /* the one dose of accent color on the card */
  opacity: 0.85;                   /* softened, so it frames the words instead of shouting */
}

/* THE QUOTE. Reading size and prose leading — this is a sentence, not a headline. */
.info-card-name {
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* reading size for a spoken sentence */
  font-weight: 400;                /* regular: the words carry themselves */
  line-height: 1.4;                /* prose leading — a quote almost always wraps */
  letter-spacing: 0;               /* no tracking games on running text */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* THE NAME. Under a short rule, at label scale — the receipt, not the content. */
.info-card-title {
  display: block;                  /* its own row */
  margin-top: calc(34px * var(--scale));  /* a clear break between the words and the source */
  padding-top: calc(26px * var(--scale));  /* air below the rule drawn on this element */
  border-top: var(--accent-weight) solid var(--accent);  /* the short rule (width capped below) */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ~1.75:1 under the quote */
  font-weight: 600;                /* the name is the firmer half of the attribution */
  line-height: 1.25;               /* one row in almost every case */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* attribution voice, whatever the operator types */
  color: var(--text-color);        /* primary text color — the name is still a person */
  /* The rule is drawn as this element's top border, so it has to be as short as the mark
     it is: a full-width line under a centered quote reads as a divider, not an attribution. */
  width: calc(240px * var(--scale));  /* the rule's length */
  margin-left: auto;               /* centered under the quote… */
  margin-right: auto;              /* …on both sides */
}

/* THE ROLE. The quietest line on the card. */
.info-card-extra {
  display: block;                  /* its own row */
  margin-top: calc(8px * var(--scale));  /* name and role read as one unit */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* below the name, above nothing */
  font-weight: 400;                /* conversational weight */
  line-height: 1.3;                /* a long job title may wrap */
  color: var(--text-dim);          /* secondary text color */
}`,
    hasAccent: false,
    tokens: {
      accentWeight: 'calc(2px * var(--scale))',
      labelTracking: '0.14em',
    },
  }),
);
