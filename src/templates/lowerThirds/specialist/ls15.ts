// ls15 "Scripture Reading" — the reader's strap, where the READING outranks the reader.
//
// This is the one graphic in the pack whose subject is not the person on screen. During a
// reading the congregation wants the reference — so they can follow in their own copy — and
// the reader's name is the courtesy line under it. Every church stream that gets this right
// sets the reference biggest; the ones that get it wrong run a normal speaker strap and the
// reference ends up as a subtitle nobody can read from the back of the room.
//
// So the reference is the headline, set in the accent, and the reader is the small line
// beneath. The translation sits with the reference as a quiet suffix because it qualifies the
// reference, not the person.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls15: TemplateVariant = defineVariant(
  {
    id: 'ls15',
    category: 'lower-third',
    name: 'Scripture Reading',
    styleTag: 'minimal',
    roleTag: 'faith',
    keywords: ['church', 'scripture', 'reading', 'bible', 'verse', 'reader', 'lectionary', 'liturgy', 'faith'],
    description: 'The reference set as the headline, with the reader named quietly beneath.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Reading', sample: 'Isaiah 40 : 28–31' },
      { title: 'Translation', sample: 'NIV' },
      { title: 'Read by', sample: 'Ruth Okonjo' },
      { title: 'Role', sample: 'Elder' },
    ],
    logo: 'none',
    // Line reveal: the rule draws, then the reference rises. Slow and deliberate — the
    // graphic is asking people to find a page, so it should not be gone before they look.
    animationPresets: ['line-reveal', 'fade', 'blur-in', 'slide-up', 'mask-wipe', 'slide-down'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Scripture Reading',
    description:
      'The reading strap: the scripture reference set as the headline with its translation ' +
      'as a quiet suffix, and the reader credited underneath. The reference leads because ' +
      'that is what a congregation needs from the graphic — the reader’s name is the ' +
      'courtesy line, not the subject.',
    uicolor: '1',
  },
  (o) => {
    // The reference row holds the reading and its translation on one baseline; the credit
    // row holds the reader and their office. Each row disappears entirely when nothing is
    // left in it, so a bare reference or a bare credit both render as complete graphics.
    const refRow = hasLine(o, 0) || hasLine(o, 1)
      ? `      <div class="lower-third-refrow">
${slot(o, 0, 'lower-third-name', '        ')}
${slot(o, 1, 'lower-third-translation', '        ')}
      </div>
`
      : '';
    const creditRow = hasLine(o, 2) || hasLine(o, 3)
      ? `      <div class="lower-third-creditrow">
${slot(o, 2, 'lower-third-title', '        ')}
${slot(o, 3, 'lower-third-extra', '        ')}
      </div>
`
      : '';

    return {
      html: `    <!-- The strap: a hairline, the reference row, then the reader's credit row. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
${refRow}${creditRow}    </div>`,

      css: `/* The panel — quiet and light, the same surface as the rest of the worship pack. */
.lower-third-box {
  padding: calc(22px * var(--scale)) calc(44px * var(--scale)) calc(24px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);      /* the minimal family's quiet panel */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  max-width: calc(680px * var(--scale));  /* a reference is short; nothing here needs the frame */
}

/* The hairline — the pack's shared punctuation mark. */
.lower-third-accent {
  width: calc(46px * var(--scale));  /* a short mark, not a rule across the panel */
  height: calc(2px * var(--scale));  /* a hairline */
  background: var(--accent);        /* the one accent surface */
  margin-bottom: calc(14px * var(--scale));  /* air between the mark and the reference */
  transform-origin: left center;    /* line-reveal draws it from this end */
}

/* The reference row: reading and translation share a baseline, so the translation reads
   as a qualifier of the reference rather than as a second fact. */
.lower-third-refrow {
  display: flex;                    /* reference and translation in a row… */
  flex-wrap: wrap;                  /* …wrapping only if the reference is genuinely long */
  align-items: baseline;            /* one shared baseline */
  gap: calc(12px * var(--scale));
  min-width: 0;                     /* allow shrinking */
}
.lower-third-refrow > .lower-third-mask,
.lower-third-creditrow > .lower-third-mask {
  display: flex;                    /* each value hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The reading (f0) — the graphic's headline. Tabular figures so chapter and verse
   numbers keep an even rhythm rather than bunching. */
.lower-third-name {
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 600;                 /* semibold: present without shouting */
  line-height: 1.1;                 /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  font-variant-numeric: tabular-nums;  /* even rhythm across chapter and verse figures */
  color: var(--text-color);         /* primary text color */
}

/* The translation (f1) — small caps beside the reference, in the accent. */
.lower-third-translation {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* a suffix, not a line */
  font-weight: 700;                 /* bold — three small caps need the weight */
  line-height: 1.2;                 /* single tight row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* NIV, whatever the operator types */
  color: var(--accent);             /* the reference's one dose of colour */
  white-space: nowrap;              /* a translation abbreviation never breaks */
}

/* The credit row: the reader and their office, inline behind a drawn middot. */
.lower-third-creditrow {
  display: flex;                    /* reader and office on one row… */
  flex-wrap: wrap;                  /* …wrapping only if both are long */
  align-items: baseline;            /* one shared baseline */
  gap: calc(10px * var(--scale));   /* the drawn middot sits in this gap */
  margin-top: calc(12px * var(--scale));  /* a clear break below the reference */
  min-width: 0;                     /* allow shrinking */
}

/* The reader (f2) — the courtesy line. */
.lower-third-title {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* half the reference, on purpose */
  font-weight: 500;                 /* medium — it is a name, but not the subject */
  line-height: 1.25;                /* room if the name wraps */
  color: var(--text-dim);           /* dimmed — never the primary ink twice */
}

/* The reader's office (f3) — the quietest voice. */
.lower-third-extra {
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* the smallest thing on the strap */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* ELDER, whatever the operator types */
  color: var(--label-color);        /* the family's label color */
}

/* The middot is DRAWN and only between the two, so a credit with no office has no
   dangling separator. */
.lower-third-creditrow > .lower-third-mask + .lower-third-mask::before {
  content: "·";                     /* the join, owned by the design */
  margin-right: calc(10px * var(--scale));  /* balances the flex gap on the other side */
  color: var(--text-dim);           /* quieter than the words it joins */
}`,
      hasAccent: true,
    };
  },
);
