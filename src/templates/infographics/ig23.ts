// ig23 "Frost Goal" — the GLASS goal meter, sibling of lt08 "Frosted Card" / ig04 "Poll Ring".
// The same frosted panel and the same ring geometry as the poll board, pointed at a different
// question: not "what share said yes" but "how far along is the appeal".
//
// THE DIFFERENCE THAT MATTERS, and the reason this is its own design and its own preset: on the
// poll ring the figure in the middle IS the percent, so one number drives both the ring and the
// counter. On a goal meter the middle figure is money and the ring's angle is raised/goal —
// two different numbers in one motion. 'goal-ring' + infographicGoalRing() are exactly that
// distinction made real; reusing 'ring-fill' here would have drawn a full ring at 3% raised.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { goalRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

export const ig23: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig23',
    category: 'infographic',
    name: 'Frost Goal',
    styleTag: 'glass',
    description: 'A goal ring: the accent draws to the share of the target while the total counts up.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Raised', sample: '8420' },
      { title: 'Goal', sample: '15000' },
    ],
    logo: 'none',
    animationPresets: ['goal-ring'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-right',
  },
  {
    name: 'Frost Goal',
    description:
      'A translucent frosted panel holding a goal ring: a label on top, then an accent ring that ' +
      'draws to the share of the target while the running total counts up in its centre, and the ' +
      '"of <target>" caption beneath. Type plain numbers into Raised and Goal; the share and the ' +
      'caption are derived. Set the Unit field to a currency mark, or clear it for a subscriber goal.',
    uicolor: '5',
  },
  (o) => {
    const raisedText = o.lines[0]?.sample || '8420';
    const goalText = o.lines[1]?.sample || '15000';
    return {
      html: `    <!-- Frost Goal: one frosted panel — [label] over [ring around the total] over [caption]. -->
    <div class="infographic-box">
      <!-- The label — what is being counted (field f2). -->
      <div class="infographic-kicker" id="f2">RAISED SO FAR</div>
      <!-- The ring block — SVG donut with the total centered inside it. -->
      <div class="infographic-ring">
        <svg class="infographic-ring-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <!-- The track — the dim full circle the accent ring draws over. -->
          <circle class="infographic-ring-track" cx="100" cy="100" r="86" />
          <!-- The fill — pathLength 100 makes the dash math read as percent:
               dashoffset 100 = empty, dashoffset 100 - percent = filled to that percent.
               data-value carries raised/goal, written by the rebuild; the SVG-attribute
               rotation only moves the start point from 3 o'clock to 12 o'clock. -->
          <circle class="infographic-ring-fill" cx="100" cy="100" r="86" pathLength="100"
                  data-value="0" stroke-dasharray="100" stroke-dashoffset="100"
                  transform="rotate(-90 100 100)" />
        </svg>
        <!-- The readout — stacked in the ring's hole: the total, then the derived share. -->
        <div class="infographic-readout">
          <div class="infographic-figure">
            <!-- The unit mark — its own field, so a subscriber goal simply clears it (:empty). -->
            <span class="infographic-unit" id="f3">&pound;</span>
            <!-- The total — the goal-ring preset counts this element's text from 0. -->
            <span class="infographic-value" id="f0">${raisedText}</span>
          </div>
          <!-- The share — written by the rebuild, never typed. -->
          <div class="infographic-percent" id="infographic-percent"></div>
        </div>
      </div>
      <!-- The target caption — "of £15,000", written by the rebuild. -->
      <div class="infographic-goal-line" id="infographic-goal-line"></div>
    </div>
    <!-- Hidden goal source — SPX writes field f1 here; the rebuild reads it. -->
    <div id="f1" style="display: none">${goalText}</div>`,

      css: `/* The panel — the glass family's translucent recipe, a centred column. */
.infographic-box {
  display: flex;                   /* a simple column: label over ring over caption */
  flex-direction: column;          /* stacked top to bottom */
  align-items: center;             /* a centred meter — everything shares one axis */
  padding: calc(30px * var(--scale)) calc(44px * var(--scale));  /* generous inner air */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: var(--panel-bg);     /* the translucent white wash */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop blur — this IS the glass */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The label — quiet tracked caps naming what is counted. */
.infographic-kicker {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                /* bold keeps small caps legible over video */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-align: center;              /* the whole stack is centre-axis */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}

/* The ring block — the SVG and the readout share one square. */
.infographic-ring {
  position: relative;              /* the readout is centred against this square */
  width: calc(260px * var(--scale));   /* ring width… */
  height: calc(260px * var(--scale));  /* …and height: a true circle */
  margin-top: calc(18px * var(--scale));  /* air between the label and the ring */
}
.infographic-ring-svg {
  width: 100%;                     /* the SVG fills the square… */
  height: 100%;                    /* …both ways */
  display: block;                  /* no inline baseline gap under the SVG */
}

/* The track — the dim circle the accent draws over. */
.infographic-ring-track {
  fill: none;                      /* a ring, not a disc */
  stroke: rgba(255, 255, 255, 0.16);  /* the empty lane over the glass */
  stroke-width: 14;                /* in the viewBox's own units */
}

/* The fill — the accent ring the preset draws to data-value percent. */
.infographic-ring-fill {
  fill: none;                      /* a ring, not a disc */
  stroke: var(--accent);           /* the accent's main surface in this panel */
  stroke-width: 14;                /* matches the track exactly */
  stroke-linecap: round;           /* a soft leading end — the glass family never cuts square */
}

/* The readout — centred in the ring's hole. */
.infographic-readout {
  position: absolute;              /* over the SVG… */
  inset: 0;                        /* …across the whole square */
  display: flex;                   /* the figure over the share… */
  flex-direction: column;          /* …stacked */
  align-items: center;             /* centred horizontally */
  justify-content: center;         /* and vertically, in the hole */
}

/* The figure block — the unit mark rests on the total's baseline. */
.infographic-figure {
  display: flex;                   /* mark and figure sit side by side */
  align-items: baseline;           /* the small mark rests on the figure's baseline */
  gap: calc(4px * var(--scale));   /* a thin seam between mark and figure */
  max-width: calc(190px * var(--scale));  /* the ring's hole — a long total wraps inside it */
}

/* The unit mark — static and dimmed. Empty field = no mark at all (:empty). */
.infographic-unit {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* clearly subordinate to the figure */
  font-weight: 600;                /* semibold so a thin currency glyph stays visible */
  color: var(--text-dim);          /* dimmed — the total carries the weight */
}
.infographic-unit:empty {
  display: none;                   /* no unit = no mark, and no gap left behind */
}

/* The total — the number in the middle; the goal-ring preset counts it from 0. */
.infographic-value {
  font-size: calc(56px * var(--scale) * var(--type-scale));  /* it must fit the ring's hole */
  font-weight: 700;                /* bold — the panel's single heavy element */
  line-height: 1.02;               /* no dead leading inside the hole */
  letter-spacing: -0.01em;         /* large glyphs tighten */
  font-variant-numeric: tabular-nums;  /* digits keep one width — no jitter while counting */
  overflow-wrap: break-word;       /* an absurdly long figure breaks instead of escaping the ring */
  color: var(--text-color);        /* primary text color */
}

/* The share — the derived percent under the total, in the accent. */
.infographic-percent {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* clearly under the total */
  font-weight: 700;                /* bold — it is a figure, not a caption */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  margin-top: calc(4px * var(--scale));  /* total and share read as one unit */
  color: var(--accent);            /* the accent's text moment */
}

/* The target caption — what the ring is running toward, written by the rebuild. */
.infographic-goal-line {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* caption scale under the ring */
  font-weight: 400;                /* regular — it is the quiet half of the meter */
  font-variant-numeric: tabular-nums;  /* equal-width digits across updates */
  text-align: center;              /* the whole stack is centre-axis */
  margin-top: calc(16px * var(--scale));  /* air between the ring and the caption */
  color: var(--text-dim);          /* dimmed — never full white twice */
}`,

      fields: [
        { field: 'f0', ftype: 'textfield', title: o.lines[0]?.title || 'Raised', value: raisedText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Goal', value: goalText },
        { field: 'f2', ftype: 'textfield', title: 'Label', value: 'RAISED SO FAR' },
        { field: 'f3', ftype: 'textfield', title: 'Unit', value: '£' },
      ],

      runtimeExtraJs: goalRuntimeJs('ring'),
    };
  },
);
