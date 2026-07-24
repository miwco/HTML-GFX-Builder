// The ESPORTS SCOREBOARD category — the two graphics that sit on screen while a match runs
// (docs/COMPETITION_PACK.md):
//
//   the SERIES SCOREBUG (type 'esports-score')  two teams, their map score, the stage line,
//                                              and a series pip row — plus the match phase:
//                                              pre-match -> live -> final, and a technical
//                                              pause that is independent of all three.
//   the MAP / ROUND INDICATOR (type 'map-round') the series card: one row per map, each won
//                                              by a side or still to play, with a cursor on
//                                              the map being played right now.
//
// Both are self-assembled through templates/competition/shared.ts: the design owns its SPX
// fields, ships the runtime that paints them, and the machine (declared by the graphic type)
// drives the phase marks through named calls. Nothing here evaluates a condition — a phase mark
// is applied because the operator's event found an arrow out of the state the graphic is in.
//
// One structure, two shapes. The rows a map indicator renders and the pips a scorebug renders
// are BOTH the operator's data (how many maps, how many won), so both are measured motion
// (compMotion.ts) rather than keyframes, and both rebuild from a hidden source field.


import type { ResolvedOptions, TemplateVariant } from '../../../model/wizard';
import type { AnimData } from '../../../blocks/animData';
import type { TypeField } from '../../types/graphicType';
import {
  COMP_WIDTH,
  ESCAPE_HTML_JS,
  READY_GUARD_JS,
  defineCompetitionVariant,
  hiddenSource,
  type CompCategorySpec,
  type CompDesign,
  type CompMeta,
} from '../shared';

/** The category: a strip that hugs its content, parked in a corner or across the top. */
export const ESPORTS_CATEGORY: CompCategorySpec = {
  type: 'esports-score',
  prefix: 'esports-score',
  rootComment: 'Esports scoreboard root — the match strip and its phase marks.',
  widthFraction: COMP_WIDTH.strip,
};

export const P = ESPORTS_CATEGORY.prefix;

// ── The series scorebug ──────────────────────────────────────────────────────

/**
 * The scorebug's fields. Five visible lines (the wizard's Fields step retitles them), the
 * series format that decides how many pips are drawn, and the two team logos — image fields
 * the design owns, exactly like a versus card's.
 */
export const SCORE_FIELDS: TypeField[] = [
  { key: 'teamA', label: 'Team A', kind: 'text', value: 'TEAM LIQUID', role: 'line' },
  { key: 'scoreA', label: 'Score A', kind: 'text', value: '1', role: 'line' },
  { key: 'teamB', label: 'Team B', kind: 'text', value: 'NAVI', role: 'line' },
  { key: 'scoreB', label: 'Score B', kind: 'text', value: '1', role: 'line' },
  { key: 'stage', label: 'Stage / map', kind: 'text', value: 'MAP 3 · MIRAGE', role: 'line' },
  { key: 'series', label: 'Series format', kind: 'text', value: 'BEST OF 5', role: 'data' },
  { key: 'logoA', label: 'Team A logo', kind: 'image', value: '', role: 'data' },
  { key: 'logoB', label: 'Team B logo', kind: 'image', value: '', role: 'data' },
];

export interface ScoreMarkupOptions {
  /** Whether the two team logo slots are drawn beside the names. */
  logos: boolean;
  /** What sits between the two sides: the pip row, or a plain score divider. */
  center: 'pips' | 'divider';
  /** The word the status chip shows before the match goes live. */
  preLabel?: string;
}

