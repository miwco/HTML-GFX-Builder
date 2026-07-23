// ls11 "Team Tag" — the esports player identity.
//
// An esports player is named differently from an athlete, and the strap has to follow. The
// in-game name is the real name on screen; the team TAG is a two-to-four letter prefix that
// belongs in front of it (the way tournament brackets and scoreboards print it); the legal
// name, if it is shown at all, is a smaller line underneath. That order — tag, handle, role,
// team — is what league broadcasts use, and it is the reverse of a sports strap's, where the
// person leads and the club follows.
//
// The tag is its own field and its own chip, because it is not part of the handle: the handle
// survives a transfer and the tag does not.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls11: TemplateVariant = defineVariant(
  {
    id: 'ls11',
    category: 'lower-third',
    name: 'Team Tag',
    styleTag: 'sport',
    description: 'A team tag chip in front of the in-game name, with role and org beneath.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Team tag', sample: 'NGT' },
      { title: 'In-game name', sample: 'Vantablack' },
      { title: 'Role', sample: 'Mid lane' },
      { title: 'Player name', sample: 'Karim Haddad · Northgate Esports' },
    ],
    logo: 'none',
    // The tournament stinger: fast, lateral, no settle. It reads as part of the broadcast's
    // transition package rather than as a considered introduction.
    animationPresets: ['snap-stinger', 'slide-left', 'mask-wipe', 'pop-spring', 'fade', 'slide-up'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Team Tag',
    description:
      'The league player tag: a filled team-tag chip in front of the in-game name, with the ' +
      'role and the legal name beneath. Tag and handle are separate SPX fields on purpose — ' +
      'a handle survives a transfer and a tag does not, so an operator changes one without ' +
      'retyping the other.',
    uicolor: '6',
  },
  (o) => {
    const tagChip = hasLine(o, 0)
      ? `        <!-- ${o.lines[0].title} (f0) — the org's bracket tag, its own chip. -->
        <div class="lower-third-mask lower-third-tagwrap"><span id="f0" class="lower-third-tag">${o.lines[0].sample}</span></div>
`
      : '';

    return {
      html: `    <!-- The tag chip and handle share the top row; role and legal name sit beneath. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
      <div class="lower-third-text">
        <div class="lower-third-idrow">
${tagChip}${slot(o, 1, 'lower-third-name', '        ')}
        </div>
${slot(o, 2, 'lower-third-title', '        ')}
${slot(o, 3, 'lower-third-extra', '        ')}
      </div>
    </div>`,

      css: `/* The slab — hard-edged, sitting on a bright accent floor rather than behind a bar:
   league graphics tend to underline rather than to bracket. */
.lower-third-box {
  display: flex;                    /* the accent floor is a sibling of the text… */
  flex-direction: column-reverse;   /* …drawn UNDER it (reverse puts the first child last) */
  background: var(--panel-bg);      /* the flat dark slab */
  box-shadow: var(--panel-shadow);  /* the family's hard lift */
  width: fit-content;               /* the slab hugs its content */
}

/* The accent floor — the graphic's accent node, a full-width bar along the bottom edge. */
.lower-third-accent {
  height: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  transform-origin: left center;    /* line-reveal draws it from this end */
}

.lower-third-text {
  min-width: 0;                     /* let it shrink so long values wrap instead of overflowing */
  max-width: calc(640px * var(--scale));  /* the wrap point for a very long handle */
  padding: calc(16px * var(--scale)) calc(28px * var(--scale)) calc(16px * var(--scale));
}

/* The identity row: tag chip, then handle, on one baseline. */
.lower-third-idrow {
  display: flex;                    /* chip and handle in a row… */
  flex-wrap: wrap;                  /* …wrapping only if the handle is genuinely long */
  align-items: baseline;            /* the chip sits on the handle's baseline */
  gap: calc(12px * var(--scale));
  min-width: 0;                     /* allow shrinking */
}
.lower-third-idrow > .lower-third-mask {
  display: flex;                    /* each value hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The tag chip — filled, tight, and never wrapped: a bracket tag is an atom. */
.lower-third-tagwrap {
  flex: none;                       /* the chip keeps its size whatever the handle does */
  max-width: calc(200px * var(--scale));  /* a bracket tag is three or four characters; a full
                                             org name pasted here clips inside its own mask
                                             rather than pushing the handle off the slab */
  overflow: hidden;                 /* the clip is what makes the max-width real (bench) */
}
.lower-third-tag {
  display: block;                   /* the chip's box is this element */
  max-width: calc(180px * var(--scale));  /* a tag is 3-4 characters; a longer value clips
                                             here rather than laying out wider (bench) */
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* smaller than the handle it prefixes */
  font-weight: 700;                 /* bold — a tag is set heavy everywhere it appears */
  line-height: 1;                   /* the chip's height comes from its padding */
  letter-spacing: 0.06em;           /* a touch of air keeps 3 caps from fusing */
  text-transform: uppercase;        /* NGT, whatever the operator types */
  padding: calc(6px * var(--scale)) calc(10px * var(--scale)) calc(7px * var(--scale));
  background: var(--accent);        /* the tag is the strap's one filled accent surface */
  color: var(--accent-ink);         /* the family's ink for text ON accent */
  white-space: nowrap;              /* a tag never breaks across lines… */
  overflow: hidden;                 /* …and a too-long one is clipped… */
  text-overflow: ellipsis;          /* …with an honest ellipsis */
}

/* The in-game name — the strap's headline, and the name the audience actually knows. */
.lower-third-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 700;                 /* bold — the handle carries the strap */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — the one line that says what this player does in the game. */
.lower-third-title {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* clearly below the handle */
  font-weight: 600;                 /* semibold keeps tracked caps crisp */
  line-height: 1.25;                /* room if the role wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* MID LANE, whatever the operator types */
  color: var(--accent);             /* the role takes the colour, the way rosters print it */
  margin-top: calc(8px * var(--scale));  /* tied to the identity row above */
}

/* The legal name and org — the smallest line, and the one many broadcasts leave empty. */
.lower-third-extra {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* the quietest voice on the strap */
  font-weight: 400;                 /* regular — this line is reference, not billing */
  line-height: 1.3;                 /* room if the pairing wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(4px * var(--scale));  /* tied to the role above it */
}`,
      hasAccent: true,
    };
  },
);
