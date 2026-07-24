// ig12 "Volt Poll" — the SPORT poll board, sibling of lt06 "Split Bar" / card02 "Slab Card".
// A solid dark slab holding a horizontal bar chart: a heavy accent caps heading, then
// label/value rows with square-cut accent fills that grow to each value. Same bars rebuild as
// ig02 (dataRuntimes.ts), in the sport skin — zero radius throughout.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';
import { barsRuntimeJs } from './dataRuntimes';

const BARS_SAMPLE = 'HOME | 62\nAWAY | 38';

export const ig12: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig12',
    category: 'infographic',
    name: 'Volt Poll',
    styleTag: 'sport',
    description: 'A solid sport slab bar chart: heavy caps labels with square-cut accent fills.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Bars', sample: BARS_SAMPLE },
      { title: 'Heading', sample: 'POSSESSION' },
    ],
    logo: 'none',
    animationPresets: ['bars-grow'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-left',
  },
  {
    name: 'Volt Poll',
    description:
      'The sport poll board, sibling of lt06 Split Bar and card02 Slab Card: a solid dark slab ' +
      'with a heavy accent caps heading and label/value rows whose square-cut accent fills grow ' +
      'to each value. Type one "Label | value" line per bar (values 0-100).',
    uicolor: '5',
  },
  (o) => {
    const barsText = o.lines[0]?.sample || BARS_SAMPLE;
    const headingText = o.lines[1]?.sample || 'POSSESSION';

    return {
      html: `    <!-- Volt Poll: solid slab — heavy caps heading on top, the bar rows below. -->
    <div class="infographic-box">
      <!-- Heading — the slab's heavy accent caps kicker (SPX writes field f1 here). -->
      <div class="infographic-heading" id="f1">${headingText}</div>
      <!-- Bar rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-bars"></div>
    </div>
    <!-- Hidden bars source — SPX writes field f0 here; JS renders it. One "Label | value" per line. -->
    <div id="f0" class="noacg-data-source">${barsText}</div>`,

      css: `/* The slab — a solid dark board, zero radius: the sport family's hard panel. */
.infographic-box {
  width: calc(560px * var(--scale));  /* fixed chart width — the tracks need a stable length */
  box-sizing: border-box;          /* padding stays inside the fixed width */
  padding: calc(26px * var(--scale)) calc(32px * var(--scale));  /* generous inner air */
  background: var(--panel-bg);     /* the near-black slab — retints via the :root contract */
}

/* Heading — a heavy accent caps kicker (the sport family shouts its label). */
.infographic-heading {
  margin-bottom: calc(20px * var(--scale));  /* air before the first bar row */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* label size — a kicker, not a headline */
  font-weight: 700;                /* bold so the caps carry */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* sport shouts */
  color: var(--accent);            /* the heading wears the accent */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
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

/* The bar's label — heavy caps, the primary reading line of each row. */
.infographic-bar-label {
  min-width: 0;                    /* allow the label to shrink and wrap inside flex */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly bigger than nothing else competes */
  font-weight: var(--display-weight);  /* the family's heavy weight */
  line-height: 1.2;                /* a touch of leading if a label wraps */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* sport labels shout */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
}

/* The value figure — the number the bar visualizes, heavy and accent. */
.infographic-bar-value {
  flex-shrink: 0;                  /* long labels never squeeze the figure */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* same size as the label… */
  font-weight: var(--display-weight);  /* …the family's heavy weight */
  font-variant-numeric: tabular-nums;  /* equal-width digits — figures align across rows */
  color: var(--accent);            /* the figure wears the accent */
}

/* The track — a square-cut lane the fill grows inside (sport radius 0). */
.infographic-bar-track {
  height: calc(16px * var(--scale));  /* a chunkier sport lane */
  background: rgba(255, 255, 255, 0.12);  /* translucent white lane on the slab */
  overflow: hidden;                /* the growing fill is clipped to the lane */
}

/* The fill — the preset grows its width from 0% to its data-value percent (square-cut). */
.infographic-bar-fill {
  width: 0;                        /* fallback — the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
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
