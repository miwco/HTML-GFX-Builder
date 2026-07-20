// The permanent prompt pieces of the HyperFrames side of the video harness: the
// composition contract (hard requirements the validator enforces - see
// src/video/hyperframes/validate.ts, whose messages these rules mirror) and one canonical
// example composition (a REAL document that passes the full pipeline - the taste anchor,
// exactly like EXAMPLE_COMPOSITION is for the Remotion coder). The shared
// MOTION_PRINCIPLES (prompts.ts) apply unchanged - taste is engine-independent - including
// its instruction to prefer the BUNDLED broadcast faces, which the contract below lists
// from the same single source (video/videoFonts.ts) the Remotion contract reads; the
// composed document embeds exactly those faces (video/hyperframes/fontCss.ts).

import { videoFontFamiliesDoc } from '../../video/videoFonts';

export const HYPERFRAMES_CONTRACT = `## The composition contract (hard requirements - the validator enforces these)
- ONE complete standalone HTML document (doctype, <html>, <head> with a <style> block,
  <body>). This is a HyperFrames composition: https-free, self-contained, deterministic.
- The body holds ONE composition root:
  <div id="root" data-composition-id="main" data-start="0" data-width="<W>"
       data-height="<H>" data-duration="<seconds>">
  data-width/data-height MUST equal the given canvas exactly; data-duration MUST equal the
  given duration exactly. Size #root to the same px values and give it overflow: hidden.
- Timed elements are CLIPS: class="clip" plus data-start, data-duration (seconds, relative
  to the composition), and data-track-index (stacking layer). The FRAMEWORK owns a clip's
  visibility - it shows each clip exactly inside its time window. Never animate a clip
  element's visibility/display yourself; animate elements INSIDE clips.
- ALL motion lives on ONE GSAP timeline, built SYNCHRONOUSLY in an inline <script> at the
  end of <body>:
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    // ...tweens, positioned in composition seconds: tl.from('#title', {...}, 0.4)
    window.__timelines['main'] = tl;   // key = data-composition-id
  gsap is provided as a global - include NO <script src> tags, ever. NEVER call
  tl.play() (or any .play()): the renderer SEEKS the paused timeline frame by frame.
- Position every tween in absolute composition seconds (the third argument). The renderer
  renders time t by seeking the timeline to t - the same t always produces the same frame.
- Deterministic only: no Date.now/performance.now, no Math.random (precompute seeded
  arrays inline if you need scatter), no setTimeout/setInterval/requestAnimationFrame, no
  fetch/network, no browser storage, no repeat: -1 (compute a finite repeat count from the
  duration instead).
- Animate transforms, opacity (use gsap autoAlpha), colors, and filters. Never tween
  display or raw visibility.
- EDITABLE INPUTS are composition VARIABLES, declared on the <html> element:
    <html lang="en" data-composition-variables='[
      {"id":"title","type":"string","label":"Title","default":"PRIME TIME"},
      {"id":"accent","type":"color","label":"Accent","default":"#f6a623"}
    ]'>
  Types: string, number, color, and image (below). Expose the content a non-technical user
  would change - the headline, a kicker, an accent colour, a score (typically 2-5 variables);
  keep timing/layout in code. Do NOT declare boolean or enum variables: the runtime carries a
  scalar into the document by exactly two routes, text substitution and a CSS custom property,
  and neither makes a boolean or a named choice do anything a viewer would see - the control
  would be rejected as one that does nothing.
  Bind them declaratively:
  - text: <h1 data-var-text="title">PRIME TIME</h1> (the authored text = the default; keep
    such elements leaf-only - text content, no element children).
  - colors/numbers: every variable is also available as var(--<id>) in CSS - e.g.
    color: var(--accent, #f6a623). Prefer CSS bindings for colors.
- UPLOADED ASSETS are referenced by logical name with an asset: URL - <img src="asset:logo">
  or background-image: url(asset:logo) - using EXACTLY the names you were given, nothing
  else. An "image" variable lets the user pick WHICH asset fills a slot: its default is a
  known asset name (or "" for none) and the element binds with data-var-src:
    <img class="hero-logo" data-var-src="logo" src="asset:logo" alt="">
  When the brief expects an image that was NOT uploaded, design a REAL typographic
  substitute (a bold wordmark lockup), never a grey box or the literal word "LOGO" - and
  then do not reference the missing asset at all.
- <video> and <audio> elements are not supported - build from text, shapes, gradients,
  and images.
- Transparent projects: paint NO background anywhere (body and root stay transparent).
  Opaque projects: paint a deliberate designed background (a dark layered gradient beats
  flat black).
- BUNDLED FONTS - these broadcast faces are already loaded in BOTH the preview and the
  final render; use one by naming its family in CSS (with a fallback), e.g.
  \`font-family: "Bebas Neue", "Arial Narrow", Arial, sans-serif;\`. Available:
${videoFontFamiliesDoc()}
  Do NOT write an @font-face rule, <link>, @import, or any font URL - they are pre-injected,
  and a network/URL font load is rejected by the validator. A system stack (Arial, Georgia,
  …) is allowed where none of the above fits (there is no bundled serif).
- Write clean, readable code a motion designer can edit: a commented <style> block,
  descriptive ids/classes, timing gathered as consts at the top of the script, short
  comments explaining the WHY of each phase. Keep the document under ~90 kB.`;

