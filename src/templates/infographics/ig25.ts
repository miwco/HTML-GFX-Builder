// ig25 "Volt Milestones" — the SPORT milestone track, sibling of lt05 "Angle Slab" /
// ig03 "Timing Tower" / ig12 "Volt Poll". The same tier rail as ig24 "House Milestones" — same
// two fields, same shared rebuild, same evenly spaced geometry — drawn in the sport register:
// a leaning near-black slab, a squared rail, and hard-edged square markers instead of dots.
//
// This pairing is the point of a graphic TYPE: the milestone track's contract (a "Label |
// target" list, a running figure, and everything else derived) lives once in
// dataRuntimes.ts, and a family only decides how it looks.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { milestoneRuntimeJs } from './dataRuntimes';
import { defineInfographicVariant } from './shared';

const MILESTONES_SAMPLE = [
  'BRONZE | 1000',
  'SILVER | 2500',
  'GOLD | 5000',
  'LEGEND | 10000',
].join('\n');

export const ig25: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig25',
    category: 'infographic',
    name: 'Volt Milestones',
    styleTag: 'sport',
    description: 'A tier rail in the sport register: square markers lit as the line passes them.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Milestones', sample: MILESTONES_SAMPLE },
      { title: 'Current', sample: '3120' },
    ],
    logo: 'none',
    animationPresets: ['milestone-run'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Volt Milestones',
    description:
      'A forward-leaning sport slab with a chunky accent edge, carrying a tier rail: the label ' +
      'and running figure over a squared track with one square marker per milestone, lit as the ' +
      'line reaches it. Type one "Label | target" per line into Milestones and the running ' +
      'figure into Current; which tiers are met and where the line stops are derived from them.',
    uicolor: '1',
  },
  (o) => {
    const milestonesText = o.lines[0]?.sample || MILESTONES_SAMPLE;
    const currentText = o.lines[1]?.sample || '3120';
    return {
      html: `    <!-- Volt Milestones: [accent edge] | [leaning slab: heading row / rail with markers]. -->
    <div class="infographic-accent"></div>
    <div class="infographic-box">
      <!-- The heading row: label and running figure left, the tier count right. -->
      <div class="infographic-head">
        <div class="infographic-head-left">
          <span class="infographic-kicker" id="f2">CHANNEL TIERS</span>
          <!-- The running figure — written by the rebuild, grouped. -->
          <span class="infographic-current" id="infographic-current"></span>
        </div>
        <!-- "2 / 4" — how many tiers are behind us; written by the rebuild. -->
        <span class="infographic-reached" id="infographic-reached"></span>
      </div>
      <!-- The rail: an empty lane, the accent progress line, and the marker columns on top. -->
      <div class="infographic-rail">
        <div class="infographic-milestone-track">
          <div class="infographic-milestone-fill" data-value="0"></div>
        </div>
        <!-- The markers — one evenly spaced column per milestone, built by the rebuild. -->
        <div class="infographic-nodes" id="infographic-nodes"></div>
      </div>
    </div>
    <!-- Hidden sources — SPX writes the milestone lines into f0 and the running figure into f1. -->
    <div id="f0" style="display: none">${milestonesText}</div>
    <div id="f1" style="display: none">${currentText}</div>`,

      css: `/* The accent edge — a chunky bar fused to the slab's leaning left side. The lean is
   painted on ::before so nothing that tweens .infographic-accent can flatten it. */
.infographic-accent {
  position: absolute;              /* pinned inside the positioned .infographic root */
  left: 0;                         /* at the very left edge */
  top: 0;                          /* full slab height… */
  bottom: 0;                       /* …top to bottom */
  width: var(--accent-weight);     /* the family's bar weight */
}
.infographic-accent::before {
  content: '';                     /* the painted surface — the element itself stays unskewed */
  position: absolute;              /* fills its parent… */
  inset: 0;                        /* …edge to edge */
  background: var(--accent);       /* the one accent surface */
  transform: skewX(-8deg);         /* the sport family's lean */
}

/* The slab — near-black, leaning, painted on ::before so no preset can straighten it. A fixed
   width is what makes the rail a rail: the marker columns divide THIS width evenly. */
.infographic-box {
  position: relative;              /* the painted slab is placed against this box */
  width: calc(900px * var(--scale));  /* the rail's run — four tiers read comfortably across it */
  margin-left: var(--accent-weight);  /* starts where the accent edge ends */
  padding: calc(20px * var(--scale)) calc(46px * var(--scale)) calc(22px * var(--scale)) calc(30px * var(--scale));
}
.infographic-box::before {
  content: '';                     /* the slab surface itself */
  position: absolute;              /* behind the content… */
  inset: 0;                        /* …across the whole box */
  z-index: -1;                     /* …and under it */
  background: var(--panel-bg);     /* the near-black slab */
  transform: skewX(-8deg);         /* the family's lean, matching the accent edge */
  box-shadow: var(--panel-shadow);  /* the family's lift */
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
  min-width: 0;                    /* let a long label wrap rather than widen the slab */
}

/* The label — tracked caps in the accent colour. */
.infographic-kicker {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                /* bold keeps condensed caps legible over video */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* the sport register is always caps */
  color: var(--label-color);       /* the family's label colour */
}

/* The running figure — where we are right now, grouped by the rebuild. */
.infographic-current {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* the row's one large voice */
  font-weight: var(--display-weight);  /* the family's display weight — heavy condensed */
  line-height: 1;                  /* condensed figures sit tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  font-variant-numeric: tabular-nums;  /* digits keep one width across updates */
  color: var(--text-color);        /* primary text color */
}

/* The tier count — "2 / 4", the derived progress through the list. */
.infographic-reached {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* clearly under the figure */
  font-weight: 700;                /* bold — still a headline of its own */
  letter-spacing: 0.04em;          /* condensed figures need air to be read one by one */
  font-variant-numeric: tabular-nums;  /* equal-width digits across updates */
  white-space: nowrap;             /* "10 / 12" never wraps */
  color: var(--accent);            /* the accent's text moment */
}

/* The rail — the lane, the line, and the marker columns share one stacking context. */
.infographic-rail {
  position: relative;              /* the track is positioned against this block */
  margin-top: calc(22px * var(--scale));  /* air between the heading row and the rail */
}

/* The lane — squared, not rounded: the sport family cuts its edges. */
.infographic-milestone-track {
  height: calc(10px * var(--scale));  /* a solid rail — this family has weight */
  background: rgba(255, 255, 255, 0.14);  /* the empty lane over the slab */
  overflow: hidden;                /* the running line is clipped to the lane */
}

/* The line — the preset runs its width out to data-value percent. Width, not scaleX: scaling
   would drag the markers that sit on the rail out of alignment. */
.infographic-milestone-fill {
  width: 0;                        /* fallback — the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  background: var(--accent);       /* the line is the accent's main surface */
  will-change: width;              /* hint for the width tween (the deviation noted above) */
}

/* The marker columns — EQUAL WIDTHS, so labels can never collide however close two targets are. */
.infographic-nodes {
  display: flex;                   /* one column per milestone */
  margin-top: calc(-15px * var(--scale));  /* pull the markers back up onto the rail */
}
.infographic-node {
  flex: 1 1 0;                     /* every milestone gets exactly the same width */
  min-width: 0;                    /* long labels wrap inside their column, never over the next */
  display: flex;                   /* marker over target over label… */
  flex-direction: column;          /* …stacked */
  align-items: center;             /* centred on the column's own axis */
  text-align: center;              /* wrapped label rows stay centred too */
}

/* The marker — a leaning square on the rail, matching the slab's own angle. Unreached: an
   outline in keyline grey. */
.infographic-node-dot {
  width: calc(20px * var(--scale));   /* marker width… */
  height: calc(20px * var(--scale));  /* …and height: a square */
  border: calc(3px * var(--scale)) solid rgba(255, 255, 255, 0.32);  /* the unreached outline */
  background: var(--panel-bg);     /* punch the rail out behind the marker */
  transform: skewX(-8deg);         /* the family's lean, at marker scale */
}

/* A REACHED milestone: the marker fills with the accent and its numbers brighten. That state
   is written by the rebuild from the operator's own figures, and the 'milestone-run' preset
   pops exactly these markers as the line passes them. */
.infographic-node.is-reached .infographic-node-dot {
  border-color: var(--accent);     /* the outline adopts the accent… */
  background: var(--accent);       /* …and fills */
}
.infographic-node.is-reached .infographic-node-target {
  color: var(--accent);            /* a passed target is stated in the accent */
}
.infographic-node.is-reached .infographic-node-label {
  color: var(--text-color);        /* and its name comes up to full strength */
}

/* The target figure under each marker. */
.infographic-node-target {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* the marker's headline value */
  font-weight: 700;                /* bold — it is a number to hit */
  line-height: 1.15;               /* compact under the marker */
  letter-spacing: 0.02em;          /* condensed figures need a little air */
  font-variant-numeric: tabular-nums;  /* equal-width digits along the rail */
  margin-top: calc(10px * var(--scale));  /* air between the marker and its figure */
  color: var(--text-dim);          /* dimmed until the milestone is reached */
}

/* The milestone's name, the quietest line on the slab. */
.infographic-node-label {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the smallest voice on the rail — held at the 16px broadcast-safe floor */
  font-weight: 700;                /* bold keeps condensed caps legible over video */
  line-height: 1.25;               /* wrapped names stay readable */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* the sport register is always caps */
  overflow-wrap: break-word;       /* a long name wraps inside its column */
  margin-top: calc(4px * var(--scale));  /* figure and name read as one unit */
  color: var(--text-dim);          /* dimmed until the milestone is reached */
}`,

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Milestones', value: milestonesText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Current', value: currentText },
        { field: 'f2', ftype: 'textfield', title: 'Label', value: 'CHANNEL TIERS' },
      ],

      runtimeExtraJs: milestoneRuntimeJs(),
    };
  },
);
