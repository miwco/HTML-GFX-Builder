// card57 "Order of Service" — the item card for a service or ceremony: the hymn, the reading,
// the address, the piece of music, and who is leading it. Minimal family, sibling of card07
// (Clean Title) and lt02 (Underline).
//
// It is a topic card with an order number, and the number is the point. A congregation
// following a printed order needs to know where the service has got to, so the reference sits
// in an accent chip to the LEFT of the title rather than above it — the same place the number
// sits on the printed page, and out of the way of the title's own wrapping.
//
// Anchored low: this card runs under a wide shot of the room while something is happening,
// not instead of it.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card57: TemplateVariant = defineCardVariant(
  {
    id: 'card57',
    category: 'info-card',
    name: 'Order of Service',
    styleTag: 'minimal',
    description: 'The order number in an accent chip, the item beside it, and who is leading beneath.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Reference', sample: 'HYMN 342' },
      { title: 'Item', sample: 'Guide Me, O Thou Great Redeemer' },
      { title: 'Led by', sample: 'The choir, led by Maria Santos' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'fade', 'mask-wipe', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Order of Service',
    description:
      'A service item card: the reference (“HYMN 342”, “READING”, “THE ADDRESS”) in a small ' +
      'accent chip beside the item title, with the person leading it underneath. Sits low in ' +
      'frame so the room stays in shot.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Order of Service: an accent chip reference beside the item, leader beneath. -->
    <div class="info-card-box">
${cardLineMasks(o)}
    </div>`,
    css: `/* The card — a grid, so the chip holds its own column and the title wraps inside its
   own. A floated or inline chip would let a long title wrap underneath it, which is exactly
   the layout a printed order of service does not have.
   NOTE: the grid ITEMS are the .info-card-mask wrappers (the reveal masks the assembler puts
   around every line), not the spans inside them — so the placement rules below target the
   masks and the type rules target the spans. */
.info-card-box {
  display: grid;                   /* two columns: the chip, then everything else */
  grid-template-columns: auto 1fr; /* the chip takes its own width; the text takes the rest */
  column-gap: calc(22px * var(--scale));  /* the gutter between the chip and the title */
  align-items: start;              /* the chip aligns to the title's first row, not its middle */
  padding: calc(22px * var(--scale)) calc(28px * var(--scale));  /* comfortable card padding */
  box-shadow: var(--panel-keyline); /* the minimal family's 1px keyline, no fill behind it */
}

/* The reference's mask — column one, standing beside both text rows. */
.info-card-mask:nth-child(1) {
  grid-row: span 2;                /* the chip stands beside both the title and the leader */
  align-self: start;               /* pinned to the top of the block, not floated in it */
}

/* The leader's mask — column two, under the title rather than under the chip. */
.info-card-mask:nth-child(3) {
  grid-column: 2;                  /* stays in the text column, aligned with the title above */
}

/* THE REFERENCE. A small accent chip — the order number, where the printed page puts it. */
.info-card-name {
  display: inline-block;           /* the chip hugs its own text inside the mask */
  padding: calc(7px * var(--scale)) calc(14px * var(--scale));  /* a tight chip */
  background: var(--accent);       /* the one accent dose, used as a shape */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* the smallest type on the card */
  font-weight: 700;                /* bold caps on a solid chip */
  line-height: 1.2;                /* one tight row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reference voice, whatever the operator types */
  color: var(--accent-ink);        /* the dark-on-accent ink token */
  /* The grid gives this column its max-content width, so a short reference like "HYMN 342"
     already stays on one row without asking for it. The cap is what stops an operator's long
     value (a whole first line pasted in) from pushing the title column off the card: past it
     the chip wraps, which is ugly but bounded. A nowrap rule here would not be bounded. */
  max-width: calc(300px * var(--scale));  /* the chip's own wrap point */
}

/* THE ITEM. The title of whatever is happening — the card's main line. */
.info-card-title {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* card heading size */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* a hymn title often runs to two rows */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* WHO IS LEADING IT. Under the title, in its own column — never under the chip. */
.info-card-extra {
  display: block;                  /* its own row inside the mask */
  margin-top: calc(9px * var(--scale));  /* title and leader read as one unit */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* ~1.8:1 under the item */
  font-weight: 400;                /* conversational weight */
  line-height: 1.35;               /* a name and a role may wrap */
  color: var(--text-dim);          /* secondary text color */
}`,
    hasAccent: false,
    tokens: {
      labelTracking: '0.14em',
      displayWeight: '600',
    },
  }),
);
