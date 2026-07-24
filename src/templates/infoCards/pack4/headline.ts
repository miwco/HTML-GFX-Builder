// The HEADLINE + BODY design builder — the card that carries a headline and the paragraph
// under it: a news card, an announcement, a release note, a full-time report.
//
// This is the pack's first design whose CONTENT is running text rather than lines, and that
// changes the typography rather than the layout. The measure narrows (a paragraph set to a
// headline's width runs to ninety characters a line and nobody reads that), the leading opens
// up, and the body keeps its own type ramp instead of inheriting the supporting-line one.
//
// Field order is reading order — kicker (f0), headline (f1), body (f2), source (f3) — so
// turning steps on gives a newsroom reveal: the kicker lands, then the headline, then the
// story, then the byline, one SPX Continue at a time.

import type { ResolvedOptions } from '../../../model/wizard';
import { accentDiv, emptyLineCss, maskLine, maskScoped, stack } from '../../pack4/markup';
import {
  accentCss,
  accentInset,
  decl,
  labelCss,
  measureCss,
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

/** Type ramp, padding and measure per family. `measure` is a percentage of the frame width. */
const RAMP = {
  clean: { headline: 50, body: 26, caps: false, measure: 44, pad: { top: 6, right: 0, bottom: 6, left: 30 } },
  frost: { headline: 44, body: 25, caps: false, measure: 42, pad: { top: 40, right: 52, bottom: 38, left: 44 } },
  volt: { headline: 54, body: 25, caps: true, measure: 46, pad: { top: 36, right: 54, bottom: 32, left: 44 } },
  house: { headline: 44, body: 25, caps: false, measure: 42, pad: { top: 32, right: 52, bottom: 34, left: 38 } },
} as const;

/** Build a headline card in one of the pack's four looks. */
export function buildHeadlineCard(skin: Pack4Skin, o: ResolvedOptions): CardDesign {
  const r = RAMP[skin.id];
  const pad: BoxPad = { ...r.pad, left: accentInset(skin, r.pad.left) };
  const textLines = [`.${P}-kicker`, `.${P}-headline`, `.${P}-body`, `.${P}-source`];
  const legibility = textLegibilityCss(skin, textLines.join(',\n'));

  return {
    html: `    <!-- Headline card: a kicker, the headline, the story under it, then where it came from. -->
    <div class="${P}-box">
${stack(
  accentDiv(P),
  maskLine(o, P, 0, `${P}-kicker`),
  maskLine(o, P, 1, `${P}-headline`),
  maskLine(o, P, 2, `${P}-body`),
  maskLine(o, P, 3, `${P}-source`),
)}
    </div>`,

    css: `${panelCss(
      skin,
      P,
      pad,
      [
        decl('display', 'flex', 'stack the blocks so empty ones can collapse'),
        decl('flex-direction', 'column', 'kicker, headline, body, source'),
        decl('align-items', 'flex-start', 'everything hugs the same left edge'),
        decl('text-align', 'left', 'marked lines, rules and wrapped prose stay left-aligned in every anchor zone'),
      ].join('\n'),
    )}

${measureCss(P, o.resolution, r.measure)}

${accentCss(skin, P, pad)}

${labelCss(`.${P}-kicker`, 19, 'The kicker (f0) — BREAKING, ANNOUNCEMENT, FULL TIME. One word of context.')}

/* The headline (f1) — set to be read at a glance from across a room. */
.${P}-headline {
${decl('font-size', typeSize(r.headline), 'headline scale (values are 1080p reference)')}
${decl('font-weight', 'var(--display-weight)', "the family's display weight")}
${decl('line-height', '1.12', 'a headline that wraps still reads as one block')}
${decl('letter-spacing', 'var(--display-tracking)', 'large display type tightens slightly')}${
      r.caps ? `\n${decl('text-transform', 'uppercase', 'the sport headline is shouted')}` : ''
    }
${decl('color', 'var(--text-color)', 'primary text color')}
${decl('margin-top', px(12), 'clear air under the kicker')}
}

/* The body (f2) — running text, and the only place in the pack with a paragraph's leading.
   No uppercase here at any size: this is prose, and prose in caps is unreadable. */
.${P}-body {
${decl('font-size', typeSize(r.body), 'body scale — comfortably readable, clearly not the headline')}
${decl('font-weight', '400', 'regular: the weight contrast is the hierarchy')}
${decl('line-height', '1.45', 'paragraph leading — running text needs more than a title does')}
${decl('color', 'var(--text-dim)', 'dimmed — the headline keeps the full-strength ink')}
${decl('margin-top', px(18), 'a real break between headline and story')}
}

/* The source (f3) — the byline, the outlet, where to read more. The card's quietest line. */
.${P}-source {
${decl('font-family', 'var(--font-label)', "the family's label face")}
${decl('font-size', typeSize(18), 'the smallest type on the card')}
${decl('font-weight', '600', 'semibold keeps small type legible')}
${decl('line-height', '1.3', 'a source line that wraps stays tidy')}
${decl('letter-spacing', 'var(--label-tracking)', "the family's label tracking")}
${decl('text-transform', 'uppercase', 'a label, not a sentence')}
${decl('color', 'var(--label-color)', "the family's label color")}
${decl('margin-top', px(20), 'clearly separated from the story above')}
}

${readableTextCss(maskScoped(P, textLines), 'How every line wraps — spaces first, and never a hyphen on air.')}

${emptyLineCss(textLines)}${legibility ? `\n\n${legibility}` : ''}`,
    hasAccent: true,
  };
}
