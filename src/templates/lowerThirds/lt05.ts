// lt05 "Angle Slab" - a sport lower third built from one forward-leaning slab.
// The teachable moment: the lean is PAINTED, not animated. The slab background lives on
// .lower-third-box::before with transform: skewX(-8deg); presets tween .lower-third-box itself (snap-stinger
// even tweens its skewX to 0), and because the pseudo-layer is never touched by any preset,
// the lean survives every entrance and exit. The text needs no counter-skew - it sits in the
// unskewed .lower-third-box and reads dead straight. The accent is a chunky vertical slab inside the
// box, leaning the same -8deg so it fuses with the painted slab's left edge.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt05: TemplateVariant = defineVariant(
  {
    id: 'lt05',
    category: 'lower-third',
    name: 'Angle Slab',
    styleTag: 'sport',
    description: 'A forward-leaning dark slab with a chunky accent edge - fast, aggressive sport energy.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Player', sample: 'JAKE MORRISON' },
      { title: 'Stat line', sample: '24 PTS · 11 AST' },
    ],
    hasLogoSlot: false,
    animationPresets: ['snap-stinger', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Angle Slab',
    description:
      'A dark slab painted at a forward lean as if mid-sprint, while the text container stays ' +
      'straight so every line reads clean. A chunky accent slab inside the panel fuses with the ' +
      'leaning left edge. Built for player names and stat lines.',
    uicolor: '5',
  },
  (o) => ({
    // Structure: one box holding the accent edge and the masked text lines. The accent is
    // INSIDE the box so it slides with snap-stinger and is clipped by mask-wipe's clip-path.
    html: `    <!-- Angle Slab: one leaning panel with its accent edge inside. Text lines sit in reveal masks. -->
    <div class="lower-third-box">
      <!-- The accent edge - rides inside the box so every preset moves it with the slab. -->
      <div class="lower-third-accent"></div>
${lineMasks(o)}
    </div>`,
    css: `/* The box: presets animate THIS element, so it carries no lean of its own. */
.lower-third-box {
  position: relative;              /* anchors the painted slab (::before) and the accent edge */
  padding: calc(16px * var(--scale)) calc(36px * var(--scale));  /* tight vertical, wide horizontal */
}

/* The painted slab: the sport lean lives HERE, on a background layer no preset ever tweens.
   snap-stinger animates .lower-third-box skewX -10 -> 0; keeping the design lean on this pseudo-layer
   means that inline skewX(0) can never flatten the slab. */
.lower-third-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the box exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* paints behind the text and the accent */
  background: var(--panel-bg);     /* near-black slab behind the text */
  border-radius: 0;                /* hard corners - sport shape language */
  transform: skewX(-8deg);         /* SKEW: the whole slab leans forward */
}

/* The accent: a chunky vertical slab fused to the painted slab's left edge. */
.lower-third-accent {
  position: absolute;              /* pinned over the slab's left edge ... */
  left: 0;                         /* ... flush with the box's left side */
  top: 0;                          /* full height, top ... */
  bottom: 0;                       /* ... to bottom */
  width: calc(10px * var(--scale));  /* chunky 10px slab, not a hairline */
  background: var(--accent);       /* the one loud color moment */
  transform: skewX(-8deg);         /* transforms on ::before don't reach siblings, so the
                                      accent leans itself to fuse with the painted slab */
}

/* Line 1 - the player name. Big, heavy, all caps. */
.lower-third-name {
  font-size: calc(58px * var(--scale) * var(--type-scale));  /* headline scale */
  font-weight: 700;                /* maximum punch */
  line-height: 1.1;                /* tight - big text needs little leading */
  letter-spacing: 0.02em;          /* a touch of air between the caps */
  text-transform: uppercase;       /* names are shouted, not spoken */
  color: var(--text-color);        /* primary text */
}

/* Line 2 - the stat line, dimmed so the accent slab stays the single color moment. */
.lower-third-title {
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* clearly secondary to the name (58/27 within 1.8-2.2) */
  font-weight: 500;                /* medium - legible without competing */
  line-height: 1.25;               /* normal leading for the small line */
  color: var(--text-dim);          /* secondary line dims - one accent dose per graphic */
  font-variant-numeric: tabular-nums;  /* digits share one width - stats align as they tick */
  margin-top: calc(4px * var(--scale));  /* small gap: name + stats read as one unit */
}`,
    hasAccent: true,
  }),
);
