// bug21 "House Sponsor Rotation" — the NoaCG rotating sponsor bug: a mono kicker over one
// sponsor stage that cycles through three slots on a timer. The rotation is REAL: the graphic
// type's machine holds each sponsor, then plays a crossfade whose midpoint calls
// sponsorShowNext() (bugRuntimes.ts), and the operator can skip or pause it from the control
// panel. Sibling of lt11 House Strap. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';
import { SPONSOR_ROTATION_JS } from './bugRuntimes';
import { rotationStageCss } from './rotationParts';

export const bug21: TemplateVariant = defineBugVariant(
  {
    id: 'bug21',
    category: 'corner-bug',
    name: 'House Sponsor Rotation',
    styleTag: 'noacg',
    description: 'A house sponsor bug that cycles three partner logos on a timer — skippable on air.',
    maxLines: 1,
    suggestedLines: [{ title: 'Kicker', sample: 'SPONSORED BY' }],
    logo: 'built-in',
    animationPresets: ['fade', 'blur-in', 'slide-up', 'pop-spring'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-right',
  },
  {
    name: 'House Sponsor Rotation',
    description:
      'The house sponsor bug that rotates: a mono kicker over one logo stage holding three ' +
      'partner slots, cycling on a timer with a soft crossfade. Empty slots are skipped, and ' +
      'the operator can skip ahead or pause the rotation on air.',
    uicolor: '4',
  },
  (o) => {
    // Three real SPX image fields ("filelist"), numbered after every wizard field. Only the
    // filled ones take part in the rotation (bugRuntimes.ts sponsorSlots).
    const base = o.lines.length + o.extraFields.length;
    const slots = [
      { field: `f${base}`, path: o.logoAssetPath ?? '', title: 'Sponsor 1' },
      { field: `f${base + 1}`, path: '', title: 'Sponsor 2' },
      { field: `f${base + 2}`, path: '', title: 'Sponsor 3' },
    ];

    return {
      html: `    <!-- House Sponsor Rotation: the kicker, then one stage the sponsors take turns on. -->
    <div class="corner-bug-box">
${bugLineMasks(o)}
      <div class="corner-bug-stage">
${slots.map((s) => bugSlotHtml(s, 'bars', '        ')).join('\n')}
      </div>
    </div>`,

      extraFields: slots.map(bugSlotField),

      runtimeExtraJs: SPONSOR_ROTATION_JS,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void tint behind the kicker and the sponsor stage. */
.corner-bug-box {
  display: flex;                   /* the kicker and the stage stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* both centred on the panel's axis */
  gap: calc(9px * var(--scale));   /* air between the kicker and the mark */
  padding: calc(14px * var(--scale)) calc(22px * var(--scale));  /* even air inside the panel */
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

${bugSlotCss({ width: 132, height: 52, mark: 'bars', radius: '0' })}

${rotationStageCss(132, 52)}`,

      hasAccent: false, // the accent moments are the kicker colour and the placeholder bars
    };
  },
);
