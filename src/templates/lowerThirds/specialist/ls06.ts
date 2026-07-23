// ls06 "Commentary Booth" — the two callers, named as a unit.
//
// A commentary strap is not an interview strap with sports colours. It answers a different
// question: not "who is this person" but "whose voices am I listening to". That is why every
// sports broadcast puts a single header over the pair — COMMENTARY, ON THE CALL, IN THE
// BOOTH — and only then the two names. The header is the subject; the names are its list.
//
// So the composition is a header row over a two-column list, not two equal blocks: the header
// spans both, the names sit under it in the same weight, and each caller's job (play-by-play,
// colour, touchline) is the small line beneath their name. It also has to survive being on
// screen for two seconds during a restart, which is why the motion is the sport snap and not
// a considered reveal.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { duoGridCss, duoSplitBalanced, hasLine, personColumn } from './shared';

export const ls06: TemplateVariant = defineVariant(
  {
    id: 'ls06',
    category: 'lower-third',
    name: 'Commentary Booth',
    styleTag: 'sport',
    roleTag: 'commentary',
    keywords: ['commentators', 'casters', 'booth', 'play-by-play', 'colour', 'callers', 'on the call'],
    description: 'A COMMENTARY header spanning two callers — the pair named as one unit.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Header', sample: 'On the call' },
      { title: 'Caller 1', sample: 'RAY OKONKWO' },
      { title: 'Caller 1 role', sample: 'Play-by-play' },
      { title: 'Caller 2', sample: 'MIA HALVORSEN' },
      { title: 'Caller 2 role', sample: 'Analysis' },
    ],
    logo: 'none',
    // Sport-fast on purpose: this strap goes up during a break in play and comes off before
    // the restart. A considered reveal would still be arriving when the whistle went.
    animationPresets: ['snap-stinger', 'mask-wipe', 'slide-left', 'fade', 'slide-up', 'pop-spring'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Commentary Booth',
    description:
      'The booth strap: one accent header row naming the segment, spanning two callers set ' +
      'side by side beneath it, each with their own name and job as independent SPX fields. ' +
      'The header is what makes it a commentary graphic rather than two lower thirds — it ' +
      'says whose voices these are before it says who they belong to.',
    uicolor: '7',
  },
  (o) => {
    // Line 0 is the header; the callers start at line 1. The duo split works on the REST,
    // so removing the header never re-reads a caller's name as one.
    const callers = {
      ...o,
      lines: o.lines.slice(1),
    };
    const rebased = duoSplitBalanced(callers);
    const { left, right } = {
      left: rebased.left.map((i) => i + 1),
      right: rebased.right.map((i) => i + 1),
    };
    const classes = {
      column: 'lower-third-person',
      name: 'lower-third-caller',
      role: 'lower-third-callerrole',
    };
    const header = hasLine(o, 0)
      ? `      <!-- ${o.lines[0].title} (f0) — the segment header, spanning both callers. -->
      <div class="lower-third-mask lower-third-header"><span id="f0" class="lower-third-name">${o.lines[0].sample}</span></div>
`
      : '';
    const divider = left.length > 0 && right.length > 0
      ? '\n        <!-- Separator — drawn only while both callers are present. -->\n        <div class="lower-third-divider"></div>'
      : '';

    return {
      html: `    <!-- The booth: a header row over the two callers. -->
    <div class="lower-third-box">
${header}      <div class="lower-third-callers">
${personColumn(o, left, classes, '        ')}${divider}
${personColumn(o, right, classes, '        ')}
      </div>
    </div>`,

      css: `/* The slab — flat, zero radius, one hard offset shadow: the sport family's surface. */
.lower-third-box {
  background: var(--panel-bg);      /* the flat dark slab */
  box-shadow: var(--panel-shadow);  /* the family's hard lift */
}

/* The header row — a full-width accent band. It is the graphic's subject line, so it takes
   the accent as a FILL rather than as a rule: at a glance the band is what you read. */
.lower-third-header {
  background: var(--accent);        /* the one bold accent surface, sport-style */
  padding: calc(7px * var(--scale)) calc(26px * var(--scale)) calc(8px * var(--scale));
}
.lower-third-name {
  display: block;                   /* the band's text fills its row */
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* a header, not a headline */
  font-weight: 500;                 /* Oswald is already condensed — weight would blunt it */
  line-height: 1.1;                 /* one tight band row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* ON THE CALL, whatever the operator types */
  color: var(--accent-ink);         /* the family's ink for text ON accent */
}

/* The callers area, below the band. The grid lives HERE and not on the box, because the
   box has to stack the header row above it. */
.lower-third-callers {
  padding: calc(18px * var(--scale)) calc(26px * var(--scale)) calc(20px * var(--scale));
}

${duoGridCss({
  gap: 'calc(28px * var(--scale))',
  columnMax: 'calc(400px * var(--scale))',
  divider: true,
  container: '.lower-third-callers',
})}

/* Each caller's name — both identical: on the call, neither voice outranks the other. */
.lower-third-caller {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  line-height: 1.05;                /* condensed caps sit tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;        /* matchday voice */
  color: var(--text-color);         /* primary text color */
}

/* Each caller's job — the small line that makes the pair legible as a booth. */
.lower-third-callerrole {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the quietest voice on the strap */
  line-height: 1.25;                /* room if the job title wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* keeps the block uniform */
  color: var(--label-color);        /* the family's label color */
  margin-top: calc(5px * var(--scale));  /* tied to the name above it */
}`,
      // The accent is the header band — a filled surface, not a bar node. The presets fall
      // back to moving the box, which is right: the booth arrives as one slab.
      hasAccent: false,
      tokens: { labelColor: 'var(--text-dim)' },
    };
  },
);
