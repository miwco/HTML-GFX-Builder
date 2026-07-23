// The MATCH-UP & COMPETITOR category — the three full-frame graphics that are ABOUT the
// competitors rather than about the score (docs/COMPETITION_PACK.md):
//
//   the MATCH-UP (type 'matchup')          two sides meet; the operator can then PICK a winner,
//                                          change the pick freely, and LOCK it in. After the
//                                          lock, picking is structurally impossible.
//   the HEAD-TO-HEAD (type 'head-to-head') the same two sides, compared stat by stat, with
//                                          measured bars and a leader the operator highlights.
//   the PLAYER CARD (type 'player-card')   one competitor: name, role, portrait slot, and a
//                                          stat block revealed on a Continue press.
//
// THE PICK IS DATA. There is one `selected` state, and WHICH side it means is the `winner`
// field, applied atomically as the event's payload (docs/STATE_MACHINE_SCHEMA.md §3). A
// four-team format would not add a state. And "you cannot pick after the lock" is meant
// literally: no `select` arrow leaves `locked`, so a late pick finds no transition and is
// dropped with its payload — no condition evaluates anything.
//
// One consequence worth stating, because it is the rule the runtime is built around: update()
// NEVER paints the winner. Typing "B" into the winner field changes what the graphic WOULD
// show if the operator selected — it does not select. Only the machine's states call
// applyWinner. That is what keeps a data update from silently becoming a transition.

import type { ResolvedOptions, TemplateVariant } from '../../../model/wizard';
import type { AnimData } from '../../../blocks/animData';
import type { TypeField } from '../../types/graphicType';
import {
  ESCAPE_HTML_JS,
  READY_GUARD_JS,
  defineCompetitionVariant,
  hiddenSource,
  type CompCategorySpec,
  type CompDesign,
  type CompMeta,
} from '../shared';

/** The category: full-frame cards — the sides need the whole stage to meet on. */
export const MATCHUP_CATEGORY: CompCategorySpec = {
  type: 'matchup',
  prefix: 'matchup',
  rootComment: 'Match-up root — two competitors, a pick, and the lock.',
  fullFrame: true,
};

export const P = MATCHUP_CATEGORY.prefix;

/** The A/B choice both the winner pick and the leader highlight are made from. */
const SIDE_OPTIONS = [
  { label: '—', value: '' },
  { label: 'Side A', value: 'A' },
  { label: 'Side B', value: 'B' },
];

// ── The match-up ─────────────────────────────────────────────────────────────

export const MATCHUP_FIELDS: TypeField[] = [
  { key: 'teamA', label: 'Side A', kind: 'text', value: 'TEAM LIQUID', role: 'line' },
  { key: 'teamB', label: 'Side B', kind: 'text', value: 'NAVI', role: 'line' },
  { key: 'event', label: 'Event line', kind: 'text', value: 'GRAND FINAL · BEST OF 5', role: 'line' },
  { key: 'noteA', label: 'Side A note', kind: 'text', value: 'SEED 1 · 14-2', role: 'data' },
  { key: 'noteB', label: 'Side B note', kind: 'text', value: 'SEED 3 · 11-5', role: 'data' },
  // The pick. A genuinely constrained choice, which is what the broadcast field policy's
  // dropdown exception is for — and it is DATA: one `selected` state carries either side.
  { key: 'winner', label: 'Winner', kind: 'select', value: '', role: 'data', options: SIDE_OPTIONS },
  { key: 'logoA', label: 'Side A logo', kind: 'image', value: '', role: 'data' },
  { key: 'logoB', label: 'Side B logo', kind: 'image', value: '', role: 'data' },
];

