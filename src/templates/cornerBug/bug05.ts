// bug05 "House Ident" — the NoaCG station/show ident: the amber bar, the channel logo, and
// the channel name over the show it is running. The identity bug a channel leaves up for a
// whole segment, so it is drawn small and quiet: one accent moment, mono show line, void
// panel. Sibling of lt11 House Strap and bug02 House Clock. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug05: TemplateVariant = defineBugVariant(
  {
    id: 'bug05',
    category: 'corner-bug',
    name: 'House Ident',
    styleTag: 'noacg',
    description: 'The house station ident: an amber bar, the channel logo, the channel over its show.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Channel', sample: 'NOACG TV' },
      { title: 'Show', sample: 'THE MORNING LINE' },
    ],
    logo: 'built-in',
    animationPresets: ['slide-right', 'fade', 'blur-in', 'slide-up', 'slide-down', 'pop-spring'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'top-left',
  },
  {
    name: 'House Ident',
    description:
      'The house identity mark: an amber edge bar, the channel logo (or the three-bar house ' +
      'placeholder), and the channel name over the show currently on air — all on the void ' +
      'panel, sized to sit in the corner for a whole segment.',
    uicolor: '4',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist"): its id comes after every wizard field
    // so nothing collides. Empty = the three-bar house mark shows instead.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Logo',
    };

    return {
      html: `    <!-- House Ident: the amber bar, the logo, then the channel over its show. -->
    <div class="corner-bug-box">
      <!-- The accent bar lives INSIDE the panel, so it travels with it on every entrance. -->
      <div class="corner-bug-accent"></div>
${bugSlotHtml(slot, 'bars')}
      <div class="corner-bug-text">
${bugLineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* The accent bar — the house's single colour moment, fused to the panel's left edge.
   It sits inside the panel so entrance presets carry the two as one piece. */
.corner-bug-accent {
  position: absolute;              /* pinned inside the panel */
  left: 0;                         /* flush with the panel's left edge */
  top: 0;                          /* …from the top… */
  bottom: 0;                       /* …to the bottom: the bar is the panel's height */
  width: var(--accent-weight);     /* the family's bar thickness */
  background: var(--accent);       /* the one accent colour */
  box-shadow: var(--accent-glow);  /* the house glow, on the accent only */
}

/* The panel — the house void tint behind a horizontal lockup: mark, then the text column. */
.corner-bug-box {
  position: relative;              /* the accent bar positions against this */
  display: flex;                   /* the mark and the text sit side by side */
  align-items: center;             /* both centered on the lockup's axis */
  gap: calc(14px * var(--scale));  /* air between the mark and the text */
  padding: calc(14px * var(--scale)) calc(20px * var(--scale));  /* even air inside the panel */
  padding-left: calc(20px * var(--scale) + var(--accent-weight));  /* clear the accent bar */
  background: var(--panel-bg);     /* the void panel */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the house panel is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's lift */
}

${bugSlotCss({ width: 52, height: 36, mark: 'bars', radius: '0', align: 'left center' })}

/* The text column — the channel over the show, left-aligned against the mark. */
.corner-bug-text {
  display: flex;                   /* the two lines stack… */
  flex-direction: column;          /* …top to bottom */
  text-align: left;                /* both lines hug the same edge (overrides the zone) */
}

/* The channel (f0) — the name the viewer should recognise at a glance. */
.corner-bug-name {
  font-size: calc(22px * var(--scale) * var(--type-scale));   /* compact — a mark, not a title */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* channel names read as marks */
  color: var(--text-color);        /* primary text */
}

/* The show (f1) — the mono house label voice, clearly subordinate. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(4px * var(--scale));  /* the two lines read as one lockup */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(13px * var(--scale) * var(--type-scale));   /* tiny label size */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.25;               /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* the house label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* the house carries the accent in the label */
}`,

      hasAccent: true,
    };
  },
);
