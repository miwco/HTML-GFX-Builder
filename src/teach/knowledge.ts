// Deterministic teaching knowledge base. Maps code tokens (and a few line patterns) to short,
// beginner-friendly, SPX/broadcast-specific explanations. This is the curated, offline source
// for the Learn panel — reliable and accurate (no AI hallucination). The architecture leaves
// room for AI to *enrich* these later, but the rules stand on their own.

export type ExplainCategory = 'SPX' | 'CSS' | 'JS' | 'GSAP' | 'HTML';

export interface Explanation {
  /** The token/concept this explains, e.g. "play()" or "left". */
  title: string;
  category: ExplainCategory;
  /** Short, plain-language explanation (1–2 sentences). */
  body: string;
  /** How it shows up in the preview / on air (optional). */
  affects?: string;
}

/** Keyword → explanation. Keys are lowercase; matched against the token under the cursor. */
export const TOKEN_KNOWLEDGE: Record<string, Explanation> = {
  // ---------- SPX ----------
  spxgctemplatedefinition: {
    title: 'SPXGCTemplateDefinition',
    category: 'SPX',
    body: 'The template definition object. SPX reads it to know which data fields to show the operator and how to play the graphic.',
    affects: 'Drives the inputs the operator sees in the SPX rundown.',
  },
  datafields: {
    title: 'DataFields',
    category: 'SPX',
    body: 'The list of data fields the operator fills in (name, title, score…). Each entry becomes an input in the SPX rundown.',
  },
  ftype: {
    title: 'ftype',
    category: 'SPX',
    body: 'The kind of input SPX shows for a field: textfield, textarea, number, dropdown, color, checkbox, filelist, and more.',
  },
  prvar: {
    title: 'prvar',
    category: 'SPX',
    body: 'Optional “preview variable” name SPX can use to reference a field.',
  },
  playserver: { title: 'playserver', category: 'SPX', body: 'Which SPX play-out server/channel target this template is intended for.' },
  playchannel: { title: 'playchannel', category: 'SPX', body: 'The CasparCG channel SPX plays this template on.' },
  playlayer: { title: 'playlayer', category: 'SPX', body: 'The layer within the channel — higher layers render on top.' },
  webplayout: { title: 'webplayout', category: 'SPX', body: 'Which web renderer/output this template uses in SPX.' },
  uicolor: { title: 'uicolor', category: 'SPX', body: 'A color label for the template’s card in the SPX interface (cosmetic).' },
  dataformat: { title: 'dataformat', category: 'SPX', body: 'How field data is passed to the template — normally "json".' },
  steps: {
    title: 'steps',
    category: 'SPX',
    body: 'Number of extra states a multi-step graphic has. 0 means a simple play/stop graphic; >0 enables next().',
  },
  play: {
    title: 'play()',
    category: 'JS',
    body: 'SPX calls play() when the graphic is taken on air. Usually copies in the latest data and animates the graphic in.',
    affects: 'Runs when you press ▶ Play.',
  },
  stop: {
    title: 'stop()',
    category: 'JS',
    body: 'SPX calls stop() to take the graphic off air. Usually animates it out.',
    affects: 'Runs when you press ■ Stop.',
  },
  update: {
    title: 'update(data)',
    category: 'JS',
    body: 'SPX calls update(data) with the operator’s field values as a JSON string. Parse it and copy each value into the matching visible element.',
    affects: 'Runs when you press ⟳ Update (and inside Play).',
  },
  next: {
    title: 'next()',
    category: 'JS',
    body: 'SPX calls next() to advance a multi-step graphic to its next state (only used when steps > 0).',
    affects: 'Runs when you press » Next.',
  },
  runtemplateupdate: {
    title: 'runTemplateUpdate()',
    category: 'JS',
    body: 'Helper that copies each hidden .spx-data value into its matching visible element (id f0 → f0_gfx).',
  },

  // ---------- CSS ----------
  position: {
    title: 'position',
    category: 'CSS',
    body: 'How an element is placed. "absolute" lets you position it precisely with left/top, independent of other elements.',
  },
  left: { title: 'left', category: 'CSS', body: 'Distance from the left edge of the canvas (with position: absolute). e.g. left: 120px moves it 120px right.', affects: 'Moves the element horizontally on the 1920×1080 canvas.' },
  top: { title: 'top', category: 'CSS', body: 'Distance from the top edge of the canvas (with position: absolute).', affects: 'Moves the element vertically on the canvas.' },
  right: { title: 'right', category: 'CSS', body: 'Distance from the right edge. Set to auto when you’re positioning from the left instead.' },
  bottom: { title: 'bottom', category: 'CSS', body: 'Distance from the bottom edge — handy for lower-thirds anchored near the bottom of frame.' },
  width: { title: 'width', category: 'CSS', body: 'The element’s width in pixels.' },
  height: { title: 'height', category: 'CSS', body: 'The element’s height in pixels.' },
  opacity: { title: 'opacity', category: 'CSS', body: '0 = invisible, 1 = fully visible. Graphics often start at 0 and fade to 1 on play().', affects: 'Controls visibility / fade.' },
  transform: { title: 'transform', category: 'CSS', body: 'Moves, scales, or rotates an element without disturbing layout. translateY(40px) nudges down; scale(1.1) enlarges.' },
  color: { title: 'color', category: 'CSS', body: 'The text color of an element.' },
  background: { title: 'background', category: 'CSS', body: 'The element’s background — a color, gradient, or image behind its content.' },
  'background-color': { title: 'background-color', category: 'CSS', body: 'A solid background color behind the element’s content.' },
  'font-size': { title: 'font-size', category: 'CSS', body: 'How large the text is, in pixels. Broadcast text is usually large (30–100px) so it reads on screen.' },
  'font-weight': { title: 'font-weight', category: 'CSS', body: 'How bold the text is: 400 normal, 700 bold, up to 900.' },
  'font-family': { title: 'font-family', category: 'CSS', body: 'Which typeface to use. Add custom fonts with @font-face (see the Brand panel).' },
  'text-align': { title: 'text-align', category: 'CSS', body: 'Horizontal alignment of text: left, center, or right.' },
  'line-height': { title: 'line-height', category: 'CSS', body: 'Vertical spacing between lines of text.' },
  'letter-spacing': { title: 'letter-spacing', category: 'CSS', body: 'Extra space between letters — small positive values suit uppercase labels.' },
  padding: { title: 'padding', category: 'CSS', body: 'Space inside an element, between its edge and its content.' },
  margin: { title: 'margin', category: 'CSS', body: 'Space outside an element, pushing neighbors away.' },
  border: { title: 'border', category: 'CSS', body: 'A line around the element: width, style, color (e.g. 2px solid #fff).' },
  'border-left': { title: 'border-left', category: 'CSS', body: 'A line on just the left edge — a common accent strip for lower-thirds.' },
  display: { title: 'display', category: 'CSS', body: 'How an element lays out. "flex" makes a row/column of children; "none" hides it; "inline-block" sizes to content.' },
  'z-index': { title: 'z-index', category: 'CSS', body: 'Stacking order among positioned elements — higher numbers render on top.' },
  inset: { title: 'inset', category: 'CSS', body: 'Shorthand for top/right/bottom/left. inset: 0 fills the whole canvas.' },
  gap: { title: 'gap', category: 'CSS', body: 'Space between flex/grid children.' },
  overflow: { title: 'overflow', category: 'CSS', body: 'What happens to content that exceeds the box. "hidden" clips it — used to keep the canvas exactly 1920×1080.' },
  'box-sizing': { title: 'box-sizing', category: 'CSS', body: 'border-box makes width/height include padding and border, which is easier to reason about.' },
  'font-variant-numeric': { title: 'font-variant-numeric', category: 'CSS', body: 'tabular-nums makes digits equal width, so scores/timers don’t jiggle as numbers change.' },
  animation: { title: 'animation', category: 'CSS', body: 'Runs a @keyframes sequence on the element (name, duration, easing).' },
  '@keyframes': { title: '@keyframes', category: 'CSS', body: 'Defines an animation’s steps (from/to or percentages). Reference it by name in the animation property.' },
  '@font-face': { title: '@font-face', category: 'CSS', body: 'Registers a custom font file so you can use it in font-family. The Brand panel can add these for you.' },
  ':root': { title: ':root', category: 'CSS', body: 'The document root. A handy place to define CSS variables like --brand-primary used across the template.' },
  var: { title: 'var()', category: 'CSS', body: 'Inserts a CSS variable’s value, e.g. var(--brand-primary). Change it once in :root and everything updates.' },

  // ---------- GSAP ----------
  gsap: { title: 'gsap', category: 'GSAP', body: 'The bundled GSAP animation library (no internet needed). Smoothly tweens element properties.' },
  duration: { title: 'duration', category: 'GSAP', body: 'How long a GSAP tween lasts, in seconds.' },
  ease: { title: 'ease', category: 'GSAP', body: 'The acceleration curve of a tween, e.g. power3.out (fast then settling) — gives motion a natural feel.' },
  yoyo: { title: 'yoyo', category: 'GSAP', body: 'Makes a repeating tween play forward then backward — used for pulses.' },
  repeat: { title: 'repeat', category: 'GSAP', body: 'How many extra times a tween repeats (-1 = forever).' },

  // ---------- HTML ----------
  class: { title: 'class', category: 'HTML', body: 'A reusable style hook. Many elements can share a class; CSS targets it with .name.' },
  id: { title: 'id', category: 'HTML', body: 'A unique element name. CSS targets it with #name and JS finds it with getElementById.' },
  img: { title: '<img>', category: 'HTML', body: 'An image element. Point src at a file in assets/ (relative path) so it travels with the export.' },
  src: { title: 'src', category: 'HTML', body: 'The image/script source path. Keep it relative (assets/logo.png) for a portable SPX package.' },
};

