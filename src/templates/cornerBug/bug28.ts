// bug28 "Session Bug" — the MINIMAL event ident: no panel. The event logo, a thin accent rule,
// then the event name over its session or venue line, straight on the video. The mark a
// conference, lecture or ceremony stream can leave up all day. Sibling of lt01 Hairline.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug28: TemplateVariant = defineBugVariant(
  {
    id: 'bug28',
    category: 'corner-bug',
    name: 'Session Bug',
    styleTag: 'minimal',
    description: 'A panel-free event mark: the logo, a thin rule, the event over its session line.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Event', sample: 'Annual Conference' },
      { title: 'Detail', sample: 'SESSION 4 · AUDITORIUM' },
    ],
    logo: 'built-in',
    animationPresets: ['fade', 'slide-left', 'blur-in', 'slide-down', 'slide-up'],
    // Ivory, not Porcelain: this design has no panel, so its text sits straight on the video
    // and has to be the light one of the two minimal palettes.
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'top-right',
  },
  {
    name: 'Session Bug',
    description:
      'No panel: the event logo (or a hairline keyline placeholder) sits bare on the video, ' +
      'divided by a thin accent rule from the event name and its session, room or venue line. ' +
      'Whitespace does the work; soft shadows carry it over bright footage.',
    uicolor: '2',
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
      html: `    <!-- Session Bug: no panel — logo, a thin accent rule, then event over session. -->
    <div class="corner-bug-box">
${bugSlotHtml(slot, 'keyline')}
      <!-- The accent rule — the design's single colour moment (minimal geometry). -->
      <div class="corner-bug-accent"></div>
      <div class="corner-bug-text">
${bugLineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: [bugSlotField(slot)],

      css: `/* No panel here: a bare horizontal lockup over the video — mark, rule, text. */
.corner-bug-box {
  display: flex;                   /* the three pieces sit side by side */
  align-items: center;             /* all centred on the lockup's axis */
  gap: calc(13px * var(--scale));  /* even air between the pieces */
}

${bugSlotCss({ width: 44, height: 44, mark: 'keyline' })}

/* The logo carries its own shadow here — there is no panel to lift it off the video. */
.corner-bug-logo {
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));  /* readable over bright footage */
}

/* The accent rule — a short vertical hairline dividing the mark from the text. */
.corner-bug-accent {
  width: var(--accent-weight);     /* the family's hairline weight */
  height: calc(38px * var(--scale));  /* a short stroke, not a full-height edge */
  background: var(--accent);       /* the one accent colour */
  flex: none;                      /* never squeezed by the text beside it */
}

/* The text column — the event over its session line. */
.corner-bug-text {
  display: flex;                   /* the two lines stack… */
  flex-direction: column;          /* …top to bottom */
  text-align: left;                /* both lines hug the same edge (overrides the zone) */
}

/* The event name (f0) — the line the viewer reads first. */
.corner-bug-name {
  font-size: calc(18px * var(--scale) * var(--type-scale));   /* compact — a mark, not a title */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

/* The detail (f1) — the session, room or venue, as a tiny tracked caps label. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(4px * var(--scale));  /* the two lines read as one lockup */
  font-size: calc(11px * var(--scale) * var(--type-scale));   /* clearly subordinate */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.3;                /* air if it wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* minimal keeps its labels dim */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}`,

      hasAccent: true,
    };
  },
);
