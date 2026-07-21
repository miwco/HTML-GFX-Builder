// gt05 "House Countdown" — the NoaCG house game timer, sibling of lt11 "House Strap".
// Same house DNA: an 8px amber bar with the restrained glow fused to the left edge of a
// void blur panel, a mono caps label in the accent color, and a confident display clock.
// The bar draws in first on the family's line reveal while the countdown ticks from frame
// one; at zero the clock flips to the accent and gives one brief glowing flash.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineGameTimerVariant } from './shared';

export const gt05: TemplateVariant = defineGameTimerVariant(
  {
    id: 'gt05',
    category: 'game-timer',
    name: 'House Countdown',
    styleTag: 'noacg',
    description: 'The house timer: an amber bar and void panel, a mono label over a display clock.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'ROUND 1' }],
    logo: 'none',
    animationPresets: ['timer-line-reveal', 'timer-run'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'top-center',
  },
  {
    name: 'House Countdown',
    description:
      'The NoaCG house countdown, sibling of lt11 House Strap: one 8px amber bar with the ' +
      'house glow fused to a void blur panel, a tracking-wide mono label in the accent ' +
      'color above a bold display clock. The bar draws in first; at zero the clock turns ' +
      'the accent color with a brief glowing flash.',
    uicolor: '4',
  },
  (o) => ({
    // House structure: [8px accent bar] | [void blur panel — label over clock], exactly the
    // lt11 lockup. The hidden #f1 minutes source is appended by the assembler.
    html: `    <!-- House Countdown: [amber bar] | [void panel: mono label over the display clock]. -->
    <div class="game-timer-accent"></div>
    <div class="game-timer-box">
      <!-- The label line — #f0 is the SPX field; line-reveal slides it up out of the mask. -->
      <div class="game-timer-mask"><span id="f0" class="game-timer-label">${o.lines[0]?.sample || 'ROUND 1'}</span></div>
      <!-- The clock — the countdown runtime repaints this every second as M:SS. -->
      <div class="game-timer-clock">3:00</div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow.
   The glow follows the accent color (color-mix), so retinting keeps it coherent. */
.game-timer-accent {
  position: absolute;              /* pinned inside the positioned .game-timer root */
  left: 0;                         /* at the very left edge */
  top: 0;                          /* full panel height… */
  bottom: 0;                       /* …top to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
  will-change: transform;          /* hint the browser: line-reveal grows this bar in */
}

/* The panel — the house void: near-black, translucent, softly blurring the video. */
.game-timer-box {
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(20px * var(--scale)) calc(44px * var(--scale)) calc(22px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
}

/* The label — the house voice: mono, caps, tracked wide, in the accent color. */
.game-timer-label {
  font-family: var(--font-label);  /* the family's mono label face */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* label scale — clearly subordinate to the clock */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.3;                /* a touch of air if the label wraps */
  letter-spacing: var(--label-tracking);  /* wide tracking — the label breathes */
  text-transform: uppercase;       /* reads as a technical label */
  color: var(--label-color);       /* the label carries the accent, not a second white */
}

/* The clock — the confident display moment; tabular figures so digits never jiggle. */
.game-timer-clock {
  margin-top: calc(10px * var(--scale));  /* label + clock read as one unit */
  font-size: calc(76px * var(--scale) * var(--type-scale));  /* the headline element of the design */
  font-weight: var(--display-weight);  /* full display weight */
  line-height: 1;                  /* the numerals sit tight under the label */
  letter-spacing: var(--display-tracking);  /* big display type tightens slightly */
  font-variant-numeric: tabular-nums;  /* every digit the same width — no jiggle */
  color: var(--text-color);        /* the brightest element on screen */
  will-change: transform, opacity; /* hint the browser: presets fade this up */
}

/* ── Time's up: the clock runtime adds .game-timer-done on the root at zero. ── */

/* The clock flips to the accent and gives one brief glowing flash — restrained, house-style. */
.game-timer-done .game-timer-clock {
  color: var(--accent);            /* zero reads in the accent color */
  text-shadow: var(--accent-glow); /* the house glow, on the digits, at zero only */
  animation: game-timer-flash 0.9s ease-out;  /* one brief flash, then steady */
}
@keyframes game-timer-flash {
  0%, 44%, 100% { opacity: 1; }    /* on… */
  22%, 66% { opacity: 0.25; }      /* …off — two quick blinks, then settle */
}`,
    hasAccent: true,
  }),
);
