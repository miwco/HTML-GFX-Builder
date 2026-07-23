// The PROCESS / CHECKLIST design builder — a heading and up to four ordered steps.
//
// This is the pack's STEPPED graphic (TemplateVariant.defaultSteps): created in multi-step
// mode, so the entrance shows the heading and each SPX Continue reveals the next step. A
// process shown all at once is a list, not a process — the operator walking through it IS the
// graphic. Turn steps off in the Animation panel and it degrades to a plain numbered list,
// which is exactly what a rundown card wants.
//
// The step markers are CSS counters on each line's own pseudo-element, and that is load
// bearing rather than a shortcut: a step the operator clears is `display: none`, and a
// display:none element is skipped by counters — so a card with the third step deleted numbers
// its remaining steps 1, 2, 3 rather than 1, 2, 4.

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

/** How a step is marked. The four are genuinely different graphics: a numbered process, a
 *  checklist, a chunky numbered runsheet, and the house's mono runbook. */
type Marker = 'number' | 'check' | 'chip' | 'mono';

const RAMP = {
  clean: { heading: 20, step: 27, marker: 'number' as Marker, caps: false, pad: { top: 6, right: 0, bottom: 6, left: 30 } },
  frost: { heading: 20, step: 25, marker: 'check' as Marker, caps: false, pad: { top: 40, right: 54, bottom: 38, left: 44 } },
  volt: { heading: 22, step: 25, marker: 'chip' as Marker, caps: true, pad: { top: 36, right: 56, bottom: 32, left: 44 } },
  house: { heading: 18, step: 25, marker: 'mono' as Marker, caps: false, pad: { top: 32, right: 52, bottom: 34, left: 38 } },
} as const;

/** The marker column width — wide enough for a two-digit number in every skin. */
const COLUMN = 52;

/** The marker's own rule: what sits in the reserved column beside each step. */
function markerCss(marker: Marker, stepSize: number): string {
  const common = [
    decl('position', 'absolute', 'placed in the reserved marker column'),
    decl('left', '0', "flush with the step column's left edge"),
    decl('top', typeSize(Math.round(stepSize * 0.06)), 'optically aligned with the first text row'),
  ];
  if (marker === 'chip') {
    return [
      ...common,
      decl('content', 'counter(step)', 'the step number, counted by the browser'),
      decl('counter-increment', 'step', 'a cleared step is display:none and is skipped — so 1, 2, 3 stays 1, 2, 3'),
      decl('display', 'flex', 'centres the numeral inside its chip'),
      decl('align-items', 'center', 'vertically centred in the chip'),
      decl('justify-content', 'center', 'horizontally centred in the chip'),
      decl('width', typeSize(Math.round(stepSize * 1.35)), 'a square chip, sized off the step text'),
      decl('height', typeSize(Math.round(stepSize * 1.35)), 'the same value as the width — a true square'),
      decl('background', 'var(--accent)', 'the accent-filled chip: the sport marker is solid'),
      decl('color', 'var(--accent-ink)', 'dark ink on the accent fill — the family token'),
      decl('font-size', typeSize(Math.round(stepSize * 0.8)), 'the numeral inside the chip'),
      decl('font-weight', '700', 'bold: a chip numeral has to hold its own'),
      decl('line-height', '1', 'one clean em box inside the chip'),
    ].join('\n');
  }
  if (marker === 'check') {
    return [
      ...common,
      decl('content', "''", 'the checkbox is drawn, not typed — no glyph to go missing'),
      decl('width', typeSize(Math.round(stepSize * 1.05)), 'the checkbox square'),
      decl('height', typeSize(Math.round(stepSize * 1.05)), 'the same value as the width'),
      decl('border', '2px solid var(--accent)', 'an outlined box — the checklist marker'),
      decl('border-radius', 'calc(6px * var(--scale))', 'softly rounded, matching the glass panel'),
      decl('box-sizing', 'border-box', 'the border stays inside the square'),
    ].join('\n');
  }
  return [
    ...common,
    decl('content', 'counter(step)', 'the step number, counted by the browser'),
    decl('counter-increment', 'step', 'a cleared step is display:none and is skipped — so 1, 2, 3 stays 1, 2, 3'),
    decl('font-family', marker === 'mono' ? 'var(--font-label)' : 'inherit', marker === 'mono' ? "the house mono label face" : 'the graphic’s own typeface'),
    decl('font-size', typeSize(Math.round(stepSize * 0.92)), 'a shade below the step text — a marker, not a heading'),
    decl('font-weight', '700', 'bold: the number is the anchor of the row'),
    decl('font-variant-numeric', 'tabular-nums', 'equal-width digits — the numbers line up down the column'),
    decl('line-height', '1.2', 'aligned with the first row of step text'),
    decl('color', 'var(--accent)', 'the accent dose that threads the steps together'),
  ].join('\n');
}

