// bug07 "Slab Ident" — the SPORT station/show ident, the corner-scale sibling of lt05/lt06 and
// bug03 Slab Bug: a solid slab with the logo mounted on a fused accent block, the channel in
// heavy condensed caps, and the show as a tracked caps line beneath. Zero radius, hard offset
// shadow, no blur — the sport family's shape language. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug07: TemplateVariant = defineBugVariant(
  {
    id: 'bug07',
    category: 'corner-bug',
    name: 'Slab Ident',
    styleTag: 'sport',
    description: 'A solid ident slab: the club logo on a fused accent block, channel over show.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Channel', sample: 'VOLTA SPORT' },
      { title: 'Show', sample: 'MATCHDAY LIVE' },
    ],
    logo: 'built-in',
    animationPresets: ['slide-right', 'snap-stinger', 'pop-spring', 'fade', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'top-left',
  },
  {
    name: 'Slab Ident',
    description:
      'The sport identity slab: the logo (or a solid accent placeholder block) mounted in a ' +
      'fused accent panel, with the channel in heavy condensed caps over the show on air. ' +
      'Square corners and a hard offset shadow — the sticker-slab family.',
    uicolor: '5',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist"); its id comes after every wizard field.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Logo',
    };

    return {
      html: `    <!-- Slab Ident: the fused accent edge, then the logo and the channel + show. -->
    <div class="corner-bug-box">
      <!-- The accent edge — a fused stripe, the sport family's colour moment. It carries no
           logo on purpose: a club mark has its own colours and must never sit on ours. -->
      <div class="corner-bug-accent"></div>
${bugSlotHtml(slot, 'slab')}
      <div class="corner-bug-text">
${bugLineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* The slab — solid, square-cornered, sitting on a hard offset shadow. The accent edge,
   the club mark and the text sit side by side inside it. */
.corner-bug-box {
  display: flex;                   /* the accent edge, the mark and the text sit in a row */
  align-items: center;             /* everything centred on the slab's axis */
  gap: calc(14px * var(--scale));  /* air between the mark and the text */
  padding-right: calc(18px * var(--scale));  /* air before the slab's right edge */
  background: var(--panel-bg);     /* the solid slab */
  border-radius: var(--panel-radius);  /* sport is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
  overflow: hidden;                /* the accent edge's corners follow the slab's */
}

/* The accent edge — a chunky stripe fused to the slab's left edge. */
.corner-bug-accent {
  align-self: stretch;             /* runs the slab's full height */
  width: var(--accent-weight);     /* the family's chunky bar */
  background: var(--accent);       /* the one accent moment */
  flex: none;                      /* never squeezed by the lockup beside it */
}

${bugSlotCss({ width: 44, height: 44, mark: 'slab', radius: '0' })}

/* The mark keeps its own air inside the slab (the accent edge has none of its own). */
.corner-bug-media {
  margin: calc(12px * var(--scale)) 0 calc(12px * var(--scale)) calc(14px * var(--scale));
}

/* The placeholder block is quiet: it marks the slot, it is not a shape in the design. */
.corner-bug-mark {
  opacity: 0.35;                   /* clearly a placeholder until a file is picked */
}

/* The text column — channel over show, packed tight the way sport straps are. */
.corner-bug-text {
  display: flex;                   /* the two lines stack… */
  flex-direction: column;          /* …top to bottom */
  justify-content: center;         /* centred against the mark */
  text-align: left;                /* both lines hug the same edge (overrides the zone) */
}

/* The channel (f0) — heavy condensed caps, the sport voice at bug scale. */
.corner-bug-name {
  font-size: calc(24px * var(--scale) * var(--type-scale));   /* compact — a mark, not a title */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1;                  /* condensed caps need no leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* sport shouts in caps */
  color: var(--text-color);        /* primary text */
}

/* The show (f1) — a tracked caps line under the channel. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(4px * var(--scale));  /* the two lines read as one lockup */
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* clearly subordinate */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.25;               /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* sport opens its labels up */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* the family's label colour */
}`,

      hasAccent: true,
    };
  },
);
