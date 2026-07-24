// ig13 "Clean Poll" — the MINIMAL poll board, sibling of lt01 "Hairline" / ig06 "Schedule
// Board". One quiet near-black panel holding a horizontal bar chart: an accent tracking-caps
// heading over a dim keyline, then label/value rows with slim rounded tracks whose accent
// fills grow to each value. Same bars rebuild as ig02 (dataRuntimes.ts), in the minimal skin.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';
import { barsRuntimeJs } from './dataRuntimes';

const BARS_SAMPLE = 'Agree | 64\nNeutral | 22\nDisagree | 14';

export const ig13: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig13',
    category: 'infographic',
    name: 'Clean Poll',
    styleTag: 'minimal',
    description: 'A quiet dark panel bar chart: an accent heading over slim growing bars.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Bars', sample: BARS_SAMPLE },
      { title: 'Heading', sample: 'VIEWER POLL' },
    ],
    logo: 'none',
    animationPresets: ['bars-grow'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-left',
  },
  {
    name: 'Clean Poll',
    description:
      'The minimal poll board, sibling of lt01 Hairline and ig06 Schedule Board: one ' +
      'restrained near-black panel with an accent tracking-caps heading over a dim keyline, ' +
      'and label/value rows whose slim rounded accent fills grow to each value. Type one ' +
      '"Label | value" line per bar (values 0-100).',
    uicolor: '1',
  },
  (o) => {
    const barsText = o.lines[0]?.sample || BARS_SAMPLE;
    const headingText = o.lines[1]?.sample || 'VIEWER POLL';

    return {
      html: `    <!-- Clean Poll: one dark panel — caps heading, keyline, the bar rows below. -->
    <div class="infographic-box">
      <!-- Heading — the panel's accent tracking-caps kicker (SPX writes field f1 here). -->
      <div class="infographic-heading" id="f1">${headingText}</div>
      <!-- The rule — a dim keyline under the heading. -->
      <div class="infographic-rule"></div>
      <!-- Bar rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-bars"></div>
    </div>
    <!-- Hidden bars source — SPX writes field f0 here; JS renders it. One "Label | value" per line. -->
    <div id="f0" class="noacg-data-source">${barsText}</div>`,

      css: `/* The panel — restrained and near-black: the minimal family's quiet slab (lt01's sibling). */
.infographic-box {
  width: calc(560px * var(--scale));  /* fixed chart width — the tracks need a stable length */
  box-sizing: border-box;          /* padding stays inside the fixed width */
  padding: calc(28px * var(--scale)) calc(34px * var(--scale));  /* generous inner air */
  background: var(--panel-bg);     /* the palette's near-black panel — retints via the :root contract */
  border-radius: var(--panel-radius);  /* the family's near-square radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the authored edge and family lift */
}

/* Heading — the accent tracking-wide caps kicker, the panel's loudest color moment. */
.infographic-heading {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* kicker scale — a label, not a headline */
  font-weight: 700;                /* bold keeps small caps legible */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--accent);            /* the heading wears the accent */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* The rule — a thin dim keyline under the heading. */
.infographic-rule {
  height: 1px;                     /* a true keyline — 1px at every resolution */
  margin: calc(16px * var(--scale)) 0 calc(22px * var(--scale));  /* air above and below */
  background: rgba(255, 255, 255, 0.16);  /* dim, not accent — the color stays in the caps and fills */
}

/* The chart — bar rows stacked with even air between them. */
#infographic-bars {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one bar row under another */
  gap: calc(18px * var(--scale));  /* even rhythm between the rows */
}

/* Head line of a row: label on the left, value figure on the right. */
.infographic-bar-head {
  display: flex;                   /* label and value share one line */
  justify-content: space-between;  /* label hugs left, value hugs right */
  align-items: baseline;           /* both sit on the same baseline */
  gap: calc(24px * var(--scale));  /* never let label and value touch */
  margin-bottom: calc(8px * var(--scale));  /* small gap down to the track */
}

/* The bar's label — the primary reading line of each row. */
.infographic-bar-label {
  min-width: 0;                    /* allow the label to shrink and wrap inside flex */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* clearly bigger than the heading kicker */
  font-weight: 600;                /* semibold carries the row */
  line-height: 1.25;               /* a touch of leading in case a long label wraps */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* The value figure — the number the bar visualizes. */
.infographic-bar-value {
  flex-shrink: 0;                  /* long labels never squeeze the figure */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* same size as the label… */
  font-weight: 700;                /* …contrast through weight, not more fonts */
  font-variant-numeric: tabular-nums;  /* equal-width digits — figures align across rows */
  color: var(--text-color);        /* primary text color */
}

/* The track — a slim rounded lane the fill grows inside. */
.infographic-bar-track {
  height: calc(10px * var(--scale));  /* a slim minimal lane */
  border-radius: 999px;            /* full pill — a cap, not a size, so it is not scaled */
  background: rgba(255, 255, 255, 0.10);  /* a quiet lane on the near-black panel */
  overflow: hidden;                /* the growing fill is clipped to the lane */
}

/* The fill — the preset grows its width from 0% to its data-value percent. */
.infographic-bar-fill {
  width: 0;                        /* fallback — the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  border-radius: inherit;          /* the growing end stays rounded like the lane */
  background: var(--accent);       /* the bars are the accent moment of this graphic */
  will-change: width;              /* hint for the width tween */
}`,

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Bars', value: barsText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Heading', value: headingText },
      ],

      // Shared bars rebuild — one "Label | value" per line (dataRuntimes.ts).
      runtimeExtraJs: barsRuntimeJs(),
    };
  },
);
