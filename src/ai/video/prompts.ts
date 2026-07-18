// The permanent prompt pieces of the video harness: the NoaCG motion-design principles
// (taste), the Remotion contract (hard requirements the validator enforces), and one
// canonical example composition (a REAL module that passes the full pipeline - the taste
// anchor, like lt01 is for SPX templates).

import { videoFontFamiliesDoc } from '../../video/videoFonts';

export const MOTION_PRINCIPLES = `## NoaCG motion-design principles (the permanent quality bar)
- A COMMITTED CONCEPT: every piece is built around ONE memorable device you could name in
  a sentence ("the title assembles from sliced slabs", "a gold ribbon carries the
  reveal", "steam curls rise into the wordmark"). Choose it deliberately and let every
  element serve it. A technically clean result that reads as a neutral default template
  is a FAILURE of this bar - design something this brief, and only this brief, deserves.
- Clear visual hierarchy: one hero element; everything else supports it. If everything is
  big, nothing is.
- Purposeful movement: every animation exists to direct attention or express energy - no
  decoration-only motion. If removing a movement changes nothing, remove it.
- Excellent typography: deliberate size CONTRAST (hero type 3-6x support type), tight
  letter-spacing on large text, generous on small caps labels. Prefer the BUNDLED broadcast
  faces (listed in the contract) for hero type - the right face is the biggest single lever
  on a premium look. A well-chosen system stack is still fine where nothing bundled fits
  (e.g. Georgia / 'Times New Roman' for a serif/editorial look, since the bundled set is
  sans/display/mono). Size EVERY piece of type from the frame (fractions of height/width),
  never a fixed px value - a support/kicker line is around height*0.025-0.035; a hardcoded
  22px kicker on a 1080p canvas is unreadably small.
- SIZE THE HERO FROM ITS OWN STRING, never from a height fraction. Each bundled face lists
  its measured width per uppercase character (the contract's font list); a height fraction
  knows nothing about how long the title is or how wide the face runs, which is why it
  fails in BOTH directions - long strings in a wide face overflow, short strings in a
  narrow face come out timid.
  Work it out explicitly, in this order:
    charWidth = fontSize * capAdvance(face)     // capAdvance is given per face
    lineWidth = charWidth * characters          // include the spaces
  Choose fontSize so the settled hero line spans 55-80% of the frame width - that is a
  FLOOR as much as a ceiling - and never more than 88%. A 4-character word therefore takes
  a far larger fontSize than a 14-character one, in the same design.
  VERY SHORT HEROES ARE THE EXCEPTION: at roughly three characters or fewer - a countdown
  numeral, a monogram, "GO" - the width band stops meaning anything (one digit would demand
  an absurd size to span half the frame), so HEIGHT governs instead: set such a hero to
  about 35-60% of the frame height and let its width fall where it falls. The point of both
  rules is the same - a hero that owns the frame - so never read the width band as licence
  to shrink a single numeral until it spans 55%, and never let a short hero sit small just
  because the arithmetic was written for words.
  Then CHECK the result: at the settled moment no readable text may cross the frame edge or
  clip against an overflow mask. A line set with white-space: nowrap has no safety net -
  it will not wrap, it will simply run off the frame - so it must be sized to fit outright.
- Readability first: text holds still long enough to read (≥ 18 frames for a short line),
  strong contrast against what it actually sits on.
- Professional easing: springs and clamped interpolate curves with intent - decisive
  entrances (fast start, soft landing), sharp exits (accelerate away). NEVER linear for an
  entrance or exit; linear only for continuous travel.
- Intentional timing: choreograph on a beat grid; stagger related elements 2-5 frames.
- Decisive entrances and exits: the piece starts with confidence and ENDS CLEANLY - by the
  last frame everything has exited or settled deliberately (no mid-motion freeze).
- THE BRIEF PICKS THE PALETTE WORLD: audience, genre, and energy decide whether the piece
  lives in layered darks, daylight warmth, rich saturated colour, or airy light tones - a
  warm morning look executed with depth is exactly as premium as a graphite newsroom.
  Within the chosen world keep discipline: neutrals carry the frame, one or two accents do
  sharp work. No rainbow/multi-hue gradients (tonal SAME-HUE shading is the depth tool),
  no default-blue, no pure #FF0000.
- Restraint in COUNT, not in character: 1-2 typefaces and few, well-choreographed
  elements - but give each one material character (a lit surface, a texture, a strong
  silhouette). Minimal is a design choice; empty is not.
- No flat colour walls: any shape covering a large share of the frame is a LIT surface -
  give it a soft same-hue gradient, an edge highlight or hairline keyline where it meets
  another layer, and a shadow separating it from what is behind. Overlapping panels stay
  individually readable (distinct tones, visible edges); if the layers collapse into one
  flat fill, the depth is gone and the piece reads cheap.
- Deliberate stacking, text on top: paint back-to-front - background, then shape layers,
  then text/logo LAST in the JSX (explicit zIndex when in doubt). Once a text element has
  landed and is readable, nothing sweeps over or covers it: a covering wipe happens BEFORE
  the text lands, and text exits BEFORE (or with) the panels under it, never after.
- Compose for the WHOLE frame: the hero occupies a confident share of it (a title spans
  roughly half the width; a full-frame piece like a stinger covers the frame at its peak).
  Never a small element adrift in empty space - if it reads as under-scale, it is. Use the
  frame's own width/height fractions to size things.
- No placeholder design, ever. These are the signs of an unfinished result, and none may
  ship: a flat grey/neutral rectangle standing in for real content; the literal word
  "LOGO"/"TEXT" as a stand-in; a lone element doing a weak center-screen fade with no
  structure; arbitrary drift that isn't choreographed; a thin washed-out gradient - and
  the uncommitted default: a centred word on a plain dark radial gradient with a light
  sweep and a small-caps kicker. That last one is this tool's most common failure; it
  only passes when the brief asks for exactly that. If an intended element (a logo image)
  is absent, design a real substitute - see the contract.`;

