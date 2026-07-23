// lt39 "Block Caps" — the BOLD family's name-only strap: a solid accent block, then one name in
// heavy condensed caps on a hard-edged slab. Zero radius, one hard offset shadow, nothing else.
// It is the compact end of the sport family and the counterpart of lt19 and lt31: the same "just
// the name" job, answered at the loudest volume the pack has.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt39: TemplateVariant = defineVariant(
  {
    id: 'lt39',
    category: 'lower-third',
    name: 'Block Caps',
    styleTag: 'sport',
    description: 'One name in heavy caps on a hard slab, led by a solid accent block.',
    maxLines: 1,
    suggestedLines: [{ title: 'Name', sample: 'JAKE MORRISON' }],
    logo: 'none',
    animationPresets: ['snap-stinger', 'mask-wipe', 'slide-right', 'pop-spring', 'fade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Block Caps',
    description:
      'The fastest name in the pack: a solid accent block bolted to a dark slab carrying one line ' +
      'of heavy condensed caps. For substitutions, goal scorers, fight-card names and anywhere a ' +
      'role line would only slow the read down. Sibling of lt05 Angle Slab.',
    uicolor: '7',
  },
  (o) => ({
    html: `    <!-- Block Caps: [solid accent block] | [one name in heavy caps] — one hard-edged slab. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
${lineMasks(o, '      ')}
    </div>`,
    css: `/* The slab — block and name fused into one unit, zero radius on purpose. */
.lower-third-box {
  display: flex;                   /* block and name sit side by side */
  align-items: stretch;            /* the block runs the slab's full height */
  background: var(--panel-bg);     /* dark panel behind the name */
  box-shadow: var(--panel-shadow);  /* the family's hard offset lift */
}

/* The accent block — the sport family's deliberate bold-accent exception. */
.lower-third-accent {
  flex: none;                      /* fixed width; a long name never squeezes it */
  width: calc(28px * var(--scale));  /* a block, not a bar — this is the loudest accent in the pack */
  background: var(--accent);       /* the accent used boldly, sport-style */
  will-change: transform;          /* hint the browser: presets animate this block */
}

/* The name — condensed heavy caps; size does the shouting. The slab's interior padding
   lives on the LINE, not on its mask: a padded mask would let the line show inside that
   padding while it slides up from behind the mask edge. */
.lower-third-name {
  padding: calc(14px * var(--scale)) calc(38px * var(--scale)) calc(16px * var(--scale)) calc(28px * var(--scale));
  font-size: calc(58px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.02;               /* big display text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the matchday voice */
  color: var(--text-color);        /* primary text */
}`,
    hasAccent: true,
  }),
);