/** The scorebug's markup — the same DOM for every design; the CSS is what differs. */
export function scoreMarkup(o: ResolvedOptions, opts: ScoreMarkupOptions): string {
  const value = (i: number, fallback: string) => o.lines[i]?.sample ?? fallback;
  const side = (letter: 'a' | 'b', nameId: string, scoreId: string, logoId: string, name: string, score: string) =>
    `      <!-- Side ${letter.toUpperCase()}: ${opts.logos ? 'logo, ' : ''}team name, map score. -->
      <div class="${P}-side ${P}-side-${letter}">
${opts.logos ? `        <div class="${P}-logo"><img id="${logoId}" alt="" style="display: none" /></div>\n` : ''}        <div class="${P}-mask ${P}-team-mask"><span id="${nameId}" class="${P}-team">${name}</span></div>
        <div class="${P}-chip"><span id="${scoreId}" class="${P}-figure">${score}</span></div>
      </div>`;

  return `    <div class="${P}-box">
      <!-- The head: the stage line and the phase chip the machine paints. -->
      <div class="${P}-head">
        <div class="${P}-mask"><span id="f4" class="${P}-stage">${value(4, 'MAP 3 · MIRAGE')}</span></div>
        <span class="${P}-status">${opts.preLabel ?? 'PRE-MATCH'}</span>
      </div>
      <!-- The accent — the design's flourish, and what the phase marks tint. A design may
           draw it as an edge bar (absolute) or as a rule between the head and the scores;
           it sits here so the second kind needs no magic offset. -->
      <div class="${P}-accent"></div>
      <!-- The body: the two sides around the series center. -->
      <div class="${P}-body">
${side('a', 'f0', 'f1', 'f6', value(0, 'TEAM LIQUID'), value(1, '1'))}
        <!-- The center: ${opts.center === 'pips' ? 'one pip per map of the series, filled as maps are won' : 'the score divider'}. -->
        <div class="${P}-center">
${
  opts.center === 'pips'
    ? `          <div class="${P}-pips" id="${P}-pips"></div>
          <span class="${P}-series-label" id="${P}-series-label">${SCORE_FIELDS[5].value}</span>`
    : `          <span class="${P}-divider">:</span>`
}
        </div>
${side('b', 'f2', 'f3', 'f7', value(2, 'NAVI'), value(3, '1'))}
      </div>
    </div>
${hiddenSource('f5', SCORE_FIELDS[5].value, 'Series format (f5) — how many pips the center row draws.')}`;
}

/**
 * The scorebug runtime.
 *
 * Three jobs, and the split between them is the model's (docs/STATE_MACHINE_SCHEMA.md §3):
 *  - compRebuild/compRepaint are DATA. They draw the pips the series format asks for and pop a
 *    score that actually changed. They move no pointer and are never a transition.
 *  - markPreMatch / markLive / markFinal / markPaused / markRunning are STATE EFFECTS. Each is
 *    named by a state's timeline in the machine, so it runs when — and only when — the operator's
 *    event found an arrow out of the state the graphic is in.
 *  - compClearMarks is the visual half of RESET: play() calls it, so a replay never inherits the
 *    last match's FINAL flag. Resetting the data is a separate operation, and stays update()'s.
 */
