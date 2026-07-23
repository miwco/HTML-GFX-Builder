// bug20 "Quiet Sponsor Strip" — the MINIMAL partner strip: no panel at all. A tracked-caps
// kicker over a short accent rule, with three sponsor slots below it, straight on the video.
// The one a conference, church or webinar stream can leave up without shouting. Sibling of
// lt01 Hairline and bug04 Hairline Bug. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug20: TemplateVariant = defineBugVariant(
  {
    id: 'bug20',
    category: 'corner-bug',
    name: 'Quiet Sponsor Strip',
    styleTag: 'minimal',
    description: 'A panel-free partner strip: a kicker over a short accent rule and three slots.',
    maxLines: 1,
    suggestedLines: [{ title: 'Kicker', sample: 'WITH THANKS TO' }],
    logo: 'built-in',
    animationPresets: ['fade', 'slide-up', 'blur-in', 'slide-down', 'pop-spring'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Quiet Sponsor Strip',
    description:
      'No panel: a tracked-caps kicker over a short accent rule, with three sponsor logo slots ' +
      'beneath, all sitting straight on the video with soft shadows for bright footage. The ' +
      'quietest way to credit partners on screen.',
    uicolor: '2',
  },
  (o) => {
    // Three real SPX image fields ("filelist"), numbered after every wizard field. An unused
    // slot keeps its placeholder — the strip's shape never depends on filling all three.
    const base = o.lines.length + o.extraFields.length;
    const slots = [
      { field: `f${base}`, path: o.logoAssetPath ?? '', title: 'Sponsor 1' },
      { field: `f${base + 1}`, path: '', title: 'Sponsor 2' },
      { field: `f${base + 2}`, path: '', title: 'Sponsor 3' },
    ];

    return {
      html: `    <!-- Quiet Sponsor Strip: kicker, a short accent rule, then three sponsor slots. -->
    <div class="corner-bug-box">
${bugLineMasks(o)}
      <!-- The accent rule — the design's single colour moment (minimal geometry). -->
      <div class="corner-bug-accent"></div>
      <div class="corner-bug-row">
${slots.map((s) => bugSlotHtml(s, 'keyline', '        ')).join('\n')}
      </div>
    </div>`,

      extraFields: slots.map(bugSlotField),

      css: `/* No panel here: kicker, rule and marks stack bare over the video.
   A sponsor strip is wider than a corner caption, so it opts out of the bug width cap:
   the row of marks IS the graphic, and wrapping it would break the lockup. */
.corner-bug-box {
  max-width: none;                 /* the strip sizes to its marks, not to the caption cap */
  display: flex;                   /* the three pieces stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* everything centred on the strip's axis */
  gap: calc(10px * var(--scale));  /* even air between the pieces */
}

/* The kicker (f0) — a tiny tracked-caps label, quiet over bright footage. */
.corner-bug-name {
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* tiny label size */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* minimal keeps its labels dim */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

/* The accent rule — short on purpose: a mark, not a line across the frame. */
.corner-bug-accent {
  width: calc(34px * var(--scale));   /* a short stroke */
  height: var(--accent-weight);       /* the family's hairline weight */
  background: var(--accent);          /* the one accent colour */
}

/* The row — the three sponsor marks, evenly spaced under the rule. */
.corner-bug-row {
  display: flex;                   /* the marks sit side by side */
  align-items: center;             /* all on one baseline */
  gap: calc(30px * var(--scale));  /* generous air — partner marks must not read as one logo */
}

${bugSlotCss({ width: 92, height: 40, mark: 'keyline' })}

/* The logos carry their own shadow here — there is no panel to lift them off the video. */
.corner-bug-logo {
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));  /* readable over bright footage */
}`,

      hasAccent: true,
    };
  },
);
