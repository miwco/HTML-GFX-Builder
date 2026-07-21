// card08 "Slab Title" — the SPORT title card, sibling of lt05 "Angle Slab" / card02 "Slab
// Card". The same sport DNA: a near-black slab painted at the family -8° lean (the lean
// lives on ::before so no preset flattens it), a chunky accent edge fused to the leaning
// left side, a small accent kicker above one huge heavy condensed title and a dimmed
// subtitle. Built to open a match or a segment.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineClass } from './shared';

export const card08: TemplateVariant = defineCardVariant(
  {
    id: 'card08',
    category: 'info-card',
    name: 'Slab Title',
    styleTag: 'sport',
    description: 'A leaning sport slab: an accent kicker over one huge condensed title and a subtitle.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Title', sample: 'GRAND FINAL' },
      { title: 'Kicker', sample: 'MATCHDAY 12' },
      { title: 'Subtitle', sample: 'KICK-OFF 20:00 · ARENA' },
    ],
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-left',
  },
  {
    name: 'Slab Title',
    description:
      'The sport show opener, sibling of lt05/card02: a near-black slab painted at the family ' +
      '-8° lean with a chunky accent edge fused to its leaning side, a small accent kicker ' +
      'over one huge heavy condensed title and a dimmed subtitle. The lean lives on a ' +
      'pseudo-layer, so the snap-stinger entrance never flattens it.',
    uicolor: '5',
  },
  (o) => {
    // Visual order kicker (f1) → title (f0) → subtitle (f2); field ids stay f0/f1/f2. The
    // accent edge rides INSIDE the box so snap-stinger moves it with the slab.
    const mask = (i: number) =>
      `      <!-- ${o.lines[i].title} (f${i}) — SPX writes this field's value straight into the element. -->\n` +
      `      <div class="info-card-mask"><span id="f${i}" class="${cardLineClass(i)}">${o.lines[i].sample}</span></div>`;
    const kicker = o.lines.length > 1 ? mask(1) + '\n' : '';
    const subtitle = o.lines.length > 2 ? '\n' + mask(2) : '';

    return {
      html: `    <!-- Slab Title: one leaning slab — accent kicker, huge title, subtitle; accent edge inside. -->
    <div class="info-card-box">
      <!-- The accent edge — rides inside the box so every preset moves it with the slab. -->
      <div class="info-card-accent"></div>
${kicker}${mask(0)}${subtitle}
    </div>`,
      css: `/* The box: presets animate THIS element, so it carries no lean of its own — the
   family skew lives on the pseudo-layer below. */
.info-card-box {
  position: relative;              /* anchors the painted slab (::before) and the accent edge */
  padding: calc(22px * var(--scale)) calc(44px * var(--scale));  /* roomy opener padding */
}

/* The painted slab: the sport lean lives HERE, on a background layer no preset ever tweens. */
.info-card-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the box exactly… */
  inset: 0;                        /* …edge to edge */
  z-index: -1;                     /* paints behind the text and the accent */
  background: var(--panel-bg);     /* near-black slab behind the text */
  border-radius: var(--panel-radius);  /* the family's panel corner radius (0) */
  transform: skewX(-8deg);         /* SKEW: the whole slab leans forward, same as lt05 */
}

/* The accent edge: a chunky vertical slab fused to the painted slab's left edge. */
.info-card-accent {
  position: absolute;              /* pinned over the slab's left edge… */
  left: 0;                         /* …flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's accent edge weight */
  background: var(--accent);       /* the loud color moment on the edge */
  transform: skewX(-8deg);         /* matches the slab so the two fuse seamlessly */
}

/* The kicker (f1) — a small tracked-caps label in the accent color above the title. */
.info-card-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label scale — clearly subordinate */
  font-weight: 700;                /* bold so the small caps carry */
  line-height: 1.2;                /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;       /* sport shouts, whatever the operator types */
  color: var(--accent);            /* the kicker carries the one accent dose */
  margin-bottom: calc(10px * var(--scale));  /* clear air before the title lands */
}

/* The title (f0) — the biggest type in the card: one huge heavy condensed statement. */
.info-card-name {
  font-size: calc(76px * var(--scale) * var(--type-scale));  /* opener headline scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.02;               /* huge text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the title is shouted */
  color: var(--text-color);        /* primary text */
}

/* The subtitle (f2) — a dimmed caps closing line. */
.info-card-extra {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* well below the title — clear hierarchy */
  font-weight: 500;                /* medium — legible without competing */
  line-height: 1.25;               /* normal leading for the small line */
  letter-spacing: var(--label-tracking);  /* matches the kicker's tracking */
  text-transform: uppercase;       /* matches the caps voice */
  color: var(--text-dim);          /* dimmed — one accent dose per card (the kicker) */
  margin-top: calc(12px * var(--scale));  /* clear break under the title */
}`,
      hasAccent: true,
    };
  },
);
