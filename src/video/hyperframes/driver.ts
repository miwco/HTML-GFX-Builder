// The HyperFrames DRIVER - the script composeHyperframesDocument injects at the end of
// <body>, after the composition's own scripts. It is NoaCG's minimal implementation of
// the HyperFrames runtime contract for the profile the app generates:
//
//   - the framework owns `.clip` visibility: an element with data-start/data-duration is
//     visible exactly inside its time window;
//   - ALL motion lives on the ONE paused GSAP timeline the composition registered at
//     window.__timelines[<data-composition-id>]; the driver renders any time t by seeking
//     that timeline (tl.time(t, suppressEvents)) - there is no notion of playback, every
//     frame is a fresh seek, exactly like the real HyperFrames renderer;
//   - composition variables apply as data-var-text substitutions and --<id> CSS custom
//     properties on the root (the native HyperFrames variables contract); image variables
//     are resolved at compose time (they substitute a src URL, not live-updatable text).
//
// gsap.globalTimeline is paused at boot in BOTH modes, so a stray tween created outside
// the registered timeline freezes at its start state everywhere - deterministically, and
// identically in preview and render - instead of drifting on the wall clock.
//
// Two modes, one seek core:
//   'preview' - speaks a nonce-authenticated postMessage protocol with the app
//     (src/video/hyperframes/bridge.ts is the client): in play/pause/replay/seek/probe/
//     set-vars, out ready/boot-error/frame/state/probe-result/runtime-error. The play
//     loop lives HERE (rAF advancing a local clock, looping), so scrubbing and transport
//     match the Remotion player's feel.
//   'render' - exposes window.__noacgHfRender { version, prepare, seek, getErrors } for
//     the render worker's HyperFrames composition, which drives one seek per output frame.
//
// The driver is authored as a plain JS string (no template placeholders) so it can be
// inlined into a srcdoc/render document verbatim.

import { HYPERFRAMES_RUNTIME_VERSION } from '../../render/manifest';

export const HF_CHANNEL = 'noacg-hf';
export const HF_PROTOCOL_V = 2;
export const HF_RENDER_RUNTIME_VERSION = HYPERFRAMES_RUNTIME_VERSION;

