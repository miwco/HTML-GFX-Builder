// The in-document render runtime — a virtual clock + the __noacgRender API, injected into
// the render document BEFORE GSAP (composeRenderDocument owns the order).
//
// Why a virtual clock: a frame must be a pure function of (document, data, schedule, epoch,
// frame number) — never of rAF timing, CPU speed, or the wall clock. Instead of parking
// rebuilt timelines with callbacks suppressed (the editor-scrub trick, which freezes
// count-ups and tl.call clocks mid-animation), we let the graphic execute its REAL
// lifecycle — update() → play() → next()× → stop() — against a clock we own: Date,
// performance.now, setTimeout/setInterval and requestAnimationFrame are all virtualized,
// GSAP's ticker is detached (a snippet after GSAP loads runs gsap.ticker.remove(gsap.updateRoot)),
// and seek(t) advances time in frame quanta, firing due timers at their exact deadlines and
// driving gsap.updateRoot(t) — the same granularity a live rAF ticker gives, minus the jitter.
//
// Plain commented ES5, no dependencies — the same house style as the emitted template
// runtimes. Exported as a string so the app (composeRenderDocument) ships it; render-worker
// never needs it directly (it arrives inside documentHtml).

import { RENDER_RUNTIME_VERSION } from './manifest';

export const RENDER_RUNTIME_JS = `// ---- NoaCG render runtime: virtual clock + __noacgRender (generated) ----
(function () {
  var vNow = 0;            // virtual ms since output t=0
  var epochMs = 0;         // virtual wall clock at t=0 (Date.now() === epochMs + vNow)
  var fps = 50;
  var started = false;     // t=0 cues fire on the first seek
  var seq = 0;             // registration order breaks deadline ties (update before play)
  var timers = [];         // pending { id, deadline, fn, args, intervalMs, seq }
  var rafQ = [];           // pending { id, fn }
  var nextTimerId = 1;
  var nextRafId = 1;
  var errors = [];
  var RealDate = Date;

  function report(msg) { errors.push(String(msg)); }
  window.addEventListener('error', function (ev) { report(ev.message || ev.error); });
  window.addEventListener('unhandledrejection', function (ev) { report(ev.reason); });

  // ---- Virtual Date: no-arg construction and now() read the virtual clock; explicit
  // arguments pass through untouched. instanceof Date keeps working (shared prototype).
  function VirtualDate() {
    if (arguments.length === 0) return new RealDate(epochMs + vNow);
    var args = [null].concat(Array.prototype.slice.call(arguments));
    return new (Function.prototype.bind.apply(RealDate, args))();
  }
  VirtualDate.now = function () { return epochMs + vNow; };
  VirtualDate.parse = RealDate.parse;
  VirtualDate.UTC = RealDate.UTC;
  VirtualDate.prototype = RealDate.prototype;
  window.Date = VirtualDate;

  try { window.performance.now = function () { return vNow; }; } catch (e) {}

  // ---- Virtual timers. Delays clamp to >= 1 ms so zero-delay chains advance time
  // (live browsers clamp too) instead of looping forever inside one quantum.
  window.setTimeout = function (fn, delay) {
    var args = Array.prototype.slice.call(arguments, 2);
    var id = nextTimerId++;
    if (typeof fn !== 'function') return id; // string form unsupported (house code never uses it)
    timers.push({ id: id, deadline: vNow + Math.max(1, Number(delay) || 0), fn: fn, args: args, intervalMs: null, seq: seq++ });
    return id;
  };
  window.setInterval = function (fn, delay) {
    var args = Array.prototype.slice.call(arguments, 2);
    var id = nextTimerId++;
    if (typeof fn !== 'function') return id;
    var every = Math.max(1, Number(delay) || 0);
    timers.push({ id: id, deadline: vNow + every, fn: fn, args: args, intervalMs: every, seq: seq++ });
    return id;
  };
  function clearTimer(id) {
    for (var i = 0; i < timers.length; i++) if (timers[i].id === id) { timers.splice(i, 1); return; }
  }
  window.clearTimeout = clearTimer;
  window.clearInterval = clearTimer;

  window.requestAnimationFrame = function (fn) {
    var id = nextRafId++;
    rafQ.push({ id: id, fn: fn });
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    for (var i = 0; i < rafQ.length; i++) if (rafQ[i].id === id) { rafQ.splice(i, 1); return; }
  };

  // ---- Network is inert: the document is fully self-contained (assets and fonts ride as
  // data URLs), so anything that still reaches out — a surviving polling block, hand-written
  // fetch — must not introduce nondeterminism or hang a sandboxed render.
  window.fetch = function () { return new Promise(function () {}); }; // never settles
  try { window.XMLHttpRequest.prototype.send = function () {}; } catch (e) {}
  window.WebSocket = function () {
    return { send: function () {}, close: function () {}, addEventListener: function () {}, removeEventListener: function () {} };
  };
  window.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {}, removeEventListener: function () {} };
  };

  // ---- The clock driver ------------------------------------------------------------

  /** Fire every pending timer due at or before \`limit\`, in (deadline, registration) order,
   *  with vNow sitting at each timer's exact deadline while its callback runs. Callbacks may
   *  schedule more timers inside the window — the rescan picks them up. */
  var FIRE_CAP = 20000; // runaway guard (the outer render timeout is the real limit)
  function fireTimersThrough(limit) {
    for (var fired = 0; fired < FIRE_CAP; fired++) {
      var best = -1;
      for (var i = 0; i < timers.length; i++) {
        var t = timers[i];
        if (t.deadline > limit + 1e-6) continue;
        if (best === -1 || t.deadline < timers[best].deadline - 1e-9 ||
            (Math.abs(t.deadline - timers[best].deadline) <= 1e-9 && t.seq < timers[best].seq)) best = i;
      }
      if (best === -1) return;
      var timer = timers[best];
      vNow = Math.max(vNow, timer.deadline);
      if (timer.intervalMs === null) timers.splice(best, 1);
      else { timer.deadline += timer.intervalMs; timer.seq = seq++; }
      try { timer.fn.apply(null, timer.args); } catch (e) { report('timer: ' + (e && e.message)); }
    }
    report('render runtime: timer fire cap reached (runaway setTimeout/setInterval chain?)');
  }

  function flushRaf() {
    var q = rafQ; rafQ = []; // callbacks re-requesting land in the NEXT flush, like real rAF
    for (var i = 0; i < q.length; i++) {
      try { q[i].fn(vNow); } catch (e) { report('raf: ' + (e && e.message)); }
    }
  }

  function tick() {
    flushRaf();
    if (window.gsap && window.gsap.updateRoot) window.gsap.updateRoot(vNow / 1000);
  }

  /** Advance virtual time to tMs, ticking at every frame boundary on the way (GSAP updates
   *  at frame quanta — the granularity a live rAF ticker gives). Monotonic: the host does a
   *  hard reset (fresh iframe) for backward seeks. */
  function advanceTo(tMs) {
    if (tMs < vNow - 0.001) throw new Error('noacg render: backward seek (' + tMs + ' < ' + vNow + ')');
    var frameMs = 1000 / fps;
    if (!started) { started = true; fireTimersThrough(vNow); tick(); } // the t=0 cues
    while (vNow < tMs - 0.001) {
      var boundary = (Math.floor(vNow / frameMs + 1e-6) + 1) * frameMs;
      var next = Math.min(tMs, boundary);
      fireTimersThrough(next);
      vNow = next;
      tick();
    }
  }

  // ---- Asset readiness + measurement ------------------------------------------------

  /** Force-load every declared font face (data-URL faces otherwise load lazily on first
   *  use) and decode every image, so frame 0 never shows a fallback font or a blank img. */
  function loadAssets() {
    var waits = [];
    try {
      if (document.fonts) {
        document.fonts.forEach(function (f) { try { f.load(); } catch (e) {} });
        waits.push(document.fonts.ready);
      }
    } catch (e) {}
    var imgs = document.images;
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i].decode) waits.push(imgs[i].decode()['catch'](function () {}));
    }
    return Promise.all(waits);
  }

  var CONTINUOUS_S = 1e7; // GSAP reports repeat:-1 as a huge duration — treat as endless
  function phaseMs(tl) {
    var s = tl.duration();
    return s >= CONTINUOUS_S ? { ms: 0, continuous: true } : { ms: Math.round(s * 1000), continuous: false };
  }

  /** Snapshot every element's inline style attribute — the pre-probe truth. Restoring
   *  the attribute verbatim is semantics-free and strictly correct, unlike GSAP's
   *  clearProps (which can wipe AUTHORED inline styles — e.g. the display:none data
   *  holders — once a probe tween has touched the element). */
  function snapshotInlineStyles() {
    var all = document.querySelectorAll('*');
    var snap = [];
    for (var i = 0; i < all.length; i++) snap.push([all[i], all[i].getAttribute('style')]);
    return snap;
  }
  function restoreInlineStyles(snap) {
    for (var i = 0; i < snap.length; i++) {
      var el = snap[i][0];
      var s = snap[i][1];
      if (s === null) el.removeAttribute('style');
      else el.setAttribute('style', s);
    }
  }

  /** Return the document to its exact pre-probe inline-style state and rewrite truthful
   *  field values, so measurement leaves no trace on frame 0. */
  function resetDom(dataStr, styleSnap) {
    try { window.gsap.killTweensOf('*'); } catch (e) {}
    try { restoreInlineStyles(styleSnap); } catch (e) {}
    try { if (typeof window.update === 'function') window.update(dataStr); } catch (e) { report('update: ' + (e && e.message)); }
  }

  /** Build each phase once (paused world — the detached ticker never advances anything),
   *  read its real duration, kill it, and reset. Measuring in-page at final resolution is
   *  what makes layout-sized phases (credit rolls, marquees) correct by construction. */
  function measure(dataStr) {
    var m = { inMs: 0, stepMs: [], outMs: 0, continuous: { in: false, out: false },
              hasBuilders: typeof window.buildInTimeline === 'function',
              runtimeVersion: ${RENDER_RUNTIME_VERSION} };
    try { if (typeof window.update === 'function') window.update(dataStr); } catch (e) { report('update: ' + (e && e.message)); }
    if (!m.hasBuilders) return m;
    var styleSnap = snapshotInlineStyles();
    var probes = [];
    try {
      var tlIn = window.buildInTimeline();
      probes.push(tlIn);
      var pIn = phaseMs(tlIn);
      m.inMs = pIn.ms; m.continuous['in'] = pIn.continuous;
      if (typeof window.revealNextStep === 'function') {
        for (var guard = 0; guard < 64; guard++) {
          var st = window.revealNextStep();
          if (!st) break;
          probes.push(st);
          m.stepMs.push(phaseMs(st).ms);
        }
      }
      if (typeof window.buildOutTimeline === 'function') {
        var tlOut = window.buildOutTimeline();
        probes.push(tlOut);
        var pOut = phaseMs(tlOut);
        m.outMs = pOut.ms; m.continuous.out = pOut.continuous;
      }
    } catch (e) { report('measure: ' + (e && e.message)); }
    for (var i = 0; i < probes.length; i++) { try { probes[i].kill(); } catch (e) {} }
    resetDom(dataStr, styleSnap);
    return m;
  }

  // ---- The host-facing API ----------------------------------------------------------
  window.__noacgRender = {
    version: ${RENDER_RUNTIME_VERSION},

    /** Await fonts + images, measure the phase durations, leave the document reset at
     *  vNow = 0. opts: { epochMs, fps, data } (data = the field object for update()). */
    prepare: function (opts) {
      epochMs = typeof opts.epochMs === 'number' ? opts.epochMs : new RealDate().getTime();
      fps = opts.fps || 50;
      var dataStr = JSON.stringify(opts.data || {});
      return loadAssets().then(function () { return measure(dataStr); });
    },

    /** Register the operator cues (from schedule.ts) as virtual timers. Call once,
     *  after prepare and before the first seek. */
    setSchedule: function (cues) {
      for (var i = 0; i < cues.length; i++) {
        (function (cue) {
          var run = function () {
            try {
              if (cue.action === 'update' && typeof window.update === 'function') window.update(cue.payload || '{}');
              else if (cue.action === 'play' && typeof window.play === 'function') window.play();
              else if (cue.action === 'next' && typeof window.next === 'function') window.next();
              else if (cue.action === 'stop' && typeof window.stop === 'function') window.stop();
            } catch (e) { report('cue ' + cue.action + ': ' + (e && e.message)); }
          };
          if (cue.atMs <= 0) timers.push({ id: nextTimerId++, deadline: 0, fn: run, args: [], intervalMs: null, seq: seq++ });
          else timers.push({ id: nextTimerId++, deadline: cue.atMs, fn: run, args: [], intervalMs: null, seq: seq++ });
        })(cues[i]);
      }
    },

    /** Synchronously advance the world to tMs. The host settles paint afterwards. */
    seek: function (tMs) { advanceTo(tMs); },

    vNow: function () { return vNow; },
    getErrors: function () { return errors.slice(); }
  };
})();
`;

/** Runs right AFTER GSAP loads: detach GSAP's rAF-driven core update so gsap.updateRoot(t)
 *  from the runtime is the only thing that advances animation time. */
export const GSAP_DETACH_JS = `// Detach GSAP from real time — the render runtime drives gsap.updateRoot(t) itself.
if (window.gsap) { gsap.ticker.remove(gsap.updateRoot); gsap.ticker.lagSmoothing(0); }
`;
