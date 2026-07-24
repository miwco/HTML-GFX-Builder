// The SPECIALIST lower-third pack — scaffolding shared by the designs in this folder.
//
// These are ordinary lower thirds: same category, same `defineVariant`, same structure
// contract, same preset bank, same assembler. Nothing here forks the platform. What the pack
// adds is the part a generalist strap deliberately leaves out — the production's own
// HIERARCHY, COMPOSITION and MOTION:
//
//   · a squad number is bigger than the player's name, because that is what the camera cuts to;
//   · a party colour is the identity, so it leads and the name follows;
//   · a scripture reference outranks the reader who is reading it;
//   · two commentators are named TOGETHER, so their strap arrives as one move, not a sequence;
//   · an analyst's strap is marked ANALYSIS first, because the mark is the editorial point.
//
// ── The two-person contract ─────────────────────────────────────────────────────────────
//
// Eight designs here name two people at once. The rule for all of them: each person's name
// and role are INDEPENDENT SPX FIELDS (f0…f3), never one string an operator has to punctuate
// themselves, and the layout is content-sized so "Bo Li" and "Aleksandra Kowalczyk-Nowak" can
// sit side by side without either one being padded into a column it doesn't fill or squeezed
// out of one it overflows. `duoSplit` + `duoGridCss` below are that rule, written once.

import type { ResolvedOptions } from '../../../model/wizard';

/**
 * One masked text line, placed BY INDEX into a named slot.
 *
 * The category's own `lineMasks` emits every line into one homogeneous stack, which is right
 * for a strap whose lines are a name over a title. A specialist design places its lines into
 * SLOTS that mean different things (a left column and a right one, a number beside a name),
 * so it addresses them individually — and gets, for free, the honest answer to a line the
 * operator deleted: **an absent line emits nothing at all**, and the layout closes over the
 * gap rather than reserving a hole for it.
 */
export function slot(
  o: ResolvedOptions,
  index: number,
  className: string,
  indent = '      ',
): string {
  const line = o.lines[index];
  if (!line) return ''; // the operator removed this line — the design renders without it
  return (
    `${indent}<!-- ${line.title} (f${index}) — SPX writes this field's value straight into the element. -->\n` +
    `${indent}<div class="lower-third-mask"><span id="f${index}" class="${className}">${line.sample}</span></div>`
  );
}

/** Several slots in order, with the absent ones dropped (never a blank line in the markup). */
export function slots(
  o: ResolvedOptions,
  spec: Array<{ index: number; className: string }>,
  indent = '      ',
): string {
  return spec
    .map((s) => slot(o, s.index, s.className, indent))
    .filter(Boolean)
    .join('\n');
}

/** True when the operator kept this line — the guard a design uses before emitting the
 *  wrapper, divider or chip that only exists to hold it. */
export function hasLine(o: ResolvedOptions, index: number): boolean {
  return !!o.lines[index];
}

// ── Two people, independently ───────────────────────────────────────────────────────────

/** Which line indices belong to which person. */
export interface DuoSplit {
  left: number[];
  right: number[];
}

/**
 * Split the lines of a design whose two people are PEERS (the interview straps).
 *
 * The slots are POSITIONAL — f0/f1 are the first person's name and role, f2/f3 the second's —
 * but the operator may remove any line, so the split is derived from how many survive rather
 * than assumed. What a peer design gives up FIRST is the roles, because a strap that names
 * one of two people on screen is simply wrong, while a strap that names both without their
 * titles is a format broadcasters run on purpose:
 *
 *   4 lines → name + role · name + role   (the full two-box interview strap)
 *   3 lines → name + role · name          (one is introduced, the other just named)
 *   2 lines → name · name                 (the classic "two names" strap — no roles at all)
 *   1 line  → name                        (it degrades to an ordinary one-line lower third)
 *
 * In every case the FIRST line of a column is that person's name and the second is their
 * role, so the hierarchy each design paints stays true whatever the operator left in.
 */
export function duoSplitBalanced(o: ResolvedOptions): DuoSplit {
  const n = o.lines.length;
  if (n <= 1) return { left: n === 1 ? [0] : [], right: [] };
  if (n === 2) return { left: [0], right: [1] };
  if (n === 3) return { left: [0, 1], right: [2] };
  return { left: [0, 1], right: [2, 3] };
}