export const HF_DRIVER_JS = `(function () {
  'use strict';
  var cfg = window.__NOACG_HF_CONFIG || {};
  var mode = cfg.mode || 'preview';
  var nonce = cfg.nonce || '';
  var fps = cfg.fps || 30;
  var durationFrames = cfg.durationInFrames || 1;
  var duration = durationFrames / fps; // seconds
  var errors = [];
  var booted = false;
  var root = null;
  var tl = null;
  var clips = [];

  function recordError(message) {
    if (errors.length < 20) errors.push(String(message));
    // Live preview errors surface in the app's error banner as they happen.
    if (mode === 'preview' && booted) {
      post({ type: 'runtime-error', message: String(message) });
    }
  }
  window.addEventListener('error', function (ev) {
    recordError(ev.message || 'script error');
  });
  window.addEventListener('unhandledrejection', function (ev) {
    recordError((ev.reason && ev.reason.message) || 'unhandled rejection');
  });

  function boot() {
    root = document.querySelector('[data-composition-id]');
    if (!root) {
      return 'The document has no composition root - add a <div data-composition-id="..." data-width data-height data-duration> element.';
    }
    var id = root.getAttribute('data-composition-id');
    var timelines = window.__timelines || {};
    tl = timelines[id];
    if (!tl || typeof tl.time !== 'function') {
      return 'No timeline registered for "' + id + '" - build gsap.timeline({ paused: true }) synchronously and assign window.__timelines["' + id + '"] = tl.';
    }
    // Freeze global GSAP time: only explicit seeks render motion (see the header note).
    if (window.gsap && window.gsap.globalTimeline) window.gsap.globalTimeline.pause();
    // Collect clips (timed elements inside the root; the root itself is not a clip).
    clips = [];
    var timed = root.querySelectorAll('[data-start][data-duration]');
    for (var i = 0; i < timed.length; i++) {
      var el = timed[i];
      if (el === root) continue;
      var start = parseFloat(el.getAttribute('data-start'));
      var dur = parseFloat(el.getAttribute('data-duration'));
      if (isFinite(start) && isFinite(dur)) clips.push({ el: el, start: start, end: start + dur });
    }
    applyValues(cfg.values || {});
    seek(0);
    booted = true;
    return null;
  }

  /** Apply scalar variable values: data-var-text substitution + --<id> root properties. */
  function applyValues(values) {
    if (!root) return;
    var decls = [];
    try {
      decls = JSON.parse(document.documentElement.getAttribute('data-composition-variables') || '[]');
    } catch (e) {
      decls = [];
    }
    for (var i = 0; i < decls.length; i++) {
      var d = decls[i];
      if (!d || typeof d.id !== 'string' || d.type === 'image') continue;
      var value = values[d.id];
      if (value === undefined) value = d['default'];
      if (value === undefined || value === null) continue;
      root.style.setProperty('--' + d.id, String(value));
      var bound = document.querySelectorAll('[data-var-text="' + d.id + '"]');
      for (var j = 0; j < bound.length; j++) bound[j].textContent = String(value);
    }
  }

  /** Render the composition at time t (seconds). Pure: same t -> same pixels. */
  function seek(t) {
    if (t < 0) t = 0;
    if (t > duration) t = duration;
    for (var i = 0; i < clips.length; i++) {
      var c = clips[i];
      c.el.style.visibility = t >= c.start && t < c.end ? '' : 'hidden';
    }
    try {
      tl.time(t, true);
    } catch (e) {
      recordError((e && e.message) || 'timeline seek failed');
    }
  }

  // ── Render mode: the worker drives one seek per output frame ────────────────
  if (mode === 'render') {
    var bootError = null;
    window.__noacgHfRender = {
      version: ${HF_RENDER_RUNTIME_VERSION},
      prepare: function () {
        bootError = boot();
        if (bootError) recordError(bootError);
        var fontsReady =
          document.fonts && document.fonts.ready
            ? Promise.race([
                document.fonts.ready,
                new Promise(function (res) { setTimeout(res, 3000); }),
              ])
            : Promise.resolve();
        return fontsReady.then(function () {
          return { durationMs: duration * 1000 };
        });
      },
      seek: function (tMs) {
        if (!booted) return;
        seek(tMs / 1000);
      },
      getErrors: function () {
        return errors.slice();
      },
    };
    return;
  }

  // ── Preview mode: the postMessage protocol + the play loop ──────────────────
  var playing = false;
  var t = 0;
  var lastFramePosted = -1;
  var lastTick = 0;

  function post(msg) {
    msg.channel = '${HF_CHANNEL}';
    msg.v = ${HF_PROTOCOL_V};
    msg.nonce = nonce;
    window.parent.postMessage(msg, '*');
  }
  function postFrame() {
    var frame = Math.min(durationFrames - 1, Math.floor(t * fps));
    if (frame !== lastFramePosted) {
      lastFramePosted = frame;
      post({ type: 'frame', frame: frame });
    }
  }
  function setPlaying(next) {
    if (playing === next) return;
    playing = next;
    post({ type: 'state', playing: playing });
    if (playing) {
      lastTick = performance.now();
      requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    if (!playing) return;
    t += (now - lastTick) / 1000;
    lastTick = now;
    if (t >= duration) t = t % duration; // loop, matching the Remotion player's autoplay
    seek(t);
    postFrame();
    requestAnimationFrame(tick);
  }

  window.addEventListener('message', function (ev) {
    var msg = ev.data;
    if (!msg || msg.channel !== '${HF_CHANNEL}' || msg.nonce !== nonce) return;
    if (ev.source !== window.parent) return;
    if (!booted) return; // a failed boot already posted boot-error; nothing here can run

    switch (msg.type) {
      case 'play':
        setPlaying(true);
        break;
      case 'pause':
        setPlaying(false);
        break;
      case 'replay':
        t = 0;
        seek(0);
        postFrame();
        setPlaying(true);
        break;
      case 'seek':
        setPlaying(false);
        t = Math.max(0, Math.min(durationFrames - 1, msg.frame || 0)) / fps;
        seek(t);
        postFrame();
        break;
      case 'set-vars':
        applyValues(msg.values || {});
        seek(t); // re-render the current moment with the new values
        break;
      case 'probe': {
        var probeErrors = [];
        var textIssues = [];
        var frames = msg.frames || [];
        var checkFrames = msg.checkFrames || [];
        // One seek per distinct frame: error probing and the readability checks share it.
        var seekFrames = frames.slice();
        for (var c = 0; c < checkFrames.length; c++) {
          if (seekFrames.indexOf(checkFrames[c]) < 0) seekFrames.push(checkFrames[c]);
        }
        seekFrames.sort(function (a, b) { return a - b; });
        for (var i = 0; i < seekFrames.length; i++) {
          var f = seekFrames[i];
          var before = errors.length;
          try {
            seek(f / fps);
          } catch (e) {
            recordError((e && e.message) || 'seek failed');
          }
          var threw = errors.length > before;
          if (frames.indexOf(f) >= 0) {
            for (var k = before; k < errors.length; k++) {
              probeErrors.push({ frame: f, message: errors[k] });
            }
          }
          // Skip the checks on a frame that just threw - the DOM is whatever survived.
          if (checkFrames.indexOf(f) >= 0 && !threw && window.__noacgTextChecks) {
            var found = window.__noacgTextChecks.clip().concat(window.__noacgTextChecks.safeArea());
            for (var q = 0; q < found.length; q++) {
              textIssues.push({
                frame: f,
                kind: found[q].kind,
                key: found[q].key,
                message: found[q].message,
                lossPct: found[q].lossPct,
              });
            }
          }
        }
        seek(t); // leave the visible state where it was
        post({
          type: 'probe-result',
          id: msg.id,
          ok: probeErrors.length === 0,
          errors: probeErrors,
          textIssues: textIssues,
        });
        break;
      }
    }
  });

  var fontsReady =
    document.fonts && document.fonts.ready
      ? Promise.race([
          document.fonts.ready,
          new Promise(function (res) { setTimeout(res, 1500); }),
        ])
      : Promise.resolve();
  fontsReady.then(function () {
    var err = boot();
    if (err) {
      recordError(err);
      post({ type: 'boot-error', message: err });
      return;
    }
    post({ type: 'ready' });
    postFrame();
    if (cfg.autoplay) setPlaying(true);
  });
})();
`;