export const SCORE_RUNTIME_JS = `${ESCAPE_HTML_JS}

var scoreIds = ['f1', 'f3'];       // the two map-score fields (f0/f2 are the team names)
var lastScores = {};               // what each score said last time — a pop needs the change
var onAir = false;                 // true between play() and stop(): pops only happen on air

// compRebuild(): draw the series pip row. How many pips there are is the operator's series
// format ("BEST OF 5" -> 5), and how many are filled is the live map score — both data, so
// this is measured at paint time and never written down as a keyframe.
function compRebuild() {
  var host = document.getElementById('${P}-pips');
  var label = document.getElementById('${P}-series-label');
  var series = (document.getElementById('f5') || { textContent: '' }).textContent;
  if (label) label.textContent = series;
  if (!host) return;               // a design without a pip row (the plain divider) — nothing to draw
  var count = parseInt(String(series).replace(/[^0-9]/g, ''), 10);
  if (isNaN(count) || count < 1) count = 3;        // an unreadable format still draws a sane row
  count = Math.min(count, 9);                      // nine pips is the widest a strip reads at
  var a = parseInt((document.getElementById('f1') || { textContent: '0' }).textContent, 10) || 0;
  var b = parseInt((document.getElementById('f3') || { textContent: '0' }).textContent, 10) || 0;
  var html = '';
  for (var i = 0; i < count; i++) {
    // Side A fills from the left, side B from the right; the rest stay open.
    var cls = i < a ? ' ${P}-pip-a' : (i >= count - b ? ' ${P}-pip-b' : '');
    html += '<span class="${P}-pip' + cls + '"></span>';
  }
  host.innerHTML = html;
}

// compRepaint(): the score bump. A map score that CHANGED while the graphic is on air scales
// up and springs back — the classic broadcast pop, and the reason update() keeps the previous
// value around.
function compRepaint() {
  for (var i = 0; i < scoreIds.length; i++) {
    var el = document.getElementById(scoreIds[i]);
    if (!el) continue;
    var value = el.textContent;
    var changed = lastScores[scoreIds[i]] !== undefined && lastScores[scoreIds[i]] !== value;
    lastScores[scoreIds[i]] = value;
    if (changed && onAir) {
      // Pop the CHIP, not the figure: the figure is clipped by the chip, so scaling it alone
      // would chop the outer digit of a two-digit score.
      gsap.fromTo(el.parentNode,
        { scale: 1.3 },
        { scale: 1, duration: 0.4 / motionSpeed(), ease: 'back.out(1.7)' }
      );
    }
  }
}

// compClearMarks(): back to the neutral, pre-match look. The VISUAL half of reset — the data
// half is update()'s, and the two are never one call.
function compClearMarks() {
  var root = document.querySelector('.${P}');
  if (!root) return;
  root.classList.remove('${P}-live', '${P}-final', '${P}-paused');
  var status = root.querySelector('.${P}-status');
  if (status) status.textContent = 'PRE-MATCH';
  onAir = true;                    // play() calls this — from here a score change pops
}

// setStatus(): the one place the phase chip's word is written.
function setStatus(word) {
  var status = document.querySelector('.${P}-status');
  if (status) status.textContent = word;
}

// markPreMatch(): the phase group's initial state. Reached again by taking the graphic off
// air and back on, which is why the mark clearing and this say the same thing.
function markPreMatch() {
  var root = document.querySelector('.${P}');
  if (root) root.classList.remove('${P}-live', '${P}-final');
  setStatus('PRE-MATCH');
}

// markLive(): the match is running. Called by the phase group's 'live' state — reached from
// pre-match by the operator's "Go live", and from final by "Next map".
function markLive() {
  var root = document.querySelector('.${P}');
  if (!root) return;
  root.classList.remove('${P}-final');
  root.classList.add('${P}-live');
  setStatus('LIVE');
  gsap.fromTo('.${P}-status', { opacity: 0.2 }, { opacity: 1, duration: 0.35 / motionSpeed(), ease: 'power2.out' });
}

// markFinal(): the map is decided. The scores settle and the strip carries the FINAL flag
// until the operator starts the next map.
function markFinal() {
  var root = document.querySelector('.${P}');
  if (!root) return;
  root.classList.remove('${P}-live');
  root.classList.add('${P}-final');
  setStatus('FINAL');
  gsap.fromTo('.${P}-box',
    { scale: 1.03 },
    { scale: 1, duration: 0.4 / motionSpeed(), ease: 'back.out(1.8)' }
  );
}

// markPaused() / markRunning(): the technical pause. Its own group on purpose — a pause can
// happen in any phase and must not multiply the phase states (2 + 3 states, never 6).
function markPaused() {
  var root = document.querySelector('.${P}');
  if (!root) return;
  root.classList.add('${P}-paused');
  setStatus('PAUSE');
}

function markRunning() {
  var root = document.querySelector('.${P}');
  if (!root) return;
  root.classList.remove('${P}-paused');
  // Return the chip to whatever the phase group is showing — the pause never owned the phase.
  setStatus(root.classList.contains('${P}-final') ? 'FINAL' : (root.classList.contains('${P}-live') ? 'LIVE' : 'PRE-MATCH'));
}

${READY_GUARD_JS}`;

/** The scorebug's shared LAYOUT — the geometry every design of the type has in common. */
export function scoreStructureCss(opts: ScoreMarkupOptions): string {
  return `/* ── The strip's layout (shared by every scorebug design). ── */
.${P}-head {
  display: flex;                   /* the stage line and the phase chip share one row */
  align-items: center;             /* both on the head's center line */
  justify-content: space-between;  /* stage left, phase chip right */
  gap: calc(18px * var(--scale));  /* air between them */
}

.${P}-body {
  display: flex;                   /* side A · center · side B */
  align-items: center;             /* all three on the strip's center line */
  gap: calc(20px * var(--scale));  /* air around the center block */
}

/* One side: ${opts.logos ? 'the logo slot, ' : ''}the team name, and its score chip. */
.${P}-side {
  display: flex;                   /* the side's parts in one row */
  align-items: center;             /* on the strip's center line */
  gap: calc(16px * var(--scale));  /* air inside the side */
  min-width: 0;                    /* lets a long team name shrink and wrap, not overflow */
  flex: 1;                         /* both sides claim equal width */
}

/* Side B mirrors: the DOM order stays name-then-score, the display flips so both score
   chips meet around the center. */
.${P}-side-b {
  flex-direction: row-reverse;     /* chip toward the center, name facing outward */
}

.${P}-team-mask {
  min-width: 0;                    /* flex children refuse to shrink without this */
  flex: 1;                         /* the name gives up width before the chip does */
}

.${P}-chip {
  display: flex;                   /* centers the figure… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  flex-shrink: 0;                  /* scores never squeeze — names give up width instead */
}

.${P}-center {
  display: flex;                   /* the pip row over its label */
  flex-direction: column;          /* stacked */
  align-items: center;             /* centered on the strip's axis */
  gap: calc(6px * var(--scale));   /* a hairline of air between them */
  flex-shrink: 0;                  /* the center corridor keeps its width */
}
${
  opts.logos
    ? `
/* The logo slot — an operator image field. Empty shows the design's placeholder mark. */
.${P}-logo {
  display: flex;                   /* centers the image in the slot */
  align-items: center;
  justify-content: center;
  width: calc(46px * var(--scale));    /* a square slot, whatever the file's aspect */
  height: calc(46px * var(--scale));
  flex-shrink: 0;                  /* the slot never collapses */
}
.${P}-logo img {
  max-width: 100%;                 /* the logo fits its slot… */
  max-height: 100%;                /* …both ways, undistorted */
  object-fit: contain;
}`
    : ''
}
${
  opts.center === 'pips'
    ? `
/* The series pips — one per map of the format, filled from each side. */
.${P}-pips {
  display: flex;                   /* the pips in a row */
  align-items: center;
  gap: calc(6px * var(--scale));   /* air between pips */
}
.${P}-pip {
  width: calc(14px * var(--scale));    /* a small, even mark */
  height: calc(6px * var(--scale));
  border-radius: calc(3px * var(--scale));
  background: rgba(255, 255, 255, 0.22);  /* an unplayed map */
}`
    : ''
}`;
}