/**
 * Split the lines of a design with a LEAD and a SUPPORT person (host + guest, the desk pair).
 *
 * The opposite trade to `duoSplitBalanced`, and it has to be: here the two people are not
 * interchangeable, so the lead is completed BEFORE the support person appears at all.
 * Dropping to two lines on a host-and-guest strap means "just the guest, with their chip" —
 * it must never re-read the guest's own role as the host's name, which is exactly what the
 * balanced split would do.
 *
 *   4 lines → lead name + role · support name + role
 *   3 lines → lead name + role · support name
 *   2 lines → lead name + role                       (one person, complete)
 *   1 line  → lead name
 */
export function duoSplitLed(o: ResolvedOptions): DuoSplit {
  const n = o.lines.length;
  return { left: [0, 1].slice(0, Math.min(n, 2)), right: [2, 3].slice(0, Math.max(0, n - 2)) };
}

/** The markup for one person's column: their name, then their role if they have one. */
export function personColumn(
  o: ResolvedOptions,
  indices: number[],
  classes: { column: string; name: string; role: string },
  indent = '      ',
): string {
  if (indices.length === 0) return '';
  const inner = slots(
    o,
    indices.map((index, i) => ({ index, className: i === 0 ? classes.name : classes.role })),
    `${indent}  `,
  );
  return `${indent}<div class="${classes.column}">\n${inner}\n${indent}</div>`;
}

/**
 * The structural half of a two-person layout — the part that must be identical in all eight
 * duo designs, because it is the part that is easy to get wrong. Each design writes its own
 * LOOK (surfaces, type, colour) on top.
 *
 * Why these declarations and not `1fr 1fr`:
 *
 * - **content-sized columns** (`auto`) so unequal names get unequal room. A symmetric grid
 *   pads "Bo Li" out to the width of "Aleksandra Kowalczyk-Nowak" and the strap reads as a
 *   layout error; auto columns simply track the type.
 * - **`min-width: 0`** on each column, because a grid item's default `min-width: auto`
 *   refuses to shrink below its longest word — which is how a single long surname pushes a
 *   strap past the safe area instead of wrapping.
 * - **a per-column `max-width`** so one very long value wraps inside its own column rather
 *   than eating the other person's. The box's own cap (the assembler's auto-fit) then holds
 *   the pair inside the safe area.
 * - **`align-items: start`** so a wrapped two-line name doesn't drag the other person's
 *   baseline down with it.
 */
export function duoGridCss(opts: {
  gap: string;
  columnMax: string;
  divider: boolean;
  /** Which element is the grid. Defaults to the panel itself; a design with a header ROW
   *  above the pair (the commentary booth) points this at its own inner row instead, so the
   *  panel is left free to stack. */
  container?: string;
}): string {
  return `/* ── The two-person grid ──
   Content-sized columns: each person gets exactly the room their name needs, so a short
   name is never padded out to a long one's width. min-width: 0 lets a column shrink (a
   grid item refuses to by default, which is what pushes long names off the safe area),
   and the per-column cap makes an extreme value wrap inside its OWN column. */
${opts.container ?? '.lower-third-box'} {
  display: grid;                    /* two people side by side… */
  grid-auto-flow: column;           /* …laid out as columns, in document order */
  grid-auto-columns: auto;          /* each column tracks its own text — never a forced half */
  align-items: start;               /* a wrapped name never drags the other's baseline down */
  column-gap: ${opts.gap};
}
.lower-third-person {
  display: flex;                    /* name over role */
  flex-direction: column;           /* top to bottom */
  min-width: 0;                     /* allow shrinking — long names wrap instead of overflowing */
  max-width: ${opts.columnMax};     /* one long value wraps in its own column, never into the other's */
}${
    opts.divider
      ? `

/* The divider — drawn only when there really are two people (see the design's HTML). */
.lower-third-divider {
  align-self: stretch;              /* full height of the taller column */
  width: calc(2px * var(--scale));  /* a hairline, not a bar — the accent is elsewhere */
  background: var(--text-color);    /* the panel's own text colour… */
  opacity: 0.22;                    /* …at a whisper, so it separates without competing */
}`
      : ''
  }`;
}

