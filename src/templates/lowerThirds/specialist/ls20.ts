// ls20 "Candidate Bar" — the election-night result strap.
//
// In civic coverage the PARTY COLOUR is the identity. Viewers read the colour before the
// abbreviation and the abbreviation before the name, and every results programme is built on
// that order — which is why this strap leads with a filled colour block carrying the party's
// short form, and why the candidate's name follows it rather than the other way round.
//
// The colour is the graphic's `--accent`, deliberately. It means an operator sets a party by
// picking a colour in the Style panel (or a rundown drives it), the whole strap re-tints
// coherently, and nothing has to be hard-coded per party. That is the one integration
// decision this design makes, and it is the reason it works for any country's parties.
//
// The share figure is right-aligned in its own cell so a column of straps played in sequence
// keeps its decimal points in line — the thing that makes results coverage look counted
// rather than typed.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { TABULAR_FIGURES, hasLine, slot } from './shared';

export const ls20: TemplateVariant = defineVariant(
  {
    id: 'ls20',
    category: 'lower-third',
    name: 'Candidate Bar',
    styleTag: 'minimal',
    roleTag: 'politics',
    keywords: ['election', 'candidate', 'party', 'results', 'count', 'constituency', 'vote', 'share', 'civic'],
    description: 'A party-colour block with its short form, the candidate named, and the share right-aligned.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Party (short)', sample: 'GRN' },
      { title: 'Candidate', sample: 'Ingrid Sørensen' },
      { title: 'Constituency', sample: 'Bergen North' },
      { title: 'Share', sample: '31.4%' },
    ],
    logo: 'none',
    // The wipe reads as a bar filling — the right gesture for a count. Nothing springy:
    // election graphics carry a claim about a real number.
    animationPresets: ['mask-wipe', 'slide-left', 'fade', 'line-reveal', 'slide-up', 'slide-down'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Candidate Bar',
    description:
      'The results strap: a filled party-colour block carrying the party’s short form, the ' +
      'candidate and constituency beside it, and the vote share right-aligned in tabular ' +
      'figures so a run of straps keeps its decimals in line. The party colour IS the ' +
      'graphic’s accent, so setting one colour re-tints the whole strap for any party.',
    uicolor: '2',
  },
  (o) => {
    // The colour block is unconditional, its short form is not. The block is this design's
    // .lower-third-accent node (the animation data keyframes it by selector), and it is also
    // the party's identity — a results bar still reads correctly as a bare colour block, which
    // is exactly how coverage handles an independent or an unlabelled party.
    const partyBlock = `      <!-- The party colour block — the identity, and the accent node. -->
      <div class="lower-third-accent">
${hasLine(o, 0) ? `        <div class="lower-third-mask"><span id="f0" class="lower-third-party">${o.lines[0].sample}</span></div>\n` : ''}      </div>
`;
    const share = hasLine(o, 3)
      ? `      <div class="lower-third-sharecell">
${slot(o, 3, 'lower-third-extra', '        ')}
      </div>
`
      : '';

    return {
      html: `    <!-- The bar: [party colour block] | [candidate · constituency] | [share]. -->
    <div class="lower-third-box">
${partyBlock}      <div class="lower-third-text">
${slot(o, 1, 'lower-third-name', '        ')}
${slot(o, 2, 'lower-third-title', '        ')}
      </div>
${share}    </div>`,

      css: `/* The bar — one hard-edged run: colour block, name, share. Zero radius, because a
   results bar is a row in a table and a table's rows have square ends. */
.lower-third-box {
  display: flex;                    /* the three cells in a row */
  align-items: stretch;             /* every cell runs the bar's full height */
  background: var(--panel-bg);      /* the quiet panel behind the text */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  min-width: calc(620px * var(--scale));  /* a run of straps keeps ONE width, so the share
                                             column does not move between candidates */
}

/* The party colour block — the graphic's accent node, and its identity. */
.lower-third-accent {
  flex: 0 0 auto;                   /* never squeezed by a long name */
  min-width: calc(108px * var(--scale));  /* two- and four-letter short forms give one block */
  max-width: calc(210px * var(--scale));  /* and a full party name pasted in by mistake clips
                                             inside its own block rather than pushing the
                                             candidate and the share out of the bar */
  overflow: hidden;                 /* the clip is what makes the max-width real: without it a
                                       long value overflows the centred flex child into the
                                       candidate beside it (proven by the runtime bench) */
  display: flex;                    /* centre the short form inside the block */
  align-items: center;              /* …vertically */
  justify-content: center;          /* …horizontally */
  padding: calc(14px * var(--scale)) calc(16px * var(--scale));
  background: var(--accent);        /* THE party colour — set it in the Style panel */
}

/* The party short form. Bounded and clipped: a short form is two-to-four characters, so a
   full party name pasted in by mistake ellipsizes inside the block rather than laying out
   wider than it and colliding with the candidate (the runtime bench proves it). */
.lower-third-party {
  display: block;                   /* so the width bound and the ellipsis apply */
  max-width: calc(176px * var(--scale));  /* the block's inner width — the measured cap */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* big enough to read at a glance */
  font-weight: 800;                 /* heavy — this is the thing viewers read first */
  line-height: 1;                   /* the block's height comes from its padding */
  letter-spacing: 0.04em;           /* a touch of air keeps three caps from fusing */
  text-transform: uppercase;        /* GRN, whatever the operator types */
  color: var(--accent-ink);         /* the family's ink for text ON accent */
  white-space: nowrap;              /* a short form never wraps… */
  overflow: hidden;                 /* …and a too-long one is clipped… */
  text-overflow: ellipsis;          /* …with an honest ellipsis */
}

/* The candidate cell — takes the slack, so the share stays pinned to the right edge. */
.lower-third-text {
  flex: 1 1 auto;                   /* absorbs the bar's spare width */
  display: flex;                    /* stack name over constituency */
  flex-direction: column;           /* top to bottom */
  justify-content: center;          /* vertically centred against the colour block */
  min-width: 0;                     /* let it shrink so long names wrap instead of overflowing */
  padding: calc(12px * var(--scale)) calc(26px * var(--scale)) calc(13px * var(--scale)) calc(22px * var(--scale));
}

/* The candidate (f1) — the bar's headline. */
.lower-third-name {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 600;                 /* semibold: present without shouting */
  line-height: 1.1;                 /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The constituency (f2) — where the count is. */
.lower-third-title {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* half the name — reference, not billing */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.25;                /* room if a long constituency wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the civic register */
  color: var(--label-color);        /* the family's label color */
  margin-top: calc(4px * var(--scale));  /* tied to the name above it */
}

/* The share cell — pinned right, its own rule, tabular figures. Right-aligning it is what
   keeps decimal points in line across a sequence of straps. */
.lower-third-sharecell {
  flex: 0 0 auto;                   /* sized by its figure, never stretched */
  display: flex;                    /* centre the figure in the cell */
  align-items: center;              /* …vertically */
  justify-content: flex-end;        /* …against the right edge */
  padding: calc(12px * var(--scale)) calc(26px * var(--scale));
  border-left: 1px solid rgba(255, 255, 255, 0.14);  /* the cell divider */
}

/* The share (f3). */
.lower-third-extra {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* the figure is the news */
  font-weight: 700;                 /* bold — a result is stated, not mentioned */
  line-height: 1;                   /* single tight figure */
  ${TABULAR_FIGURES}
  color: var(--text-color);         /* primary text color */
  text-align: right;                /* decimals line up across a run of straps */
  white-space: nowrap;              /* a percentage never wraps */
}`,
      hasAccent: true,
      tokens: { labelColor: 'var(--text-dim)' },
    };
  },
);
