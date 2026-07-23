// bug32 "Laurel Bug" — the MINIMAL award mark: no panel. The award or festival logo inside a
// hairline accent ring, then the award word as a tiny kicker over the category, straight on the
// video. The quiet nominee/winner mark a ceremony or graduation stream can leave up.
//
// NOTE on the line order: this design leads with the KICKER (f0, "WINNER") and gives the
// display weight to the second line (f1, the category).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug32: TemplateVariant = defineBugVariant(
  {
    id: 'bug32',
    category: 'corner-bug',
    name: 'Laurel Bug',
    styleTag: 'minimal',
    description: 'A panel-free award mark: the logo in a hairline ring, the award word over its category.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Award', sample: 'WINNER' },
      { title: 'Category', sample: 'Short Film of the Year' },
    ],
    logo: 'built-in',
    animationPresets: ['fade', 'blur-in', 'slide-up', 'pop-spring', 'slide-right'],
    // Ivory, not Porcelain: with no panel the text sits straight on the video and has to be
    // the light one of the two minimal palettes.
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Laurel Bug',
    description:
      'No panel: the award or festival logo sits inside a hairline accent ring, with the award ' +
      'word as a tiny tracked-caps kicker over the category. Soft shadows carry it over bright ' +
      'footage — the quietest way to mark a nominee or a winner.',
    uicolor: '2',
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
      html: `    <!-- Laurel Bug: the ringed award logo, then the award kicker over its category. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'ring')}
      <div class="corner-bug-text">
${bugLineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* No panel here: a bare horizontal lockup over the video — the ringed mark, then text. */
.corner-bug-box {
  display: flex;                   /* the mark and the text sit side by side */
  align-items: center;             /* both centred on the lockup's axis */
  gap: calc(14px * var(--scale));  /* air between the mark and the text */
}

${bugSlotCss({ width: 52, height: 52, mark: 'ring', radius: '50%' })}

/* A picked logo keeps the ring — on an award mark the ring IS the badge, not a placeholder. */
.corner-bug-media.has-image .corner-bug-mark {
  display: block;                  /* overrides the shared rule: the ring stays under the logo */
}
.corner-bug-media.has-image .corner-bug-logo {
  padding: calc(7px * var(--scale));  /* the logo sits inside the ring, never across it */
}

/* The text column — the award kicker over the category. */
.corner-bug-text {
  display: flex;                   /* the two lines stack… */
  flex-direction: column;          /* …top to bottom */
  text-align: left;                /* both lines hug the same edge (overrides the zone) */
}

/* The award word (f0) — the KICKER: a tiny tracked-caps label. */
.corner-bug-name {
  font-size: calc(11px * var(--scale) * var(--type-scale));   /* tiny label size */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* minimal keeps its labels dim */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

/* The category (f1) — the line the viewer actually reads. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(4px * var(--scale));  /* the two lines read as one lockup */
  font-size: calc(18px * var(--scale) * var(--type-scale));   /* the lockup's display line */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}`,

      hasAccent: false, // the accent moment is the ring around the mark
    };
  },
);
