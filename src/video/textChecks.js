// Runtime READABILITY checks, run against a mounted composition's own DOM at a settled
// frame. Two failure classes, one implementation, FOUR consumers - which is why this file
// is plain JS installing a global rather than a typed module:
//
//   - the Remotion player host (player-host/, its own package, opaque origin): inlined into
//     the host page by scripts/build-player-host.mjs, exactly like the bundled font CSS;
//   - the HyperFrames driver (opaque-origin srcdoc): inlined by hyperframes/compose.ts via
//     a ?raw import, ahead of the driver that calls it;
//   - both engines' validators, through their probe protocols, where a persistent crop
//     becomes a repair round before the composition is ever applied;
//   - scripts/video-bench.mjs, which reaches into the preview frame over CDP.
//
// Neither runtime can be reached from the app (sandbox="allow-scripts", no
// allow-same-origin, so no contentDocument), and the HyperFrames driver is injected as a
// STRING - so a shared TypeScript module cannot serve both. A shared source file inlined
// into each world can, and keeps one algorithm instead of three drifting copies.
//
// CLIPPING: "KITCHEN" rendering as "KITCH", "WORLD REPORT" as "WORLD REP". Measured from
// the glyphs themselves - a Range over the element's own text nodes - against the frame and
// every overflow-clipping ancestor. Measuring the RANGE, not the element box, is what makes
// this work: nowrap text inside a fixed-width clipped card overflows silently, and the
// element's own rect reports the (uncut) box width, not the painted glyph extent.
//
// OCCLUSION: "the title is painted behind the shape panels" - hit-testing sample points
// against the real paint order, the video counterpart of the SPX bench's overlap check.
//
// False positives are the expensive failure here (a flagged run costs the user repair
// rounds), so the checks are deliberately conservative: clip-path/mask-image ancestors are
// invisible to a rect test and stay unflagged (an intentional mask reads as clean), the
// thresholds below ignore sub-glyph bleeds, and callers only trust a finding that PERSISTS
// across several hold frames - which is what excludes an entrance still in flight.
//
// Issue shape: { kind: 'clip' | 'occlusion', key, message }. `key` is stable across frames
// (the percentages in `message` are not) - callers dedupe and intersect on it.

