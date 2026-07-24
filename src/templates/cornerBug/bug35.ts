// bug35 "Venue Chip" — the SPORT location/status chip: the venue in heavy condensed caps on a
// solid chip, with the status set in an accent block beside it. Square corners, hard offset
// shadow. The compact overlay a match feed leaves up while the camera is at the ground.
// Sibling of bug03 Slab Bug and lt05/lt06.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineClass } from './shared';

/** One masked line, in the assembler's own idiom — this chip splits its two lines between the
 *  slab and the accent block, so it places them itself. */
function mask(line: { title: string; sample: string }, index: number, indent: string): string {
  return (
    `${indent}<!-- ${line.title} (f${index}) — SPX writes this field's value straight into the element. -->\n` +
    `${indent}<div class="corner-bug-mask"><span id="f${index}" class="${bugLineClass(index)}">${line.sample}</span></div>`
  );
}

export const bug35: TemplateVariant = defineBugVariant(
  {
    id: 'bug35',
    category: 'corner-bug',
    name: 'Venue Chip',
    styleTag: 'sport',
    description: 'A sport chip: the venue on a solid slab, the status in a fused accent block.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Location', sample: 'ARENA WEST' },
      { title: 'Status', sample: 'PITCHSIDE' },
    ],
    logo: 'none',
    animationPresets: ['slide-right', 'snap-stinger', 'pop-spring', 'fade', 'slide-down'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Venue Chip',
    description:
      'The sport location chip: the venue in heavy condensed caps on a square-cornered slab, ' +
      'with the status set in the family dark chip ink on a fused accent block. Sized to sit ' +
      'under a scorebug or beside a lower third without fighting either.',
    uicolor: '5',
  },
  (o) => {
    // The venue rides on the slab, the status in the accent block. Both come from the SAME
    // line list, so a design with fewer lines simply has fewer elements.
    const [place, ...rest] = o.lines;
    const venue = place ? `${mask(place, 0, '        ')}\n` : '';
    const status = rest.map((line, i) => mask(line, i + 1, '        ')).join('\n');

    return {
      html: `    <!-- Venue Chip: the venue on the slab, the status in the fused accent block. -->
    <div class="corner-bug-box">
      <div class="corner-bug-text">
${venue}      </div>
      <!-- The accent block — the sport family's colour moment, holding the status. -->
      <div class="corner-bug-accent">
${status}
      </div>
    </div>`,

      css: `/* The chip — solid, square-cornered, on a hard offset shadow. */
.corner-bug-box {
  display: flex;                   /* the venue and the status block sit side by side */
  align-items: stretch;            /* the accent block runs the chip's full height */
  background: var(--panel-bg);     /* the solid slab */
  border-radius: var(--panel-radius);  /* sport is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
  overflow: hidden;                /* the accent block's corners follow the chip's */
}

/* The venue side — the words sit on the slab with their own air. */
.corner-bug-text {
  display: flex;                   /* one line, centred in its half */
  align-items: center;             /* on the chip's axis */
  padding: calc(9px * var(--scale)) calc(16px * var(--scale));  /* air inside the slab */
}

/* The venue (f0) — heavy condensed caps, the sport voice at chip scale. */
.corner-bug-name {
  font-size: calc(18px * var(--scale) * var(--type-scale));   /* compact — a chip, not a strap */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.1;                /* condensed caps need almost no leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* sport shouts in caps */
  color: var(--text-color);        /* primary text */
  white-space: nowrap;             /* the chip is one row: the venue never wraps */
}

/* The accent block — filled with the one accent colour, fused to the chip's right edge. */
.corner-bug-accent {
  display: flex;                   /* centre the status inside the block */
  align-items: center;             /* vertically… */
  justify-content: center;         /* …and horizontally */
  padding: calc(9px * var(--scale)) calc(14px * var(--scale));  /* air around the status */
  background: var(--accent);       /* the one accent moment */
}

/* The status (f1) — tracked caps in the block's dark ink. */
.corner-bug-title,
.corner-bug-extra {
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* small label size */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.15;               /* condensed caps need almost no leading */
  letter-spacing: var(--label-tracking);  /* sport opens its labels up */
  text-transform: uppercase;       /* sport shouts in caps */
  color: var(--accent-ink);        /* dark-on-accent, the family's chip ink */
  white-space: nowrap;             /* the chip is one row: the status never wraps */
}`,

      hasAccent: true,
    };
  },
);
