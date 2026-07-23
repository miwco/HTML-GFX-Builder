// bug31 "Champion Bug" — the SPORT award mark: an accent chip carrying the award word, fused to
// a solid slab holding the category and the trophy/competition logo. Square corners, hard offset
// shadow, heavy caps. Sibling of bug03 Slab Bug and lt05/lt06.
//
// NOTE on the line order: the award word (f0) lives in the accent chip and the category (f1)
// takes the display weight on the slab — the chip is the label, the category is the headline.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineClass } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

/** One masked line, in the assembler's own idiom — this design splits its lines between two
 *  containers (the award chip and the slab body), so it places them itself. */
function mask(line: { title: string; sample: string }, index: number, indent: string): string {
  return (
    `${indent}<!-- ${line.title} (f${index}) — SPX writes this field's value straight into the element. -->\n` +
    `${indent}<div class="corner-bug-mask"><span id="f${index}" class="${bugLineClass(index)}">${line.sample}</span></div>`
  );
}

export const bug31: TemplateVariant = defineBugVariant(
  {
    id: 'bug31',
    category: 'corner-bug',
    name: 'Champion Bug',
    styleTag: 'sport',
    description: 'An award slab: the award word on an accent chip, the category beside the trophy logo.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Award', sample: 'CHAMPIONS' },
      { title: 'Category', sample: 'CITY CUP 2026' },
    ],
    logo: 'built-in',
    animationPresets: ['snap-stinger', 'pop-spring', 'slide-up', 'fade', 'blur-in'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Champion Bug',
    description:
      'The sport award mark: the award word in the family dark chip ink on a fused accent ' +
      'block, with the category in heavy condensed caps beside the trophy or competition logo. ' +
      'Square-cornered on a hard offset shadow.',
    uicolor: '5',
  },
  (o) => {
    // The trophy or competition logo is a real SPX image field ("filelist"); its id comes after
    // every wizard field so nothing collides.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Award logo',
    };

    // The award word rides in the accent chip; every further line sits on the slab beside the
    // mark. Both are emitted from the SAME line list, so a design with fewer lines simply has
    // fewer elements — never an id nothing answers to.
    const [award, ...rest] = o.lines;
    const chip = award
      ? `      <!-- The accent chip — the sport family's colour moment, holding the award word. -->
      <div class="corner-bug-accent">
${mask(award, 0, '        ')}
      </div>\n`
      : '';
    const categories = rest.map((line, i) => mask(line, i + 1, '          ')).join('\n');

    return {
      html: `    <!-- Champion Bug: the award chip, then the trophy logo and the category. -->
    <div class="corner-bug-box">
${chip}      <div class="corner-bug-body">
${bugSlotHtml(slot, 'slab', '        ')}
        <div class="corner-bug-text">
${categories}
        </div>
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* The slab — solid, square-cornered, on a hard offset shadow. */
.corner-bug-box {
  display: flex;                   /* the award chip and the body sit side by side */
  align-items: stretch;            /* the chip runs the slab's full height */
  background: var(--panel-bg);     /* the solid slab */
  border-radius: var(--panel-radius);  /* sport is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
  overflow: hidden;                /* the chip's corners follow the slab's */
}

/* The award chip — filled with the one accent colour, fused to the slab's left edge. */
.corner-bug-accent {
  display: flex;                   /* centre the award word inside the chip */
  align-items: center;             /* vertically… */
  justify-content: center;         /* …and horizontally */
  padding: calc(12px * var(--scale)) calc(16px * var(--scale));  /* air around the word */
  background: var(--accent);       /* the one accent moment */
}

/* The award word (f0) — heavy tracked caps in the chip's dark ink. */
.corner-bug-name {
  font-size: calc(14px * var(--scale) * var(--type-scale));   /* small, but it shouts */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.1;                /* condensed caps need almost no leading */
  letter-spacing: var(--label-tracking);  /* sport opens its labels up */
  text-transform: uppercase;       /* sport shouts in caps */
  color: var(--accent-ink);        /* dark-on-accent, the family's chip ink */
  max-width: calc(120px * var(--scale));  /* a long word wraps rather than stretching the chip */
}

/* The body — the trophy mark and the category, side by side on the slab. */
.corner-bug-body {
  display: flex;                   /* the mark and the category sit side by side */
  align-items: center;             /* both centred on the body's axis */
  gap: calc(13px * var(--scale));  /* air between the mark and the words */
  padding: calc(11px * var(--scale)) calc(18px * var(--scale));  /* air inside the slab */
}

${bugSlotCss({ width: 42, height: 42, mark: 'slab', radius: '0' })}

/* The placeholder block is quiet: it marks the slot, it is not a shape in the design. */
.corner-bug-mark {
  opacity: 0.35;                   /* clearly a placeholder until a file is picked */
}

/* The category (f1) — heavy condensed caps, the sport voice at bug scale. */
.corner-bug-title,
.corner-bug-extra {
  font-size: calc(20px * var(--scale) * var(--type-scale));   /* the lockup's display line */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1;                  /* condensed caps need no leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* sport shouts in caps */
  color: var(--text-color);        /* primary text */
}`,

      hasAccent: true,
    };
  },
);