(function () {
  'use strict';

  /** Fraction of the text's own width/height that must be lost before it counts as clipped.
   *  0.12 is comfortably below one short word ("WORLD REPORT" -> "WORLD REP" loses ~17%,
   *  "KITCHEN" -> "KITCH" ~28%) and comfortably above a trailing-space or antialiasing bleed. */
  var CLIP_LOSS = 0.12;
  /** …and an absolute floor, so a big headline losing a hairline never fires. */
  var CLIP_MIN_PX = 8;

  /**
   * SAFE AREA: how close readable text may come to the frame edge, as a fraction of the
   * frame. 5% is the broadcast title-safe convention and, measured across a 14-generation
   * bench, it separates cleanly: every hero line that reads well sits at 11% or more, while
   * a headline running genuinely edge-to-edge measured 3%. Nothing landed in between, so the
   * threshold is not slicing through a cluster of real designs.
   */
  var SAFE_AREA = 0.05;

  var CLIPS = /^(hidden|clip|scroll|auto)$/;

  function width(b) {
    return Math.max(0, b.right - b.left);
  }
  function height(b) {
    return Math.max(0, b.bottom - b.top);
  }

  function describe(el) {
    var cls = typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '';
    return '<' + el.tagName.toLowerCase() + cls + '>';
  }

  function label(el) {
    return (el.textContent || '').trim().slice(0, 28);
  }

  /** Text smaller than this on screen is decoration, not the hero - ignored by both checks. */
  var MIN_AREA_PX = 500;

  /**
   * Every element that renders its OWN readable text: visible, not tiny, carrying a direct
   * non-empty text node. Both checks start here.
   *
   * `requireBoxArea` is the difference between them, and it is load-bearing. Occlusion
   * hit-tests sample points, so it needs an element with a real box. CLIPPING must NOT gate
   * on the box: an element clipped away ENTIRELY has a zero-area box (a real failure seen in
   * the bench - glyph halves absolutely positioned inside a zero-height overflow:hidden
   * span, rendering a completely blank frame that every check scored clean). Gating on the
   * box made total clipping invisible while partial clipping was caught - exactly backwards.
   * The clip check gates on the GLYPH extent instead (see clipIssues).
   */
  function readableTextElements(doc, win, requireBoxArea) {
    var out = [];
    var all = doc.querySelectorAll('body *');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var cs = win.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.3) continue;
      if (parseFloat(cs.fontSize) < 12) continue;
      var ownText = false;
      for (var n = 0; n < el.childNodes.length; n++) {
        var node = el.childNodes[n];
        if (node.nodeType === 3 && (node.textContent || '').trim()) ownText = true;
      }
      if (!ownText) continue;
      if (requireBoxArea) {
        var r = el.getBoundingClientRect();
        if (!(r.width > 0 && r.width * r.height > MIN_AREA_PX)) continue;
      }
      out.push(el);
    }
    return out;
  }

  /**
   * The painted extent of an element's OWN glyphs (its direct text nodes), ignoring
   * descendants - a Range measures what is actually drawn, box overflow included.
   *
   * CAVEAT that shapes both checks: a Range's HEIGHT is the font's full ascent/descent box
   * (~1.4em for a typical face), not the ink. Text set at lineHeight 1.02 inside an
   * overflow:hidden wrapper - the standard masked-reveal idiom, used throughout the house
   * style - therefore reports ~27% of its "height" clipped while not one pixel of glyph is
   * cut. Measured on the offline stub's own title sample. Width has no such slack: glyph
   * advances are exactly what gets painted. Hence the rules below.
   */
  function textExtent(el, doc) {
    var box = null;
    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if (node.nodeType !== 3 || !(node.textContent || '').trim()) continue;
      var range = doc.createRange();
      range.selectNodeContents(node);
      var r = range.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      box = box
        ? {
            left: Math.min(box.left, r.left),
            top: Math.min(box.top, r.top),
            right: Math.max(box.right, r.right),
            bottom: Math.max(box.bottom, r.bottom),
          }
        : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }
    return box;
  }

  /** Clip a region down through the ancestor chain, per axis, remembering the clippers.
   *  The frame itself (the viewport) is the outermost one.
   *
   *  Two different questions are answered from this walk, and they want different ancestors:
   *  CLIPPING asks "who cut this text?" - the INNERMOST clipper, usually a card. SAFE AREA
   *  asks "how close is it to the frame edge?" - the OUTERMOST clipper, which is the frame
   *  itself (the Remotion Player's container, or the HyperFrames composition root). Measuring
   *  the safe area against a card would be meaningless; measuring the cut against the frame
   *  would miss every cropped card. */
  function clipRegion(el, win) {
    var region = { left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight };
    var frame = { left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight };
    var clippers = [];
    for (var a = el.parentElement; a && a !== el.ownerDocument.documentElement; a = a.parentElement) {
      var cs = win.getComputedStyle(a);
      var clipsX = CLIPS.test(cs.overflowX);
      var clipsY = CLIPS.test(cs.overflowY);
      if (!clipsX && !clipsY) continue;
      // The BORDER box, not the padding box: the larger region, so padding never
      // manufactures a finding. getBoundingClientRect is already in the same
      // (post-transform) space as the text Range, so scaled previews compare correctly.
      var r = a.getBoundingClientRect();
      if (clipsX) {
        region.left = Math.max(region.left, r.left);
        region.right = Math.min(region.right, r.right);
      }
      if (clipsY) {
        region.top = Math.max(region.top, r.top);
        region.bottom = Math.min(region.bottom, r.bottom);
      }
      clippers.push(a);
      // Last one wins: the walk ends at the outermost clipper, which is the frame.
      if (r.width > 1 && r.height > 1) {
        frame = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }
    }
    return { region: region, clippers: clippers, frame: frame };
  }

  /** An element that clips its own overflow cuts its own text too (the fixed-width card). */
  function selfClip(el, win, region) {
    var cs = win.getComputedStyle(el);
    var r = el.getBoundingClientRect();
    var out = { left: region.left, top: region.top, right: region.right, bottom: region.bottom };
    if (CLIPS.test(cs.overflowX)) {
      out.left = Math.max(out.left, r.left);
      out.right = Math.min(out.right, r.right);
    }
    if (CLIPS.test(cs.overflowY)) {
      out.top = Math.max(out.top, r.top);
      out.bottom = Math.min(out.bottom, r.bottom);
    }
    return out;
  }

  /** Text whose glyphs are cut by the frame edge or by an overflow-clipping ancestor. */
  function clipIssues(doc, win) {
    return computeClips(doc, win).slice(0, 5);
  }

  /** The UNCAPPED clip findings. The safe-area check needs the full set to exclude from -
   *  reading the capped list let a badly broken composition report the same element as both
   *  cut off AND crowding the edge, once the cap swallowed its clip finding. */
  function computeClips(doc, win) {
    var issues = [];
    // No box-area gate here (see readableTextElements): the glyph extent decides what counts
    // as hero text, so type clipped away to nothing is still measured.
    var texts = readableTextElements(doc, win, false);
    for (var i = 0; i < texts.length; i++) {
      var el = texts[i];
      var text = textExtent(el, doc);
      if (!text || width(text) <= 0 || height(text) <= 0) continue;
      if (width(text) * height(text) <= MIN_AREA_PX) continue;

      var found = clipRegion(el, win);
      var region = selfClip(el, win, found.region);
      var visible = {
        left: Math.max(text.left, region.left),
        top: Math.max(text.top, region.top),
        right: Math.min(text.right, region.right),
        bottom: Math.min(text.bottom, region.bottom),
      };

      // WIDTH ONLY. The height axis cannot be judged from a Range: its slack is leading, not
      // ink (see textExtent), so every masked reveal would be reported as cropped - which is
      // exactly what happened to the offline stub's own title sample. Distinguishing
      // "leading clipped" from "glyphs clipped" needs ink metrics the DOM does not give us,
      // and a false positive costs the user repair rounds. A line cut in half vertically is
      // therefore a KNOWN GAP, accepted deliberately; horizontal crops - the failure class
      // that actually shipped ("KITCHEN" as "KITCH") - are measured exactly.
      var lostW = width(text) - width(visible);
      if (lostW <= Math.max(CLIP_MIN_PX, CLIP_LOSS * width(text))) continue;
      var axis = 'width';
      var pct = Math.round((lostW / width(text)) * 100);

      // Name the culprit so the repair round has somewhere to go: the innermost clipper, or
      // the frame when nothing else took the bite.
      var cutter = found.clippers.length ? describe(found.clippers[0]) : 'the frame edge';
      issues.push({
        kind: 'clip',
        // How much of the glyph run is gone, so a caller can tell a near-miss from text that
        // is not painted at all. At 100 the visible extent is zero - nothing of the line
        // reaches the screen - which is the one clip verdict that cannot be a false positive.
        lossPct: pct,
        key: 'clip:' + label(el) + ':' + axis,
        message:
          '"' + label(el) + '" is CUT OFF - ' + pct + '% of its ' + axis + ' is clipped by ' + cutter +
          '. Give the text room (or fit the type to the box); readable text must never be cropped at the hold.',
      });
    }
    return issues;
  }

  /**
   * Readable text crowding the frame edge. NOT the same defect as clipping: nothing is cut,
   * the piece just has no margin, which reads as an accident on air (and is unsafe on any
   * display that overscans). Text the clip check already reported is skipped - a cropped
   * line is one finding, not two.
   */
  function safeAreaIssues(doc, win) {
    var issues = [];
    var clipped = {};
    var priorClips = computeClips(doc, win);
    for (var c = 0; c < priorClips.length; c++) clipped[priorClips[c].key.split(':')[1]] = true;

    var texts = readableTextElements(doc, win, false);
    for (var i = 0; i < texts.length; i++) {
      var el = texts[i];
      var text = textExtent(el, doc);
      if (!text || width(text) <= 0 || height(text) <= 0) continue;
      if (width(text) * height(text) <= MIN_AREA_PX) continue;
      if (clipped[label(el)]) continue;

      var frame = clipRegion(el, win).frame;
      var fw = width(frame);
      var fh = height(frame);
      if (fw <= 0 || fh <= 0) continue;

      // Trim the Range's leading overhang before measuring the VERTICAL margins: the font's
      // ascent/descent box can stand ~0.2em proud of the element's own line box at each end,
      // which would report a comfortable top/bottom margin as a violation. The element's own
      // box is the honest bound for that axis. Horizontal needs no such correction - and must
      // not get one, or text overflowing its box (the clipped-headline case) would be hidden.
      var ownBox = el.getBoundingClientRect();
      var top = Math.max(text.top, Math.min(ownBox.top, text.bottom));
      var bottom = Math.min(text.bottom, Math.max(ownBox.bottom, text.top));

      var margins = [
        { side: 'left', v: (text.left - frame.left) / fw },
        { side: 'right', v: (frame.right - text.right) / fw },
        { side: 'top', v: (top - frame.top) / fh },
        { side: 'bottom', v: (frame.bottom - bottom) / fh },
      ];
      var worst = margins[0];
      for (var m = 1; m < margins.length; m++) if (margins[m].v < worst.v) worst = margins[m];
      if (worst.v >= SAFE_AREA) continue;

      issues.push({
        kind: 'safe-area',
        key: 'safe-area:' + label(el) + ':' + worst.side,
        message:
          '"' + label(el) + '" sits ' + Math.max(0, Math.round(worst.v * 100)) + '% from the ' +
          worst.side + ' edge of the frame - readable text needs a margin of at least ' +
          Math.round(SAFE_AREA * 100) + '%. Scale the type down or bring it in.',
      });
    }
    return issues.slice(0, 5);
  }

  /** Is this element something that PAINTS over what is behind it? */
  function painted(el, win) {
    if (['IMG', 'VIDEO', 'CANVAS', 'SVG', 'svg'].indexOf(el.tagName) >= 0) return true;
    var cs = win.getComputedStyle(el);
    if (Number(cs.opacity) < 0.05) return false;
    // background-clip: text paints only inside its own glyphs - the standard technique for a
    // specular sweep over a wordmark (a duplicate glyph layer), not an occluder.
    var clip = cs.webkitBackgroundClip || cs.backgroundClip;
    if (clip === 'text') return false;
    if (cs.backgroundImage !== 'none') return true;
    var m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    var parts = m[1].split(',').map(Number);
    return (parts[3] === undefined ? 1 : parts[3]) > 0.05;
  }

  /**
   * Text painted BEHIND the graphics: hit-test each text element against the real paint
   * order. Occluded = most sample points are covered by a painted element that is neither
   * ancestor nor descendant and does not carry the same text (duplicate glyph layers -
   * sweeps, glows - are deliberate).
   */
  function occlusionIssues(doc, win) {
    var issues = [];
    var texts = readableTextElements(doc, win, true);
    for (var i = 0; i < texts.length; i++) {
      var el = texts[i];
      var r = el.getBoundingClientRect();
      var points = [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + r.width * 0.25, r.top + r.height / 2],
        [r.left + r.width * 0.75, r.top + r.height / 2],
        [r.left + r.width / 2, r.top + r.height * 0.25],
        [r.left + r.width / 2, r.top + r.height * 0.75],
      ];
      var blocked = 0;
      var blocker = null;
      for (var p = 0; p < points.length; p++) {
        var x = points[p][0];
        var y = points[p][1];
        if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) continue;
        var stack = doc.elementsFromPoint(x, y);
        for (var s = 0; s < stack.length; s++) {
          var hit = stack[s];
          if (hit === el || el.contains(hit) || hit.contains(el)) break; // reached our text
          var hitText = (hit.textContent || '').trim();
          if (hitText && hitText === (el.textContent || '').trim()) break;
          if (painted(hit, win)) {
            blocked++;
            if (!blocker) blocker = describe(hit);
            break;
          }
        }
      }
      if (blocked >= 3) {
        issues.push({
          kind: 'occlusion',
          key: 'occlusion:' + label(el),
          // Say what to DO, like the clip and safe-area messages: this text is handed to the
          // model verbatim as a repair round, and "it is behind a panel" on its own reads as a
          // sizing problem, which is the one fix that cannot work.
          message:
            '"' + label(el) + '" is painted BEHIND ' + blocker + ' (' + blocked +
            '/5 sample points covered). This is a LAYERING problem, not a size one: raise the ' +
            'text above the covering element (paint it later, or give it the higher z-index), ' +
            'or move the covering element off it. Do not shrink or move the text to dodge it.',
        });
      }
    }
    return issues.slice(0, 5);
  }

  window.__noacgTextChecks = {
    clip: function () {
      return clipIssues(document, window);
    },
    safeArea: function () {
      return safeAreaIssues(document, window);
    },
    occlusion: function () {
      return occlusionIssues(document, window);
    },
  };
})();
