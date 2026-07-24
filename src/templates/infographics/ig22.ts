// ig22 "House Goal" — the NoaCG goal meter, sibling of lt11 "House Strap" / ig08 "House
// Schedule". The house void panel carrying a fundraising or subscriber goal: a mono label, one
// huge grouped figure behind its unit mark, a percent readout held on the right, a progress
// track, and the target caption under it.
//
// It is the house counterpart of ig05 "Rising Total" (minimal) and shares its two-number
// contract exactly — raised (#f0) and the hidden goal (#f1) — through the shared rebuild in
// dataRuntimes.ts. A goal meter has no third number: everything else on the panel is derived,
// which is what keeps an operator's job to typing two figures.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { goalRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

export const ig22: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig22',
    category: 'infographic',
    name: 'House Goal',
    styleTag: 'noacg',
    description: 'A goal meter: the running total over a progress bar toward a target, with the share.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Raised', sample: '124213' },
      { title: 'Goal', sample: '250000' },
    ],
    logo: 'none',
    animationPresets: ['count-up'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Goal',
    description:
      'The NoaCG goal meter: an 8px amber bar fused to a void blur panel, a mono label over one ' +
      'huge grouped total with its unit mark, the share of the goal held on the right, then a ' +
      'progress track and the "of <target>" caption. Type plain numbers into Raised and Goal — ' +
      'the share, the grouping and the caption are all worked out from them. Set the Unit field ' +
      'to a currency mark for an appeal, or clear it for a subscriber or sign-up goal.',
    uicolor: '4',
  },
  (o) => {
    const raisedText = o.lines[0]?.sample || '124213';
    const goalText = o.lines[1]?.sample || '250000';
    return {
      html: `    <!-- House Goal: [amber bar] | [void panel: label / figure + share / track / caption]. -->
    <div class="infographic-accent"></div>
    <div class="infographic-box">
      <!-- The label — what is being counted (field f2). -->
      <div class="infographic-kicker" id="f2">TOTAL RAISED</div>
      <!-- The headline row: the unit mark and the counting figure on the left, the share right. -->
      <div class="infographic-head">
        <div class="infographic-figure">
          <!-- The unit mark — its own field, so a subscriber goal simply clears it (:empty). -->
          <span class="infographic-unit" id="f3">&euro;</span>
          <!-- The total — the count-up preset tweens this element's text from 0. -->
          <span class="infographic-value" id="f0">${raisedText}</span>
        </div>
        <!-- The share — written by the rebuild, never typed. -->
        <span class="infographic-percent" id="infographic-percent"></span>
      </div>
      <!-- The progress track — the count-up preset grows the fill to its data-value percent. -->
      <div class="infographic-track">
        <div class="infographic-bar-fill" data-value="0"></div>
      </div>
      <!-- The target caption — "of €250,000", written by the rebuild. -->
      <div class="infographic-goal-line" id="infographic-goal-line"></div>
    </div>
    <!-- Hidden goal source — SPX writes field f1 here; the rebuild reads it. -->
    <div id="f1" style="display: none">${goalText}</div>`,

      css: `/* The accent bar — the house 8px amber edge with its one restrained glow. */
.infographic-accent {
  position: absolute;              /* pinned inside the positioned .infographic root */
  left: 0;                         /* at the very left edge */
  top: 0;                          /* full panel height… */
  bottom: 0;                       /* …top to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* The panel — the house void. A minimum width keeps the track a stable run behind short totals. */
.infographic-box {
  min-width: calc(660px * var(--scale));  /* the meter reads as a meter even at €12 raised */
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(24px * var(--scale)) calc(40px * var(--scale)) calc(24px * var(--scale)) calc(28px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}

/* The label — the house mono caps line naming what is counted. */
.infographic-kicker {
  font-family: var(--font-label);  /* the house label face */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                /* bold keeps small caps legible over video */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}

/* The headline row — the figure on the left, the share held apart on the right. */
.infographic-head {
  display: flex;                   /* figure and share share one row */
  justify-content: space-between;  /* the figure hugs left, the share hugs right */
  align-items: baseline;           /* both sit on the same text baseline */
  gap: calc(32px * var(--scale));  /* distinct figures keep distinct space between them */
  margin-top: calc(6px * var(--scale));  /* label and figure read as one unit */
}

/* The figure block — the unit mark rests on the total's baseline. */
.infographic-figure {
  display: flex;                   /* mark and figure sit side by side */
  align-items: baseline;           /* the small mark rests on the figure's baseline */
  gap: calc(8px * var(--scale));   /* a thin seam between mark and figure */
  min-width: 0;                    /* let an enormous total wrap rather than widen the panel */
}

/* The unit mark — static and dimmed: a unit, not part of the counting number.
   Empty field = no mark at all (:empty), which is how a subscriber goal drops it. */
.infographic-unit {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* clearly subordinate to the figure */
  font-weight: 600;                /* semibold so a thin currency glyph stays visible */
  color: var(--text-dim);          /* dimmed — the total carries the weight */
}
.infographic-unit:empty {
  display: none;                   /* no unit = no mark, and no gap left behind */
}

/* The total — the panel's one enormous number; the count-up preset tweens it from 0. */
.infographic-value {
  font-size: calc(96px * var(--scale) * var(--type-scale));  /* the whole design IS this number (1080p reference) */
  font-weight: 700;                /* bold — the panel's single heavy element */
  line-height: 1;                  /* no dead leading — the track sets the gap below */
  letter-spacing: -0.02em;         /* very large glyphs tighten */
  font-variant-numeric: tabular-nums;  /* digits keep one width — no jitter while counting */
  overflow-wrap: break-word;       /* an absurdly long figure breaks instead of overflowing */
  color: var(--text-color);        /* primary text color */
}

/* The share — the derived percent, in the accent: the one number nobody typed. */
.infographic-percent {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* large, but clearly under the total */
  font-weight: 700;                /* bold — it is a headline figure of its own */
  font-variant-numeric: tabular-nums;  /* equal-width digits across updates */
  white-space: nowrap;             /* "100%" never wraps */
  color: var(--accent);            /* the accent's main text moment */
}

/* The track — a lane the accent fill grows inside. */
.infographic-track {
  height: calc(12px * var(--scale));  /* thicker than the minimal meter: the house has weight */
  margin-top: calc(20px * var(--scale));  /* air between the figure and the bar */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: rgba(255, 255, 255, 0.12);  /* the empty lane over the void panel */
  overflow: hidden;                /* the growing fill is clipped to the lane */
}

/* The fill — the preset grows its width from 0% to its data-value percent.
   Deliberate deviation from the "transform/opacity only" motion rule: the fill tweens WIDTH
   because scaleX would squash its end cap; the lane is a clipped 12px strip, so relayout
   stays cheap. */
.infographic-bar-fill {
  width: 0;                        /* fallback — the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  border-radius: inherit;          /* the growing end matches the lane's rounding */
  background: var(--accent);       /* the bar is the accent's main surface */
  box-shadow: var(--accent-glow);  /* the house glow, along the bar */
  will-change: width;              /* hint for the width tween (the deviation noted above) */
}

/* The target caption — what the meter is running toward, written by the rebuild. */
.infographic-goal-line {
  font-family: var(--font-label);  /* the house label face — a target reads as data */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* caption scale under the track */
  font-weight: 400;                /* regular — it is the quiet half of the meter */
  font-variant-numeric: tabular-nums;  /* equal-width digits across updates */
  margin-top: calc(12px * var(--scale));  /* small gap down from the track */
  color: var(--text-dim);          /* dimmed — never full white twice */
}`,

      fields: [
        { field: 'f0', ftype: 'textfield', title: o.lines[0]?.title || 'Raised', value: raisedText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Goal', value: goalText },
        { field: 'f2', ftype: 'textfield', title: 'Label', value: 'TOTAL RAISED' },
        { field: 'f3', ftype: 'textfield', title: 'Unit', value: '€' },
      ],

      runtimeExtraJs: goalRuntimeJs('bar'),
    };
  },
);
