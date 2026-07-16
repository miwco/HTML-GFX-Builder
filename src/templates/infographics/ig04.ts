// ig04 "Poll Ring" — glass style. A frosted glass panel (the infographic sibling of
// lt08 "Frosted Card" / lt09 "Gradient Pill") holding one poll result: the question in
// bold up top, then an accent ring that draws around a huge counting percentage with a
// small caps answer label beneath it. The 'ring-fill' preset drives ring + counter in
// sync. Stat shape: plain fields written straight into #f0/#f1/#f2 — no rebuild JS.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';

const QUESTION_SAMPLE = 'Should the city extend the late-night train service?';

export const ig04: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig04',
    category: 'infographic',
    name: 'Poll Ring',
    styleTag: 'glass',
    description: 'A frosted panel where an accent ring draws around a counting poll percentage.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Percentage', sample: '68' },
      { title: 'Answer label', sample: 'YES' },
    ],
    logo: 'none',
    animationPresets: ['ring-fill'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Poll Ring',
    description:
      'A translucent frosted panel — the sibling of the Frosted Card / Gradient Pill lower ' +
      'thirds — showing one poll result. The question sits on top; below it an accent ring ' +
      '(the glass family\'s ring geometry) draws to the percentage while the huge figure ' +
      'counts up, with the answer in quiet small caps underneath. Percentage is 0-100.',
    uicolor: '4',
  },
  (o) => {
    // The design owns its SPX fields — f0 first (ring-fill tweens #f0 and reads its number).
    const valueText = o.lines[0]?.sample || '68';
    const answerText = o.lines[1]?.sample || 'YES';
    return {
      html: `    <!-- Poll Ring: one frosted panel — [question] over [ring around figure + answer]. -->
    <div class="infographic-box">
      <!-- The question — the poll being answered (SPX writes field f2 here). -->
      <div class="infographic-question" id="f2">${QUESTION_SAMPLE}</div>
      <!-- The ring block — SVG donut with the readout centered inside it. -->
      <div class="infographic-ring">
        <svg class="infographic-ring-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <!-- The track — the dim full circle the accent ring draws over. -->
          <circle class="infographic-ring-track" cx="100" cy="100" r="86" />
          <!-- The fill — pathLength 100 makes the dash math read as percent:
               dashoffset 100 = empty, dashoffset 100 - percent = filled to that percent.
               The SVG-attribute rotation only moves the circle's start point from
               3 o'clock to 12 o'clock — geometry setup, not an animated CSS transform. -->
          <circle class="infographic-ring-fill" cx="100" cy="100" r="86" pathLength="100"
                  stroke-dasharray="100" stroke-dashoffset="100"
                  transform="rotate(-90 100 100)" />
        </svg>
        <!-- The readout — stacked in the ring's hole: figure + % sign, answer below. -->
        <div class="infographic-readout">
          <div class="infographic-figure">
            <!-- The figure — the ring-fill preset counts this element's text from 0. -->
            <span class="infographic-value" id="f0">${valueText}</span>
            <!-- The % sign — its own static element so the counter never rewrites it. -->
            <span class="infographic-pct">%</span>
          </div>
          <!-- The answer — quiet tracking-wide caps under the figure. -->
          <div class="infographic-answer" id="f1">${answerText}</div>
        </div>
      </div>
    </div>`,

      css: `/* The frosted panel — same glass language as the Frosted Card lower third. */
.infographic-box {
  display: flex;                   /* a simple column: question over ring */
  flex-direction: column;          /* stacked top to bottom */
  align-items: center;             /* a centered poll — everything shares one axis */
  padding: calc(36px * var(--scale)) calc(48px * var(--scale));  /* generous inner air */
  background: var(--panel-bg);     /* the palette's glass tint — retints via the :root contract */
  backdrop-filter: blur(18px);     /* frosts the video playing behind the panel */
  -webkit-backdrop-filter: blur(18px);  /* Safari spelling of the same effect */
  border-radius: calc(18px * var(--scale));  /* soft, friendly card corners */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18),  /* 1px inner keyline catches the light */
              0 20px 60px rgba(0, 0, 0, 0.35);            /* one soft wide shadow lifts the panel */
}

/* The question — the panel's headline, wrapping to balanced centered rows. */
.infographic-question {
  max-width: calc(480px * var(--scale));  /* wraps at a readable measure, like the bench look */
  margin-bottom: calc(30px * var(--scale));  /* clear air between question and ring — never touching */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* headline size — the ring's figure still leads */
  font-weight: 700;                /* bold enough to carry the panel */
  line-height: 1.25;               /* a touch of leading for wrapped rows */
  letter-spacing: -0.01em;         /* large text tightens slightly */
  text-align: center;              /* centered poll layout */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped rows get even lengths */
}

/* The ring block — the SVG donut with the readout anchored over its center. */
.infographic-ring {
  position: relative;              /* anchor for the absolutely-centered readout */
  width: calc(300px * var(--scale));   /* ring diameter — the hero of the design */
  height: calc(300px * var(--scale));  /* square: the SVG circle fills it exactly */
}

/* The SVG canvas — fills the block; no baseline gap below it. */
.infographic-ring-svg {
  display: block;                  /* kill the inline-image baseline gap */
  width: 100%;                     /* the .infographic-ring box sets the real size */
  height: 100%;                    /* keep the 1:1 viewBox mapping */
}

/* The track — a dim translucent lane the accent ring draws over (glass family lane). */
.infographic-ring-track {
  fill: none;                      /* a ring, not a disc */
  stroke: rgba(255, 255, 255, 0.16);  /* translucent white lane on the glass */
  stroke-width: 12;                /* viewBox units — scales with the SVG */
}

/* The fill — the ring-fill preset tweens stroke-dashoffset 100 -> 100 - percent. */
.infographic-ring-fill {
  fill: none;                      /* a ring, not a disc */
  stroke: var(--accent);           /* the ring is the accent moment of this graphic */
  stroke-width: 12;                /* same weight as the track — fill sits exactly on it */
  stroke-linecap: round;           /* soft rounded tip on the drawn end */
  will-change: stroke-dashoffset;  /* hint the browser: this property animates */
}

/* The readout — centered in the ring's hole; figure on top, answer below. */
.infographic-readout {
  position: absolute;              /* pinned over the SVG */
  inset: 0;                        /* cover the whole ring block */
  display: flex;                   /* a small centered column */
  flex-direction: column;          /* figure over answer */
  align-items: center;             /* centered on the ring's axis */
  justify-content: center;         /* centered in the ring's hole */
}

/* The figure row — the counting number and its static % sign share one baseline. */
.infographic-figure {
  display: flex;                   /* number and % sit side by side */
  align-items: baseline;           /* the % rests on the number's baseline */
  gap: calc(4px * var(--scale));   /* a hair of air — beside the number, never inside it */
}

/* The number — huge, heavy, the single loudest thing on the panel. */
.infographic-value {
  font-size: calc(76px * var(--scale) * var(--type-scale));  /* hero size, sized to sit inside the ring's hole */
  font-weight: 800;                /* heaviest weight — contrast through weight, not more fonts */
  line-height: 1;                  /* no dead leading — the answer sets the gap below */
  letter-spacing: -0.02em;         /* very large glyphs tighten */
  font-variant-numeric: tabular-nums; /* digits keep one width — no jitter while counting up */
  color: var(--text-color);        /* primary text color */
}

/* The % sign — small and accent-colored, clearly subordinate to the number. */
.infographic-pct {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* under half the number — clear hierarchy */
  font-weight: 800;                /* matches the number's weight at its smaller size */
  line-height: 1;                  /* hugs its baseline */
  color: var(--accent);            /* echoes the ring — the same single accent */
}

/* The answer — quiet tracking-wide caps under the figure. */
.infographic-answer {
  margin-top: calc(8px * var(--scale));  /* small gap: figure + answer read as one unit */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* small label size */
  font-weight: 700;                /* bold keeps small caps legible */
  line-height: 1.2;                /* compact single-line label */
  letter-spacing: 0.18em;          /* small caps need room to breathe */
  margin-right: -0.18em;           /* cancel the trailing tracking so the caps stay centered */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  white-space: nowrap;             /* a short caps label never wraps mid-word */
  color: var(--text-dim);          /* dimmed — never full white twice */
}`,

      fields: [
        { field: 'f0', ftype: 'textfield', title: o.lines[0]?.title || 'Percentage', value: valueText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Answer label', value: answerText },
        { field: 'f2', ftype: 'textfield', title: 'Question', value: QUESTION_SAMPLE },
      ],

      runtimeExtraJs: '', // stat shape: update() writes fields straight in — no rebuild needed
    };
  },
);
