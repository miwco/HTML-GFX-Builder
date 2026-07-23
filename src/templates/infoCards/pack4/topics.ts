// The TOPIC CARD design builder — the card that stays up DURING the discussion: a chapter
// marker, a question, a talking point, a key term.
//
// The composition inverts the title card on purpose. A title card leads with a small kicker so
// the big line lands as an announcement; a topic card leads with the SUBJECT, because it is
// already on screen while people talk about it and the viewer's eye returns to it repeatedly.
// The supporting lines are marked with a small accent point, which is what tells you at a
// glance that they are points about the heading rather than a subtitle of it.
//
// Field order is heading (f0), line 1 (f1), line 2 (f2) — the same order they are read in, so
// SPX Continue reveals them one point at a time when the operator turns steps on.

import type { ResolvedOptions } from '../../../model/wizard';
import { accentDiv, emptyLineCss, maskLine, maskScoped, stack } from '../../pack4/markup';
import {
  accentCss,
  accentInset,
  decl,
  panelCss,
  px,
  readableTextCss,
  textLegibilityCss,
  typeSize,
  type BoxPad,
  type Pack4Skin,
} from '../../pack4/skin';
import type { CardDesign } from '../shared';

const P = 'info-card';

/** Type ramp and padding per family. A topic card is quieter than an opener: the heading is
 *  large enough to own the card and small enough to live beside a talking head. */
const RAMP = {
  clean: { heading: 46, point: 25, caps: false, pad: { top: 6, right: 0, bottom: 6, left: 30 } },
  frost: { heading: 42, point: 24, caps: false, pad: { top: 44, right: 52, bottom: 40, left: 44 } },
  volt: { heading: 52, point: 23, caps: true, pad: { top: 38, right: 56, bottom: 34, left: 44 } },
  house: { heading: 44, point: 24, caps: false, pad: { top: 32, right: 52, bottom: 34, left: 38 } },
} as const;

/** Build a topic card in one of the pack's four looks. */
export function buildTopicCard(skin: Pack4Skin, o: ResolvedOptions): CardDesign {
  const r = RAMP[skin.id];
  const pad: BoxPad = { ...r.pad, left: accentInset(skin, r.pad.left) };
  const points = `.${P}-point`;
  const legibility = textLegibilityCss(skin, `.${P}-heading,\n${points}`);

  return {
    html: `    <!-- Topic card: [accent motif] the subject, then the points made about it. -->
    <div class="${P}-box">
${stack(
  accentDiv(P),
  maskLine(o, P, 0, `${P}-heading`),
  maskLine(o, P, 1, `${P}-point ${P}-point-first`),
  maskLine(o, P, 2, `${P}-point`),
  maskLine(o, P, 3, `${P}-point`),
  maskLine(o, P, 4, `${P}-point`),
)}
    </div>`,

    css: `${panelCss(
      skin,
      P,
      pad,
      [
        decl('display', 'flex', 'stack the lines so empty ones can collapse'),
        decl('flex-direction', 'column', 'heading first, then its points'),
        decl('align-items', 'flex-start', 'everything hugs the same left edge'),
        decl('text-align', 'left', 'marked lines, rules and wrapped prose stay left-aligned in every anchor zone'),
      ].join('\n'),
    )}

${accentCss(skin, P, pad)}

/* The heading (f0) — the subject itself. The card exists to keep this on screen. */
.${P}-heading {
${decl('font-size', typeSize(r.heading), 'card heading scale (values are 1080p reference)')}
${decl('font-weight', 'var(--display-weight)', "the family's display weight")}
${decl('line-height', '1.12', 'a heading that wraps still reads as one block')}
${decl('letter-spacing', 'var(--display-tracking)', 'large display type tightens slightly')}${
      r.caps ? `\n${decl('text-transform', 'uppercase', 'the sport talking point is shouted')}` : ''
    }
${decl('color', 'var(--text-color)', 'primary text color')}
}

/* The points (f1…) — what is being said about the heading. Quiet, and marked with a small
   accent square so they read as points rather than as a subtitle. */
${points} {
${decl('position', 'relative', 'anchors the accent point marker below')}
${decl('padding-left', px(24), 'the column the marker sits in')}
${decl('font-size', typeSize(r.point), 'clearly subordinate to the heading')}
${decl('font-weight', '400', 'regular; the contrast comes from the heading')}
${decl('line-height', '1.35', 'body text gets room to breathe')}${
      r.caps
        ? `\n${decl('letter-spacing', 'var(--label-tracking)', 'sport keeps its tracked caps voice')}\n${decl('text-transform', 'uppercase', 'matches the heading above')}`
        : ''
    }
${decl('color', 'var(--text-dim)', 'dimmed — never full-strength text twice')}
${decl('margin-top', px(14), 'even rhythm down the list of points')}
}

/* The first point sits a little further from the heading than the points sit from each other.
   It carries its own class rather than :first-of-type, because every line lives in its own
   mask element — each span is the first of its type inside its own wrapper. */
${points}-first {
${decl('margin-top', px(22), 'heading → points: a slightly larger break')}
}

/* The point marker — a small accent square. It lives on the LINE's own pseudo-element, so a
   point the operator cleared takes its marker away with it (see the :empty rule below). */
${points}::before {
${decl('content', "''", 'pseudo-elements render only with content set')}
${decl('position', 'absolute', 'placed in the reserved left column')}
${decl('left', '0', "flush with the text column's left edge")}
${decl('top', typeSize(Math.round(r.point * 0.5)), 'optically centred on the first row')}
${decl('width', px(9), 'small on purpose — a marker, not a bullet slab')}
${decl('height', px(9), 'square: the same value as the width')}
${decl('background', 'var(--accent)', 'the accent dose that threads the points together')}
}

${readableTextCss(maskScoped(P, [`.${P}-heading`, points]), 'How the lines wrap — spaces first, and never a hyphen on air.')}

${emptyLineCss([`.${P}-heading`, points])}${legibility ? `\n\n${legibility}` : ''}`,
    hasAccent: true,
  };
}