/** The match-up's markup — the same DOM for every design; the CSS is what differs. */
export function matchupMarkup(o: ResolvedOptions): string {
  const value = (i: number, fallback: string) => o.lines[i]?.sample ?? fallback;
  const side = (letter: 'a' | 'b', nameId: string, noteId: string, logoId: string, name: string, note: string) =>
    `        <!-- Side ${letter.toUpperCase()} — the winner mark lands on this column. -->
        <div class="${P}-side ${P}-side-${letter}" data-side="${letter.toUpperCase()}">
          <div class="${P}-logo"><img id="${logoId}" alt="" style="display: none" /></div>
          <div class="${P}-mask"><span id="${nameId}" class="${P}-name">${name}</span></div>
          <span id="${noteId}" class="${P}-note">${note}</span>
          <span class="${P}-verdict"></span>
        </div>`;

  return `    <div class="${P}-box">
      <!-- The accent flourish — the seam the two sides meet on. -->
      <div class="${P}-accent"></div>
      <!-- The head: the event line above the match-up. -->
      <div class="${P}-head">
        <div class="${P}-mask"><span id="f2" class="${P}-event">${value(2, 'GRAND FINAL · BEST OF 5')}</span></div>
      </div>
      <!-- The body: side A, the VS mark, side B. -->
      <div class="${P}-body">
${side('a', 'f0', 'f3', 'f6', value(0, 'TEAM LIQUID'), MATCHUP_FIELDS[3].value)}
        <div class="${P}-center"><span class="${P}-vs">VS</span></div>
${side('b', 'f1', 'f4', 'f7', value(1, 'NAVI'), MATCHUP_FIELDS[4].value)}
      </div>
    </div>
${hiddenSource('f5', '', 'The winner pick (f5) — DATA. One "selected" state carries either side.')}`;
}

/**
 * The match-up runtime.
 *
 * applyWinner / applyLock / clearWinner are STATE EFFECTS: the machine's states name them, so
 * they run when an event found an arrow out of the state the graphic is in. There is
 * deliberately NO compRepaint — a data update must never look like a pick.
 */
export const MATCHUP_RUNTIME_JS = `// sideEl(letter): the column a side letter names, or null.
function sideEl(letter) {
  var wanted = String(letter || '').trim().toUpperCase();
  if (wanted !== 'A' && wanted !== 'B') return null;
  return document.querySelector('.${P}-side[data-side="' + wanted + '"]');
}

// clearWinner(): back to a neutral match-up. Both the 'neutral' state's effect and the visual
// half of reset — a replay never inherits the last pick.
function clearWinner() {
  var sides = document.querySelectorAll('.${P}-side');
  for (var i = 0; i < sides.length; i++) {
    sides[i].classList.remove('${P}-win', '${P}-lose');
    var mark = sides[i].querySelector('.${P}-verdict');
    if (mark) mark.textContent = '';
  }
  var root = document.querySelector('.${P}');
  if (root) root.classList.remove('${P}-locked');
}

// applyWinner(): paint the pick the event carried in. Re-entering the state repaints from the
// field, which is what makes "change the pick freely" a self-transition and not a second state.
function applyWinner() {
  var picked = (document.getElementById('f5') || { textContent: '' }).textContent;
  var winner = sideEl(picked);
  clearWinner();
  if (!winner) return;             // nothing picked yet, or an unknown letter — stay neutral
  var sides = document.querySelectorAll('.${P}-side');
  for (var i = 0; i < sides.length; i++) {
    var isWinner = sides[i] === winner;
    sides[i].classList.add(isWinner ? '${P}-win' : '${P}-lose');
    var mark = sides[i].querySelector('.${P}-verdict');
    if (mark) mark.textContent = isWinner ? 'WINNER' : '';
  }
  gsap.fromTo(winner, { scale: 1.05 }, { scale: 1, duration: 0.4 / motionSpeed(), ease: 'back.out(1.8)' });
}

// applyLock(): the pick is final. The dimming says so; the MACHINE is what makes it true, by
// simply having no 'select' arrow leaving this state.
function applyLock() {
  var root = document.querySelector('.${P}');
  if (root) root.classList.add('${P}-locked');
  gsap.fromTo('.${P}-accent', { opacity: 0.3 }, { opacity: 1, duration: 0.35 / motionSpeed(), ease: 'power2.out' });
}

// compClearMarks(): play()'s visual reset — the neutral match-up, whatever the last run left.
function compClearMarks() {
  clearWinner();
}`;

