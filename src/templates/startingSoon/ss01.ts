// ss01 "Quiet Hold" — the minimal holding screen, sibling of lt01 (Hairline) and lt02
// (Underline). A centered full-frame pre-show card: a small tracking-wide caps title over
// a large, elegant show name, a 2px accent hairline, then the countdown in big quiet
// figures. No panel — generous whitespace does the work; the hairline breathes on hold.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss01: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss01',
    category: 'starting-soon',
    name: 'Quiet Hold',
    styleTag: 'minimal',
    description: 'Centered caps title, elegant show name, accent hairline and a big quiet countdown.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'STARTING SOON' },
      { title: 'Show name', sample: 'The Late Line' },
    ],
    logo: 'none',
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Quiet Hold',
    description:
      'The quietest holding screen of the set: a small tracking-wide caps title above a ' +
      'large elegant show name, separated from the quiet tabular countdown by one 2 px ' +
      'accent hairline that breathes while the screen holds. Pure type and whitespace — ' +
      'the sibling of the Hairline and Underline lower thirds.',
    uicolor: '1',
  },
  (o) => ({
    // A single centered stack: kicker (f0) → show name (f1) → hairline (the breath
    // target) → clock. Both text lines are mask-wrapped so future presets can reveal them.
    html: `    <!-- Quiet Hold: caps title, big show name, breathing hairline, light countdown. -->
    <div class="starting-soon-box">
      <!-- The small tracking-wide caps title (field f0). -->
      <div class="starting-soon-mask"><span class="starting-soon-kicker" id="f0">${o.lines[0]?.sample || 'STARTING SOON'}</span></div>
      <!-- The show name — the composition's one big, elegant moment (field f1). -->
      <div class="starting-soon-mask"><span class="starting-soon-show" id="f1">${o.lines[1]?.sample || 'The Late Line'}</span></div>
      <!-- The hairline separator — the single accent moment; hold-loop breathes it. -->
      <div class="starting-soon-rule starting-soon-pulse"></div>
      <!-- The countdown — the clock runtime paints M:SS here every second. -->
      <div class="starting-soon-clock">5:00</div>
    </div>`,
    css: `/* The stack: no panel at all — centered type and whitespace carry the whole card. */
.starting-soon-box {
  display: flex;                   /* stack the lines vertically… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* every line sits on the same center axis */
  text-align: center;              /* wrapped rows stay centered too */
  gap: calc(18px * var(--scale));  /* even, generous air between the lines */
}

/* The caps title — a quiet tracking-wide label above the show name. */
.starting-soon-kicker {
  font-size: calc(24px * var(--scale) * var(--type-scale)); /* label scale — clearly subordinate */
  font-weight: 600;                /* firm enough for small caps to carry */
  letter-spacing: 0.24em;          /* wide tracking — the label breathes */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--text-dim);          /* dimmed — never pure white twice */
}

/* The show name — large and elegant; the only heavy element on the card. */
.starting-soon-show {
  font-size: calc(92px * var(--scale) * var(--type-scale)); /* full-frame headline scale */
  font-weight: 600;                /* confident without shouting */
  line-height: 1.08;               /* big text sits tight */
  letter-spacing: -0.01em;         /* large sizes tighten slightly */
  color: var(--text-color);        /* primary text color */
}

/* The hairline — the design's single accent moment, and the hold-loop breath target. */
.starting-soon-rule {
  width: calc(84px * var(--scale));  /* a short stroke — a mark, not a rule across the card */
  height: calc(2px * var(--scale));  /* true hairline weight */
  margin: calc(18px * var(--scale)) 0;  /* extra air above and below the separator */
  background: var(--accent);       /* the one small, sharp dose of accent color */
  will-change: transform;          /* hint the browser: the breath scales this */
}

/* The countdown — large, light figures; tabular digits so the colon never jitters. */
.starting-soon-clock {
  font-size: calc(112px * var(--scale) * var(--type-scale)); /* the clock is the card's focal point on hold */
  font-weight: 400;                /* regular figures — the size carries the moment, not weight */
  line-height: 1;                  /* a single tight row of digits */
  letter-spacing: 0.02em;          /* a touch of air between the light figures */
  font-variant-numeric: tabular-nums; /* every digit same width — no width wobble per tick */
  color: var(--text-color);        /* primary text color */
}

/* Time's up — the clock takes the accent, the card's only other color moment. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* 0:00 lights up in the accent color */
}`,
  }),
);
