// sb04 "Frost Score" — the GLASS scoreboard, sibling of lt08 "Frosted Card". A translucent
// frosted strip with a soft accent bar on the left (which doubles as the flag marker the
// graphic type's flag group pulses), team names in the family's heavier weight, and the two
// scores in glass chips with accent figures around an accent colon.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineScoreboardVariant } from './shared';

export const sb04: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb04',
    category: 'scoreboard',
    name: 'Frost Score',
    styleTag: 'glass',
    description: 'A frosted score strip: soft accent bar, team names, scores in glass chips.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'HOME' }],
    logo: 'none',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-center',
  },
  {
    name: 'Frost Score',
    description:
      'The glass score strip, sibling of lt08 Frosted Card: a translucent blurred panel with a ' +
      'soft accent bar on the left, team names in the family\'s heavier weight, and the two ' +
      'scores in glass chips with accent figures around an accent colon. The scores pop when ' +
      'they change on air.',
    uicolor: '3',
  },
  () => ({
    // Structure mirrors sb01/sb03: the accent bar (the flag marker), team group A, the colon,
    // and team group B (DOM order name-then-score, mirrored visually to meet at the colon).
    html: `    <!-- Frost Score: frosted strip — [accent bar] TEAM A [score] : [score] TEAM B. -->
    <div class="scoreboard-box">
      <!-- The accent bar — the design's accent AND the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- Team group A: name, then the score chip. -->
      <div class="scoreboard-group">
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">HOME</span></div>
        <div class="scoreboard-chip">
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">0</span></div>
        </div>
      </div>
      <!-- The divider: an accent colon between the two chips. -->
      <div class="scoreboard-colon">:</div>
      <!-- Team group B: same DOM order as A (name f2, score f3), mirrored visually. -->
      <div class="scoreboard-group scoreboard-group-b">
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">AWAY</span></div>
        <div class="scoreboard-chip">
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">0</span></div>
        </div>
      </div>
    </div>`,
    css: `/* The strip — a translucent frosted rail with the family's keyline and lift. */
.scoreboard-box {
  position: relative;              /* anchors the accent bar */
  display: flex;                   /* names, chips and colon in one row */
  align-items: center;             /* everything shares the strip's center line */
  gap: calc(22px * var(--scale));  /* air between the groups and the colon */
  padding: calc(14px * var(--scale)) calc(32px * var(--scale)) calc(14px * var(--scale)) calc(36px * var(--scale));
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The accent bar — a soft accent edge inside the rounded panel, also the flag marker the
   graphic type's flag group pulses (opacity + scaleY). */
.scoreboard-accent {
  position: absolute;              /* pinned inside the panel's left edge */
  left: calc(12px * var(--scale)); /* inset from the rounded corner */
  top: calc(16px * var(--scale));  /* clears the panel radius, top… */
  bottom: calc(16px * var(--scale));  /* …and bottom */
  width: var(--accent-weight);     /* the glass family's accent weight (4px) */
  border-radius: var(--accent-weight);  /* rounded ends — a soft bar, not a hard slab */
  background: var(--accent);       /* the one accent surface */
}

/* One team group: the name and its score chip, reading as a unit. */
.scoreboard-group {
  display: flex;                   /* name + chip side by side */
  align-items: center;             /* both sit on the strip's center line */
  gap: calc(18px * var(--scale));  /* air between the name and its chip */
  min-width: 0;                    /* lets a long team name shrink and wrap, not overflow */
}
.scoreboard-group:first-of-type {
  margin-left: calc(14px * var(--scale));  /* clears the inset accent bar */
}

/* Group B mirrors: DOM stays name-then-score (the contract), display flips visually. */
.scoreboard-group-b {
  flex-direction: row-reverse;     /* score chip first, name last (visually) */
}

/* The team name mask: allowed to give up width so long names wrap inside the strip. */
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
}

/* The team name — the family's heavier weight. */
.scoreboard-team {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* a step under the scores */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.1;                /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The score chip — a second layer of glass with an accent keyline, holding the accent figure. */
.scoreboard-chip {
  display: flex;                   /* centers the figure… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally on the chip */
  min-width: calc(64px * var(--scale));   /* single digits still get a solid chip */
  padding: calc(6px * var(--scale)) calc(16px * var(--scale));  /* snug frame around the figure */
  flex-shrink: 0;                  /* scores never squeeze — names give up width instead */
  border-radius: calc(12px * var(--scale));  /* a softly rounded glass chip */
  background: rgba(255, 255, 255, 0.10);  /* a second layer of the same glass */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent);  /* a thin accent keyline */
}

/* The score figure — big accent figures, tabular so they never jitter as they tick. */
.scoreboard-score {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* the loudest scale — scores lead a scoreboard */
  font-weight: 700;                /* heavy glass figures */
  line-height: 1;                  /* the figure fills its chip */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}

/* The divider — an accent colon between the two chips. */
.scoreboard-colon {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* matches the team names */
  font-weight: 700;                /* solid, not a hairline */
  line-height: 1;                  /* sits tight on the center line */
  color: var(--accent);            /* ties the strip together */
}

/* Full time — the result group adds .scoreboard-final; the scores steady in white. */
.scoreboard-final .scoreboard-score {
  color: var(--text-color);        /* at full time the scores settle to white — the match is decided */
}`,
    hasAccent: true,
  }),
);
