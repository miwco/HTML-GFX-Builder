// bug22 "Frost Sponsor Rotation" — the GLASS rotating sponsor bug: a frosted pill with the
// kicker inline at the left and one logo stage to its right, cycling through three partner
// slots on a timer. The rotation is the graphic type's machine (a crossfade whose midpoint
// calls sponsorShowNext), pausable and skippable on air. Sibling of lt08 Frosted Card.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';
import { SPONSOR_ROTATION_JS } from './bugRuntimes';
import { rotationStageCss } from './rotationParts';

export const bug22: TemplateVariant = defineBugVariant(
  {
    id: 'bug22',
    category: 'corner-bug',
    name: 'Frost Sponsor Rotation',
    styleTag: 'glass',
    description: 'A frosted sponsor pill that cycles three partner logos on a timer.',
    maxLines: 1,
    suggestedLines: [{ title: 'Kicker', sample: 'PARTNERS' }],
    logo: 'built-in',
    animationPresets: ['blur-in', 'fade', 'pop-spring', 'slide-up'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Frost Sponsor Rotation',
    description:
      'The glass sponsor bug that rotates: a translucent blurred pill with a soft caps kicker ' +
      'inline at the left and one logo stage beside it, cycling through three partner slots ' +
      'with a crossfade. Empty slots are skipped; the operator can skip ahead or pause.',
    uicolor: '3',
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
      html: `    <!-- Frost Sponsor Rotation: the kicker, then one stage the sponsors take turns on. -->
    <div class="corner-bug-box">
${bugLineMasks(o)}
      <div class="corner-bug-stage">
${slots.map((s) => bugSlotHtml(s, 'diamond', '        ')).join('\n')}
      </div>
    </div>`,

      extraFields: slots.map(bugSlotField),

      runtimeExtraJs: SPONSOR_ROTATION_JS,

      css: `/* The pill — translucent glass, heavy blur, hairline keyline, one soft lift. */
.corner-bug-box {
  display: flex;                   /* the kicker and the stage sit side by side */
  align-items: center;             /* both centred on the pill's axis */
  gap: calc(16px * var(--scale));  /* air between the words and the mark */
  padding: calc(12px * var(--scale)) calc(20px * var(--scale));  /* even air inside the pill */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The kicker (f0) — a soft caps label, quieter than the marks it introduces. */
.corner-bug-name {
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* tiny label size */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* glass carries the accent in the label */
  white-space: nowrap;             /* the kicker stays on one line beside the stage */
}

${bugSlotCss({ width: 118, height: 46, mark: 'diamond', radius: 'calc(8px * var(--scale))' })}

${rotationStageCss(118, 46)}`,

      hasAccent: false, // the accent moments are the kicker colour and the placeholder lozenge
    };
  },
);