/** The match-up's shared LAYOUT — the geometry every design of the type has in common. */
export function matchupStructureCss(): string {
  return `/* ── The match-up's layout (shared by every design of the type). ── */
.${P}-head {
  position: absolute;              /* the event line rides above the match-up… */
  top: 16%;                        /* …in the frame's upper third */
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;         /* centered on the frame's axis */
}

.${P}-body {
  display: flex;                   /* side A · VS · side B */
  align-items: center;             /* the three meet on one line */
  justify-content: center;
  width: 100%;
  gap: calc(30px * var(--scale));
}

/* One side: a column that owns 38% of the frame, so the two can never collide however
   long the operator's names run — a long name wraps inside its column instead. */
.${P}-side {
  display: flex;
  flex-direction: column;          /* logo, name, note, verdict — stacked */
  align-items: center;
  gap: calc(14px * var(--scale));
  width: 38%;
  min-width: 0;
  text-align: center;
  will-change: transform, opacity; /* the sides move as units */
}

.${P}-center {
  display: flex;                   /* the VS mark, alone in the corridor */
  align-items: center;
  justify-content: center;
  flex-shrink: 0;                  /* the middle corridor keeps its width */
}

/* The logo slot — an operator image field; empty shows the design's placeholder. */
.${P}-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(150px * var(--scale));
  height: calc(150px * var(--scale));
}
.${P}-logo img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* The verdict mark — empty until a winner is picked, so it takes no room when unused. */
.${P}-verdict:empty {
  display: none;
}`;
}

// ── The head-to-head ─────────────────────────────────────────────────────────

export const H2H_FIELDS: TypeField[] = [
  { key: 'teamA', label: 'Side A', kind: 'text', value: 'TEAM LIQUID', role: 'line' },
  { key: 'teamB', label: 'Side B', kind: 'text', value: 'NAVI', role: 'line' },
  { key: 'title', label: 'Title', kind: 'text', value: 'HEAD TO HEAD', role: 'line' },
  {
    key: 'rows',
    label: 'Comparison (one per line: "Stat | A | B")',
    kind: 'lines',
    value: 'MAPS WON | 14 | 11\nROUND WIN % | 58 | 52\nAVG RATING | 1.18 | 1.09\nHEAD TO HEAD | 3 | 2',
    role: 'data',
  },
  { key: 'leader', label: 'Highlighted side', kind: 'select', value: '', role: 'data', options: SIDE_OPTIONS },
  { key: 'logoA', label: 'Side A logo', kind: 'image', value: '', role: 'data' },
  { key: 'logoB', label: 'Side B logo', kind: 'image', value: '', role: 'data' },
];

/** The head-to-head's markup — the rows are rebuilt, so the body starts empty. */
export function h2hMarkup(o: ResolvedOptions): string {
  const value = (i: number, fallback: string) => o.lines[i]?.sample ?? fallback;
  return `    <div class="${P}-box">
      <!-- The head: the title over the two sides' names and crests. -->
      <div class="${P}-head">
        <div class="${P}-mask"><span id="f2" class="${P}-event">${value(2, 'HEAD TO HEAD')}</span></div>
        <div class="${P}-head-sides">
          <div class="${P}-head-side" data-side="A">
            <div class="${P}-logo"><img id="f5" alt="" style="display: none" /></div>
            <div class="${P}-mask"><span id="f0" class="${P}-name">${value(0, 'TEAM LIQUID')}</span></div>
          </div>
          <div class="${P}-head-side" data-side="B">
            <div class="${P}-logo"><img id="f6" alt="" style="display: none" /></div>
            <div class="${P}-mask"><span id="f1" class="${P}-name">${value(1, 'NAVI')}</span></div>
          </div>
        </div>
      </div>
      <!-- The accent rule between the two sides and their figures. -->
      <div class="${P}-accent"></div>
      <!-- The body: one comparison row per line of the source, with measured bars. -->
      <div class="${P}-body" id="${P}-rows"></div>
    </div>
${hiddenSource('f3', H2H_FIELDS[3].value, 'Comparison source (f3) — one "Stat | A | B" per line.')}
${hiddenSource('f4', '', 'The highlighted side (f4) — DATA, applied by the highlight event.')}`;
}

/**
 * The head-to-head runtime. compRebuild is DATA (the rows the operator typed, plus the bar
 * shares measured from their figures); applyLeader / clearLeader are STATE EFFECTS.
 */
