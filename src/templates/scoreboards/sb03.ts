// sb03 "House Score" — the NoaCG scoreboard, sibling of lt11 "House Strap". A void blur strip
// with an amber accent edge on the left (which doubles as the flag marker the graphic type's
// flag group pulses), team names in display type, and the two scores in void chips with amber
// figures. An amber colon divides the chips. No lean — the house family paints flat panels.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineScoreboardVariant } from './shared';

export const sb03: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb03',
    category: 'scoreboard',
    name: 'House Score',
    styleTag: 'noacg',
    description: 'The house score strip: void panel, amber accent edge, scores in void chips.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'HOME' }],
    logo: 'none',
    animationPresets: ['slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'top-center',
  },
  {
    name: 'House Score',
    description:
      'The NoaCG score strip, sibling of lt11 House Strap: a void blur panel with an amber ' +
      'top edge and an amber accent bar on the left, team names in display type, and the two ' +
      'scores in void chips with amber figures around an amber colon. The scores pop when they ' +
      'change on air.',
    uicolor: '4',
  },
  () => ({
    // Structure: the strip (.scoreboard-box) holds the accent edge (the flag marker), team
    // group A, the colon, and team group B. Group B keeps the contract's DOM order (name f2,
    // then score f3) but renders row-reversed so both chips meet around the colon.
    html: `    <!-- House Score: void strip — [amber edge] TEAM A [score] : [score] TEAM B. -->
    <div class="scoreboard-box">
      <!-- The accent edge — the design's accent AND the flag marker the machine pulses. -->
      <div class="scoreboard-accent"></div>
      <!-- Team group A: name, then the score chip. -->
      <div class="scoreboard-group">
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">HOME</span></div>
        <div class="scoreboard-chip">
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">0</span></div>
        </div>
      </div>
      <!-- The divider: an amber colon between the two chips. -->
      <div class="scoreboard-colon">:</div>
      <!-- Team group B: same DOM order as A (name f2, score f3), mirrored visually. -->
      <div class="scoreboard-group scoreboard-group-b">
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">AWAY</span></div>
        <div class="scoreboard-chip">
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">0</span></div>
        </div>
      </div>
    </div>`,
    css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The strip — the house void, with an amber top edge (the house strip). */
.scoreboard-box {
  position: relative;              /* anchors the accent edge */
  display: flex;                   /* names, chips and colon in one row */
  align-items: center;             /* everything shares the strip's center line */
  gap: calc(22px * var(--scale));  /* air between the groups and the colon */
  padding: calc(14px * var(--scale)) calc(34px * var(--scale)) calc(14px * var(--scale)) calc(40px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow); /* one deep lifting shadow */
  border-top: calc(2px * var(--scale)) solid color-mix(in srgb, var(--accent) 50%, transparent);  /* the house strip's amber top edge */
}

/* The accent edge — 8px amber bar fused to the left, with the house glow. It is also the
   flag marker: the graphic type's flag group pulses its opacity and scaleY. */
.scoreboard-accent {
  position: absolute;              /* pinned over the strip's left edge */
  left: 0;                         /* flush with the box's left side */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* One team group: the name and its score chip, reading as a unit. */
.scoreboard-group {
  display: flex;                   /* name + chip side by side */
  align-items: center;             /* both sit on the strip's center line */
  gap: calc(20px * var(--scale));  /* air between the name and its chip */
  min-width: 0;                    /* lets a long team name shrink and wrap, not overflow */
}

/* Group B mirrors: DOM stays name-then-score (the contract), display flips so the chip sits
   toward the colon and the name faces outward — a symmetrical strip. */
.scoreboard-group-b {
  flex-direction: row-reverse;     /* score chip first, name last (visually) */
}

/* The team name mask: allowed to give up width so long names wrap inside the strip. */
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
}

/* The team name — house display type. */
.scoreboard-team {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* a step under the scores */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text on the void */
}

/* The score chip — a denser void tile (house chip radius 6) holding the amber figure. */
.scoreboard-chip {
  display: flex;                   /* centers the figure… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally on the chip */
  min-width: calc(66px * var(--scale));   /* single digits still get a solid chip */
  padding: calc(6px * var(--scale)) calc(16px * var(--scale));  /* snug frame around the figure */
  flex-shrink: 0;                  /* scores never squeeze — names give up width instead */
  border-radius: calc(6px * var(--scale));  /* the house chip radius */
  background: rgba(10, 12, 16, 0.6);  /* a second, denser layer of the void */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent);  /* a thin amber keyline */
}

/* The score figure — big amber figures, tabular so they never jitter as they tick. */
.scoreboard-score {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* the loudest scale — scores lead a scoreboard */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1;                  /* the figure fills its chip */
  color: var(--accent);            /* the scores wear the accent */
  font-variant-numeric: tabular-nums;  /* digits share one width — no jitter as scores tick */
}

/* The divider — an amber colon between the two chips. */
.scoreboard-colon {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* matches the team names */
  font-weight: var(--display-weight);  /* solid, not a hairline */
  line-height: 1;                  /* sits tight on the center line */
  color: var(--accent);            /* ties the strip together */
}

/* Full time — the result group adds .scoreboard-final; the scores steady in paper white. */
.scoreboard-final .scoreboard-score {
  color: var(--text-color);        /* at full time the scores settle to white — the match is decided */
}`,
    hasAccent: true,
  }),
);
