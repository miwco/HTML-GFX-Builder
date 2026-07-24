// bug08 "Rule Ident" — the MINIMAL station/show ident, the corner-scale sibling of lt01
// Hairline and bug04 Hairline Bug. No panel at all: the logo, a short accent rule as the
// divider, then the channel over the show, straight on the video. Whitespace does the work and
// a soft text shadow carries it over bright footage. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { bugSlotCss, bugSlotField, bugSlotHtml } from './parts';

export const bug08: TemplateVariant = defineBugVariant(
  {
    id: 'bug08',
    category: 'corner-bug',
    name: 'Rule Ident',
    styleTag: 'minimal',
    description: 'A panel-free ident: the logo, a thin accent rule, the channel over its show.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Channel', sample: 'CITY NEWS' },
      { title: 'Show', sample: 'THE BRIEFING' },
    ],
    logo: 'built-in',
    animationPresets: ['fade', 'slide-right', 'blur-in', 'slide-down', 'slide-up'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'top-left',
  },
  {
    name: 'Rule Ident',
    description:
      'No panel: the channel logo (or a hairline keyline placeholder) sits bare over the video, ' +
      'separated from the channel name and its show by a thin vertical accent rule. Text ' +
      'shadows keep it readable on bright footage. Sibling of the lt01 Hairline.',
    uicolor: '2',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist"); its id comes after every wizard field.
    const slot = {
      field: `f${o.lines.length + o.extraFields.length}`,
      path: o.logoAssetPath ?? '',
      title: 'Logo',
    };

    return {
      html: `    <!-- Rule Ident: no panel — logo, a thin accent rule, then channel over show. -->
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
  align-items: center;             /* all centered on the lockup's axis */
  gap: calc(14px * var(--scale));  /* even air between the pieces */
}

${bugSlotCss({ width: 46, height: 46, mark: 'keyline' })}

/* The logo carries its own shadow here — there is no panel to lift it off the video. */
.corner-bug-logo {
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));  /* readable over bright footage */
}

/* The accent rule — a short vertical hairline dividing the mark from the text. */
.corner-bug-accent {
  width: var(--accent-weight);     /* the family's hairline weight */
  height: calc(40px * var(--scale));  /* a short stroke, not a full-height edge */
  background: var(--accent);       /* the one accent colour */
  flex: none;                      /* never squeezed by the text beside it */
}

/* The text column — the channel over the show, left-aligned against the rule. */
.corner-bug-text {
  display: flex;                   /* the two lines stack… */
  flex-direction: column;          /* …top to bottom */
  text-align: left;                /* both lines hug the same edge (overrides the zone) */
}

/* The channel (f0) — the name the viewer should recognise at a glance. */
.corner-bug-name {
  font-size: calc(20px * var(--scale) * var(--type-scale));   /* compact — a mark, not a title */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

/* The show (f1) — a tiny tracked caps label under the channel. */
.corner-bug-title,
.corner-bug-extra {
  margin-top: calc(4px * var(--scale));  /* the two lines read as one lockup */
  font-size: calc(12px * var(--scale) * var(--type-scale));   /* clearly subordinate */
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
