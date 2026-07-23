// ls23 "Analysis Kicker" — the strap that marks opinion as opinion.
//
// This design exists because of an editorial rule, not a visual one. Newsrooms are required —
// by style guide, and in public broadcasting often by charter — to make it unmistakable when
// what the viewer is hearing is interpretation rather than reporting. The mechanism is
// always the same: a word set apart from the name, ahead of it, in a colour the bulletin
// uses for nothing else. ANALYSIS. COMMENT. OPINION.
//
// So the kicker is the graphic's first element and its loudest, and the person named beneath
// it is secondary — the inverse of a correspondent strap, where the name leads and the beat
// follows. The credential line matters here too: an analyst's authority is the reason they
// are on, so it is given its own line rather than being folded into the name's subtitle.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls23: TemplateVariant = defineVariant(
  {
    id: 'ls23',
    category: 'lower-third',
    name: 'Analysis Kicker',
    styleTag: 'minimal',
    roleTag: 'analysis',
    keywords: ['analysis', 'comment', 'opinion', 'expert', 'pundit', 'correspondent', 'editorial', 'news'],
    description: 'An ANALYSIS kicker set ahead of the name — marks interpretation as interpretation.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Kicker', sample: 'Analysis' },
      { title: 'Name', sample: 'Dr. Farah Nasser' },
      { title: 'Credential', sample: 'Former Chief Economist, Bank of England' },
      { title: 'Subject', sample: 'On the rate decision' },
    ],
    logo: 'none',
    // Line reveal: the kicker's bar draws before anything is named, which is the editorial
    // point made as motion — the viewer is told what KIND of thing this is first.
    animationPresets: ['line-reveal', 'mask-wipe', 'fade', 'slide-up', 'slide-left', 'blur-in'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Analysis Kicker',
    description:
      'The comment strap: a filled kicker — ANALYSIS, OPINION, COMMENT — set ahead of and ' +
      'above the name, in the one colour the bulletin reserves for it, with the analyst’s ' +
      'credential on its own line beneath. Built for the editorial rule that interpretation ' +
      'must be visibly marked as interpretation, not for a house style.',
    uicolor: '2',
  },
  (o) => {
    // The kicker BAND is unconditional — it holds this design's .lower-third-accent node,
    // which the animation data keyframes by selector — while the word inside it is the
    // operator's. A band with no word is still the editorial mark's colour, and dropping the
    // band entirely would take the accent element with it.
    const kicker = `      <!-- The editorial mark. It leads, and it is the loudest thing here. -->
      <div class="lower-third-kickerrow">
        <div class="lower-third-accent"></div>
${hasLine(o, 0) ? `        <div class="lower-third-mask lower-third-kickerwrap"><span id="f0" class="lower-third-name">${o.lines[0].sample}</span></div>\n` : ''}      </div>
`;

    return {
      html: `    <!-- The strap: the kicker row, then the person it qualifies. -->
    <div class="lower-third-box">
${kicker}      <div class="lower-third-text">
${slot(o, 1, 'lower-third-title', '        ')}
${slot(o, 2, 'lower-third-extra', '        ')}
${slot(o, 3, 'lower-third-subject', '        ')}
      </div>
    </div>`,

      css: `/* The panel — quiet, so the kicker above it is the only loud thing. */
.lower-third-box {
  background: var(--panel-bg);      /* the quiet panel behind the text */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  width: fit-content;               /* the strap hugs its content */
  max-width: calc(800px * var(--scale));  /* a credential line runs long — but never past
                                             the category auto-fit cap (the frame safe area) */
}

/* The kicker row — a full-width band in the reserved colour. */
.lower-third-kickerrow {
  display: flex;                    /* the accent tick leads the word */
  align-items: stretch;             /* the tick runs the band's height */
  background: var(--accent);        /* THE reserved colour — used nowhere else on the strap */
}

/* The accent tick at the head of the band. It is the graphic's accent NODE, so the
   line-reveal preset and the step reveals have a real element to address — and it is drawn
   in the panel's own dark, which reads as a notch cut out of the band. */
.lower-third-accent {
  flex: none;                       /* never squeezed */
  width: calc(8px * var(--scale));  /* a notch, not a bar */
  background: var(--panel-bg);      /* the panel colour, cut into the band */
  transform-origin: left center;    /* line-reveal draws it from this end */
}

.lower-third-kickerwrap {
  padding: calc(7px * var(--scale)) calc(22px * var(--scale)) calc(8px * var(--scale)) calc(16px * var(--scale));
  max-width: calc(360px * var(--scale));  /* the mark is one word; a sentence typed in here
                                             clips inside its own mask rather than stretching
                                             the band past the strap it belongs to */
  overflow: hidden;                 /* the clip is what makes the max-width real (bench) */
}

/* The kicker word (f0). Bounded and clipped: the mark is one word, so a sentence typed in
   here ellipsizes inside the band rather than laying out wider than it (the runtime bench
   measures the layout box, which a paint-only clip would not shrink). */
.lower-third-name {
  display: block;                   /* fills its band row */
  max-width: calc(322px * var(--scale));  /* the wrap's inner width — the measured cap */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* a mark, not a headline */
  font-weight: 800;                 /* the heaviest weight on the graphic, on purpose */
  line-height: 1.15;                /* one tight band row */
  letter-spacing: 0.14em;           /* widely tracked — the editorial mark's own voice */
  text-transform: uppercase;        /* ANALYSIS, whatever the operator types */
  color: var(--accent-ink);         /* the family's ink for text ON accent */
  white-space: nowrap;              /* the mark never wraps… */
  overflow: hidden;                 /* …and a too-long one is clipped… */
  text-overflow: ellipsis;          /* …with an honest ellipsis */
}

.lower-third-text {
  min-width: 0;                     /* let it shrink so long values wrap instead of overflowing */
  padding: calc(16px * var(--scale)) calc(34px * var(--scale)) calc(18px * var(--scale)) calc(24px * var(--scale));
}

/* The name (f1) — secondary to the kicker, which is the inversion this design is for. */
.lower-third-title {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 600;                 /* semibold: present without shouting */
  line-height: 1.12;                /* room for an honorific and a wrapped surname */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The credential (f2) — the reason this person's interpretation is worth airing, so it
   gets its own line rather than being folded into a subtitle. */
.lower-third-extra {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.3;                 /* a credential wraps — give the rows air */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(6px * var(--scale));  /* tied to the name above it */
}

/* The subject (f3) — what they are analysing. Small caps, and the first line to drop. */
.lower-third-subject {
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* the smallest voice on the strap */
  font-weight: 600;                 /* semibold — small tracked caps need the weight */
  line-height: 1.3;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the label voice */
  color: var(--label-color);        /* the family's label color */
  margin-top: calc(9px * var(--scale));  /* its own beat below the credential */
}`,
      hasAccent: true,
      tokens: { labelColor: 'var(--text-dim)' },
    };
  },
);