export const H2H_RUNTIME_JS = `${ESCAPE_HTML_JS}

// compRebuild(): parse the hidden #f3 source (one "Stat | A | B" per line) and rebuild the
// comparison rows. When both figures are numbers, each side's bar gets its SHARE of the pair
// as a data-value — the percentage is the operator's data, so the growth is measured at play
// time (compBarsGrow) rather than written down as a keyframe.
function compRebuild() {
  var host = document.getElementById('${P}-rows');
  if (!host) return;
  var source = (document.getElementById('f3') || { textContent: '' }).textContent;
  var html = '';
  source.split('\\n').forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var parts = line.split('|');
    var label = (parts[0] || '').trim();
    var a = (parts[1] || '').trim();
    var b = (parts[2] || '').trim();
    if (label === '' || a === '' || b === '') return;   // a half-typed row is skipped, not guessed
    var na = parseFloat(a.replace(/,/g, ''));
    var nb = parseFloat(b.replace(/,/g, ''));
    var shareA = 50, shareB = 50;                  // non-numeric rows split the bar evenly
    if (!isNaN(na) && !isNaN(nb) && (na + nb) > 0) {
      shareA = Math.round((na / (na + nb)) * 100);
      shareB = 100 - shareA;
    }
    var leadA = !isNaN(na) && !isNaN(nb) && na > nb ? ' ${P}-row-lead' : '';
    var leadB = !isNaN(na) && !isNaN(nb) && nb > na ? ' ${P}-row-lead' : '';
    html += '<div class="${P}-row">'
          +   '<span class="${P}-row-value ${P}-row-a' + leadA + '">' + escapeHtml(a) + '</span>'
          +   '<div class="${P}-row-middle">'
          +     '<span class="${P}-row-label">' + escapeHtml(label) + '</span>'
          +     '<div class="${P}-row-bars">'
          +       '<div class="${P}-row-track ${P}-row-track-a"><div class="${P}-row-fill" data-value="' + shareA + '" style="width: ' + shareA + '%"></div></div>'
          +       '<div class="${P}-row-track ${P}-row-track-b"><div class="${P}-row-fill" data-value="' + shareB + '" style="width: ' + shareB + '%"></div></div>'
          +     '</div>'
          +   '</div>'
          +   '<span class="${P}-row-value ${P}-row-b' + leadB + '">' + escapeHtml(b) + '</span>'
          + '</div>';
  });
  host.innerHTML = html;
}

// clearLeader(): both sides back to level.
function clearLeader() {
  var root = document.querySelector('.${P}');
  if (root) root.classList.remove('${P}-lead-a', '${P}-lead-b');
}

// applyLeader(): dim the other side and lift the highlighted one. Which side it is rides in
// as the event's payload, so the highlight and the value it means arrive together.
function applyLeader() {
  var picked = String((document.getElementById('f4') || { textContent: '' }).textContent).trim().toUpperCase();
  clearLeader();
  var root = document.querySelector('.${P}');
  if (!root || (picked !== 'A' && picked !== 'B')) return;
  root.classList.add(picked === 'A' ? '${P}-lead-a' : '${P}-lead-b');
  gsap.fromTo('.${P}-head-side[data-side="' + picked + '"]',
    { scale: 1.04 },
    { scale: 1, duration: 0.4 / motionSpeed(), ease: 'back.out(1.7)' }
  );
}

// compClearMarks(): play()'s visual reset — a level comparison, whatever the last run showed.
function compClearMarks() {
  clearLeader();
}

${READY_GUARD_JS}`;

/** The head-to-head's shared LAYOUT. */
export function h2hStructureCss(): string {
  return `/* ── The head-to-head's layout (shared by every design of the type). ── */

/* The accent is a RULE in the flow between the two sides and their figures — a title that
   wraps must not end up underlined through the middle. */
.${P}-accent {
  width: 62%;
  margin-top: calc(22px * var(--scale));
  flex-shrink: 0;
}

.${P}-head {
  display: flex;                   /* the title over the two sides */
  flex-direction: column;
  align-items: center;
  gap: calc(18px * var(--scale));
  width: 100%;
}

.${P}-head-sides {
  display: flex;                   /* the two sides, mirrored around the middle */
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: calc(60px * var(--scale));
}

.${P}-head-side {
  display: flex;                   /* crest above name */
  flex-direction: column;
  align-items: center;
  gap: calc(10px * var(--scale));
  width: 32%;
  min-width: 0;
  text-align: center;
  will-change: transform, opacity;
}

.${P}-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(90px * var(--scale));
  height: calc(90px * var(--scale));
}
.${P}-logo img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.${P}-body {
  display: flex;                   /* one comparison row per stat… */
  flex-direction: column;          /* …stacked */
  gap: calc(22px * var(--scale));  /* rows need real air: each carries a label AND its bars */
  width: 74%;                      /* the comparison keeps a measure, whatever the frame */
  margin-top: calc(26px * var(--scale));
}

/* One row: side A's figure, the label and its two bars, side B's figure. */
.${P}-row {
  display: flex;
  align-items: center;
  gap: calc(18px * var(--scale));
  will-change: transform, opacity; /* the cascade moves each row */
}

.${P}-row-value {
  width: calc(120px * var(--scale));
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;  /* figures line up down both columns */
}
.${P}-row-a { text-align: right; }
.${P}-row-b { text-align: left; }

.${P}-row-middle {
  flex: 1;                         /* the label and bars take the slack */
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(6px * var(--scale));
}

.${P}-row-bars {
  display: flex;                   /* the two tracks meet in the middle */
  align-items: center;
  width: 100%;
  gap: calc(6px * var(--scale));
}

.${P}-row-track {
  flex: 1;                         /* each side owns half the width */
  height: calc(6px * var(--scale));
  overflow: hidden;                /* the fill never paints past its track */
}

/* Side A's bar grows leftward from the middle, side B's rightward. */
.${P}-row-track-a { display: flex; justify-content: flex-end; }
.${P}-row-fill { height: 100%; }`;
}