/** Line/selection patterns matched with a regex when a token lookup doesn’t apply. */
export interface PatternRule {
  test: RegExp;
  explain: Explanation;
}

export const PATTERN_KNOWLEDGE: PatternRule[] = [
  {
    test: /f\d+_gfx/i,
    explain: {
      title: 'fN_gfx (visible field element)',
      category: 'SPX',
      body: 'A visible element bound to data field fN. update() copies the operator’s input for fN into this element’s text.',
      affects: 'Its on-screen text comes from the matching SPX field.',
    },
  },
  {
    test: /spx-data/i,
    explain: {
      title: '.spx-data (hidden data holder)',
      category: 'SPX',
      body: 'Hidden holders SPX writes incoming field values into. Convention: holder id f0 → visible element f0_gfx.',
    },
  },
  {
    test: /gsap\.(fromto|from|to)/i,
    explain: {
      title: 'gsap.to / from / fromTo',
      category: 'GSAP',
      body: 'Animate properties: to() animates to values, from() from values, fromTo() between two sets. Common for play()/stop().',
      affects: 'Drives the in/out animation.',
    },
  },
  {
    test: /killtweensof/i,
    explain: {
      title: 'gsap.killTweensOf()',
      category: 'GSAP',
      body: 'Stops any running animations on a target before starting a new one — prevents overlapping play/stop tweens.',
    },
  },
  {
    test: /getelementbyid/i,
    explain: {
      title: 'getElementById()',
      category: 'JS',
      body: 'Finds the element with a given id so you can read or change it — e.g. write a field value into f0_gfx.',
    },
  },
  {
    test: /queryselector(all)?/i,
    explain: {
      title: 'querySelector / querySelectorAll',
      category: 'JS',
      body: 'Finds elements by CSS selector. querySelectorAll(".spx-data") returns every hidden data holder.',
    },
  },
  {
    test: /\d+px/i,
    explain: {
      title: 'px (pixels)',
      category: 'CSS',
      body: 'A pixel measurement. The canvas is 1920×1080, so left: 960px is the horizontal center.',
    },
  },
];
