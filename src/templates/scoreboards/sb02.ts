// sb02 "Quiet Score" — the minimal scoreboard, sibling of lt01 (Hairline) and lt02
// (Underline). Like both siblings it is panel-free: two floating rows (team name left,
// score right in tabular figures) separated by a 2px dim hairline, with a 3px vertical
// accent rule on the leading edge — the design's single color moment, drawn first by
// line-reveal. Whitespace and type do the talking; no box behind them.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineScoreboardVariant } from './shared';

export const sb02: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb02',
    category: 'scoreboard',
    name: 'Quiet Score',
    styleTag: 'minimal',
    description: 'Panel-free corner stack - two quiet rows split by a hairline, accent rule on the edge.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'HOME' }],
    hasLogoSlot: false,
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'top-left',
  },
  {
    name: 'Quiet Score',
    description:
      'The lt01/lt02 sibling for scores: a panel-free stack floating in the corner. Each ' +
      'row pairs a tracking-wide caps team name with a tabular-figure score; a 2px hairline ' +
      'splits the rows and a 3px accent rule stands on the leading edge.',
    uicolor: '1',
  },
  () => ({
    // Two team rows inside one panel; the accent rule lives inside the box so every
    // preset that moves .scoreboard-box carries it along.
    html: `    <!-- Quiet Score: [accent rule] | row A / hairline / row B. -->
    <div class="scoreboard-box">
      <!-- The accent rule — the design's single color moment (line-reveal draws it first). -->
      <div class="scoreboard-accent"></div>
      <!-- Team A: name left, score right. -->
      <div class="scoreboard-row">
        <div class="scoreboard-mask scoreboard-mask-team"><span id="f0" class="scoreboard-team">HOME</span></div>
        <div class="scoreboard-mask scoreboard-mask-score"><span id="f1" class="scoreboard-score">0</span></div>
      </div>
      <!-- The 2px hairline between the two team rows. -->
      <div class="scoreboard-rule"></div>
      <!-- Team B: same anatomy as team A. -->
      <div class="scoreboard-row">
        <div class="scoreboard-mask scoreboard-mask-team"><span id="f2" class="scoreboard-team">AWAY</span></div>
        <div class="scoreboard-mask scoreboard-mask-score"><span id="f3" class="scoreboard-score">0</span></div>
      </div>
    </div>`,
    css: `/* The stack — panel-free like lt01/lt02: whitespace and type do the talking. */
.scoreboard-box {
  position: relative;              /* anchors the absolutely-placed accent rule */
  padding-left: calc(27px * var(--scale));  /* room for the 3px rule + a generous 24px gap */
}

/* The accent rule — a thin vertical line on the stack's leading edge (lt01's hairline). */
.scoreboard-accent {
  position: absolute;              /* pinned to the stack, not part of the row flow */
  left: 0;                         /* sits on the leading edge */
  top: 0;                          /* spans the full stack height… */
  bottom: 0;                       /* …edge to edge */
  width: calc(3px * var(--scale)); /* a true hairline — just visible at 1080p */
  background: var(--accent);       /* the one small, sharp dose of accent color */
  will-change: transform;          /* hint the browser: line-reveal scales this */
}

/* One team row: name on the left, score pushed to the right edge. */
.scoreboard-row {
  display: flex;                   /* name and score share one line */
  align-items: center;             /* both sit on the row's centerline */
  justify-content: space-between;  /* name hugs left, score hugs right */
  gap: calc(44px * var(--scale));  /* the quiet air that separates name from score */
}

/* The name mask may shrink so long team names wrap instead of pushing the score out. */
.scoreboard-mask-team {
  min-width: 0;                    /* lets flexbox shrink this side and wrap the text */
}

/* The score mask never shrinks — the number always keeps its place at the edge. */
.scoreboard-mask-score {
  flex-shrink: 0;                  /* long names wrap; the score stays put */
}

/* The hairline between the rows — dim punctuation, never a second accent. */
.scoreboard-rule {
  height: calc(2px * var(--scale));  /* hairline weight (minimal family: 2-4px) */
  margin: calc(12px * var(--scale)) 0;  /* even air above and below the line */
  background: var(--text-dim);     /* drawn from the dim text tone… */
  opacity: 0.35;                   /* …then faded further — a whisper, not a border */
}

/* Team name — quiet tracking-wide caps, subordinate to the score. */
.scoreboard-team {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* label scale (values are 1080p reference) */
  font-weight: 600;                /* firm without shouting */
  line-height: 1.15;               /* tight, but safe if a long name wraps */
  letter-spacing: 0.1em;           /* small caps breathe */
  text-transform: uppercase;       /* reads as a team tag, whatever the operator types */
  color: var(--text-dim);          /* dimmed like lt01's title — the score is the anchor */
}

/* Score — the row's anchor: bigger, heavier, and in tabular figures. */
.scoreboard-score {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* clearly senior to the team name */
  font-weight: 700;                /* the heaviest element in the design */
  line-height: 1.1;                /* a touch of headroom for the on-air score pop */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter on updates */
  color: var(--text-color);        /* primary text color */
}`,
    hasAccent: true,
  }),
);
