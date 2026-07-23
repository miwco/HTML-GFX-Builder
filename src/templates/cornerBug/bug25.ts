// bug25 "House Event Bug" — the NoaCG event ident: the event logo, the event name, and the
// day/venue line beneath it, on the house void panel. The mark a conference, festival or
// tournament leaves in the corner for a whole session. Sibling of lt11 House Strap and bug05
// House Ident. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug25: TemplateVariant = defineBugVariant(
  {
    id: 'bug25',
    category: 'corner-bug',
    name: 'House Event Bug',
    styleTag: 'noacg',
    description: 'The house event mark: the event logo, its name, and the day or venue beneath.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Event', sample: 'SUMMER SUMMIT 2026' },
      { title: 'Detail', sample: 'DAY 2 · MAIN HALL' },
    ],
    logo: 'built-in',
    animationPresets: ['slide-left', 'fade', 'blur-in', 'slide-down', 'pop-spring'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'top-right',
  },
  {
    name: 'House Event Bug',
    description:
      'The house event ident: the event logo (or the three-bar house placeholder) beside the ' +
      'event name, with the day, session or venue as a mono line underneath — on the void ' +
      'panel, sized to sit in the corner through a whole session.',
    uicolor: '4',
  },
  (o) => {
    // The event logo is a real SPX image field ("filelist"); its id comes after every wizard
    // field so nothing collides.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Event logo',
    };

    return {
      html: `    <!-- House Event Bug: the event logo, then the event name over its day/venue line. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'bars')}
      <div class="corner-bug-text">
${bugLineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void tint behind a horizontal lockup: mark, then the text column. */
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

${bugSlotCss({ width: 46, height: 46, mark: 'bars', radius: '0' })}

/* The text column — the event over its detail line. */
.corner-bug-text {
  display: flex;                   /* the two lines stack… */
  flex-direction: column;          /* …top to bottom */
  text-align: left;                /* both lines hug the same edge (overrides the zone) */
}

/* The event name (f0) — the line the viewer reads first. */
.corner-bug-name {
  font-size: calc(19px * var(--scale) * var(--type-scale));   /* compact — a mark, not a title */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* event marks read as caps */
  color: var(--text-color);        /* primary text */
}

/* The detail (f1) — day, session or venue, in the mono house label voice. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(4px * var(--scale));  /* the two lines read as one lockup */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* clearly subordinate */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.25;               /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* the house label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* the house carries the accent in the label */
}`,

      hasAccent: false, // the accent moments are the placeholder bars and the detail line's colour
    };
  },
);
