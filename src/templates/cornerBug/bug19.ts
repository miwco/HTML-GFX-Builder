// bug19 "Slab Sponsor Strip" — the SPORT partner strip: an accent kicker chip fused to the
// left of a solid slab carrying three sponsor slots. Square corners, hard offset shadow, heavy
// tracked caps. Drawn for the bottom safe area, where a match-day sponsor bar lives. Sibling of
// bug03 Slab Bug and lt05/lt06. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug19: TemplateVariant = defineBugVariant(
  {
    id: 'bug19',
    category: 'corner-bug',
    name: 'Slab Sponsor Strip',
    styleTag: 'sport',
    description: 'A sponsor slab: an accent kicker chip fused to a row of three partner slots.',
    maxLines: 1,
    suggestedLines: [{ title: 'Kicker', sample: 'MATCH SPONSORS' }],
    logo: 'built-in',
    animationPresets: ['slide-up', 'snap-stinger', 'pop-spring', 'fade', 'slide-down'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Slab Sponsor Strip',
    description:
      'The sport partner bar: an accent kicker chip fused to the left edge of a solid slab ' +
      'holding three sponsor logo slots. Square corners and a hard offset shadow — the ' +
      'sticker-slab family at strip scale.',
    uicolor: '5',
  },
  (o) => {
    // Three real SPX image fields ("filelist"), numbered after every wizard field. An unused
    // slot keeps its placeholder — the slab's shape never depends on filling all three.
    const base = o.lines.length + o.extraFields.length;
    const slots = [
      { field: `f${base}`, path: o.logoAssetPath ?? '', title: 'Sponsor 1' },
      { field: `f${base + 1}`, path: '', title: 'Sponsor 2' },
      { field: `f${base + 2}`, path: '', title: 'Sponsor 3' },
    ];

    return {
      html: `    <!-- Slab Sponsor Strip: the accent kicker chip, then three sponsor slots. -->
    <div class="corner-bug-box">
      <!-- The accent chip — the sport family's colour moment, holding the kicker. -->
      <div class="corner-bug-accent">
${bugLineMasks(o, '        ')}
      </div>
      <div class="corner-bug-row">
${slots.map((s) => bugSlotHtml(s, 'slab', '        ')).join('\n')}
      </div>
    </div>`,

      extraFields: slots.map(bugSlotField),

      css: `/* The slab — solid, square-cornered, on a hard offset shadow.
   A sponsor strip is wider than a corner caption, so it opts out of the bug width cap:
   the row of marks IS the graphic, and wrapping it would break the lockup. */
.corner-bug-box {
  max-width: none;                 /* the strip sizes to its marks, not to the caption cap */
  display: flex;                   /* the kicker chip and the row sit side by side */
  align-items: stretch;            /* the chip runs the slab's full height */
  background: var(--panel-bg);     /* the solid slab */
  border-radius: var(--panel-radius);  /* sport is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
  overflow: hidden;                /* the chip's corners follow the slab's */
}

/* The kicker chip — filled with the one accent colour, fused to the slab's left edge. */
.corner-bug-accent {
  display: flex;                   /* centre the kicker inside the chip */
  align-items: center;             /* vertically… */
  justify-content: center;         /* …and horizontally */
  padding: calc(12px * var(--scale)) calc(18px * var(--scale));  /* air around the words */
  background: var(--accent);       /* the one accent moment */
}

/* The kicker (f0) — heavy tracked caps in the chip's dark ink. */
.corner-bug-name {
  font-size: calc(13px * var(--scale) * var(--type-scale));   /* small label size */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.15;               /* condensed caps need almost no leading */
  letter-spacing: var(--label-tracking);  /* sport opens its labels up */
  text-transform: uppercase;       /* sport shouts in caps */
  color: var(--accent-ink);        /* dark-on-accent, the family's chip ink */
  max-width: calc(150px * var(--scale));  /* a long kicker wraps rather than stretching the chip */
}

/* The row — the three sponsor marks on the slab, evenly spaced. */
.corner-bug-row {
  display: flex;                   /* the marks sit side by side */
  align-items: center;             /* all on one baseline */
  gap: calc(26px * var(--scale));  /* generous air — partner marks must not read as one logo */
  padding: calc(12px * var(--scale)) calc(24px * var(--scale));  /* air inside the slab */
}

${bugSlotCss({ width: 88, height: 38, mark: 'slab', radius: '0' })}

/* The placeholder block is quiet: it marks the slot, it is not a shape in the design. */
.corner-bug-mark {
  opacity: 0.3;                    /* clearly a placeholder until a file is picked */
}`,

      hasAccent: true,
    };
  },
);
