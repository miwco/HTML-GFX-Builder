// ls22 "Party Strap" — the house strap doing civic duty.
//
// The everyday political lower third: not a result (ls20) and not a debate podium (ls21), but
// the strap that names a politician during an interview, a doorstep, or a committee session.
// What it needs that a general strap does not is a party AFFILIATION set apart from the job
// title — "Minister for Transport" and "Green Alliance" are two different facts about the
// same person, and a strap that runs them together as one subtitle makes the affiliation
// look like part of the job.
//
// So the affiliation is a chip carrying the party colour, sitting beside the role rather than
// under it. The house bar takes the same colour, which is what makes the strap read as
// belonging to that party at a glance.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls22: TemplateVariant = defineVariant(
  {
    id: 'ls22',
    category: 'lower-third',
    name: 'Party Strap',
    styleTag: 'noacg',
    roleTag: 'politics',
    keywords: ['politician', 'party', 'minister', 'council', 'committee', 'affiliation', 'government', 'civic'],
    description: 'A politician named with their role, and their party set apart as a colour chip.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Ingrid Sørensen' },
      { title: 'Role', sample: 'Minister for Transport' },
      { title: 'Party', sample: 'Green Alliance' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Party Strap',
    description:
      'The everyday political strap: the house bar and void panel carrying a name, the job ' +
      'title, and the party affiliation as a separate colour chip beside it — two different ' +
      'facts, kept visibly different, where a single subtitle line would make the party look ' +
      'like part of the job. The bar and the chip share the party colour.',
    uicolor: '4',
  },
  (o) => {
    const partyChip = hasLine(o, 2)
      ? `        <!-- ${o.lines[2].title} (f2) — the affiliation, as a colour chip beside the role. -->
        <div class="lower-third-mask lower-third-chipwrap"><span id="f2" class="lower-third-extra">${o.lines[2].sample}</span></div>
`
      : '';

    return {
      html: `    <!-- House structure: [8px accent bar] | [void panel: name, then role + party chip]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${slot(o, 0, 'lower-third-name')}
      <div class="lower-third-footrow">
${slot(o, 1, 'lower-third-title', '        ')}
${partyChip}      </div>
    </div>`,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge. It carries the PARTY colour, which
   is what makes the strap legible as that party's before a word is read. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* THE party colour — set it in the Style panel */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void, starting where the accent bar ends. */
.lower-third-box {
  margin-left: calc(8px * var(--scale));    /* starts where the accent bar ends */
  padding: calc(22px * var(--scale)) calc(52px * var(--scale)) calc(24px * var(--scale)) calc(32px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  max-width: calc(780px * var(--scale));  /* ministerial titles run long */
}

/* The name (f0) — the strap's one heavy element. */
.lower-third-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.06;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The foot row: role and party chip on one baseline. */
.lower-third-footrow {
  display: flex;                    /* role and chip in a row… */
  flex-wrap: wrap;                  /* …wrapping only when the pair genuinely doesn't fit */
  align-items: baseline;            /* the chip sits on the role's baseline */
  gap: calc(14px * var(--scale));
  margin-top: calc(11px * var(--scale));  /* a clear break below the name */
  min-width: 0;                     /* allow shrinking */
}
.lower-third-footrow > .lower-third-mask {
  display: flex;                    /* each value hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The role (f1) — the working description. */
.lower-third-title {
  font-size: calc(23px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.25;                /* room if a long title wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
}

/* The party chip (f2) — the affiliation, filled in the party colour so it is unmistakably
   a different KIND of fact from the role beside it. */
.lower-third-chipwrap {
  flex: none;                       /* the chip keeps its size whatever the role does */
}
.lower-third-extra {
  display: block;                   /* the chip's box is this element */
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* chip type is small by definition */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1;                   /* the chip's height comes from its padding */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* GREEN ALLIANCE, whatever the operator types */
  padding: calc(6px * var(--scale)) calc(11px * var(--scale)) calc(7px * var(--scale));
  border-radius: calc(4px * var(--scale));  /* a squared chip — the house doesn't use pills */
  background: var(--accent);        /* the party colour, filled */
  color: var(--accent-ink);         /* the family's ink for text ON accent */
  white-space: nowrap;              /* a party name chip never breaks mid-word */
}`,
      hasAccent: true,
    };
  },
);
