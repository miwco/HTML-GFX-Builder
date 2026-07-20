// card02 "Slab Card" - the info-card sibling of lt05 "Angle Slab" (sport family).
// Same trick, same reason: the forward lean is PAINTED on .info-card-box::before, never on
// .info-card-box itself. Presets tween .info-card-box (snap-stinger even writes skewX to it), and
// because no preset ever touches the pseudo-layer, the -8deg lean survives every entrance
// and exit. The text sits in the unskewed box and reads dead straight. The chunky accent
// slab lives INSIDE the box, leaning the same -8deg to fuse with the painted left edge.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card02: TemplateVariant = defineCardVariant(
  {
    id: 'card02',
    category: 'info-card',
    name: 'Slab Card',
    styleTag: 'sport',
    description: 'A forward-leaning stat slab with a chunky accent edge - lt05 Angle Slab, card-sized.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Heading', sample: 'MATCH STATS' },
      { title: 'Line 1', sample: 'SHOTS ON TARGET · 9' },
      { title: 'Line 2', sample: 'POSSESSION · 61%' },
    ],
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-left',
  },
  {
    name: 'Slab Card',
    description:
      'A dark card painted at the same forward lean as the Angle Slab lower third, with the ' +
      'text container kept straight so every stat line reads clean. A chunky accent slab fuses ' +
      'with the leaning left edge. Built for match stats and score readouts.',
    uicolor: '5',
  },
  (o) => ({
    // Structure: one box holding the accent edge and the masked text lines. The accent is
    // INSIDE the box so it slides with snap-stinger and is clipped by mask-wipe's clip-path.
    html: `    <!-- Slab Card: one leaning panel with its accent edge inside. Text lines sit in reveal masks. -->
    <div class="info-card-box">
      <!-- The accent edge - rides inside the box so every preset moves it with the slab. -->
      <div class="info-card-accent"></div>
${cardLineMasks(o)}
    </div>`,
    css: `/* The box: presets animate THIS element, so it carries no lean of its own. */
.info-card-box {
  position: relative;              /* anchors the painted slab (::before) and the accent edge */
  padding: calc(20px * var(--scale)) calc(40px * var(--scale));  /* roomy card padding */
}

/* The painted slab: the sport lean lives HERE, on a background layer no preset ever tweens.
   snap-stinger animates .info-card-box skewX -10 -> 0; keeping the design lean on this pseudo-layer
   means that inline skewX(0) can never flatten the slab. */
.info-card-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the box exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* paints behind the text and the accent */
  background: var(--panel-bg);     /* near-black slab behind the text */
  border-radius: var(--panel-radius);  /* the family's panel corner radius */
  transform: skewX(-8deg);         /* SKEW: the whole slab leans forward, same as lt05 */
}

/* The accent: a chunky vertical slab fused to the painted slab's left edge. */
.info-card-accent {
  position: absolute;              /* pinned over the slab's left edge ... */
  left: 0;                         /* ... flush with the box's left side */
  top: 0;                          /* full height, top ... */
  bottom: 0;                       /* ... to bottom */
  width: var(--accent-weight);     /* the family's accent edge weight */
  background: var(--accent);       /* the loud color moment on the edge */
  transform: skewX(-8deg);         /* transforms on ::before don't reach siblings, so the
                                      accent leans itself to fuse with the painted slab */
}

/* Line 1 - the card heading. Big, heavy, all caps. */
.info-card-name {
  font-size: calc(48px * var(--scale) * var(--type-scale));  /* headline scale for a card */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight - big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* headings are shouted, not spoken */
  color: var(--text-color);        /* primary text */
}

/* Lines 2 and 3 - the stat readouts, set in the accent color like a scoreboard. */
.info-card-title,
.info-card-extra {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* clearly secondary to the heading */
  font-weight: 500;                /* medium - legible without competing */
  line-height: 1.25;               /* normal leading for the small lines */
  text-transform: uppercase;       /* stats match the heading's caps voice */
  color: var(--accent);            /* stat lines glow in the accent - bold sport dose */
  font-variant-numeric: tabular-nums;  /* digits share one width - stats align as they tick */
}

/* Gaps: a clear break after the heading, then the stats stack tightly as one block. */
.info-card-title {
  margin-top: calc(12px * var(--scale));  /* heading and stats read as separate units */
}
.info-card-extra {
  margin-top: calc(4px * var(--scale));   /* stat lines read as one list */
}`,
    hasAccent: true,
  }),
);
