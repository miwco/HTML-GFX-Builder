// The NOW / NEXT design builder — what is on air, and what follows it.
//
// Two blocks separated by a hairline: the thing playing now (label, title, detail) and the
// thing after it (label, title). The hierarchy is the whole design — "now" is set at display
// size and "next" deliberately smaller, because a viewer glancing at the screen should be able
// to tell the two apart without reading either label.
//
// BOTH labels are operator fields, not baked text. "NOW PLAYING" is the one string on this
// graphic a non-English show has to change, and a hard-coded label would have made the design
// useless to them (templates/pack4/content.ts NOW_NEXT_FIELDS).

import type { ResolvedOptions } from '../../../model/wizard';
import { accentDiv, emptyLineCss, maskLine, maskScoped, stack } from '../../pack4/markup';
import {
  accentCss,
  accentInset,
  decl,
  dividerCss,
  labelCss,
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

/** Type ramp and padding per family. */
const RAMP = {
  clean: { now: 44, meta: 24, next: 28, caps: false, pad: { top: 6, right: 0, bottom: 6, left: 28 } },
  frost: { now: 42, meta: 23, next: 26, caps: false, pad: { top: 38, right: 52, bottom: 36, left: 42 } },
  volt: { now: 48, meta: 22, next: 28, caps: true, pad: { top: 34, right: 56, bottom: 30, left: 42 } },
  house: { now: 42, meta: 23, next: 26, caps: false, pad: { top: 30, right: 52, bottom: 32, left: 36 } },
} as const;

/** Build a now/next card in one of the pack's four looks. */
export function buildNowNext(skin: Pack4Skin, o: ResolvedOptions): CardDesign {
  const r = RAMP[skin.id];
  const pad: BoxPad = { ...r.pad, left: accentInset(skin, r.pad.left) };
  const textLines = [`.${P}-kicker`, `.${P}-now`, `.${P}-meta`, `.${P}-nextlabel`, `.${P}-next`];
  const legibility = textLegibilityCss(skin, textLines.join(',\n'));

  return {
    html: `    <!-- Now / Next: what is on air now, a hairline, then what follows it. -->
    <div class="${P}-box">
${stack(
  accentDiv(P),
  maskLine(o, P, 0, `${P}-kicker`),
  maskLine(o, P, 1, `${P}-now`),
  maskLine(o, P, 2, `${P}-meta`),
  `      <!-- The divider — separates the two halves of the card. -->
      <div class="${P}-divider"></div>`,
  maskLine(o, P, 3, `${P}-nextlabel`),
  maskLine(o, P, 4, `${P}-next`),
)}
    </div>`,

    css: `${panelCss(
      skin,
      P,
      pad,
      [
        decl('display', 'flex', 'stack the blocks so empty lines can collapse'),
        decl('flex-direction', 'column', 'now block, divider, next block'),
        decl('align-items', 'stretch', 'the divider needs the full column width'),
        decl('text-align', 'left', 'marked lines, rules and wrapped prose stay left-aligned in every anchor zone'),
        decl('min-width', px(460), 'a now/next card holds its shape even with short titles'),
      ].join('\n'),
    )}

${accentCss(skin, P, pad)}

${labelCss(`.${P}-kicker`, 19, 'The now label (f0) — "NOW PLAYING", or its equivalent in the show’s own language.')}

/* What is playing now (f1) — the largest type in the card, and the reason it exists. */
.${P}-now {
${decl('font-size', typeSize(r.now), 'the card’s display line (values are 1080p reference)')}
${decl('font-weight', 'var(--display-weight)', "the family's display weight")}
${decl('line-height', '1.1', 'big type sits tight')}
${decl('letter-spacing', 'var(--display-tracking)', 'large display type tightens slightly')}${
      r.caps ? `\n${decl('text-transform', 'uppercase', 'the sport card is shouted')}` : ''
    }
${decl('color', 'var(--text-color)', 'primary text color')}
${decl('margin-top', px(10), 'clear air under the label')}
}

/* The detail under it (f2) — artist, studio, lane, room. Optional: clear it and it vanishes. */
.${P}-meta {
${decl('font-size', typeSize(r.meta), 'clearly subordinate to the title above')}
${decl('font-weight', '400', 'regular; the title carries the weight')}
${decl('line-height', '1.35', 'room in case the detail wraps')}${
      r.caps ? `\n${decl('letter-spacing', 'var(--label-tracking)', 'sport keeps its tracked caps voice')}\n${decl('text-transform', 'uppercase', 'matches the title above')}` : ''
    }
${decl('color', 'var(--text-dim)', 'dimmed — never full-strength text twice')}
${decl('margin-top', px(8), 'title and detail read as one unit')}
}

${dividerCss(`.${P}-divider`, 'The divider — the line between what is on now and what is next.', 20)}

${labelCss(`.${P}-nextlabel`, 17, 'The next label (f3) — smaller than the now label: the second half is the quieter one.')}

/* What is coming up (f4) — deliberately below the now title in size, so a glance tells
   the two halves apart without reading either label. */
.${P}-next {
${decl('font-size', typeSize(r.next), 'smaller than the now title — that contrast IS the hierarchy')}
${decl('font-weight', '600', 'semibold: present, but never competing with the now title')}
${decl('line-height', '1.25', 'a next line that wraps still reads as one item')}${
      r.caps ? `\n${decl('text-transform', 'uppercase', 'matches the caps voice above')}` : ''
    }
${decl('color', 'var(--text-color)', 'full strength — it is a real title, not a footnote')}
${decl('margin-top', px(8), 'label and title read as one unit')}
}

${readableTextCss(maskScoped(P, textLines), 'How every line wraps — spaces first, and never a hyphen on air.')}

${emptyLineCss(textLines)}${legibility ? `\n\n${legibility}` : ''}`,
    hasAccent: true,
  };
}
