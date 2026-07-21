// ig11 "House Poll" — the NoaCG poll board, sibling of lt11 "House Strap" / ig08 "House
// Schedule". The house void panel holding a horizontal bar chart: a mono accent heading over
// an amber top edge, then label/value rows with amber fills that grow to each value. Same bars
// rebuild as ig02 (dataRuntimes.ts), in the house skin.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineInfographicVariant } from './shared';
import { barsRuntimeJs } from './dataRuntimes';

const BARS_SAMPLE = 'Streaming | 78\nBroadcast | 54\nOn demand | 36';

export const ig11: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig11',
    category: 'infographic',
    name: 'House Poll',
    styleTag: 'noacg',
    description: 'The house poll board: a void panel with a mono heading and growing amber bars.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Bars', sample: BARS_SAMPLE },
      { title: 'Heading', sample: 'HOW WE WATCH' },
    ],
    logo: 'none',
    animationPresets: ['bars-grow'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-left',
  },
  {
    name: 'House Poll',
    description:
      'The NoaCG poll board, sibling of lt11 House Strap and ig08 House Schedule: the house ' +
      'void panel with an amber top edge, a tracked mono heading in the accent color, and ' +
      'label/value rows whose amber fills grow to each value. Type one "Label | value" line ' +
      'per bar (values 0-100).',
    uicolor: '4',
  },
  (o) => {
    const barsText = o.lines[0]?.sample || BARS_SAMPLE;
    const headingText = o.lines[1]?.sample || 'HOW WE WATCH';

    return {
      html: `    <!-- House Poll: void panel — mono heading on top, the bar rows below. -->
    <div class="infographic-box">
      <!-- Heading — the house mono accent kicker (SPX writes field f1 here). -->
      <div class="infographic-heading" id="f1">${headingText}</div>
      <!-- Bar rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-bars"></div>
    </div>
    <!-- Hidden bars source — SPX writes field f0 here; JS renders it. One "Label | value" per line. -->
    <div id="f0" style="display: none">${barsText}</div>`,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void with an amber top edge (the house strip). */
.infographic-box {
  width: calc(560px * var(--scale));  /* fixed chart width — the tracks need a stable length */
  box-sizing: border-box;          /* padding stays inside the fixed width */
  padding: calc(26px * var(--scale)) calc(32px * var(--scale));  /* generous inner air */
  background: var(--panel-bg);     /* the house void — retints via the :root contract */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house strip's amber top edge */
}

/* Heading — the house mono accent kicker. */
.infographic-heading {
  margin-bottom: calc(20px * var(--scale));  /* air before the first bar row */
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* small label size */
  font-weight: 500;                /* medium keeps tracked mono caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house's wide label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--label-color);       /* the label carries the accent */
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
  align-items: baseline;           /* both sit on the same text baseline */
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

/* The value figure — the number the bar visualizes, in the accent color. */
.infographic-bar-value {
  flex-shrink: 0;                  /* long labels never squeeze the figure */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* same size as the label… */
  font-weight: 700;                /* …contrast through weight */
  font-variant-numeric: tabular-nums;  /* equal-width digits — figures align across rows */
  color: var(--accent);            /* the figure wears the accent */
}

/* The track — a slim rgba-white lane the fill grows inside (house radius 6). */
.infographic-bar-track {
  height: calc(12px * var(--scale));  /* slim lane — the chart stays elegant */
  border-radius: calc(6px * var(--scale));  /* the house chip radius, not a full pill */
  background: rgba(255, 255, 255, 0.12);  /* translucent white lane on the void */
  overflow: hidden;                /* the growing fill is clipped to the lane */
}

/* The fill — the preset grows its width from 0% to its data-value percent.
   Width tweens (not scaleX) so the end stays crisp; the lane is a clipped strip. */
.infographic-bar-fill {
  width: 0;                        /* fallback — the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  border-radius: inherit;          /* the growing end matches the lane */
  background: var(--accent);       /* the bars are the accent moment of this graphic */
  box-shadow: var(--accent-glow);  /* the house glow along the fills */
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
