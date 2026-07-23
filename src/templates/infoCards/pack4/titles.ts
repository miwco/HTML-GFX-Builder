// The TITLE CARD design builder — the opener that names a show, an event, a session, a
// segment, an episode or a keynote.
//
// One structure, four looks. The composition is the same in all of them because it is the one
// that works: a small tracked-caps kicker says WHICH thing this is, one large line says WHAT it
// is, and a quiet third line carries the practical detail (time, room, speaker). The families
// differ in the panel, the accent motif, the type ramp and the casing — the decisions that
// actually make a conference session card and a match segment card look like different
// products rather than the same card in another colour.
//
// Visual order is kicker → title → subtitle; FIELD order is title (f0), kicker (f1), subtitle
// (f2), because f0/f1 are what the rundown preview and the operator's first two inputs show.

import type { ResolvedOptions } from '../../../model/wizard';
import { accentDiv, emptyLineCss, maskLine, maskScoped, stack } from '../../pack4/markup';
import {
  accentCss,
  accentInset,
  decl,
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

/** The type ramp and padding, per family. Titles are the pack's loudest graphic, so the
 *  sport ramp shouts and the house one stays measured. */
const RAMP = {
  clean: { display: 68, kicker: 20, support: 27, caps: false, pad: { top: 8, right: 0, bottom: 8, left: 30 } },
  frost: { display: 58, kicker: 20, support: 26, caps: false, pad: { top: 46, right: 56, bottom: 42, left: 46 } },
  volt: { display: 78, kicker: 22, support: 24, caps: true, pad: { top: 40, right: 60, bottom: 34, left: 46 } },
  house: { display: 60, kicker: 18, support: 26, caps: false, pad: { top: 36, right: 54, bottom: 36, left: 40 } },
} as const;

/** Build a title card in one of the pack's four looks. */
export function buildTitleCard(skin: Pack4Skin, o: ResolvedOptions): CardDesign {
  const r = RAMP[skin.id];
  const pad: BoxPad = { ...r.pad, left: accentInset(skin, r.pad.left) };
  const allLines = `.${P}-kicker,\n.${P}-display,\n.${P}-support`;
  const legibility = textLegibilityCss(skin, allLines);

  return {
    html: `    <!-- Title card: [accent motif] kicker over one large title, then the supporting line. -->
    <div class="${P}-box">
${stack(
  accentDiv(P),
  maskLine(o, P, 1, `${P}-kicker`),
  maskLine(o, P, 0, `${P}-display`),
  maskLine(o, P, 2, `${P}-support`),
)}
    </div>`,

    css: `${panelCss(
      skin,
      P,
      pad,
      [
        decl('display', 'flex', 'stack the three lines so the empty ones can collapse'),
        decl('flex-direction', 'column', 'kicker, title, subtitle — top to bottom'),
        decl('align-items', 'flex-start', 'everything hugs the same left edge'),
      ].join('\n'),
    )}

${accentCss(skin, P, pad)}

${labelCss(`.${P}-kicker`, r.kicker, "The kicker (f1) — which show, track or segment this is. The card's smallest voice.")}

/* The title (f0) — the largest type on screen, and the only thing a viewer reads at a glance. */
.${P}-display {
${decl('font-size', typeSize(r.display), 'opener headline scale (values are 1080p reference)')}
${decl('font-weight', 'var(--display-weight)', "the family's display weight")}
${decl('line-height', '1.06', 'big type sits tight')}
${decl('letter-spacing', 'var(--display-tracking)', 'large display type tightens slightly')}${
      r.caps ? `\n${decl('text-transform', 'uppercase', 'the sport opener is shouted')}` : ''
    }
${decl('color', 'var(--text-color)', 'primary text color')}
${decl('margin-top', px(14), 'clear air under the kicker')}
}

/* The supporting line (f2) — the practical detail: time, room, speaker, kick-off. */
.${P}-support {
${decl('font-size', typeSize(r.support), 'well below the title — clear hierarchy')}
${decl('font-weight', r.caps ? '500' : '400', 'the title carries the weight, not this')}
${decl('line-height', '1.3', 'room in case the detail wraps')}${
      r.caps
        ? `\n${decl('letter-spacing', 'var(--label-tracking)', "matches the kicker's tracking")}\n${decl('text-transform', 'uppercase', 'matches the caps voice above')}`
        : ''
    }
${decl('color', 'var(--text-dim)', 'dimmed — never full-strength text twice')}
${decl('margin-top', px(16), 'clear break under the title')}
}

${readableTextCss(maskScoped(P, [`.${P}-display`, `.${P}-support`]), 'How the two text lines wrap — spaces first, and never a hyphen on air.')}

${emptyLineCss([`.${P}-kicker`, `.${P}-display`, `.${P}-support`])}${legibility ? `\n\n${legibility}` : ''}`,
    hasAccent: true,
  };
}
