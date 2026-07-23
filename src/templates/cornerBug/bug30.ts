// bug30 "Gala Award Bug" — the GLASS award mark: a frosted tile with the award logo set in an
// accent ring, the award word as a soft caps kicker, and the category beneath. The gala/ceremony
// look. Sits in the lower safe area, clear of a lower third. Sibling of lt08 Frosted Card.
//
// NOTE on the line order: this design leads with the KICKER (f0, "NOMINEE") and gives the
// display weight to the second line (f1, the category) — the award word is the label, the
// category is what the viewer reads.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug30: TemplateVariant = defineBugVariant(
  {
    id: 'bug30',
    category: 'corner-bug',
    name: 'Gala Award Bug',
    styleTag: 'glass',
    description: 'A frosted award mark: the logo in an accent ring, the award word over its category.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Award', sample: 'NOMINEE' },
      { title: 'Category', sample: 'Best Original Score' },
    ],
    logo: 'built-in',
    animationPresets: ['blur-in', 'pop-spring', 'fade', 'slide-up', 'flip-3d'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Gala Award Bug',
    description:
      'The ceremony award mark: a translucent blurred tile holding the award or festival logo ' +
      'inside a soft accent ring, with the award word as a small caps kicker and the category ' +
      'beneath it. Drawn for the lower safe area of an award show or gala.',
    uicolor: '3',
  },
  (o) => {
    // The award logo is a real SPX image field ("filelist"); its id comes after every wizard
    // field so nothing collides.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Award logo',
    };

    return {
      html: `    <!-- Gala Award Bug: the ringed award logo, then the award kicker over its category. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'ring')}
      <div class="corner-bug-text">
${bugLineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* The tile — translucent glass, heavy blur, hairline keyline, one soft lift. */
.corner-bug-box {
  display: flex;                   /* the mark and the text sit side by side */
  align-items: center;             /* both centred on the tile's axis */
  gap: calc(15px * var(--scale));  /* air between the mark and the text */
  padding: calc(14px * var(--scale)) calc(22px * var(--scale));  /* even air inside the tile */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

${bugSlotCss({ width: 54, height: 54, mark: 'ring', radius: '50%' })}

/* A picked logo keeps the ring — on an award mark the ring IS the badge, not a placeholder. */
.corner-bug-media.has-image .corner-bug-mark {
  display: block;                  /* overrides the shared rule: the ring stays under the logo */
}
.corner-bug-media.has-image .corner-bug-logo {
  padding: calc(7px * var(--scale));  /* the logo sits inside the ring, never across it */
}

/* The award word (f0) — the KICKER: small caps in the accent colour. */
.corner-bug-name {
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* tiny label size */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* glass carries the accent in the label */
}

/* The category (f1) — the line the viewer actually reads. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(5px * var(--scale));  /* the two lines read as one lockup */
  font-size: calc(19px * var(--scale) * var(--type-scale));   /* the lockup's display line */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text */
}`,

      hasAccent: false, // the accent moments are the ring and the kicker colour
    };
  },
);