// ── The player / team card ───────────────────────────────────────────────────

export const PLAYER_FIELDS: TypeField[] = [
  { key: 'name', label: 'Name', kind: 'text', value: 'S1MPLE', role: 'line' },
  { key: 'role', label: 'Role / team', kind: 'text', value: 'AWPER · NAVI', role: 'line' },
  { key: 'tagline', label: 'Tagline', kind: 'text', value: 'PLAYER OF THE SERIES', role: 'line' },
  {
    key: 'stats',
    label: 'Stats (one per line: "Label | value")',
    kind: 'lines',
    value: 'RATING | 1.34\nKILLS | 97\nADR | 88.4\nHS % | 61',
    role: 'data',
  },
  { key: 'portrait', label: 'Portrait', kind: 'image', value: '', role: 'data' },
  { key: 'crest', label: 'Team logo', kind: 'image', value: '', role: 'data' },
];

/** The player card's markup — the stat rows are rebuilt from the source field. */
export function playerMarkup(o: ResolvedOptions): string {
  const value = (i: number, fallback: string) => o.lines[i]?.sample ?? fallback;
  return `    <div class="${P}-box">
      <!-- The accent flourish behind the card. -->
      <div class="${P}-accent"></div>
      <!-- The head: portrait, name, role, and the crest. -->
      <div class="${P}-head">
        <div class="${P}-portrait"><img id="f4" alt="" style="display: none" /></div>
        <div class="${P}-identity">
          <span class="${P}-tagline" id="f2">${value(2, 'PLAYER OF THE SERIES')}</span>
          <div class="${P}-mask"><span id="f0" class="${P}-name">${value(0, 'S1MPLE')}</span></div>
          <div class="${P}-mask"><span id="f1" class="${P}-role">${value(1, 'AWPER · NAVI')}</span></div>
          <div class="${P}-logo"><img id="f5" alt="" style="display: none" /></div>
        </div>
      </div>
      <!-- The body: the stat block, revealed on the Continue press. -->
      <div class="${P}-body" id="${P}-rows"></div>
    </div>
${hiddenSource('f3', PLAYER_FIELDS[3].value, 'Stat source (f3) — one "Label | value" per line.')}`;
}

/**
 * The player card runtime. compRebuild is DATA; revealStats is the Continue STEP's call and
 * markMvp / clearMvp are the branch's, so the operator's flourish is a real state and not a
 * class toggled from nowhere.
 */
