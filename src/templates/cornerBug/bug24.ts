// bug24 "Quiet Sponsor Rotation" — the MINIMAL rotating sponsor bug: no panel, a tracked-caps
// kicker over a short accent rule, and one logo stage below it cycling three partners on a
// timer. The rotation is the graphic type's machine (a crossfade whose midpoint calls
// sponsorShowNext), pausable on air. Sibling of lt01 Hairline and bug04 Hairline Bug.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';
import { SPONSOR_ROTATION_JS } from './bugRuntimes';
import { rotationStageCss } from './rotationParts';

export const bug24: TemplateVariant = defineBugVariant(
  {
    id: 'bug24',
    category: 'corner-bug',
    name: 'Quiet Sponsor Rotation',
    styleTag: 'minimal',
    description: 'A panel-free sponsor mark that cycles three partner logos on a timer.',
    maxLines: 1,
    suggestedLines: [{ title: 'Kicker', sample: 'SUPPORTED BY' }],
    logo: 'built-in',
    animationPresets: ['fade', 'blur-in', 'slide-up', 'pop-spring'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Quiet Sponsor Rotation',
    description:
      'No panel: a tiny tracked-caps kicker over a short accent rule, with one logo stage ' +
      'beneath cycling three partner slots straight on the video. Empty slots are skipped, and ' +
      'the operator can skip ahead or pause the rotation.',
    uicolor: '2',
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
      html: `    <!-- Quiet Sponsor Rotation: kicker, accent rule, then the rotating logo stage. -->
    <div class="corner-bug-box">
${bugLineMasks(o)}
      <!-- The accent rule — the design's single colour moment (minimal geometry). -->
      <div class="corner-bug-accent"></div>
      <div class="corner-bug-stage">
${slots.map((s) => bugSlotHtml(s, 'keyline', '        ')).join('\n')}
      </div>
    </div>`,

      extraFields: slots.map(bugSlotField),

      runtimeExtraJs: SPONSOR_ROTATION_JS,

      css: `/* No panel here: kicker, rule and stage stack bare over the video. */
.corner-bug-box {
  display: flex;                   /* the three pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: flex-end;           /* all hug the right edge — this one parks bottom-right */
  gap: calc(9px * var(--scale));   /* even air between the pieces */
}

/* The kicker (f0) — a tiny tracked-caps label, quiet over bright footage. */
.corner-bug-name {
  font-size: calc(11px * var(--scale) * var(--type-scale));   /* tiny label size */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* minimal keeps its labels dim */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

/* The accent rule — short on purpose: a mark, not a line across the frame. */
.corner-bug-accent {
  width: calc(28px * var(--scale));   /* a short stroke */
  height: var(--accent-weight);       /* the family's hairline weight */
  background: var(--accent);          /* the one accent colour */
}

${bugSlotCss({ width: 120, height: 48, mark: 'keyline' })}

${rotationStageCss(120, 48)}

/* The logos carry their own shadow here — there is no panel to lift them off the video. */
.corner-bug-logo {
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));  /* readable over bright footage */
}`,

      hasAccent: true,
    };
  },
);
