// The shared countdown-clock runtime, used by the starting-soon and game-timer categories.
// It emits teachable ES5 that lives OUTSIDE the marked ANIMATION region (it is playout
// logic, not motion): the animation presets only call startClock() / stopClock().
//
// Contract with the design:
//   - a hidden <div id="fN" style="display:none"> holds the duration in whole minutes
//     (decimals allowed: "0.5" is thirty seconds) — SPX writes into it like any field
//   - a .{prefix}-clock element displays the time as M:SS
//   - when the clock hits zero the root gets a .{prefix}-done class, so the design's CSS
//     can flash, recolor, or swap text without any extra JS

/** Emit the clock runtime functions for a category (prefix) and its duration field. */
export function clockRuntimeJs(prefix: string, minutesFieldId: string): string {
  return `// ── Countdown clock ─────────────────────────────────────────────────────
// The duration lives in the hidden #${minutesFieldId} field (whole minutes; "0.5" = 30 s).
// startClock()/stopClock() are called by the animation preset below.
var clockTimer = null;        // the 1-second interval while the clock runs
var clockSecondsLeft = 0;     // what renderClock() paints

// How many seconds the operator asked for.
function clockDurationSeconds() {
  var minutes = parseFloat(document.getElementById('${minutesFieldId}').textContent) || 5;
  return Math.max(1, Math.round(minutes * 60));
}

// Paint the remaining time as M:SS into the clock element.
function renderClock() {
  var m = Math.floor(clockSecondsLeft / 60);
  var s = clockSecondsLeft % 60;
  document.querySelector('.${prefix}-clock').textContent = m + ':' + (s < 10 ? '0' + s : s);
}

// Reset to the full duration and tick down once a second.
function startClock() {
  stopClock();
  document.querySelector('.${prefix}').classList.remove('${prefix}-done');
  clockSecondsLeft = clockDurationSeconds();
  renderClock();
  clockTimer = setInterval(function () {
    clockSecondsLeft = clockSecondsLeft - 1;
    if (clockSecondsLeft <= 0) {
      clockSecondsLeft = 0;
      stopClock();
      // Zero reached — the design's CSS decides what "time's up" looks like.
      document.querySelector('.${prefix}').classList.add('${prefix}-done');
    }
    renderClock();
  }, 1000);
}

function stopClock() {
  if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
}

// Show the full duration on load (before the first play()), so previews look right.
// This file loads in <head>, before the clock elements exist — wait for the DOM.
function paintIdleClock() {
  clockSecondsLeft = clockDurationSeconds();
  renderClock();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', paintIdleClock);
} else {
  paintIdleClock();               // DOM already parsed (e.g. an inline preview build)
}`;
}
