// bug29 "House Award Bug" — the NoaCG award mark: the award word as an amber kicker over the
// category it was given in, with the award or festival logo beside it, on the house void panel.
// Sits in the lower safe area, where a nominee/winner mark belongs — under the face, clear of a
// lower third. Sibling of lt11 House Strap. See docs/DESIGN_LANGUAGE.md §8.
//
// NOTE on the line order: this design leads with the KICKER (f0, "WINNER") and gives the
// display weight to the second line (f1, the category). That is the graphic's own hierarchy —
// the award word is the label, the category is what the viewer reads.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug29: TemplateVariant = defineBugVariant(
  {
    id: 'bug29',
    category: 'corner-bug',
    name: 'House Award Bug',
    styleTag: 'noacg',
    description: 'The house award mark: an amber award kicker over the category, beside the award logo.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Award', sample: 'WINNER 2026' },
      { title: 'Category', sample: 'BEST DOCUMENTARY' },
    ],
    logo: 'built-in',
    animationPresets: ['pop-spring', 'fade', 'blur-in', 'slide-up', 'slide-right'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Award Bug',
    description:
      'The house award mark: the award word ("winner", "nominee") as a small amber kicker over ' +
      'the category, with the award or festival logo (or the three-bar house placeholder) ' +
      'beside it on the void panel.',
    uicolor: '4',
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
      html: `    <!-- House Award Bug: the award logo, then the award kicker over its category. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'bars')}
      <div class="corner-bug-text">
${bugLineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void tint behind the mark and the two award lines. */
.corner-bug-box {
  display: flex;                   /* the mark and the text sit side by side */
  align-items: center;             /* both centred on the lockup's axis */
  gap: calc(14px * var(--scale));  /* air between the mark and the text */
  padding: calc(13px * var(--scale)) calc(20px * var(--scale));  /* even air inside the panel */
  background: var(--panel-bg);     /* the void panel */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the house panel is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's lift */
}

${bugSlotCss({ width: 48, height: 48, mark: 'bars', radius: '0' })}

/* The text column — the award kicker over the category. */
.corner-bug-text {
  display: flex;                   /* the two lines stack… */
  flex-direction: column;          /* …top to bottom */
  text-align: left;                /* both lines hug the same edge (overrides the zone) */
}

/* The award word (f0) — the KICKER: small, mono, amber. The label, not the headline. */
.corner-bug-name {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* tiny label size */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* the house carries the accent in the label */
}

/* The category (f1) — the line the viewer actually reads. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(5px * var(--scale));  /* the two lines read as one lockup */
  font-size: calc(19px * var(--scale) * var(--type-scale));   /* the lockup's display line */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* award categories read as caps */
  color: var(--text-color);        /* primary text */
}`,

      hasAccent: false, // the accent moments are the kicker colour and the placeholder bars
    };
  },
);
