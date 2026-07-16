// sb01 "Match Strip" - the sport scoreboard, sibling of lt05 (Angle Slab) / lt06 (Split Bar).
// Same family DNA: one dark zero-radius slab with the -8deg forward lean painted on a
// ::before layer (presets tween .scoreboard-box itself - snap-stinger even zeroes its skewX, so the
// lean must live where no preset can flatten it), a chunky 10px accent edge fused to the
// slab's left side, and condensed heavy caps. The two scores sit on solid accent chips whose
// lean is likewise painted on a ::before of a never-animated wrapper - the figures inside
// stay dead straight, and the score-pop scales their masks (clip and digits together, so
// two-digit scores never get chopped at 1.35x).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineScoreboardVariant } from './shared';

export const sb01: TemplateVariant = defineScoreboardVariant(
  {
    id: 'sb01',
    category: 'scoreboard',
    name: 'Match Strip',
    styleTag: 'sport',
    description: 'A leaning dark strip - team names flank two accent score chips. Match-night fast.',
    maxLines: 1,
    suggestedLines: [{ title: 'Team A', sample: 'HOME' }],
    logo: 'none',
    animationPresets: ['snap-stinger', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'top-center',
  },
  {
    name: 'Match Strip',
    description:
      'The classic broadcast score strip: TEAM A | score : score | TEAM B on one dark slab ' +
      'painted at the family -8deg lean, with a chunky accent edge and leaning solid-accent ' +
      'score chips. Team names in condensed heavy caps; scores in tabular figures that pop ' +
      'when they change on air.',
    uicolor: '5',
  },
  () => ({
    // Structure: the strip (.scoreboard-box) holds the accent edge, team group A, the colon divider,
    // and team group B. Group B keeps the contract's DOM order (name f2, then score f3) but
    // renders row-reversed so both chips meet in the middle around the colon. Each score chip
    // is a WRAPPER around its mask: the wrapper paints the leaning accent slab on ::before,
    // and no preset ever animates a wrapper - only .scoreboard-box and the #fN spans move.
    html: `    <!-- Match Strip: one leaning slab - TEAM A | score : score | TEAM B. -->
    <div class="scoreboard-box">
      <!-- The accent edge - rides inside the box so every preset moves it with the slab. -->
      <div class="scoreboard-accent"></div>
      <!-- Team group A: name, then the score chip. -->
      <div class="scoreboard-group">
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f0" class="scoreboard-team">HOME</span></div>
        <div class="scoreboard-chip">
          <div class="scoreboard-mask"><span id="f1" class="scoreboard-score">0</span></div>
        </div>
      </div>
      <!-- The divider: a heavy accent colon between the two chips. -->
      <div class="scoreboard-colon">:</div>
      <!-- Team group B: same DOM order as A (name f2, score f3), mirrored visually. -->
      <div class="scoreboard-group scoreboard-group-b">
        <div class="scoreboard-mask scoreboard-team-mask"><span id="f2" class="scoreboard-team">AWAY</span></div>
        <div class="scoreboard-chip">
          <div class="scoreboard-mask"><span id="f3" class="scoreboard-score">0</span></div>
        </div>
      </div>
    </div>`,
    css: `/* The strip: presets animate THIS element, so it carries no lean of its own. */
.scoreboard-box {
  position: relative;              /* anchors the painted slab (::before) and the accent edge */
  display: flex;                   /* names, chips and colon in one row */
  align-items: center;             /* everything shares the strip's center line */
  gap: calc(24px * var(--scale));  /* air between the groups and the colon */
  padding: calc(14px * var(--scale)) calc(38px * var(--scale));  /* tight vertical, wide horizontal */
}

/* The painted slab: the sport lean lives HERE, on a background layer no preset ever tweens.
   snap-stinger animates .scoreboard-box skewX -10 -> 0; keeping the design lean on this pseudo-layer
   means that inline skewX(0) can never flatten the slab. */
.scoreboard-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the box exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* paints behind the text and the chips */
  background: var(--panel-bg);     /* near-black slab behind everything */
  border-radius: 0;                /* hard corners - sport shape language */
  transform: skewX(-8deg);         /* SKEW: the whole slab leans forward */
}

/* The accent: a chunky vertical slab fused to the painted slab's left edge (as in lt05).
   The element itself stays transform-free — presets may tween .scoreboard-accent (line-reveal
   scales it), so the family lean is painted on its ::after layer, out of GSAP's reach. */
.scoreboard-accent {
  position: absolute;              /* pinned over the slab's left edge ... */
  left: 0;                         /* ... flush with the box's left side */
  top: 0;                          /* full height, top ... */
  bottom: 0;                       /* ... to bottom */
  width: calc(10px * var(--scale));  /* chunky 10px slab, not a hairline */
}

/* The accent's paint: color and lean live on the pseudo-layer no preset ever tweens. */
.scoreboard-accent::after {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the accent element exactly ... */
  inset: 0;                        /* ... edge to edge */
  background: var(--accent);       /* the accent's first dose */
  transform: skewX(-8deg);         /* leans to fuse with the painted slab's edge */
}

/* One team group: the name and its score chip, reading as a unit. */
.scoreboard-group {
  display: flex;                   /* name + chip side by side */
  align-items: center;             /* both sit on the strip's center line */
  gap: calc(22px * var(--scale));  /* air between the name and its chip */
  min-width: 0;                    /* lets a long team name shrink and wrap, not overflow */
}

/* Group B mirrors: DOM stays name-then-score (the contract), display flips so the
   chip sits toward the colon and the name faces outward - a symmetrical strip. */
.scoreboard-group-b {
  flex-direction: row-reverse;     /* score chip first, name last (visually) */
}

/* The team name mask: allowed to give up width so long names wrap inside the strip. */
.scoreboard-team-mask {
  min-width: 0;                    /* flex items refuse to shrink without this */
}

/* The team name: condensed heavy caps - the family voice. */
.scoreboard-team {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* headline scale, a step under the scores */
  font-weight: 700;                /* maximum punch */
  line-height: 1.1;                /* tight - big caps need little leading */
  letter-spacing: 0.02em;          /* a touch of air between the caps */
  text-transform: uppercase;       /* team names are shouted, not spoken */
  color: var(--text-color);        /* primary text on the dark slab */
}

/* The score chip: a wrapper no preset ever animates - safe home for the painted lean. */
.scoreboard-chip {
  position: relative;              /* anchors the leaning accent slab (::before) */
  display: flex;                   /* centers the figure ... */
  align-items: center;             /* ... vertically ... */
  justify-content: center;         /* ... and horizontally on the chip */
  min-width: calc(68px * var(--scale));   /* single digits still get a solid chip */
  padding: calc(6px * var(--scale)) calc(18px * var(--scale));  /* snug frame around the figure */
  flex-shrink: 0;                  /* scores never squeeze - names give up width instead */
}

/* The chip's paint: solid accent, leaning with the slab. Lives on the wrapper's ::before
   (not on the mask or the #fN span) so reveals and score-pops never disturb the lean. */
.scoreboard-chip::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the chip exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* paints behind the score figure */
  background: var(--accent);       /* the bold accent moment - sport's deliberate exception */
  transform: skewX(-8deg);         /* the chip leans with the slab */
}

/* The score figure: the heaviest thing on the strip, in dark ink on the bright chip. */
.scoreboard-score {
  font-size: calc(50px * var(--scale) * var(--type-scale));  /* the loudest scale - scores lead a scoreboard */
  font-weight: 700;                /* heavy condensed figures */
  line-height: 1;                  /* the figure fills its chip, no dead leading */
  color: var(--panel-bg);          /* the slab hue doubles as ink - highest contrast on accent */
  font-variant-numeric: tabular-nums;  /* digits share one width - no jitter as scores tick */
}

/* The divider: a heavy accent colon - the accent's only echo on the dark slab itself. */
.scoreboard-colon {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* matches the team names */
  font-weight: 700;                /* solid, not a hairline */
  line-height: 1;                  /* sits tight on the center line */
  color: var(--accent);            /* ties the slab to the chips */
}`,
    hasAccent: true,
  }),
);