export const REMOTION_CONTRACT = `## The composition contract (hard requirements - the validator enforces these)
- ONE complete TSX module. Imports ONLY from 'react' and 'remotion'. Default-export the
  composition component. No other files exist.
- Everything derives from useCurrentFrame() and useVideoConfig(). The same frame ALWAYS
  renders the same image (scrubbing, replay, and the final render depend on it).
- Read duration/fps/size from useVideoConfig() - NEVER hardcode them. Scale layout to the
  frame: compute sizes from width/height fractions where it matters.
- Animate with interpolate() (ALWAYS pass extrapolateLeft/Right: 'clamp' unless the value
  must keep traveling) and spring({ frame, fps, config }). Structure phases with
  <Sequence from={...} durationInFrames={...}> where it clarifies the timeline.
- Randomness ONLY via remotion's random(seed) with a stable string seed - NEVER
  Math.random. No Date.now, no timers (setTimeout/setInterval/requestAnimationFrame), no
  fetch/network, no window/document/globalThis access, no useState for animation.
- The component receives TWO props: \`{ assets = {}, fields = {} }: { assets?:
  Record<string, string>; fields?: Record<string, string | number> }\`. \`assets\` maps
  logical asset names to URLs; use <Img src={assets['name']}/> from remotion for images and
  <Video src={assets['name']}/> for video assets - NEVER OffthreadVideo (asset URLs are
  data/blob URLs, which its frame extractor cannot read). NEVER invent URLs or file paths;
  only use the asset names you were given. \`fields\` carries the editable inputs (below).
- Missing assets are the common case (the brief may name a "logo" with none uploaded). When
  an expected image is absent, design a REAL substitute, never a placeholder: for a logo or
  brand reveal, set a typographic WORDMARK (bold, tight-tracked, uppercase - a designed
  logotype), the same hero the image would have been. Under NO circumstances render a grey
  box or the literal text "LOGO". Only branch to <Img> when the named asset actually exists.
- EDITABLE INPUTS (the video Template Definition): expose the content a non-technical user
  would want to change - the headline/title text, a subtitle or kicker, an accent colour, a
  score or a count - as \`fields\` the module reads, and DECLARE each in the emit tool's
  \`inputs\` array. Read every one with a fallback that equals its declared default:
  \`const headline = fields.headline ?? 'PRIME TIME';\` and
  \`const accent = String(fields.accent ?? '#f6a623');\`. The module MUST still render with
  no fields (the fallbacks). Expose only REAL content choices (typically 2-5); keep timing,
  layout, and animation constants in code - not every value becomes an input. Use types:
  text (copy), number (a score/count, with min/max), color (a hex accent), select (a small
  set of choices), image (which uploaded asset fills a slot). Declare [] only when the piece
  truly has no editable content.
- IMAGE INPUTS let the operator choose WHICH uploaded asset fills a slot (a logo, a
  background) without code. The field value is an asset's LOGICAL NAME, so read it against
  the assets prop and branch on presence exactly like a directly-named asset:
  \`const logoName = String(fields.logo ?? '');\` then
  \`const logo = assets[logoName] || assets['knownName'];\` then
  \`{logo ? <Img src={logo} .../> : <a designed wordmark/>}\`. The declared \`default\` is a
  known asset name when one is uploaded, else \`''\`. NEVER put a URL or file data in the
  field value - the URL always comes from the assets prop. Only declare an image input when a
  real image slot exists; the "missing image -> designed substitute" rule above still applies.
- Transparent projects: the root <AbsoluteFill> paints NO background. Opaque projects:
  paint a deliberate background (a designed dark gradient beats flat black).
- BUNDLED FONTS - these broadcast faces are already loaded in BOTH the preview and the
  final render; use one by writing its family name in fontFamily (with a fallback), e.g.
  \`fontFamily: '"Bebas Neue", "Arial Narrow", Arial, sans-serif'\`. Available:
${videoFontFamiliesDoc()}
  Do NOT @font-face, import, link, or fetch a font - they are pre-injected, and any
  network/URL font load is rejected by the validator. A system stack (Arial, Georgia, …)
  is allowed where none of the above fits (there is no bundled serif).
- Write clean, readable code a motion designer can edit: descriptive names, short comments
  explaining the WHY of each phase, timing constants gathered near the top. No cleverness,
  no premature abstraction.
- Keep it self-contained and under ~300 lines.`;

