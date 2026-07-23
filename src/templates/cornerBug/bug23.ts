// bug23 "Slab Sponsor Rotation" — the SPORT rotating sponsor bug: an accent kicker chip fused
// to a solid slab whose logo stage cycles three partners on a timer. The rotation is the
// graphic type's machine (a crossfade whose midpoint calls sponsorShowNext), skippable and
// pausable on air. Sibling of bug03 Slab Bug and lt05/lt06.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';
import { SPONSOR_ROTATION_JS } from './bugRuntimes';
import { rotationStageCss } from './rotationParts';

export const bug23: TemplateVariant = defineBugVariant(
  {
    id: 'bug23',
    category: 'corner-bug',
    name: 'Slab Sponsor Rotation',
    styleTag: 'sport',
    description: 'A sponsor slab that cycles three partner logos on a timer, with an accent kicker chip.',
    maxLines: 1,
    suggestedLines: [{ title: 'Kicker', sample: 'OFFICIAL PARTNER' }],
    logo: 'built-in',
    animationPresets: ['pop-spring', 'fade', 'slide-up', 'blur-in'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Slab Sponsor Rotation',
    description:
      'The sport sponsor bug that rotates: an accent kicker chip fused to the left of a solid ' +
      'slab, with one logo stage cycling three partner slots. Empty slots are skipped, and the ' +
      'operator can skip ahead or hold a partner on screen.',
    uicolor: '5',
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
      html: `    <!-- Slab Sponsor Rotation: the accent kicker chip, then the rotating logo stage. -->
    <div class="corner-bug-box">
      <!-- The accent chip — the sport family's colour moment, holding the kicker. -->
      <div class="corner-bug-accent">
${bugLineMasks(o, '        ')}
      </div>
      <div class="corner-bug-stage">
${slots.map((s) => bugSlotHtml(s, 'slab', '        ')).join('\n')}
      </div>
    </div>`,

      extraFields: slots.map(bugSlotField),

      runtimeExtraJs: SPONSOR_ROTATION_JS,

      css: `/* The slab — solid, square-cornered, on a hard offset shadow. */
.corner-bug-box {
  display: flex;                   /* the kicker chip and the stage sit side by side */
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
  padding: calc(10px * var(--scale)) calc(14px * var(--scale));  /* air around the words */
  background: var(--accent);       /* the one accent moment */
}

/* The kicker (f0) — heavy tracked caps in the chip's dark ink. */
.corner-bug-name {
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* small label size */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.15;               /* condensed caps need almost no leading */
  letter-spacing: var(--label-tracking);  /* sport opens its labels up */
  text-transform: uppercase;       /* sport shouts in caps */
  color: var(--accent-ink);        /* dark-on-accent, the family's chip ink */
  max-width: calc(96px * var(--scale));  /* a long kicker wraps rather than stretching the chip */
}

${bugSlotCss({ width: 124, height: 46, mark: 'slab', radius: '0' })}

${rotationStageCss(124, 46)}

/* The placeholder block is quiet: it marks the slot, it is not a shape in the design. */
.corner-bug-mark {
  opacity: 0.3;                    /* clearly a placeholder until a file is picked */
}

/* The stage keeps its own air inside the slab. */
.corner-bug-stage {
  margin: calc(12px * var(--scale)) calc(20px * var(--scale));  /* air around the mark */
}`,

      hasAccent: true,
    };
  },
);