/** The drawn tick inside a checklist box (the `check` marker only). */
function tickCss(selector: string, stepSize: number): string {
  const box = Math.round(stepSize * 1.05);
  return `/* The tick — two borders rotated into a check mark, so no font has to carry the glyph.
   It is drawn INSIDE the box above and travels with the line it belongs to. */
${selector}::after {
${decl('content', "''", 'pseudo-elements render only with content set')}
${decl('position', 'absolute', 'placed over the checkbox drawn above')}
${decl('left', typeSize(Math.round(box * 0.3)), 'inset into the box')}
${decl('top', typeSize(Math.round(box * 0.2)), 'sits in the box’s upper half before rotation')}
${decl('width', typeSize(Math.round(box * 0.34)), 'the tick’s short arm')}
${decl('height', typeSize(Math.round(box * 0.6)), 'the tick’s long arm')}
${decl('border-right', '2px solid var(--accent)', 'the long stroke of the check')}
${decl('border-bottom', '2px solid var(--accent)', 'the short stroke of the check')}
${decl('transform', 'rotate(45deg)', 'rotate the corner into a check mark')}
}`;
}

/** Build a process / checklist card in one of the pack's four looks. */
export function buildProcessCard(skin: Pack4Skin, o: ResolvedOptions): CardDesign {
  const r = RAMP[skin.id];
  const pad: BoxPad = { ...r.pad, left: accentInset(skin, r.pad.left) };
  const step = `.${P}-step`;
  const textLines = [`.${P}-heading`, step];
  const legibility = textLegibilityCss(skin, textLines.join(',\n'));

  return {
    html: `    <!-- Process card: a heading, then the ordered steps. Each SPX Continue reveals one. -->
    <div class="${P}-box">
${stack(
  accentDiv(P),
  maskLine(o, P, 0, `${P}-heading`),
  ...o.lines
    .slice(1)
    .map((_, i) => maskLine(o, P, i + 1, i === 0 ? `${P}-step ${P}-step-first` : `${P}-step`)),
)}
    </div>`,

    css: `${panelCss(
      skin,
      P,
      pad,
      [
        decl('display', 'flex', 'stack the rows so a cleared step can collapse'),
        decl('flex-direction', 'column', 'heading, then one row per step'),
        decl('align-items', 'flex-start', 'everything hugs the same left edge'),
        decl('text-align', 'left', 'marked lines, rules and wrapped prose stay left-aligned in every anchor zone'),
        decl('counter-reset', 'step', 'the step counter starts here, once per card'),
      ].join('\n'),
    )}

${accentCss(skin, P, pad)}

${labelCss(`.${P}-heading`, r.heading, 'The heading (f0) — what this process IS. It enters with the card; the steps follow.')}

/* One step (f1…) — the text of the step, with its marker in the reserved column beside it. */
${step} {
${decl('position', 'relative', 'anchors the marker drawn in the column')}
${decl('padding-left', px(COLUMN), 'the marker column')}
${decl('min-height', typeSize(Math.round(r.step * 1.35)), 'a one-line step is still as tall as its marker')}
${decl('font-size', typeSize(r.step), 'step text scale (values are 1080p reference)')}
${decl('font-weight', '500', 'medium: steps are instructions, and read better with a little weight')}
${decl('line-height', '1.35', 'a step that wraps stays readable')}${
      r.caps ? `\n${decl('text-transform', 'uppercase', 'the sport runsheet is shouted')}` : ''
    }
${decl('color', 'var(--text-color)', 'full strength — every step matters equally')}
${decl('margin-top', px(18), 'even rhythm down the list of steps')}
}

/* The first step sits further from the heading than the steps sit from each other. */
${step}-first {
${decl('margin-top', px(24), 'heading → steps: a slightly larger break')}
}

/* The step marker — a counter on the line's OWN pseudo-element, so it arrives with the step
   it belongs to (and leaves with it: see the :empty rule below). */
${step}::before {
${markerCss(r.marker, r.step)}
}${r.marker === 'check' ? `\n\n${tickCss(step, r.step)}` : ''}

${readableTextCss(maskScoped(P, textLines), 'How the heading and steps wrap — spaces first, and never a hyphen on air.')}

${emptyLineCss(textLines)}${legibility ? `\n\n${legibility}` : ''}`,
    hasAccent: true,
  };
}