export const PLAYER_RUNTIME_JS = `${ESCAPE_HTML_JS}

// compRebuild(): parse the hidden #f3 source (one "Label | value" per line) and rebuild the
// stat block. The stats start HIDDEN — they are the Continue press's reveal, and a card that
// showed them before the press would give the moment away.
function compRebuild() {
  var host = document.getElementById('${P}-rows');
  if (!host) return;
  var source = (document.getElementById('f3') || { textContent: '' }).textContent;
  var html = '';
  source.split('\\n').forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;
    var split = line.indexOf('|');
    if (split === -1) return;                      // no pipe: not a "Label | value" line
    var label = line.slice(0, split).trim();
    var value = line.slice(split + 1).trim();
    if (label === '' || value === '') return;
    html += '<div class="${P}-stat">'
          +   '<span class="${P}-stat-value">' + escapeHtml(value) + '</span>'
          +   '<span class="${P}-stat-label">' + escapeHtml(label) + '</span>'
          + '</div>';
  });
  host.innerHTML = html;
}

// revealStats(): the Continue press. The stat block arrives one figure at a time — how many
// there are is the operator's data, so the stagger is measured here rather than keyframed.
function revealStats() {
  var host = document.getElementById('${P}-rows');
  if (!host) return;
  var root = document.querySelector('.${P}');
  if (root) root.classList.add('${P}-stats-shown');
  var stats = Array.prototype.slice.call(host.children);
  if (stats.length === 0) return;
  gsap.fromTo(stats,
    { y: 18, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.4 / motionSpeed(),
      ease: 'power3.out',
      stagger: Math.min(0.1, 0.8 / stats.length) / motionSpeed()
    }
  );
}

// markMvp() / clearMvp(): the flourish. Its own branch state, so the control page can offer it
// as a button and the graph shows it as an arrow — not a class toggled from nowhere.
function markMvp() {
  var root = document.querySelector('.${P}');
  if (!root) return;
  root.classList.add('${P}-mvp');
  gsap.fromTo('.${P}-tagline', { scale: 1.08 }, { scale: 1, duration: 0.45 / motionSpeed(), ease: 'back.out(1.9)' });
}

function clearMvp() {
  var root = document.querySelector('.${P}');
  if (root) root.classList.remove('${P}-mvp');
}

// compClearMarks(): play()'s visual reset — stats hidden again, no flourish, ready to replay.
function compClearMarks() {
  var root = document.querySelector('.${P}');
  if (!root) return;
  root.classList.remove('${P}-mvp', '${P}-stats-shown');
}

${READY_GUARD_JS}`;

/** The player card's shared LAYOUT. */
export function playerStructureCss(): string {
  return `/* ── The player card's layout (shared by every design of the type). ── */
.${P}-head {
  display: flex;                   /* portrait beside the identity block */
  align-items: center;
  gap: calc(34px * var(--scale));
}

.${P}-portrait {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(260px * var(--scale));
  height: calc(300px * var(--scale));
  overflow: hidden;                /* a tall portrait is cropped, never distorted */
  flex-shrink: 0;
}
.${P}-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;               /* fills the slot, keeping the subject's proportions */
}

.${P}-identity {
  display: flex;                   /* tagline, name, role, crest — stacked */
  flex-direction: column;
  align-items: flex-start;
  gap: calc(8px * var(--scale));
  min-width: 0;
}

.${P}-logo {
  display: flex;
  align-items: center;
  width: calc(64px * var(--scale));
  height: calc(64px * var(--scale));
  margin-top: calc(8px * var(--scale));
}
.${P}-logo img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.${P}-body {
  display: flex;                   /* the stats in a row of figures */
  align-items: flex-start;
  gap: calc(40px * var(--scale));
  margin-top: calc(26px * var(--scale));
  /* The stat block lines up under the IDENTITY column, not under the portrait — the head is
     portrait + identity, so the block is indented past the portrait's width and gap. */
  padding-left: calc(294px * var(--scale));
}

/* The stats themselves are hidden until the Continue press reveals them — on the STAT, not
   on the block: the entrance animates the block, so hiding that would fight the preset (and
   a replay rebuilds the rows, which is what clears the inline styles the reveal leaves). */
.${P}-stat {
  display: flex;                   /* the figure over its label */
  flex-direction: column;
  align-items: flex-start;
  gap: calc(2px * var(--scale));
  opacity: 0;                      /* the reveal is the press's job */
  will-change: transform, opacity; /* the reveal staggers them */
}
.${P}-stats-shown .${P}-stat {
  opacity: 1;                      /* after the press, the block stays up */
}`;
}

// ── The authoring API ────────────────────────────────────────────────────────

/** Define one match-up-category variant (any of its three types). */
export function defineMatchupVariant(
  spec: Omit<TemplateVariant, 'create'>,
  meta: CompMeta,
  buildDesign: (o: ResolvedOptions) => CompDesign,
  refine?: (o: ResolvedOptions) => ((data: AnimData) => AnimData) | undefined,
): TemplateVariant {
  return defineCompetitionVariant(MATCHUP_CATEGORY, spec, meta, buildDesign, refine);
}
