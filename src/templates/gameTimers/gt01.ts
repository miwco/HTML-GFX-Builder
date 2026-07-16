// gt01 "Clean Clock" — the minimal game timer, sibling of lt02 (Underline): the same
// stack of quiet small-caps over confident type, split by a short 2px accent hairline.
// No panel — whitespace does the work. Its default motion is the family's line reveal:
// the hairline draws in first, the label rises out of its mask, the clock fades up —
// while the countdown ticks from the very first frame. At zero the clock flips to the
// accent and gives one brief flash. Quiet and surgical.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineGameTimerVariant } from './shared';

export const gt01: TemplateVariant = defineGameTimerVariant(
  {
    id: 'gt01',
    category: 'game-timer',
    name: 'Clean Clock',
    styleTag: 'minimal',
    description: 'Small-caps label over a large clock, split by a 2px accent hairline that draws in first.',
    maxLines: 1,
    suggestedLines: [{ title: 'Label', sample: 'ROUND 1' }],
    logo: 'none',
    animationPresets: ['timer-line-reveal', 'timer-run'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'top-center',
  },
  {
    name: 'Clean Clock',
    description:
      'The quietest timer in the set — the lower-third sibling of lt02 (Underline): a ' +
      'dimmed small-caps label above a large tabular-figure clock, separated by a short ' +
      '2px accent hairline that draws in first, exactly like the lt02 underline. No panel ' +
      'at all; when time runs out the clock turns the accent color with one brief flash.',
    uicolor: '1',
  },
  (o) => ({
    // Stack = label mask, accent hairline, clock — top to bottom under the top-center
    // anchor. The hidden #f1 minutes source is appended by the assembler.
    html: `    <!-- Clean Clock: [small-caps label] / [accent hairline] / [big clock]. -->
    <div class="game-timer-box">
      <!-- The label line — #f0 is the SPX field; line-reveal slides it up out of the mask. -->
      <div class="game-timer-mask"><span id="f0">${o.lines[0]?.sample || 'ROUND 1'}</span></div>
      <!-- The accent hairline — the single accent moment (the lt02 underline motif). -->
      <div class="game-timer-accent"></div>
      <!-- The clock — the countdown runtime repaints this as M:SS. -->
      <div class="game-timer-clock">3:00</div>
    </div>`,
    css: `/* The stack: label / hairline / clock, centered — no panel, whitespace does the work. */
.game-timer-box {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* label, hairline, clock — top to bottom */
  align-items: center;             /* everything centered under the top anchor */
  text-align: center;              /* wrapped label rows stay centered too */
  gap: calc(10px * var(--scale));  /* even air around the hairline */
}

/* Label line — a quiet small-caps kicker; the clock is the loud element here. */
.game-timer-mask > span {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* kicker scale — clearly a label, not a headline */
  font-weight: 600;                /* enough weight for small caps to carry */
  line-height: 1.3;                /* relaxed leading at small sizes */
  letter-spacing: 0.06em;          /* quiet tracked caps — the lt02 family voice */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dimmed — the clock owns the bright white */
}

/* The hairline — short on purpose: a mark between label and clock, not a full rule. */
.game-timer-accent {
  width: calc(64px * var(--scale));  /* a short stroke — never the full stack width */
  height: calc(2px * var(--scale));  /* true hairline weight */
  background: var(--accent);       /* the one small, sharp dose of accent color */
  will-change: transform;          /* hint the browser: line-reveal scales this */
}

/* The clock — large and calm; tabular figures so digits never jiggle as they tick. */
.game-timer-clock {
  font-size: calc(88px * var(--scale) * var(--type-scale));  /* the headline element of the design */
  font-weight: 400;                /* regular — confident, never shimmer-thin over video */
  line-height: 1;                  /* the numerals sit tight under the hairline */
  letter-spacing: 0.02em;          /* big numerals get a touch of air */
  font-variant-numeric: tabular-nums;  /* every digit the same width — no jiggle */
  color: var(--text-color);        /* the brightest element on screen */
  will-change: transform, opacity; /* hint the browser: presets fade this up */
}

/* Time's up — the clock flips to the accent and blinks twice. Surgical, not a siren. */
.game-timer-done .game-timer-clock {
  color: var(--accent);            /* zero reads in the accent color */
  animation: game-timer-flash 0.9s ease-out;  /* one brief opacity flash, then steady */
}
@keyframes game-timer-flash {
  0%, 44%, 100% { opacity: 1; }    /* on… */
  22%, 66% { opacity: 0.2; }       /* …off — two quick blinks, then settle */
}`,
    hasAccent: true,
  }),
);
