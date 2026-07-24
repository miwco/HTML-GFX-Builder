// The data-driven infographic rebuild runtimes, shared across every design of a type.
//
// A schedule board (the agenda type) and a bar chart (the poll type) each render their rows
// from a hidden textarea source the operator types into — and that rendering is identical for
// every style a type ships in: only the CSS differs between a house schedule board and a glass
// one. So the rebuild lives here, once, and each design passes it as its `runtimeExtraJs`.
//
// The emitted strings are exactly what ig06 and ig02 authored inline before this module
// existed, so extracting them moved no template's output — the catalog baseline holds.

/** The schedule-board rebuild: renders "time | show" rows into #infographic-rows.
 *  Structure per row: .infographic-row > .infographic-time · .infographic-dot · .infographic-show. */
export function scheduleRowsRuntimeJs(): string {
  return `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so input like "Movies <18" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "time | show" per line)
// and rebuild the #infographic-rows schedule. Only the FIRST pipe splits the line, so a show
// name may itself contain a "|". Lines without both parts are skipped, like ig02.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.indexOf('|');                 // first pipe only — shows may contain one
    if (split === -1) return;                      // no pipe: not a "time | show" line
    var time = line.slice(0, split).trim();
    var show = line.slice(split + 1).trim();
    if (time === '' || show === '') return;        // skip half-empty rows
    html += '<div class="infographic-row">'
          +   '<span class="infographic-time">' + escapeHtml(time) + '</span>'
          +   '<span class="infographic-dot"></span>'
          +   '<span class="infographic-show">' + escapeHtml(show) + '</span>'
          + '</div>';
  });
  rows.innerHTML = html;
}

// Render once on load so the preview shows the board before the first update().
// This file loads in <head>, before the board elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

/** Number helpers shared by the goal and milestone runtimes — the same tolerant parse and the
 *  same thousand-grouping ig05 authored inline, so every figure in the pack reads alike. */
const NUMBER_HELPERS_JS = `// parseIgNumber(): read the number out of operator text — tolerant of the currency marks
// and thousand separators people paste in ("€124,213" -> 124213).
function parseIgNumber(text) {
  var n = parseFloat(String(text).replace(/[^0-9.+-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// formatThousands(): 124213 -> "124,213" — broadcast figures always group digits.
function formatThousands(n) {
  return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
}`;

/**
 * The GOAL-METER rebuild, in its two drawn shapes.
 *
 * A goal meter is two numbers and everything else is derived: the operator types what has been
 * raised (#f0) and what the target is (the hidden #f1 source), and the graphic works out the
 * share, the formatted figures and the caption. Both fields stay PLAIN NUMBERS on purpose — a
 * currency mark typed into them would defeat the count-up's parse — so the unit is its own
 * field (#f3), rendered as a separate element beside the figure and hidden by `:empty` when
 * the goal is measured in subscribers rather than money.
 *
 * `shape` picks where the share is written: `bar` puts it on the progress fill's data-value
 * (the 'count-up' preset grows it), `ring` puts it on the SVG ring's (the 'goal-ring' preset
 * draws it). Everything else is identical, which is the point — a bar goal and a ring goal are
 * one graphic drawn two ways, not two graphics.
 */
export function goalRuntimeJs(shape: 'bar' | 'ring'): string {
  const writeShare =
    shape === 'bar'
      ? `  // Progress: the fill is rendered AT its value so an on-air update() shows fresh data at
  // once; on play() the 'count-up' preset empties it and grows it back to data-value.
  var fill = document.querySelector('.infographic-bar-fill');
  if (fill) {
    fill.setAttribute('data-value', percent);
    fill.style.width = percent + '%';
  }`
      : `  // Progress: the ring carries its OWN percent (raised/goal) — never the raised figure,
  // which is money and would clamp to a full ring. The 'goal-ring' preset reads it here.
  var ring = document.querySelector('.infographic-ring-fill');
  if (ring) {
    ring.setAttribute('data-value', percent);
    ring.style.strokeDashoffset = (100 - percent);
  }`;

  return `${NUMBER_HELPERS_JS}

// rebuildInfographic(): read the raised total (#f0) and the hidden goal (#f1), then derive
// everything the panel shows — the grouped figure, the share of the goal, the "of <goal>"
// caption, and the percent readout. Read from data-target where it exists: update() keeps it
// current, while the count-up preset rewrites the live textContent mid-count ("0", "43,207"…).
function rebuildInfographic() {
  var raisedEl = document.getElementById('f0');
  var goalEl = document.getElementById('f1');
  if (!raisedEl || !goalEl) return;
  var raised = parseIgNumber(raisedEl.getAttribute('data-target') || raisedEl.textContent);
  var goal = parseIgNumber(goalEl.getAttribute('data-target') || goalEl.textContent);
  var unitEl = document.getElementById('f3');
  var unit = unitEl ? unitEl.textContent.trim() : '';

  // The displayed total is always grouped; data-target holds the same text so the count-up
  // counts to it and restores exactly this formatting when it lands.
  var raisedText = formatThousands(raised);
  raisedEl.textContent = raisedText;
  raisedEl.setAttribute('data-target', raisedText);

  // The share, clamped to the 0-100 the drawn track can express. The FIGURES above are never
  // clamped: an appeal that passes its target must still show what it actually raised.
  var percent = goal > 0 ? Math.max(0, Math.min(100, (raised / goal) * 100)) : 0;

${writeShare}

  // The caption under the meter: what the target is, in the operator's own unit.
  var goalLine = document.getElementById('infographic-goal-line');
  if (goalLine) goalLine.textContent = 'of ' + unit + formatThousands(goal);

  // The percent readout — rounded, because a goal meter showing 43.7% reads as noise.
  var readout = document.getElementById('infographic-percent');
  if (readout) readout.textContent = Math.round(percent) + '%';
}

// Render once on load so the preview shows real figures before the first update().
// This file loads in <head>, before the panel elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

/**
 * The MILESTONE-TRACK rebuild: "Label | target" lines become evenly spaced nodes on a track,
 * with the ones already passed marked `.is-reached` and a progress line run out to where the
 * current figure sits between them.
 *
 * THE ONE THING WORTH KNOWING ABOUT THE GEOMETRY, because it is a truthfulness decision:
 * the nodes are spaced EVENLY, not in proportion to their targets. A tier track whose nodes sat
 * at target/max would bunch four milestones into the last fifth of the rail the moment someone
 * set a stretch goal, and the labels would collide. So the rail is read as "milestone 1 → 2 →
 * 3 → 4" and the progress line is interpolated BETWEEN THE NODES: at exactly milestone 2 the
 * line stops exactly on node 2, and between two milestones it sits proportionally between
 * them. That is what the drawn layout claims, so it is what the line does — the alternative
 * (a line at raised/max over evenly spaced nodes) would draw a position that means nothing.
 */
export function milestoneRuntimeJs(): string {
  return `${NUMBER_HELPERS_JS}

// escapeHtml(): the nodes below are built with innerHTML — operator text is escaped first so
// input like "1,000 & rising" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "Label | target" per line) into the
// milestone columns, mark the ones the current figure (#f1) has passed, and set the progress
// line's percent. See milestoneRuntimeJs()'s comment for why the nodes are evenly spaced and
// the line is interpolated between them rather than plotted at current/max.
function rebuildInfographic() {
  var track = document.getElementById('infographic-nodes');
  var sourceEl = document.getElementById('f0');
  var currentEl = document.getElementById('f1');
  if (!track || !sourceEl || !currentEl) return;
  var current = parseIgNumber(currentEl.getAttribute('data-target') || currentEl.textContent);

  // Parse "Label | target" lines. Only the FIRST pipe splits, so a label may contain one.
  var stops = [];
  sourceEl.textContent.split('\\n').forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var split = line.indexOf('|');
    if (split === -1) return;                      // no pipe: not a "Label | target" line
    var label = line.slice(0, split).trim();
    var targetText = line.slice(split + 1).trim();
    var target = parseFloat(targetText.replace(/[^0-9.+-]/g, ''));
    if (label === '' || isNaN(target)) return;     // skip lines without a label or a number
    stops.push({ label: label, targetText: targetText, target: target });
  });

  // Even spacing: node i sits at the centre of its own column, so n nodes never bunch up.
  var n = stops.length;
  var positionAt = function (i) { return ((i + 0.5) / n) * 100; };

  var html = '';
  for (var i = 0; i < n; i++) {
    var reached = current >= stops[i].target;
    html += '<div class="infographic-node' + (reached ? ' is-reached' : '') + '"'
          +      ' data-at="' + positionAt(i).toFixed(2) + '">'
          +   '<span class="infographic-node-dot"></span>'
          +   '<span class="infographic-node-target">' + escapeHtml(stops[i].targetText) + '</span>'
          +   '<span class="infographic-node-label">' + escapeHtml(stops[i].label) + '</span>'
          + '</div>';
  }
  track.innerHTML = html;

  // Where the line stops: on a node when that milestone is exactly met, proportionally
  // between two when the figure sits between them, at the last node once they are all passed.
  var percent = 0;
  if (n > 0) {
    var passed = -1;
    for (var k = 0; k < n; k++) { if (current >= stops[k].target) passed = k; }
    if (passed === -1) {
      // Before the first milestone: run out of the rail's start toward node 1.
      var first = stops[0].target;
      percent = first > 0 ? positionAt(0) * Math.max(0, Math.min(1, current / first)) : 0;
    } else if (passed === n - 1) {
      percent = positionAt(n - 1);                 // every milestone met — the line rests on the last
    } else {
      var span = stops[passed + 1].target - stops[passed].target;
      var into = span > 0 ? (current - stops[passed].target) / span : 0;
      percent = positionAt(passed) + (positionAt(passed + 1) - positionAt(passed)) * Math.max(0, Math.min(1, into));
    }
  }

  // The fill is rendered AT its value so an on-air update() shows fresh data at once; on
  // play() the 'milestone-run' preset empties it and runs it back out.
  var fill = document.querySelector('.infographic-milestone-fill');
  if (fill) {
    fill.setAttribute('data-value', percent.toFixed(2));
    fill.style.width = percent.toFixed(2) + '%';
  }

  // The readout: the current figure, grouped, and how many milestones are behind it.
  var readout = document.getElementById('infographic-current');
  if (readout) readout.textContent = formatThousands(current);
  var counter = document.getElementById('infographic-reached');
  if (counter) {
    var done = 0;
    for (var j = 0; j < n; j++) { if (current >= stops[j].target) done++; }
    counter.textContent = done + ' / ' + n;
  }
}

// Render once on load so the preview shows the track before the first update().
// This file loads in <head>, before the track elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}

/** The bar-chart rebuild: renders "Label | value" rows into #infographic-bars.
 *  Structure per row: .infographic-row > .infographic-bar-head (label + value) + .infographic-bar-track > .infographic-bar-fill. */
export function barsRuntimeJs(): string {
  return `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so input like "Latency <500ms" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "Label | value" per line)
// and rebuild the #infographic-bars rows. Each fill is rendered already at its value so an
// on-air update() shows fresh data at once; on play() the 'bars-grow' preset resets
// the fills to 0 and grows each one back to its data-value percent.
function rebuildInfographic() {
  var bars = document.getElementById('infographic-bars');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                       // skip blank lines
    var parts = line.split('|');
    var label = parts[0].trim();
    var valueText = (parts[1] || '').trim();       // the figure exactly as the operator typed it
    var value = parseFloat(valueText);             // NaN when the value part is missing
    if (label === '' || isNaN(value)) return;      // skip lines without a label or a number
    var fill = Math.max(0, Math.min(100, value));  // clamp only the DRAWN fill to the 0-100 track
    html += '<div class="infographic-row">'
          +   '<div class="infographic-bar-head">'
          +     '<span class="infographic-bar-label">' + escapeHtml(label) + '</span>'
          +     '<span class="infographic-bar-value">' + escapeHtml(valueText) + '</span>'  // show the typed figure, never a silently altered one
          +   '</div>'
          +   '<div class="infographic-bar-track">'
          +     '<div class="infographic-bar-fill" data-value="' + fill + '" style="width: ' + fill + '%"></div>'
          +   '</div>'
          + '</div>';
  });
  bars.innerHTML = html;
}

// Render once on load so the preview shows the chart before the first update().
// This file loads in <head>, before the chart elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`;
}
