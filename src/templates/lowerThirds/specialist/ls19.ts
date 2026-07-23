// ls19 "Session Speaker" — the conference strap where the TALK leads.
//
// A conference stream has a problem a lecture does not: people join in the middle. Someone
// arriving eleven minutes into a session needs to know what talk they are in before they need
// to know who is giving it — so the session strap, unlike ls17's speaker credit, sets the
// talk title as the headline and puts the speaker underneath. It is the same inversion as
// ls15's scripture strap, for the same reason: the graphic serves the person who just walked
// in, not the person on screen.
//
// The track-and-time line is what makes it usable in a multi-track programme, and it is set
// in the house mono so it reads as schedule metadata rather than as part of the talk's title.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls19: TemplateVariant = defineVariant(
  {
    id: 'ls19',
    category: 'lower-third',
    name: 'Session Speaker',
    styleTag: 'noacg',
    roleTag: 'academic',
    keywords: ['conference', 'session', 'track', 'talk', 'keynote', 'symposium', 'programme', 'webinar', 'speaker'],
    description: 'The talk title as the headline, with the speaker and the track beneath.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Talk title', sample: 'Attribution in a Warming Arctic' },
      { title: 'Speaker', sample: 'Prof. Ama Boateng' },
      { title: 'Institution', sample: 'University of Leeds' },
      { title: 'Track', sample: 'Track B · 14:30' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'blur-in', 'slide-down'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Session Speaker',
    description:
      'The multi-track conference strap: the talk title set as the headline — because a ' +
      'viewer joining mid-session needs the talk before the speaker — with the speaker and ' +
      'institution on one line beneath and the track and time set apart in the house mono. ' +
      'Every value is its own SPX field, so a programme is driven from a rundown.',
    uicolor: '4',
  },
  (o) => {
    const creditRow = hasLine(o, 1) || hasLine(o, 2)
      ? `      <div class="lower-third-creditrow">
${slot(o, 1, 'lower-third-title', '        ')}
${slot(o, 2, 'lower-third-institution', '        ')}
      </div>
`
      : '';

    return {
      html: `    <!-- House structure: [8px accent bar] | [void panel: talk, speaker row, track line]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${slot(o, 0, 'lower-third-name')}
${creditRow}${slot(o, 3, 'lower-third-extra')}
    </div>`,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void, starting where the accent bar ends. Wider than the house
   default: a talk title is a sentence, not a name. */
.lower-third-box {
  margin-left: calc(8px * var(--scale));    /* starts where the accent bar ends */
  padding: calc(22px * var(--scale)) calc(52px * var(--scale)) calc(24px * var(--scale)) calc(32px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  max-width: calc(800px * var(--scale));  /* room for a real academic title to wrap once —
                                             kept under the category auto-fit cap, which is
                                             the frame safe area and must stay authoritative */
}

/* The talk title (f0) — the strap's headline. Sized for a sentence rather than a name:
   smaller than a name-led strap's headline, because it has more words to carry. */
.lower-third-name {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.14;                /* a title wraps — give the rows air */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The credit row: speaker and institution inline behind a drawn middot. */
.lower-third-creditrow {
  display: flex;                    /* speaker and institution on one row… */
  flex-wrap: wrap;                  /* …wrapping only if both are long */
  align-items: baseline;            /* one shared baseline */
  gap: calc(10px * var(--scale));   /* the drawn middot sits in this gap */
  margin-top: calc(12px * var(--scale));  /* a clear break below the title */
  min-width: 0;                     /* allow shrinking */
}
.lower-third-creditrow > .lower-third-mask {
  display: flex;                    /* each value hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The speaker (f1) — a credit under the title, not a headline of its own. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly below the title */
  font-weight: 500;                 /* medium — it is a name, but not the subject */
  line-height: 1.25;                /* room if the name wraps */
  color: var(--text-color);         /* the speaker keeps the primary ink… */
}

/* The institution (f2) — the same row, dimmed: it qualifies the speaker. */
.lower-third-institution {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* a shade under the speaker */
  font-weight: 400;                 /* regular — a qualifier */
  line-height: 1.25;                /* matches the speaker's rhythm */
  color: var(--text-dim);           /* …and the institution takes the dimmed one */
}
.lower-third-creditrow > .lower-third-mask + .lower-third-mask::before {
  content: "·";                     /* the join is DRAWN, never typed into a field */
  margin-right: calc(10px * var(--scale));  /* balances the flex gap on the other side */
  color: var(--text-dim);           /* quieter than the words it joins */
}

/* The track and time (f3) — schedule metadata, in the house mono so it never reads as
   part of the talk's title. */
.lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the smallest voice on the strap */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* TRACK B · 14:30, whatever the operator types */
  font-variant-numeric: tabular-nums;  /* schedule figures keep an even rhythm */
  color: var(--label-color);        /* the family's label color */
  margin-top: calc(14px * var(--scale));  /* the track line is its own beat */
}`,
      hasAccent: true,
    };
  },
);