// ── Live time (the location pack) ───────────────────────────────────────────────────────

/**
 * A live wall clock, as DESIGN-OWNED runtime emitted OUTSIDE the marked ANIMATION region
 * (`StandardDesign.runtimeExtraJs`) — the same doctrine as the corner bug's clock and
 * shared/clock.ts, so a preset swap in the Motion panel can never rewrite it.
 *
 * DOM-ready guarded: template.js loads in <head> in exported packages.
 *
 * It shows the MACHINE's local time on purpose. A remote strap says "LIVE · KYIV 14:32", and
 * on a real playout box the graphic renders where the show is cut, so the operator sets the
 * place as text and the clock follows the gallery — which is what a hand-typed time can never
 * do, and what makes the clock worth a runtime at all.
 */
export function liveClockJs(elementId: string, opts: { seconds?: boolean } = {}): string {
  const fnSuffix = elementId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `// ── Live clock ──────────────────────────────────────────────────────────────
// Paints the local time into #${elementId} once a second. Design-owned runtime: it lives
// outside the marked ANIMATION region, so changing the motion preset never touches it.
function paint${fnSuffix}() {
  var el = document.getElementById('${elementId}');
  if (!el) return;
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes())${
    opts.seconds ? ` + ':' + pad(d.getSeconds())` : ''
  };
}

// Start ticking once the DOM exists (this file loads in <head> in exported packages).
function start${fnSuffix}() {
  paint${fnSuffix}();
  setInterval(paint${fnSuffix}, ${opts.seconds ? '1000' : '15000'});  // ${
    opts.seconds ? 'every second' : 'the minute figure only — no need to wake up more often'
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start${fnSuffix});
} else {
  start${fnSuffix}();                 // DOM already parsed (e.g. an inline preview build)
}`;
}

/**
 * A clock showing the time in ANOTHER time zone, driven by a UTC offset the operator types.
 *
 * The same doctrine as `liveClockJs` — design-owned runtime outside the marked region,
 * DOM-ready guarded — with one addition: the offset is read from a real SPX field on every
 * tick rather than baked in. That is what makes one template serve a whole world clock rig:
 * the operator sets "Kyiv" and "+3" and the graphic is a Kyiv clock, with no code touched.
 *
 * `offsetFieldId` is an INPUT-ONLY field, so its element is a hidden div (the countdown
 * duration's convention, src/templates/CLAUDE.md): it carries a value the operator sets and
 * the design reads, and it is never drawn.
 */
export function zoneClockJs(elementId: string, offsetFieldId: string): string {
  return `// ── Time-zone clock ─────────────────────────────────────────────────────────
// Paints the time at the operator's UTC offset into #${elementId} every 15 seconds.
// The offset is read from the hidden #${offsetFieldId} field on every tick, so changing it
// on air re-points the clock at another city without touching this code.
// Design-owned runtime: it lives outside the marked ANIMATION region, so changing the
// motion preset never touches it.
function paintZoneClock() {
  var el = document.getElementById('${elementId}');
  if (!el) return;
  var src = document.getElementById('${offsetFieldId}');
  var raw = src ? parseFloat(src.textContent) : NaN;
  var offsetHours = isFinite(raw) ? raw : 0;   // an unset or non-numeric offset means UTC
  var now = new Date();
  // Local time + the machine's own offset = UTC; UTC + the operator's offset = their city.
  var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  var there = new Date(utcMs + offsetHours * 3600000);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  el.textContent = pad(there.getHours()) + ':' + pad(there.getMinutes());
}

// Start ticking once the DOM exists (this file loads in <head> in exported packages).
function startZoneClock() {
  paintZoneClock();
  setInterval(paintZoneClock, 15000);  // the minute figure only — no need to wake up more often
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startZoneClock);
} else {
  startZoneClock();                  // DOM already parsed (e.g. an inline preview build)
}`;
}

/** The tabular-figures rule every clock and stat readout in the pack shares: same-width
 *  digits so a ticking value never jitters the layout around it. */
export const TABULAR_FIGURES = `font-variant-numeric: tabular-nums;  /* every digit the same width — no jitter on the tick */`;