/** The canonical example - a REAL document that passes static checks, boot, and the probe. */
export const EXAMPLE_HYPERFRAMES_COMPOSITION = `<!doctype html>
<!-- "Prime Sting" - a 3 s broadcast stinger: angled panels sweep through, the title
     snaps in at center over them, everything clears sharply. The shape of a good
     composition: variables declared on <html>, clips with data-* timing, one paused
     timeline with all tweens positioned in composition seconds. 1920x1080 @ 3 s. -->
<html lang="en" data-composition-variables='[
  {"id":"title","type":"string","label":"Title","default":"PRIME TIME"},
  {"id":"kicker","type":"string","label":"Kicker","default":"SATURDAY · LIVE"},
  {"id":"accent","type":"color","label":"Accent colour","default":"#f6a623"}
]'>
<head>
<meta charset="UTF-8" />
<title>Prime Sting</title>
<style>
  body { margin: 0; }
  /* The stage: a deliberate layered dark - never flat black. */
  #root {
    position: relative;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: linear-gradient(160deg, #0c0f14 30%, #141a24 100%);
    font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
  }
  .clip { position: absolute; inset: 0; }
  /* Sweeping panels: LIT surfaces - same-hue shading + edge highlight, never flat fills. */
  .panel {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 1730px;
    margin-left: -865px;
    transform: rotate(-8deg);
    background-image: linear-gradient(165deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.28) 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 20px 60px rgba(0,0,0,0.35);
  }
  #panel-a { height: 172px; margin-top: -270px; background-color: #1d2634; }
  #panel-b { height: 140px; margin-top:  -70px; background-color: var(--accent, #f6a623); }
  #panel-c { height: 108px; margin-top:  120px; background-color: #2c3a52; }
  /* The text block paints LAST, above every panel. */
  #text-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  #title-mask { overflow: hidden; padding: 0.1em 0.3em; }
  #title {
    margin: 0;
    color: #f4f5f7;
    font-size: 140px;
    font-weight: 900;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }
  #kicker {
    margin-top: 20px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(244,245,247,0.78);
  }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0"
     data-width="1920" data-height="1080" data-duration="3">
  <!-- Panels behind (track 1), text on top (track 2) - both span the full duration;
       their motion, not their clip windows, carries the entrance and exit. -->
  <section id="panels" class="clip" data-start="0" data-duration="3" data-track-index="1">
    <div id="panel-a" class="panel"></div>
    <div id="panel-b" class="panel"></div>
    <div id="panel-c" class="panel"></div>
  </section>
  <section id="text-layer" class="clip" data-start="0" data-duration="3" data-track-index="2">
    <div id="text-block">
      <div id="title-mask"><h1 id="title" data-var-text="title">PRIME TIME</h1></div>
      <div id="kicker" data-var-text="kicker">SATURDAY · LIVE</div>
    </div>
  </section>
</div>
<script>
  // One paused timeline; every position is in absolute composition seconds.
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  // ── Timing (seconds) ───────────────────────────────────────────────────────
  const TITLE_IN = 0.35;   // title lands as the panels settle
  const KICKER_IN = 0.55;  // support line trails the hero
  const EXIT = 2.45;       // sharp clear-out fills the last ~0.55 s

  // Phase 1: three angled panels sweep in from the left with a tight stagger.
  tl.from('#panel-a', { x: -2300, duration: 0.55, ease: 'expo.out' }, 0.00);
  tl.from('#panel-b', { x: -2300, duration: 0.55, ease: 'expo.out' }, 0.06);
  tl.from('#panel-c', { x: -2300, duration: 0.55, ease: 'expo.out' }, 0.12);

  // Phase 2: the title rises out of a mask with an overshoot; the kicker fades up after.
  tl.from('#title', { yPercent: 110, duration: 0.5, ease: 'back.out(1.4)' }, TITLE_IN);
  tl.from('#kicker', { y: 24, autoAlpha: 0, duration: 0.35, ease: 'power3.out' }, KICKER_IN);

  // Hold: the settled text breathes ~1.5% so the frame never feels frozen (finite repeat).
  tl.to('#text-block', { scale: 1.015, duration: 0.55, ease: 'sine.inOut', repeat: 1, yoyo: true }, 1.1);

  // Phase 3: text exits FIRST (left, fading), panels sweep out after it.
  tl.to('#text-block', { x: -700, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, EXIT);
  tl.to('#panel-a', { x: 2300, duration: 0.4, ease: 'power2.in' }, EXIT + 0.08);
  tl.to('#panel-b', { x: 2300, duration: 0.4, ease: 'power2.in' }, EXIT + 0.12);
  tl.to('#panel-c', { x: 2300, duration: 0.4, ease: 'power2.in' }, EXIT + 0.16);

  window.__timelines['main'] = tl;
</script>
</body>
</html>`;
