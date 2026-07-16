// ig01 "Big Stat" — the minimal stat callout, sibling of lt01 (Hairline) / lt02 (Underline).
// No panel at all: one enormous figure floating over the picture, a short 3px accent rule,
// and a small tracking-wide caps label beneath it. Whitespace does all the work.
// Stat shape: plain fields written straight into #f0/#f1 — no rebuild JS needed.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';

export const ig01: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig01',
    category: 'infographic',
    name: 'Big Stat',
    styleTag: 'minimal',
    description: 'One enormous figure over a short accent rule and a quiet caps label.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Value', sample: '87%' },
      { title: 'Label', sample: 'Audience share' },
    ],
    logo: 'none',
    animationPresets: ['count-up'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-right',
  },
  {
    name: 'Big Stat',
    description:
      'The quietest infographic of the set and the sibling of lt01/lt02: no panel, just one ' +
      'huge tabular figure, a 3 px accent hairline, and a dimmed tracking-wide caps label. ' +
      'The count-up preset tweens the figure from zero to its value.',
    uicolor: '1',
  },
  (o) => {
    // The design owns its SPX fields — value first (f0 is what count-up tweens).
    const valueText = o.lines[0]?.sample || '87%';
    const labelText = o.lines[1]?.sample || 'Audience share';
    return {
      html: `    <!-- Big Stat: [enormous figure] over [short accent rule] over [caps label]. -->
    <div class="infographic-box">
      <!-- The figure — the count-up preset tweens this element's text from 0. -->
      <div class="infographic-value" id="f0">${valueText}</div>
      <!-- The rule — the design's single accent moment (a mark, not a divider). -->
      <div class="infographic-rule"></div>
      <!-- The label — small, dimmed, tracking-wide caps. -->
      <div class="infographic-label" id="f1">${labelText}</div>
    </div>`,
      css: `/* The callout: a plain vertical stack — no panel, whitespace does the work (lt01's sibling). */
.infographic-box {
  display: flex;                   /* a simple column of figure / rule / label */
  flex-direction: column;          /* stacked top to bottom */
  align-items: flex-end;           /* right-anchored zone — everything hangs off the right edge */
  text-align: right;               /* wrapped label rows keep the same right edge */
}

/* The figure — enormous and light: at this size regular weight already reads airy. */
.infographic-value {
  font-size: calc(150px * var(--scale) * var(--type-scale)); /* the whole design IS this number (1080p reference) */
  font-weight: 400;                /* regular — at 150px it already reads light and airy */
  line-height: 1;                  /* no dead leading — the rule sets the gap below */
  letter-spacing: -0.02em;         /* very large glyphs tighten */
  font-variant-numeric: tabular-nums; /* digits keep one width — no jitter while counting up */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break a very long unbroken value */
  text-wrap: balance;              /* if it ever wraps, rows get even lengths */
}

/* The rule — a short 3px accent hairline: a mark under the figure, never a full-width bar. */
.infographic-rule {
  width: calc(84px * var(--scale));   /* short on purpose — echoes lt02's underline */
  height: calc(3px * var(--scale));   /* hairline weight (family token: 2-4px) */
  margin: calc(20px * var(--scale)) 0 calc(14px * var(--scale)); /* air above and below */
  background: var(--accent);       /* the one small, sharp dose of accent color */
}

/* The label — quiet tracking-wide caps, clearly subordinate to the figure. */
.infographic-label {
  font-size: calc(21px * var(--scale) * var(--type-scale)); /* kicker scale — a caption, not a headline */
  font-weight: 400;                /* light; the figure carries all the weight */
  line-height: 1.35;               /* relaxed leading in case it wraps */
  letter-spacing: 0.16em;          /* wide tracking — small caps breathe */
  margin-right: -0.16em;           /* cancel the trailing tracking so caps end flush right */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dimmed — never full white twice */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}`,
      fields: [
        { field: 'f0', ftype: 'textfield', title: o.lines[0]?.title || 'Value', value: valueText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Label', value: labelText },
      ],
      runtimeExtraJs: '', // stat shape: update() writes fields straight in — no rebuild needed
    };
  },
);
