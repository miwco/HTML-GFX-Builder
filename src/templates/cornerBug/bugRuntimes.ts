// Design-owned runtimes for the two corner-bug designs that DO something beyond sitting
// still: the live-status swap and the sponsor rotation.
//
// Both are emitted OUTSIDE the marked ANIMATION region (StandardDesign.runtimeExtraJs), the
// same doctrine as bug02's clock and the category motion runtimes: a preset swap in the
// Motion panel rewrites the region and can never touch this code, and it survives the data
// conversion and every export untouched.
//
// The state machine reaches them by NAME — a step/branch `call` is a bare identifier the
// interpreter fires through window[name] (blocks/animData.ts), never eval'd code. So the
// function names below are the contract the types in templates/types/identityBugs.ts declare.

/**
 * The live-status runtime. The machine calls one of the three entry points; each reads its own
 * operator-editable label field and paints it into the visible status element, then re-tags the
 * root so the CSS can recolour the bug.
 *
 * The label ids are passed in because a design's field numbering depends on how many text
 * lines the wizard emitted — the same reason every logo slot computes its own `fN`.
 */
export function liveStatusJs(ids: { status: string; live: string; replay: string; standby: string }): string {
  return `// ── Live status ─────────────────────────────────────────────────────────────
// Three words, one element. The operator's Live / Replay / Standby buttons dispatch the
// machine events; the machine calls one of these, which copies that mode's label (its own
// SPX field, so the wording is editable) into the visible status element and re-tags the
// graphic so the CSS can recolour it.
function setBugStatus(sourceId, mode) {
  var out = document.getElementById('${ids.status}');
  var source = document.getElementById(sourceId);
  if (!out || !source) return;
  out.textContent = source.textContent;   // the word the operator typed for this mode
  var root = document.querySelector('.corner-bug');
  if (!root) return;
  root.classList.remove('is-live', 'is-replay', 'is-standby');
  root.classList.add('is-' + mode);       // the CSS colours the dot and the chip from this
}

function bugStatusLive() { setBugStatus('${ids.live}', 'live'); }
function bugStatusReplay() { setBugStatus('${ids.replay}', 'replay'); }
function bugStatusStandby() { setBugStatus('${ids.standby}', 'standby'); }`;
}

/**
 * The sponsor-rotation runtime. One slot shows at a time; the machine's timer calls
 * `sponsorShowNext` at the midpoint of a crossfade, so the swap happens while nothing is
 * visible.
 *
 * EMPTY SLOTS ARE SKIPPED. A sponsor bug is usually filled in one at a time, and rotating
 * onto an unfilled slot would blank the strip for a beat. Until any file is picked, the
 * rotation runs over all slots so the design still demonstrates itself in the editor.
 */
export const SPONSOR_ROTATION_JS = `// ── Sponsor rotation ────────────────────────────────────────────────────────
// The slots that actually carry a logo, in document order. setFieldValue puts .has-image on
// a slot the moment the operator picks a file, so this list is always current — no state to
// keep in step, and an empty slot is never rotated onto.
function sponsorSlots() {
  var all = document.querySelectorAll('.corner-bug-media');
  var filled = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].classList.contains('has-image')) filled.push(all[i]);
  }
  // Nothing picked yet (a fresh project): rotate the placeholders so the graphic still reads.
  return filled.length > 0 ? filled : Array.prototype.slice.call(all);
}

var sponsorIndex = 0;              // which slot is on screen

// Show exactly one slot. The index wraps, so the rotation is endless by construction.
function sponsorShow(index) {
  var slots = sponsorSlots();
  if (slots.length === 0) return;
  sponsorIndex = ((index % slots.length) + slots.length) % slots.length;
  var all = document.querySelectorAll('.corner-bug-media');
  for (var i = 0; i < all.length; i++) all[i].classList.remove('is-showing');
  slots[sponsorIndex].classList.add('is-showing');
}

// The machine's beat: advance one sponsor. Called at the midpoint of the crossfade.
function sponsorShowNext() {
  sponsorShow(sponsorIndex + 1);
}

// Show the first sponsor as soon as the DOM exists (template.js loads in <head> in exports).
function startSponsorRotation() { sponsorShow(0); }
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startSponsorRotation);
} else {
  startSponsorRotation();          // DOM already parsed (e.g. an inline preview build)
}`;