// ── The map / round indicator ────────────────────────────────────────────────

/**
 * The indicator's fields. One visible title line, the map source (a textarea the operator
 * types the series into) and the cursor that says which map is being played.
 */
export const MAP_FIELDS: TypeField[] = [
  { key: 'title', label: 'Series title', kind: 'text', value: 'BEST OF 5 · GRAND FINAL', role: 'line' },
  {
    key: 'maps',
    label: 'Maps (one per line: "Map | A / B / -")',
    kind: 'lines',
    value: 'MIRAGE | A\nINFERNO | B\nANCIENT | A\nNUKE | -\nANUBIS | -',
    role: 'data',
  },
  { key: 'current', label: 'Map being played (1-based)', kind: 'number', value: '4', role: 'data' },
  { key: 'teamA', label: 'Side A short name', kind: 'text', value: 'TL', role: 'data' },
  { key: 'teamB', label: 'Side B short name', kind: 'text', value: 'NAVI', role: 'data' },
];

/** The indicator's markup — the rows are rebuilt from the source, so the body starts empty. */
export function mapMarkup(o: ResolvedOptions): string {
  return `    <div class="${P}-box">
      <!-- The head: the series title. -->
      <div class="${P}-head">
        <div class="${P}-mask"><span id="f0" class="${P}-title">${o.lines[0]?.sample ?? MAP_FIELDS[0].value}</span></div>
      </div>
      <!-- The accent rule between the title and the maps. -->
      <div class="${P}-accent"></div>
      <!-- The body: one row per map, rendered from the source field below. -->
      <div class="${P}-body" id="${P}-rows"></div>
    </div>
${hiddenSource('f1', MAP_FIELDS[1].value, 'Map source (f1) — one "Map | A / B / -" per line.')}
${hiddenSource('f2', MAP_FIELDS[2].value, 'The map being played (f2) — 1-based; the cursor sits on it.')}
${hiddenSource('f3', MAP_FIELDS[3].value, 'Side A short name (f3) — the mark a won map shows.')}
${hiddenSource('f4', MAP_FIELDS[4].value, 'Side B short name (f4).')}`;
}

/**
 * The indicator runtime.
 *
 * compRebuild is DATA (the rows the operator typed), applyMapCursor and markSeriesFinal are
 * STATE EFFECTS the machine names. The cursor moves on an EVENT carrying the new map number as
 * its payload, which is what makes "advance to map 4" one atomic change instead of a data write
 * the graphic might animate to before the number lands.
 */
