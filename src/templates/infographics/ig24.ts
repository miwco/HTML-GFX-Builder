// ig24 "House Milestones" — the NoaCG milestone track, sibling of lt11 "House Strap" /
// ig22 "House Goal". Where a goal meter answers "how far to the target", a milestone track
// answers "which tiers have we passed" — the sub-goal, follower-tier and challenge-stage
// graphic a creator or telethon runs for hours.
//
// The nodes are EVENLY SPACED and the progress line is interpolated BETWEEN them, not plotted
// at current/max. dataRuntimes.ts milestoneRuntimeJs() carries the full reasoning; the short
// version is that a rail drawn as "1 → 2 → 3 → 4" must have its line mean position on that
// rail, and evenly spaced nodes are what keeps four labels readable when someone adds a
// stretch goal ten times the size of the first.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { milestoneRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

const MILESTONES_SAMPLE = [
  'Warm-up | 5000',
  'Halfway | 15000',
  'Stretch | 30000',
  'Dream | 50000',
].join('\n');

export const ig24: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig24',
    category: 'infographic',
    name: 'House Milestones',
    styleTag: 'noacg',
    description: 'A milestone track: tiers along a rail, the passed ones lit and the line run out to now.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Milestones', sample: MILESTONES_SAMPLE },
      { title: 'Current', sample: '18400' },
    ],
    logo: 'none',
    animationPresets: ['milestone-run'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Milestones',
    description:
      'The NoaCG milestone track: an 8px amber bar fused to a void blur panel, a heading row ' +
      'with the running figure and a "passed / total" count, then a rail of evenly spaced ' +
      'milestone nodes with the reached ones lit in amber. Type one "Label | target" per line ' +
      'into Milestones and the running figure into Current — which tiers are met, where the ' +
      'line stops and the counts are all derived from those two fields.',
    uicolor: '4',
  },
  (o) => {
    const milestonesText = o.lines[0]?.sample || MILESTONES_SAMPLE;
    const currentText = o.lines[1]?.sample || '18400';
    return {
      html: `    <!-- House Milestones: [amber bar] | [void panel: heading row / rail with nodes]. -->
    <div class="infographic-accent"></div>
    <div class="infographic-box">
      <!-- The heading row: the label and running figure on the left, the tier count right. -->
      <div class="infographic-head">
        <div class="infographic-head-left">
          <span class="infographic-kicker" id="f2">MILESTONES</span>
          <!-- The running figure — written by the rebuild, grouped. -->
          <span class="infographic-current" id="infographic-current"></span>
        </div>
        <!-- "2 / 4" — how many tiers are behind us; written by the rebuild. -->
        <span class="infographic-reached" id="infographic-reached"></span>
      </div>
      <!-- The rail: an empty lane, the amber progress line, and the milestone columns on top. -->
      <div class="infographic-rail">
        <div class="infographic-milestone-track">
          <div class="infographic-milestone-fill" data-value="0"></div>
        </div>
        <!-- The nodes — one evenly spaced column per milestone, built by the rebuild. -->
        <div class="infographic-nodes" id="infographic-nodes"></div>
      </div>
    </div>
    <!-- Hidden sources — SPX writes the milestone lines into f0 and the running figure into f1. -->
    <div id="f0" style="display: none">${milestonesText}</div>
    <div id="f1" style="display: none">${currentText}</div>`,

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

/* The panel — the house void. A fixed width is what makes the rail a rail: the columns
   divide THIS width evenly, so the track keeps its shape whatever the labels say. */
.infographic-box {
  width: calc(880px * var(--scale));  /* the rail's run — four tiers read comfortably across it */
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(22px * var(--scale)) calc(34px * var(--scale)) calc(24px * var(--scale)) calc(28px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}

/* The heading row — label + figure on the left, the tier count held on the right. */
.infographic-head {
  display: flex;                   /* the two blocks share one row */
  justify-content: space-between;  /* left block hugs left, count hugs right */
  align-items: baseline;           /* both sit on the same text baseline */
  gap: calc(28px * var(--scale));  /* distinct information keeps distinct space */
}
.infographic-head-left {
  display: flex;                   /* the label and the figure sit side by side */
  align-items: baseline;           /* on one baseline */
  gap: calc(14px * var(--scale));  /* a clear seam between a word and a number */
  min-width: 0;                    /* let a long label wrap rather than widen the panel */
}

/* The label — the house mono caps line naming the track. */
.infographic-kicker {
  font-family: var(--font-label);  /* the house label face */
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                /* bold keeps small caps legible over video */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}

/* The running figure — where we are right now, grouped by the rebuild. */
.infographic-current {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* the row's one large voice */
  font-weight: 700;                /* bold — it is the headline number */
  line-height: 1.05;               /* no dead leading around the figure */
  letter-spacing: -0.01em;         /* large glyphs tighten */
  font-variant-numeric: tabular-nums;  /* digits keep one width across updates */
  color: var(--text-color);        /* primary text color */
}

/* The tier count — "2 / 4", the derived progress through the list. */
.infographic-reached {
  font-family: var(--font-label);  /* the house label face — a ratio reads as data */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly under the figure */
  font-weight: 700;                /* bold — still a headline of its own */
  font-variant-numeric: tabular-nums;  /* equal-width digits across updates */
  white-space: nowrap;             /* "10 / 12" never wraps */
  color: var(--accent);            /* the accent's text moment */
}

/* The rail — the lane, the line, and the node columns share one stacking context. */
.infographic-rail {
  position: relative;              /* the track is positioned against this block */
  margin-top: calc(26px * var(--scale));  /* air between the heading row and the rail */
  padding-top: calc(10px * var(--scale));  /* room for the line, which sits at the top of the rail */
}

/* The lane — the empty rail the line runs along. It is inset by half a column on each
   side so the first and last nodes (at 12.5% and 87.5% of four) sit ON the drawn rail. */
.infographic-milestone-track {
  height: calc(8px * var(--scale));  /* a slim rail — the nodes carry the weight */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: rgba(255, 255, 255, 0.12);  /* the empty lane over the void panel */
  overflow: hidden;                /* the running line is clipped to the lane */
}

/* The line — the preset runs its width out to data-value percent.
   Deliberate width tween rather than scaleX: scaling would squash the cap and drag the
   nodes that sit on the rail out of alignment. */
.infographic-milestone-fill {
  width: 0;                        /* fallback — the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  border-radius: inherit;          /* the running end matches the lane's rounding */
  background: var(--accent);       /* the line is the accent's main surface */
  box-shadow: var(--accent-glow);  /* the house glow, along the line */
  will-change: width;              /* hint for the width tween (the deviation noted above) */
}

/* The node columns — EQUAL WIDTHS, so labels can never collide however close two targets
   are. Each column centres its own dot, target and label. */
.infographic-nodes {
  display: flex;                   /* one column per milestone */
  margin-top: calc(-14px * var(--scale));  /* pull the dots back up onto the rail */
}
.infographic-node {
  flex: 1 1 0;                     /* every milestone gets exactly the same width */
  min-width: 0;                    /* long labels wrap inside their column, never over the next */
  display: flex;                   /* dot over target over label… */
  flex-direction: column;          /* …stacked */
  align-items: center;             /* centred on the column's own axis */
  text-align: center;              /* wrapped label rows stay centred too */
}

/* The dot — the milestone marker sitting on the rail. Unreached: a hollow grey ring. */
.infographic-node-dot {
  width: calc(20px * var(--scale));   /* marker width… */
  height: calc(20px * var(--scale));  /* …and height: a circle */
  border: calc(3px * var(--scale)) solid rgba(255, 255, 255, 0.3);  /* the unreached ring */
  border-radius: 50%;              /* a true circle */
  background: var(--panel-bg);     /* punch the rail out behind the marker */
}

/* A REACHED milestone: the dot fills with the accent and its numbers brighten. That state
   is written by the rebuild from the operator's own figures, and the 'milestone-run' preset
   pops exactly these nodes as the line passes them. */
.infographic-node.is-reached .infographic-node-dot {
  border-color: var(--accent);     /* the ring adopts the accent… */
  background: var(--accent);       /* …and fills */
  box-shadow: var(--accent-glow);  /* the house glow, at marker scale */
}
.infographic-node.is-reached .infographic-node-target {
  color: var(--accent);            /* a passed target is stated in the accent */
}
.infographic-node.is-reached .infographic-node-label {
  color: var(--text-color);        /* and its name comes up to full strength */
}

/* The target figure under each dot. */
.infographic-node-target {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* the node's headline value */
  font-weight: 700;                /* bold — it is a number to hit */
  line-height: 1.2;                /* compact under the dot */
  font-variant-numeric: tabular-nums;  /* equal-width digits down the row of nodes */
  margin-top: calc(10px * var(--scale));  /* air between the dot and its figure */
  color: var(--text-dim);          /* dimmed until the milestone is reached */
}

/* The milestone's name, the quietest line on the panel. */
.infographic-node-label {
  font-family: var(--font-label);  /* the house label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the smallest voice on the rail — held at the 16px broadcast-safe floor */
  font-weight: 700;                /* bold keeps small caps legible over video */
  line-height: 1.25;               /* wrapped names stay readable */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  overflow-wrap: break-word;       /* a long name wraps inside its column */
  margin-top: calc(4px * var(--scale));  /* figure and name read as one unit */
  color: var(--text-dim);          /* dimmed until the milestone is reached */
}`,

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Milestones', value: milestonesText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Current', value: currentText },
        { field: 'f2', ftype: 'textfield', title: 'Label', value: 'MILESTONES' },
      ],

      runtimeExtraJs: milestoneRuntimeJs(),
    };
  },
);