/** The canonical example - REAL module that passes compile, static checks, and the probe. */
export const EXAMPLE_COMPOSITION = `// "Prime Sting" - a 3s broadcast stinger: angled panels sweep through, the title snaps
// in at center with a light sweep, everything clears sharply. The shape of a good module:
// timing constants up top, phases as clearly named sections, everything frame-derived.
// Layering: panels are LIT surfaces (same-hue shading + edge keyline), and all text paints
// LAST, above every panel (zIndex) - text exits first, panels after.

import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition({
  assets = {},
  fields = {},
}: {
  assets?: Record<string, string>;
  fields?: Record<string, string | number>;
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Editable content (declared as inputs; every read falls back to the default) ─
  const title = String(fields.title ?? 'Prime Time');
  const kicker = String(fields.kicker ?? 'Saturday · Live');
  const accent = String(fields.accent ?? '#f6a623');

  // ── Timing (in frames, derived from fps so any frame rate works) ───────────
  const sweepStart = 0;                                  // panels enter immediately
  const titleStart = Math.round(fps * 0.35);             // title lands as panels settle
  const kickerStart = titleStart + Math.round(fps * 0.15); // support line trails the hero
  const exitStart = durationInFrames - Math.round(fps * 0.55); // sharp clear-out at the end

  // ── Phase 1: three angled panels sweep across with a tight stagger ─────────
  // Each panel is a full-height slab, rotated slightly; they carry the entrance energy.
  const panels = [0, 1, 2].map((i) => {
    const enter = spring({
      frame: frame - (sweepStart + i * 3),               // 3-frame stagger between panels
      fps,
      config: { damping: 16, stiffness: 190 },
    });
    const exit = interpolate(frame, [exitStart + i * 2, exitStart + i * 2 + fps * 0.4], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    // Travel: from off-left, through center, out off-right on exit.
    const x = interpolate(enter, [0, 1], [-width * 1.2, 0]) + exit * width * 1.3;
    return { x, i };
  });

  // ── Phase 2: the title snaps in behind a mask, with a specular light sweep ─
  const titleIn = spring({ frame: frame - titleStart, fps, config: { damping: 15, stiffness: 160 } });
  const sweep = interpolate(frame, [titleStart + fps * 0.4, titleStart + fps * 1.1], [-30, 130], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Ambient hold: the settled title breathes ~1.5% so the hold never feels frozen.
  const breathe = 1 + Math.sin((frame / fps) * Math.PI * 0.8) * 0.015;
  const kickerIn = interpolate(frame, [kickerStart, kickerStart + fps * 0.25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleExit = interpolate(frame, [exitStart, exitStart + fps * 0.35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const logoName = String(fields.logo ?? ''); // an image input: which uploaded asset is the logo
  const logo = assets[logoName]; // optional - the layout works with or without it

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(160deg, #0c0f14 30%, #141a24 100%)' }}>
      {/* Sweeping panels (behind the title). Each is a LIT surface, never a flat fill:
          a same-hue shading gradient over the base colour plus a hairline top edge, so
          overlapping layers stay individually readable. */}
      {panels.map(({ x, i }) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: width * 0.9,
            height: height * (0.16 - i * 0.03),
            backgroundColor: i === 1 ? accent : i === 0 ? '#1d2634' : '#2c3a52',
            backgroundImage:
              'linear-gradient(165deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.28) 100%)',
            transform: \`translate(-50%, -50%) translate(\${x}px, \${(i - 1) * height * 0.17}px) rotate(-8deg)\`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 20px 60px rgba(0,0,0,0.35)',
          }}
        />
      ))}

      {/* Text block: paints LAST, above every panel (zIndex) - masked title rise + light
          sweep + breathing hold, with the kicker trailing in under it. */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: \`translateX(\${titleExit * -width * 0.4}px) scale(\${breathe})\`,
            opacity: 1 - titleExit,
          }}
        >
          <div style={{ overflow: 'hidden', padding: '0.1em 0.3em' }}>
            <div
              style={{
                position: 'relative',
                transform: \`translateY(\${(1 - titleIn) * 110}%)\`,
                color: '#f4f5f7',
                fontFamily: '"Archivo", "Arial Black", Arial, sans-serif', // a bundled face
                fontSize: Math.round(height * 0.13),
                fontWeight: 900,
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: Math.round(height * 0.03),
              }}
            >
              {logo && <Img src={logo} style={{ height: '1.1em', objectFit: 'contain' }} />}
              {title}
              {/* The light sweep: a moving specular band clipped to the title box */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.28) 50%, transparent 58%)',
                  transform: \`translateX(\${sweep}%)\`,
                }}
              />
            </div>
          </div>
          {/* Support line: sized from the frame (never a fixed px), tracked-out small caps */}
          <div
            style={{
              marginTop: Math.round(height * 0.018),
              fontFamily: '"Inter", Arial, Helvetica, sans-serif', // a bundled face
              fontSize: Math.round(height * 0.028),
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(244,245,247,0.78)',
              opacity: kickerIn,
              transform: \`translateY(\${(1 - kickerIn) * height * 0.02}px)\`,
            }}
          >
            {kicker}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}`;
