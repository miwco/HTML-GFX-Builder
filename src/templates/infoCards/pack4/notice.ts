// The PUBLIC-INFORMATION NOTICE design builder — the card a broadcast puts up when it has to
// tell people something: a weather warning, a venue advisory, a stadium announcement, a
// service interruption.
//
// Everything about the composition follows from one rule: in a notice, the INSTRUCTION is the
// part that matters. So "what to do" is its own field with its own weight and its own accent
// rule beside it, rather than a sentence buried in the details — a viewer who reads exactly one
// line of this card should read the one that tells them what to do.
//
// This is also the pack's one design with a real STATE MACHINE. A notice has a level, the level
// changes while the graphic is on air, and changing it must not mean re-taking the card: a
// parallel `level` group holds `standard` and `urgent`, the operator's Escalate / Stand down
// buttons move between them, and the only thing that changes is an accent wash over the panel
// (types/briefings.ts noticeCardType).

import type { ResolvedOptions } from '../../../model/wizard';
import { accentDiv, emptyLineCss, maskLine, maskScoped, stack } from '../../pack4/markup';
import {
  accentCss,
  accentInset,
  decl,
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
  clean: { headline: 46, body: 25, action: 29, caps: false, measure: 44, pad: { top: 6, right: 0, bottom: 6, left: 30 } },
  frost: { headline: 42, body: 24, action: 27, caps: false, measure: 42, pad: { top: 38, right: 52, bottom: 36, left: 44 } },
  volt: { headline: 50, body: 24, action: 28, caps: true, measure: 46, pad: { top: 34, right: 54, bottom: 32, left: 44 } },
  house: { headline: 42, body: 24, action: 27, caps: false, measure: 42, pad: { top: 30, right: 52, bottom: 32, left: 38 } },
} as const;

