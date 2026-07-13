// The permanent prompt pieces of the video harness: the NoaCG motion-design principles
// (taste), the Remotion contract (hard requirements the validator enforces), and one
// canonical example composition (a REAL module that passes the full pipeline - the taste
// anchor, like lt01 is for SPX templates).

export const MOTION_PRINCIPLES = `## NoaCG motion-design principles (the permanent quality bar)
- Clear visual hierarchy: one hero element; everything else supports it. If everything is
  big, nothing is.
- Purposeful movement: every animation exists to direct attention or express energy - no
  decoration-only motion. If removing a movement changes nothing, remove it.
- Excellent typography: deliberate size CONTRAST (hero type 3-6x support type), tight
  letter-spacing on large text, generous on small caps labels. System font stacks are fine
  when chosen well (e.g. 'Arial Black', Helvetica for impact; Georgia for editorial).
- Readability first: text holds still long enough to read (≥ 18 frames for a short line),
  strong contrast against what it actually sits on.
- Professional easing: springs and clamped interpolate curves with intent - decisive
  entrances (fast start, soft landing), sharp exits (accelerate away). NEVER linear for an
  entrance or exit; linear only for continuous travel.
- Intentional timing: choreograph on a beat grid; stagger related elements 2-5 frames.
- Decisive entrances and exits: the piece starts with confidence and ENDS CLEANLY - by the
  last frame everything has exited or settled deliberately (no mid-motion freeze).
- Restraint: 1-2 typefaces, one accent color doing sharp small work, black/white/greys
  doing the heavy lifting. Fewer, better-choreographed elements over busy scenes.
- Broadcast polish: subtle depth (soft shadows, layered darks), no default-blue, no pure
  #FF0000, no rainbow gradients.
- Compose for the WHOLE frame: the hero occupies a confident share of it (a title spans
  roughly half the width; a full-frame piece like a stinger covers the frame at its peak).
  Never a small element adrift in empty space - if it reads as under-scale, it is. Use the
  frame's own width/height fractions to size things.
- No placeholder design, ever. These are the signs of an unfinished result, and none may
  ship: a flat grey/neutral rectangle standing in for real content; the literal word
  "LOGO"/"TEXT" as a stand-in; a lone element doing a weak center-screen fade with no
  structure; arbitrary drift that isn't choreographed; a thin washed-out gradient. If an
  intended element (a logo image) is absent, design a real substitute - see the contract.`;

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
- The component receives assets as a prop: \`{ assets = {} }: { assets?: Record<string,
  string> }\` mapping logical asset names to URLs. Use <Img src={assets['name']}/> from
  remotion for images and <Video src={assets['name']}/> for video assets - NEVER
  OffthreadVideo (asset URLs are data/blob URLs, which its frame extractor cannot read).
  NEVER invent URLs or file paths; only use the asset names you were given.
- Missing assets are the common case (the brief may name a "logo" with none uploaded). When
  an expected image is absent, design a REAL substitute, never a placeholder: for a logo or
  brand reveal, set a typographic WORDMARK (bold, tight-tracked, uppercase - a designed
  logotype), the same hero the image would have been. Under NO circumstances render a grey
  box or the literal text "LOGO". Only branch to <Img> when the named asset actually exists.
- Transparent projects: the root <AbsoluteFill> paints NO background. Opaque projects:
  paint a deliberate background (a designed dark gradient beats flat black).
- Write clean, readable code a motion designer can edit: descriptive names, short comments
  explaining the WHY of each phase, timing constants gathered near the top. No cleverness,
  no premature abstraction.
- Keep it self-contained and under ~300 lines.`;

/** The canonical example - REAL module that passes compile, static checks, and the probe. */
export const EXAMPLE_COMPOSITION = `// "Prime Sting" - a 3s broadcast stinger: angled panels sweep through, the title snaps
// in at center with a light sweep, everything clears sharply. The shape of a good module:
// timing constants up top, phases as clearly named sections, everything frame-derived.

import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition({ assets = {} }: { assets?: Record<string, string> }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // ── Timing (in frames, derived from fps so any frame rate works) ───────────
  const sweepStart = 0;                                  // panels enter immediately
  const titleStart = Math.round(fps * 0.35);             // title lands as panels settle
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
  const titleExit = interpolate(frame, [exitStart, exitStart + fps * 0.35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const logo = assets['logo']; // optional - the layout works with or without it

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(160deg, #0c0f14 30%, #141a24 100%)' }}>
      {/* Sweeping panels (behind the title) */}
      {panels.map(({ x, i }) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: width * 0.9,
            height: height * (0.16 - i * 0.03),
            background: i === 1 ? '#f6a623' : i === 0 ? '#1d2634' : '#2c3a52',
            transform: \`translate(-50%, -50%) translate(\${x}px, \${(i - 1) * height * 0.17}px) rotate(-8deg)\`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}
        />
      ))}

      {/* Title block: masked rise + light sweep + breathing hold */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            overflow: 'hidden',
            padding: '0.1em 0.3em',
            transform: \`translateX(\${titleExit * -width * 0.4}px) scale(\${breathe})\`,
            opacity: 1 - titleExit,
          }}
        >
          <div
            style={{
              position: 'relative',
              transform: \`translateY(\${(1 - titleIn) * 110}%)\`,
              color: '#f4f5f7',
              fontFamily: '"Arial Black", "Arial Bold", Arial, sans-serif',
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
            Prime Time
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
      </AbsoluteFill>
    </AbsoluteFill>
  );
}`;
