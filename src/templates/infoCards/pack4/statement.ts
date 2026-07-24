// The STATEMENT design builder — the pack's long-text and multilingual layout: one passage,
// optionally repeated in a second language, under a label and over its attribution.
//
// It is the card for a scripture reading, an official statement, a translated quote, a policy
// line that has to air in two languages. Three decisions make it that rather than a big quote
// card:
//
//  - **No uppercase in the running text, in any family — including sport.** Uppercase strips
//    the diacritics that carry meaning in a dozen European languages and mangles most non-Latin
//    scripts outright. The label and the attribution shout; the passage never does.
//  - **A measure and a leading tuned for paragraphs**, not for headlines.
//  - **The second language is a first-class field**, marked with its own rule rather than
//    tucked into the attribution — so a bilingual broadcast does not have to fake it by typing
//    both languages into one box and hoping the line breaks land somewhere sensible.

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

const RAMP = {
  clean: { primary: 38, secondary: 27, measure: 46, pad: { top: 6, right: 0, bottom: 6, left: 30 } },
  frost: { primary: 34, secondary: 25, measure: 44, pad: { top: 42, right: 54, bottom: 40, left: 46 } },
  volt: { primary: 38, secondary: 26, measure: 46, pad: { top: 36, right: 56, bottom: 34, left: 46 } },
  house: { primary: 34, secondary: 25, measure: 44, pad: { top: 32, right: 52, bottom: 34, left: 38 } },
} as const;

/** Build a statement / reading card in one of the pack's four looks. */
export function buildStatementCard(skin: Pack4Skin, o: ResolvedOptions): CardDesign {
  const r = RAMP[skin.id];
  const pad: BoxPad = { ...r.pad, left: accentInset(skin, r.pad.left) };
  const textLines = [`.${P}-label`, `.${P}-primary`, `.${P}-secondary`, `.${P}-attribution`];
  const legibility = textLegibilityCss(skin, textLines.join(',\n'));

  return {
    html: `    <!-- Statement: a label, the passage, the same passage in a second language, the attribution. -->
    <div class="${P}-box">
${stack(
  accentDiv(P),
  maskLine(o, P, 0, `${P}-label`),
  maskLine(o, P, 1, `${P}-primary`),
  maskLine(o, P, 2, `${P}-secondary`),
  maskLine(o, P, 3, `${P}-attribution`),
)}
    </div>`,

    css: `${panelCss(
      skin,
      P,
      pad,
      [
        decl('display', 'flex', 'stack the blocks so an unused language can collapse'),
        decl('flex-direction', 'column', 'label, passage, second language, attribution'),
        decl('align-items', 'flex-start', 'everything hugs the same left edge'),
        decl('text-align', 'left', 'marked lines, rules and wrapped prose stay left-aligned in every anchor zone'),
      ].join('\n'),
    )}

${measureCss(P, o.resolution, r.measure)}

${accentCss(skin, P, pad)}

${labelCss(`.${P}-label`, 18, 'The label (f0) — READING, STATEMENT, TRANSLATION. What kind of passage this is.')}

/* The passage (f1) — the card's subject. Set as prose: a paragraph measure, paragraph leading,
   and sentence case in EVERY family, sport included. Uppercase would strip the diacritics that
   carry meaning in half the languages this card exists to serve. */
.${P}-primary {
${decl('font-size', typeSize(r.primary), 'passage scale — large enough to read, small enough to hold four lines')}
${decl('font-weight', '400', 'regular: a long passage in bold is exhausting to read')}
${decl('line-height', '1.4', 'paragraph leading — a long passage needs the room')}
${decl('letter-spacing', '0', 'no tracking on running text at any size')}
${decl('color', 'var(--text-color)', 'primary text color')}
${decl('margin-top', px(18), 'clear air under the label')}
}

/* The second language (f2) — a real field, marked with its own accent rule so a viewer sees at
   a glance that this is the same thing said again, not a continuation of it. Clear the field
   and both the text and its rule disappear. */
.${P}-secondary {
${decl('padding-left', px(20), 'the column the language rule sits in')}
${decl('border-left', 'var(--accent-weight) solid var(--accent)', 'the rule that marks the second language')}
${decl('font-size', typeSize(r.secondary), 'below the passage: the same words, quieter')}
${decl('font-weight', '400', 'regular, matching the passage above')}
${decl('line-height', '1.45', 'paragraph leading again')}
${decl('color', 'var(--text-dim)', 'dimmed — the primary language keeps the full-strength ink')}
${decl('margin-top', px(22), 'a real break between the two languages')}
}

/* The attribution (f3) — the source, the speaker, the verse. The card's smallest voice. */
.${P}-attribution {
${decl('font-family', 'var(--font-label)', "the family's label face")}
${decl('font-size', typeSize(18), 'the smallest type on the card')}
${decl('font-weight', '600', 'semibold keeps small type legible')}
${decl('line-height', '1.3', 'a long attribution wraps tidily')}
${decl('letter-spacing', 'var(--label-tracking)', "the family's label tracking")}
${decl('color', 'var(--label-color)', "the family's label color")}
${decl('margin-top', px(24), 'set clearly apart from the passage')}
}

${readableTextCss(maskScoped(P, textLines), 'How every line wraps — spaces first, and never a hyphen on air.')}

${emptyLineCss(textLines)}${legibility ? `\n\n${legibility}` : ''}`,
    hasAccent: true,
  };
}
