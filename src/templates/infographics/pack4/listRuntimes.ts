// The list-board rebuild runtimes for the title/topic/information pack's two data boards.
//
// Same contract as dataRuntimes.ts (the schedule board and the bar chart): the operator types
// one row per line into a hidden textarea, a design-owned `rebuildInfographic()` renders the
// rows into `#infographic-rows`, and the shared `rows-cascade` preset measures THAT list to
// build its stagger — so the motion is as long as the content, which is a magnitude no
// keyframe can hold (docs/DYNAMIC_MOTION_SCOPE.md).
//
// One difference from the schedule board, and it is deliberate. The schedule skips a line
// without a pipe, because "20:00" with no programme name is not a schedule row. A FACT and an
// ACTION are different: "New builds must be net zero from 2030" is a complete fact with no term
// in front of it, and "Book the studio" is a complete action with nobody assigned yet. So a
// line with no pipe here renders as the right-hand part alone, and the row still appears.

/** The escape helper both rebuilds share — the rows are built with innerHTML. */
const ESCAPE = `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so input like "Latency <40ms" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}`;

/** Render once on load, before the first update() — template.js loads in <head>. */
const ON_READY = `// Render once on load so the preview shows the board before the first update().
// This file loads in <head>, before the board elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;

/**
 * The KEY FACTS rebuild: one "term | explanation" per line into `#infographic-rows`.
 * Structure per row: .infographic-row > .infographic-fact-term · .infographic-fact-note.
 */
export function factRowsRuntimeJs(): string {
  return `${ESCAPE}

// rebuildInfographic(): parse the hidden #f0 source (one "term | explanation" per line) and
// rebuild the #infographic-rows fact list. Only the FIRST pipe splits the line, so an
// explanation may itself contain one. A line with NO pipe is a fact with no term in front of
// it — it still renders, as the explanation alone.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.indexOf('|');                 // first pipe only
    var term = split === -1 ? '' : line.slice(0, split).trim();
    var note = split === -1 ? line : line.slice(split + 1).trim();
    if (note === '' && term === '') return;        // nothing to show
    html += '<div class="infographic-row">'
          +   (term === '' ? '' : '<span class="infographic-fact-term">' + escapeHtml(term) + '</span>')
          +   '<span class="infographic-fact-note">' + escapeHtml(note || term) + '</span>'
          + '</div>';
  });
  rows.innerHTML = html;
}

${ON_READY}`;
}

/**
 * The RECAP / ACTION ITEMS rebuild: one "owner | action" per line into `#infographic-rows`.
 * Structure per row: .infographic-row > .infographic-owner · .infographic-action.
 */
export function recapRowsRuntimeJs(): string {
  return `${ESCAPE}

// rebuildInfographic(): parse the hidden #f0 source (one "owner | action" per line) and rebuild
// the #infographic-rows list. Only the FIRST pipe splits the line. A line with NO pipe is an
// action nobody has been assigned yet — it renders without an owner chip rather than vanishing,
// because a recap that silently drops unassigned items is worse than useless.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.indexOf('|');                 // first pipe only
    var owner = split === -1 ? '' : line.slice(0, split).trim();
    var action = split === -1 ? line : line.slice(split + 1).trim();
    if (action === '') return;                     // an owner with no action is not an item
    html += '<div class="infographic-row">'
          +   (owner === '' ? '' : '<span class="infographic-owner">' + escapeHtml(owner) + '</span>')
          +   '<span class="infographic-action">' + escapeHtml(action) + '</span>'
          + '</div>';
  });
  rows.innerHTML = html;
}

${ON_READY}`;
}