export const MAP_RUNTIME_JS = `${ESCAPE_HTML_JS}

// compRebuild(): parse the hidden #f1 source (one "Map | A / B / -" per line) and rebuild the
// rows. The row count is the operator's data — which is exactly why the entrance cascade is
// measured (compCascade) instead of written down as keyframes.
function compRebuild() {
  var host = document.getElementById('${P}-rows');
  if (!host) return;
  var source = (document.getElementById('f1') || { textContent: '' }).textContent;
  var nameA = (document.getElementById('f3') || { textContent: 'A' }).textContent;
  var nameB = (document.getElementById('f4') || { textContent: 'B' }).textContent;
  var html = '';
  source.split('\\n').forEach(function (raw, index) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.indexOf('|');                 // first pipe only — map names may contain one
    var map = (split === -1 ? line : line.slice(0, split)).trim();
    var winner = (split === -1 ? '' : line.slice(split + 1)).trim().toUpperCase();
    if (map === '') return;
    var state = winner === 'A' ? '${P}-won-a' : (winner === 'B' ? '${P}-won-b' : '${P}-open');
    var mark = winner === 'A' ? nameA : (winner === 'B' ? nameB : '·');
    html += '<div class="${P}-row ' + state + '" data-map="' + (index + 1) + '">'
          +   '<span class="${P}-row-index">' + (index + 1) + '</span>'
          +   '<span class="${P}-row-map">' + escapeHtml(map) + '</span>'
          +   '<span class="${P}-row-mark">' + escapeHtml(mark) + '</span>'
          + '</div>';
  });
  host.innerHTML = html;
}

// currentRow(): the row the cursor field points at, or null. 1-based, like an operator counts.
function currentRow() {
  var host = document.getElementById('${P}-rows');
  var at = parseInt((document.getElementById('f2') || { textContent: '' }).textContent, 10);
  if (!host || isNaN(at)) return null;
  return host.querySelector('[data-map="' + at + '"]');
}

// compRepaint(): put the cursor where the data says, with no motion. Repainting after an
// update must never look like a transition — the graphic changed what it says, not what it is.
function compRepaint() {
  var host = document.getElementById('${P}-rows');
  if (!host) return;
  var rows = host.querySelectorAll('.${P}-row');
  for (var i = 0; i < rows.length; i++) rows[i].classList.remove('${P}-current');
  var row = currentRow();
  if (row) row.classList.add('${P}-current');
}

// applyMapCursor(): the ADVANCE effect. Same repaint, plus the move that says it just
// happened — the operator's event carried the new map number in with it.
function applyMapCursor() {
  compRepaint();
  var row = currentRow();
  if (!row) return;
  gsap.fromTo(row, { x: -14 }, { x: 0, duration: 0.35 / motionSpeed(), ease: 'back.out(1.6)' });
}

// markSeriesFinal(): the series is decided. The board dims the maps that were never needed
// and the winning side's rows hold the accent.
function markSeriesFinal() {
  var root = document.querySelector('.${P}');
  if (!root) return;
  root.classList.add('${P}-decided');
  gsap.fromTo('.${P}-box', { scale: 1.02 }, { scale: 1, duration: 0.4 / motionSpeed(), ease: 'back.out(1.6)' });
}

// compClearMarks(): the visual half of reset — a replay starts an undecided series.
function compClearMarks() {
  var root = document.querySelector('.${P}');
  if (root) root.classList.remove('${P}-decided');
}

${READY_GUARD_JS}`;

/** The indicator's shared LAYOUT — the geometry every design of the type has in common. */
export function mapStructureCss(): string {
  return `/* ── The indicator's layout (shared by every map / round design). ── */
.${P}-head {
  display: flex;                   /* the title, alone on its row */
  align-items: center;
}

/* The board reads left-to-right whatever corner it is parked in — the root's zone alignment
   is for straps, and would otherwise right-align every map name in a right-hand zone. */
.${P}-head,
.${P}-body {
  text-align: left;
}

/* The accent is a RULE here, sitting in the flow between the title and the maps. */
.${P}-accent {
  width: 100%;
  flex-shrink: 0;
}

.${P}-body {
  display: flex;                   /* one row per map… */
  flex-direction: column;          /* …stacked */
  gap: calc(6px * var(--scale));   /* a hairline of air between rows */
}

/* One map row: its number, the map name, and the mark saying who took it. */
.${P}-row {
  display: flex;                   /* the three parts in a row */
  align-items: center;             /* on the row's center line */
  gap: calc(14px * var(--scale));  /* air between them */
  will-change: transform, opacity; /* the cascade moves each row */
}

.${P}-row-map {
  flex: 1;                         /* the map name takes the slack */
  min-width: 0;                    /* …and wraps rather than overflowing */
}

.${P}-row-mark {
  flex-shrink: 0;                  /* the winner mark keeps its width */
  text-align: right;               /* marks line up down the right edge */
}`;
}

// ── The authoring API ────────────────────────────────────────────────────────

/** Define one esports-category variant (either type). */
export function defineEsportsVariant(
  spec: Omit<TemplateVariant, 'create'>,
  meta: CompMeta,
  buildDesign: (o: ResolvedOptions) => CompDesign,
  refine?: (o: ResolvedOptions) => ((data: AnimData) => AnimData) | undefined,
): TemplateVariant {
  return defineCompetitionVariant(ESPORTS_CATEGORY, spec, meta, buildDesign, refine);
}

