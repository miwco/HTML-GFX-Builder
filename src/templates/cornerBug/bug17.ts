// bug17 "House Sponsor Strip" — the NoaCG partner strip: a mono kicker over a row of three
// sponsor slots, split by hairline dividers, on the house void panel. Sized for the bottom
// safe area, where a supported-by strip belongs — low enough to clear a lower third, high
// enough to stay inside the action-safe area. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug17: TemplateVariant = defineBugVariant(
  {
    id: 'bug17',
    category: 'corner-bug',
    name: 'House Sponsor Strip',
    styleTag: 'noacg',
    description: 'A house partner strip: a mono kicker over three sponsor slots on the void panel.',
    maxLines: 1,
    suggestedLines: [{ title: 'Kicker', sample: 'SUPPORTED BY' }],
    logo: 'built-in',
    animationPresets: ['slide-up', 'fade', 'blur-in', 'pop-spring', 'slide-down'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Sponsor Strip',
    description:
      'The house partner strip: a small mono kicker ("supported by") over a row of three ' +
      'sponsor logo slots divided by hairlines, on the void panel. Each slot is its own SPX ' +
      'image field, so partners can be swapped between segments without touching the design.',
    uicolor: '4',
  },
  (o) => {
    // Three real SPX image fields ("filelist"), numbered after every wizard field. An unused
    // slot simply keeps its placeholder — nothing about the strip's shape depends on filling
    // all three.
    const base = o.lines.length + o.extraFields.length;
    const slots = [
      { field: `f${base}`, path: o.logoAssetPath ?? '', title: 'Sponsor 1' },
      { field: `f${base + 1}`, path: '', title: 'Sponsor 2' },
      { field: `f${base + 2}`, path: '', title: 'Sponsor 3' },
    ];

    return {
      html: `    <!-- House Sponsor Strip: the kicker, then three sponsor slots in a row. -->
    <div class="corner-bug-box">
${bugLineMasks(o)}
      <div class="corner-bug-row">
${slots.map((s) => bugSlotHtml(s, 'bars', '        ')).join('\n')}
      </div>
    </div>`,

      extraFields: slots.map(bugSlotField),

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The strip — the house void panel behind a kicker and a row of partner marks.
   A sponsor strip is wider than a corner caption, so it opts out of the bug width cap:
   three marks in a row is the graphic, and wrapping them would break the lockup. */
.corner-bug-box {
  max-width: none;                 /* the strip sizes to its marks, not to the caption cap */
  display: flex;                   /* the kicker and the row stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* both centred on the strip's axis */
  gap: calc(10px * var(--scale));  /* air between the kicker and the marks */
  padding: calc(14px * var(--scale)) calc(24px * var(--scale));  /* even air inside the panel */
  background: var(--panel-bg);     /* the void panel */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the house panel is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's lift */
}

/* The kicker (f0) — the house mono label voice, small and tracked. */
.corner-bug-name {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* tiny label size */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* the house carries the accent in the label */
}

/* The row — the three sponsor marks, evenly spaced across the strip. */
.corner-bug-row {
  display: flex;                   /* the marks sit side by side */
  align-items: center;             /* all on one baseline */
  gap: calc(30px * var(--scale));  /* generous air — partner marks must not read as one logo */
}

${bugSlotCss({ width: 96, height: 40, mark: 'bars' })}`,

      hasAccent: false, // the accent moments are the placeholder bars and the kicker colour
    };
  },
);
