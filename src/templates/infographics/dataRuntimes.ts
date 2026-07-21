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
