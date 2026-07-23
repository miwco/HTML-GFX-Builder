// ls24 "Expert Panel" — the specialist's strap, built around the FIELD rather than the mark.
//
// Where ls23 marks a segment as comment, this one answers a different question: why is THIS
// person the one being asked? Explainer coverage, medical and legal streams, and long-form
// panel shows all lean on the same shape — the area of expertise set as a label ahead of the
// name, then the affiliation that backs it. The label is not an editorial warning like
// ls23's kicker; it is a subject tag, so it is outlined rather than filled and it takes the
// panel's quiet register instead of a reserved colour.
//
// Glass, because these formats are long: this strap sits under a talking head for minutes at
// a time, and a solid slab that long starts to feel like a lid on the picture.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls24: TemplateVariant = defineVariant(
  {
    id: 'ls24',
    category: 'lower-third',
    name: 'Expert Panel',
    styleTag: 'glass',
    roleTag: 'analysis',
    keywords: ['expert', 'specialist', 'analyst', 'panel', 'medical', 'legal', 'explainer', 'field', 'consultant'],
    description: 'The area of expertise tagged ahead of the name, with the affiliation behind it.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Field', sample: 'Infectious Disease' },
      { title: 'Name', sample: 'Dr. Farah Nasser' },
      { title: 'Affiliation', sample: 'Consultant · St Thomas’ Hospital' },
    ],
    logo: 'none',
    animationPresets: ['blur-in', 'slide-up', 'fade', 'line-reveal', 'pop-spring', 'mask-wipe'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Expert Panel',
    description:
      'The specialist strap: the area of expertise set as an outlined subject tag above the ' +
      'name, with the affiliation that backs it beneath. The tag answers "why this person" ' +
      'rather than flagging opinion, so it stays in the panel’s quiet register instead of ' +
      'taking a reserved colour. Frosted, for formats that keep a strap up for minutes.',
    uicolor: '5',
  },
  (o) => {
    const fieldTag = hasLine(o, 0)
      ? `      <!-- ${o.lines[0].title} (f0) — the subject tag: why this person is the one being asked. -->
      <div class="lower-third-mask lower-third-tagwrap"><span id="f0" class="lower-third-name">${o.lines[0].sample}</span></div>
`
      : '';

    return {
      html: `    <!-- The card: [accent edge] | [subject tag, name, affiliation]. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
      <div class="lower-third-text">
${fieldTag}${slot(o, 1, 'lower-third-title', '        ')}
${slot(o, 2, 'lower-third-extra', '        ')}
      </div>
    </div>`,

      css: `/* The card — the glass family's surface: blurred, softly cornered, lightly lifted. */
.lower-third-box {
  display: flex;                    /* the accent edge leads the text */
  align-items: stretch;             /* the edge runs the card's full height */
  background: var(--panel-bg);      /* the family's translucent white */
  backdrop-filter: var(--panel-blur);  /* the frost itself */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
  overflow: hidden;                 /* the accent edge follows the rounded corner */
  max-width: calc(720px * var(--scale));  /* an affiliation line runs long */
}

/* The accent edge — the graphic's accent node (lt15's motif). */
.lower-third-accent {
  flex: none;                       /* never squeezed by long text */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  transform-origin: center;         /* line-reveal scales it from the middle */
}

.lower-third-text {
  display: flex;                    /* stack tag, name and affiliation */
  flex-direction: column;           /* top to bottom */
  align-items: flex-start;          /* the tag hugs the left edge rather than stretching */
  min-width: 0;                     /* let it shrink so long values wrap instead of overflowing */
  padding: calc(18px * var(--scale)) calc(34px * var(--scale)) calc(20px * var(--scale)) calc(26px * var(--scale));
}

/* The subject tag (f0) — OUTLINED, not filled: this is a description, not a warning. */
.lower-third-tagwrap {
  flex: none;                       /* the tag keeps its size whatever the name does */
  max-width: 100%;                  /* …but never runs past the card */
}
.lower-third-name {
  display: block;                   /* the tag's box is this element */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* tag type is small by definition */
  font-weight: 700;                 /* bold — small tracked caps need the weight */
  line-height: 1;                   /* the tag's height comes from its padding */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* INFECTIOUS DISEASE, whatever the operator types */
  padding: calc(5px * var(--scale)) calc(11px * var(--scale)) calc(6px * var(--scale));
  border-radius: calc(999px * var(--scale));  /* a pill — the glass family's chip shape */
  color: var(--accent);             /* the tag carries the colour… */
  box-shadow: inset 0 0 0 1px currentColor;  /* …and outlines itself in it, so a repalette
                                                takes the outline with the text */
  opacity: 0.9;                     /* the outline reads as a hairline, not a border */
}

/* The name (f1) — the card's headline. */
.lower-third-title {
  font-size: calc(36px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.12;                /* room for an honorific and a wrapped surname */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
  margin-top: calc(10px * var(--scale));  /* a clear break below the tag */
}

/* The affiliation (f2) — what backs the expertise. */
.lower-third-extra {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.3;                 /* an affiliation wraps — give the rows air */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(5px * var(--scale));  /* tied to the name above it */
}`,
      hasAccent: true,
    };
  },
);