/** Build a public-information notice in one of the pack's four looks. */
export function buildNoticeCard(skin: Pack4Skin, o: ResolvedOptions): CardDesign {
  const r = RAMP[skin.id];
  const pad: BoxPad = { ...r.pad, left: accentInset(skin, r.pad.left) };
  const textLines = [`.${P}-label`, `.${P}-headline`, `.${P}-body`, `.${P}-action`, `.${P}-contact`];
  const legibility = textLegibilityCss(skin, `.${P}-headline,\n.${P}-body,\n.${P}-action,\n.${P}-contact`);

  return {
    html: `    <!-- Notice: an authority label, what has happened, the detail, WHAT TO DO, and where to ask. -->
    <div class="${P}-box">
${stack(
  accentDiv(P),
  `      <!-- The urgent wash — the parallel "level" state group fades this in and out.
           It starts hidden; the operator's Escalate button is what brings it up. -->
      <div class="${P}-alert"></div>`,
  maskLine(o, P, 0, `${P}-label`),
  maskLine(o, P, 1, `${P}-headline`),
  maskLine(o, P, 2, `${P}-body`),
  maskLine(o, P, 3, `${P}-action`),
  maskLine(o, P, 4, `${P}-contact`),
)}
    </div>`,

    css: `${panelCss(
      skin,
      P,
      pad,
      [
        decl('display', 'flex', 'stack the blocks so empty ones can collapse'),
        decl('flex-direction', 'column', 'label, headline, details, instruction, contact'),
        decl('align-items', 'flex-start', 'everything hugs the same left edge'),
        decl('text-align', 'left', 'marked lines, rules and wrapped prose stay left-aligned in every anchor zone'),
      ].join('\n'),
    )}

${measureCss(P, o.resolution, r.measure)}

${accentCss(skin, P, pad)}

/* The urgent wash — a thin accent tint over the whole panel, and the only thing that changes
   when the notice is escalated. Hidden at rest; the machine's "urgent" state fades it in. */
.${P}-alert {
${decl('position', 'absolute', 'covers the panel exactly…')}
${decl('inset', '0', '…edge to edge')}
${decl('z-index', '0', 'above the panel surface, below the words')}
${decl('opacity', '0', 'hidden until the operator escalates')}
${decl('pointer-events', 'none', 'a wash, never something to click')}
${decl('background', 'color-mix(in srgb, var(--accent) 16%, transparent)', 'the accent, heavily diluted — a tint, not a fill')}
${decl('box-shadow', 'inset 0 0 0 calc(3px * var(--scale)) var(--accent)', 'and a hard accent edge around the whole notice')}
${decl('border-radius', 'var(--panel-radius)', "follows the family's corner treatment")}
}

/* The words sit ABOVE the wash. Both are positioned, so the later ones in the markup win —
   which is also what keeps a logo slot (injected as the box's first child) on top. */
.${P}-mask,
.${P}-logo {
${decl('position', 'relative', 'joins the same stacking level as the wash')}
${decl('z-index', '1', 'above the urgent wash')}
}

/* The notice label (f0) — an accent-filled chip. A notice says who is speaking before it says
   anything else, and a chip reads as an authority mark rather than as a kicker. */
.${P}-label {
${decl('padding', `${px(7)} ${px(14)}`, 'the chip’s own air around the label')}
${decl('background', 'var(--accent)', 'the accent-filled chip')}
${decl('color', 'var(--accent-ink)', 'dark ink on the accent fill — the family token')}
${decl('border-radius', 'var(--panel-radius)', "follows the family's corner treatment")}
${decl('font-family', 'var(--font-label)', "the family's label face")}
${decl('font-size', typeSize(18), 'small: the chip is a mark, not a headline')}
${decl('font-weight', '700', 'bold keeps small caps legible on a filled chip')}
${decl('line-height', '1.2', 'one tight label line')}
${decl('letter-spacing', 'var(--label-tracking)', "the family's label tracking")}
${decl('text-transform', 'uppercase', 'reads as a label, whatever the operator types')}
}

/* The headline (f1) — what has happened, in as few words as possible. */
.${P}-headline {
${decl('font-size', typeSize(r.headline), 'headline scale (values are 1080p reference)')}
${decl('font-weight', 'var(--display-weight)', "the family's display weight")}
${decl('line-height', '1.12', 'a headline that wraps still reads as one block')}
${decl('letter-spacing', 'var(--display-tracking)', 'large display type tightens slightly')}${
      r.caps ? `\n${decl('text-transform', 'uppercase', 'the stadium announcement is shouted')}` : ''
    }
${decl('color', 'var(--text-color)', 'primary text color')}
${decl('margin-top', px(18), 'clear air under the chip')}
}

/* The details (f2) — running text, and the part a viewer reads only if they have time. */
.${P}-body {
${decl('font-size', typeSize(r.body), 'body scale — clearly not the headline')}
${decl('font-weight', '400', 'regular: this is prose')}
${decl('line-height', '1.45', 'paragraph leading — running text needs the room')}
${decl('color', 'var(--text-dim)', 'dimmed — the headline and the instruction hold the ink')}
${decl('margin-top', px(14), 'a real break under the headline')}
}

/* WHAT TO DO (f3) — the line the whole card exists for. Its own accent rule, its own weight,
   and full-strength ink: if a viewer reads one line of this notice, it should be this one. */
.${P}-action {
${decl('padding-left', px(20), 'the column the instruction rule sits in')}
${decl('border-left', 'var(--accent-weight) solid var(--accent)', 'the accent rule that marks the instruction')}
${decl('font-size', typeSize(r.action), 'above the body: the instruction outranks the detail')}
${decl('font-weight', '700', 'bold — the one instruction on the card')}
${decl('line-height', '1.3', 'an instruction that wraps stays readable')}${
      r.caps ? `\n${decl('text-transform', 'uppercase', 'matches the caps voice above')}` : ''
    }
${decl('color', 'var(--text-color)', 'full strength')}
${decl('margin-top', px(22), 'set clearly apart from the details above')}
}

/* The contact line (f4) — where to get updates. The card's quietest voice. */
.${P}-contact {
${decl('font-family', 'var(--font-label)', "the family's label face")}
${decl('font-size', typeSize(18), 'the smallest type on the card')}
${decl('font-weight', '600', 'semibold keeps small type legible')}
${decl('line-height', '1.3', 'a long contact line wraps tidily')}
${decl('letter-spacing', 'var(--label-tracking)', "the family's label tracking")}
${decl('color', 'var(--label-color)', "the family's label color")}
${decl('margin-top', px(20), 'clearly separated from the instruction')}
}

${readableTextCss(maskScoped(P, textLines), 'How every line wraps — spaces first, and never a hyphen on air.')}

${emptyLineCss(textLines)}${legibility ? `\n\n${legibility}` : ''}`,
    hasAccent: true,
  };
}
