// ls17 "Lectern" — the academic speaker strap.
//
// Two things make an academic credit different from a corporate one, and both are structural
// rather than decorative.
//
// First, POST-NOMINALS are their own field. "Prof. Ama Boateng, PhD, FRSC" is a name plus a
// list of qualifications that a department will insist on and that changes independently of
// the name; jammed into one textfield it wraps in the wrong place and sets at the wrong size.
// Here it trails the name on the same baseline, smaller and dimmed, so a long list degrades
// gracefully instead of pushing the name onto two rows.
//
// Second, the INSTITUTION carries the authority — it is why this person is being shown — so
// it is set apart under a rule rather than trailing the job title as an afterthought.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls17: TemplateVariant = defineVariant(
  {
    id: 'ls17',
    category: 'lower-third',
    name: 'Lectern',
    styleTag: 'minimal',
    roleTag: 'academic',
    keywords: ['university', 'professor', 'lecture', 'conference', 'seminar', 'institution', 'faculty', 'phd', 'research'],
    description: 'A name with its own post-nominals field, over a position and a set-apart institution.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Name', sample: 'Prof. Ama Boateng' },
      { title: 'Post-nominals', sample: 'PhD, FRSC' },
      { title: 'Position', sample: 'Chair of Atmospheric Chemistry' },
      { title: 'Institution', sample: 'University of Leeds' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'line-reveal', 'slide-up', 'mask-wipe', 'blur-in', 'slide-down'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Lectern',
    description:
      'The academic credit: the name with its post-nominals as a separate SPX field trailing ' +
      'on the same baseline, the position beneath, and the institution set apart under a rule ' +
      'because it is the authority the appearance rests on. Splitting the qualifications out ' +
      'keeps a long list from breaking the name across two rows.',
    uicolor: '1',
  },
  (o) => {
    const nameRow = hasLine(o, 0) || hasLine(o, 1)
      ? `      <div class="lower-third-namerow">
${slot(o, 0, 'lower-third-name', '        ')}
${slot(o, 1, 'lower-third-postnom', '        ')}
      </div>
`
      : '';
    // The rule is emitted UNCONDITIONALLY even though the institution under it is optional.
    // It is the design's `.lower-third-accent` node, and the animation data keyframes that
    // node by selector: an element that comes and goes with a field would leave the timeline
    // (and the line-reveal preset) addressing something that isn't there. With no institution
    // it simply closes the strap, which is a finishing mark rather than a dangling rule.
    const institution = `      <div class="lower-third-accent"></div>
${hasLine(o, 3) ? `${slot(o, 3, 'lower-third-extra')}\n` : ''}`;

    return {
      html: `    <!-- The strap: name + post-nominals, the position, then a ruled institution line. -->
    <div class="lower-third-box">
${nameRow}${slot(o, 2, 'lower-third-title')}
${institution}    </div>`,

      css: `/* The panel — quiet, restrained, wide enough for a real job title. */
.lower-third-box {
  padding: calc(20px * var(--scale)) calc(44px * var(--scale)) calc(22px * var(--scale)) calc(28px * var(--scale));
  background: var(--panel-bg);      /* the minimal family's quiet panel */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  max-width: calc(760px * var(--scale));  /* academic job titles are long — give them the room */
}

/* The name row: name and post-nominals on one baseline. */
.lower-third-namerow {
  display: flex;                    /* name and qualifications in a row… */
  flex-wrap: wrap;                  /* …wrapping only when the pair genuinely doesn't fit */
  align-items: baseline;            /* the qualifications sit on the name's baseline */
  gap: calc(10px * var(--scale));
  min-width: 0;                     /* allow shrinking */
}
.lower-third-namerow > .lower-third-mask {
  display: flex;                    /* each value hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The name (f0) — the strap's headline. */
.lower-third-name {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 600;                 /* semibold: present without shouting */
  line-height: 1.1;                 /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The post-nominals (f1) — a trailing list, not a second name: smaller, dimmed, and
   preceded by a comma the DESIGN draws, so the field holds qualifications and nothing else. */
.lower-third-postnom {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* half the name — a suffix */
  font-weight: 500;                 /* medium keeps small caps crisp */
  line-height: 1.2;                 /* single tight row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  color: var(--text-dim);           /* dimmed — the name leads */
}
.lower-third-postnom::before {
  content: ",";                     /* the separator is DRAWN, never typed into the field */
  margin-right: calc(6px * var(--scale));  /* the comma hugs the name it follows */
  margin-left: calc(-10px * var(--scale));  /* pulls back through the row gap, so the comma
                                               sits against the name rather than floating */
}

/* The position (f1's neighbour, f2) — the working description. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.3;                 /* room for a long chair title to wrap */
  color: var(--text-dim);           /* dimmed — never the primary ink twice */
  margin-top: calc(7px * var(--scale));  /* tied to the name row above it */
}

/* The rule above the institution — the graphic's accent node, and the device that sets
   the institution apart from the job title rather than letting it trail on. */
.lower-third-accent {
  width: calc(40px * var(--scale));  /* a short mark, not a rule across the panel */
  height: calc(2px * var(--scale));  /* a hairline */
  background: var(--accent);        /* the one accent surface */
  margin: calc(13px * var(--scale)) 0 calc(11px * var(--scale));  /* air on both sides — the
                                             bottom margin holds even when the rule closes
                                             the strap with no institution under it */
  transform-origin: left center;    /* line-reveal draws it from this end */
}

/* The institution (f3) — the authority line, in the accent and set in caps. */
.lower-third-extra {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* small, but the sharpest voice */
  font-weight: 600;                 /* semibold — small tracked caps need the weight */
  line-height: 1.25;                /* room if a long institution wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the institutional voice */
  color: var(--accent);             /* the strap's one coloured line */
}`,
      hasAccent: true,
    };
  },
);
