import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition({
  assets = {},
  fields = {},
}: {
  assets?: Record<string, string>;
  fields?: Record<string, string | number>;
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // ── Editable content ────────────────────────────────────────────────────
  const winnerName = String(fields.winnerName ?? 'AURORA VANE');
  const badgeLabel = String(fields.badgeLabel ?? 'Winner · Public Vote');
  const accent = String(fields.accent ?? '#e3b866'); // warm champagne gold

  // Split the hero into two stacked words for the masked line reveal.
  const words = winnerName.split(' ');
  const wordA = words[0] ?? 'AURORA';
  const wordB = words.slice(1).join(' ') || 'VANE';

  // ── Timing constants (frames, derived from fps) ─────────────────────────
  const curtainShutBy = Math.round(fps * 0.6); // 18f: slabs slam together
  const shutStagger = 3;
  const splitStart = curtainShutBy; // slabs part at 0.6s
  const badgeStart = Math.round(fps * 1.8); // badge starts dropping
  const badgeLand = Math.round(fps * 2.1);
  const heroStart = Math.round(fps * 2.1); // word masks begin
  const heroWordStagger = 4;
  const holdStart = Math.round(fps * 3.0);
  const shimmerAt = Math.round(fps * 3.4);
  const exitStart = Math.round(fps * 4.0); // text starts lifting out
  const exitTextStagger = 4;
  const slabCloseStart = Math.round(fps * 4.15); // slabs converge again
  const particleFadeStart = durationInFrames - 6;

  // ── Background: graphite -> warm near-black vertical gradient ──────────
  // Subtle gold undertone pooling low-centre, like stage-floor wash light.
  const bgStyle: React.CSSProperties = {
    background:
      'linear-gradient(180deg, #0b0b10 0%, #14110f 55%, #1c1712 100%)',
  };

  // ── Ambient scale-creep during the hold (2% over the hold window) ───────
  const holdCreep = interpolate(
    frame,
    [holdStart, durationInFrames],
    [1, 1.02],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // ── Curtain slabs: enter from corners, slam shut, part, hold, close ─────
  // Slab A: top-left origin; Slab B: bottom-right origin.
  const shutSpring = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 180 } });

  const splitSpring = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 180 } });

  const closeSpring = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 190 } });

  // Slab A (left leaf)
  const aShut = shutSpring(0);
  const aSplit = splitSpring(splitStart);
  const aClose = closeSpring(slabCloseStart);
  // Position: off-frame top-left -> centre (shut) -> pulled left third (split) -> centre again (close)
  const aShutX = interpolate(aShut, [0, 1], [-width * 0.8, 0]);
  const aSplitX = interpolate(aSplit, [0, 1], [0, -width * 0.62]);
  const aCloseX = interpolate(aClose, [0, 1], [0, width * 0.62]);
  const aX = aShutX + aSplitX + aCloseX;

  // Slab B (right leaf)
  const bShut = shutSpring(shutStagger);
  const bSplit = splitSpring(splitStart + shutStagger);
  const bClose = closeSpring(slabCloseStart + shutStagger);
  const bShutX = interpolate(bShut, [0, 1], [width * 0.8, 0]);
  const bSplitX = interpolate(bSplit, [0, 1], [0, width * 0.62]);
  const bCloseX = interpolate(bClose, [0, 1], [0, -width * 0.62]);
  const bX = bShutX + bSplitX + bCloseX;

  // Slabs fully fade with the base gradient by the very end.
  const slabFadeOut = interpolate(
    frame,
    [slabCloseStart + fps * 0.5, durationInFrames],
    [1, 0.94],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // ── Seam glow: gold hairline where slabs meet, strongest at shut/close ──
  const seamShut = interpolate(frame, [curtainShutBy - 4, curtainShutBy + 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const seamOpen = interpolate(frame, [splitStart, splitStart + fps * 0.3], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const seamClose = interpolate(
    frame,
    [slabCloseStart, slabCloseStart + fps * 0.35],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const seamGlow = Math.max(seamShut * seamOpen, seamClose);

  // ── Spotlight bloom: blooms up behind the reveal, breathes through hold ─
  const bloomIn = interpolate(frame, [splitStart, splitStart + fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomOut = interpolate(frame, [exitStart, exitStart + fps * 0.6], [1, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomOpacity = bloomIn * bloomOut;

  // ── Particle field: 40 seeded gold motes, deterministic per-index ──────
  const particleCount = 40;
  const particleFade = interpolate(
    frame,
    [particleFadeStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const seed = `particle-${i}`;
    const startX = random(seed + '-x') * width;
    const baseY = random(seed + '-y') * height;
    const speed = 8 + random(seed + '-speed') * 18; // px/sec upward
    const size = height * 0.003 * (1 + random(seed + '-size') * 2.2); // 2-3x variance
    const opacity = 0.2 + random(seed + '-op') * 0.6;
    // Loop the drift with modulo so motion is continuous and deterministic.
    const travel = (frame / fps) * speed;
    const y = ((baseY - travel) % (height + 40) + (height + 40)) % (height + 40) - 20;
    return { x: startX, y, size, opacity: opacity * particleFade, key: i };
  });

  // ── Badge: gold pill, masked drop-in, exits first (fastest, earliest) ──
  const badgeIn = spring({
    frame: frame - badgeStart,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const badgeExit = interpolate(
    frame,
    [exitStart, exitStart + Math.round(fps * 0.4)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const badgeY = interpolate(badgeIn, [0, 1], [-height * 0.12, 0]) - badgeExit * height * 0.18;
  const badgeOpacity = interpolate(badgeIn, [0, 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * (1 - badgeExit);

  // ── Hero wordmark: two masked lines, staggered, spring with overshoot ──
  const heroSpring = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 175 } });
  const aWordSpring = heroSpring(heroStart);
  const bWordSpring = heroSpring(heroStart + heroWordStagger);

  const heroExitStart = exitStart + exitTextStagger;
  const heroExit = interpolate(
    frame,
    [heroExitStart, heroExitStart + Math.round(fps * 0.4)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const heroExitY = -heroExit * height * 0.2;
  const heroExitOpacity = 1 - heroExit;

  // Slight scale overshoot on landing: 1.06 -> 1.0
  const heroScale = (s: number) => interpolate(s, [0, 0.7, 1], [1.06, 1.02, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Font size derived from string width: capAdvance ~0.68em (Archivo-ish bold display).
  const capAdvance = 0.72;
  const charCount = winnerName.length; // includes the space, per plan
  const targetWidth = width * 0.68;
  const heroFontSize = targetWidth / (charCount * capAdvance);

  // Shimmer sweep: a single left-to-right specular pass across the wordmark at ~3.4s.
  const shimmerX = interpolate(
    frame,
    [shimmerAt, shimmerAt + Math.round(fps * 0.6)],
    [-40, 140],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={bgStyle}>
      {/* Gold undertone pooling low-centre, like stage-floor wash light */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 80% 45% at 50% 100%, rgba(227,184,102,0.10) 0%, rgba(227,184,102,0) 65%)',
        }}
      />

      {/* Spotlight bloom behind the reveal */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 46%, rgba(227,184,102,${0.28 * bloomOpacity}) 0%, rgba(227,184,102,${0.1 * bloomOpacity}) 35%, rgba(227,184,102,0) 65%)`,
          transform: `scale(${holdCreep})`,
        }}
      />

      {/* Gold particle field - deterministic, behind the reveal, never over text */}
      {particles.map((p) => (
        <div
          key={p.key}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: accent,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px rgba(227,184,102,0.5)`,
          }}
        />
      ))}

      {/* Seam hairline glow where the slabs meet */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 3,
          transform: 'translateX(-50%)',
          background: accent,
          opacity: seamGlow * 0.9,
          boxShadow: `0 0 40px 6px ${accent}`,
          zIndex: 5,
        }}
      />

      {/* Curtain slab A (left leaf) - lit graphite surface with gold rim */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: width * 0.62,
          height: height * 1.3,
          transform: `translate(-50%, -50%) translateX(${aX}px) rotate(-6deg) scale(${slabFadeOut})`,
          background: 'linear-gradient(120deg, #262019 0%, #1a1512 55%, #0e0c0a 100%)',
          borderRight: `3px solid ${accent}`,
          boxShadow: `4px 0 24px rgba(227,184,102,0.25), 0 20px 60px rgba(0,0,0,0.5)`,
          zIndex: 4,
        }}
      />

      {/* Curtain slab B (right leaf) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: width * 0.62,
          height: height * 1.3,
          transform: `translate(-50%, -50%) translateX(${bX}px) rotate(6deg) scale(${slabFadeOut})`,
          background: 'linear-gradient(300deg, #262019 0%, #1a1512 55%, #0e0c0a 100%)',
          borderLeft: `3px solid ${accent}`,
          boxShadow: `-4px 0 24px rgba(227,184,102,0.25), 0 20px 60px rgba(0,0,0,0.5)`,
          zIndex: 4,
        }}
      />

      {/* Badge + hero wordmark - paint LAST, topmost, above all curtain layers */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Badge chip */}
          <div
            style={{
              overflow: 'hidden',
              marginBottom: height * 0.035,
            }}
          >
            <div
              style={{
                transform: `translateY(${badgeY}px)`,
                opacity: badgeOpacity,
                background: `linear-gradient(180deg, ${accent} 0%, #b8894a 100%)`,
                padding: `${height * 0.012}px ${height * 0.03}px`,
                borderRadius: height * 0.03,
                boxShadow: '0 6px 18px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.35)',
              }}
            >
              <span
                style={{
                  fontFamily: '"Inter", Arial, Helvetica, sans-serif',
                  fontSize: height * 0.028,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#2a1c0d',
                }}
              >
                {badgeLabel}
              </span>
            </div>
          </div>

          {/* Hero wordmark: two masked line-boxes, gold-lit fill */}
          <div
            style={{
              position: 'relative',
              transform: `translateY(${heroExitY}px)`,
              opacity: heroExitOpacity,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {[
              { word: wordA, s: aWordSpring },
              { word: wordB, s: bWordSpring },
            ].map(({ word, s }, i) => (
              <div key={i} style={{ overflow: 'hidden', padding: '0.05em 0.2em' }}>
                <div
                  style={{
                    transform: `translateY(${(1 - s) * 100}%) scale(${heroScale(s)})`,
                    position: 'relative',
                    fontFamily: '"Archivo", "Arial Black", Arial, sans-serif',
                    fontSize: heroFontSize,
                    fontWeight: 900,
                    letterSpacing: '-0.015em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    backgroundImage: `linear-gradient(180deg, #f5e0ad 0%, ${accent} 45%, #a97c3f 100%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))',
                  }}
                >
                  {word}
                  {/* Shimmer sweep - single specular pass, sole counter-accent */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(100deg, transparent 44%, rgba(255,255,255,0.55) 50%, transparent 56%)',
                      transform: `translateX(${shimmerX}%)`,
                      mixBlendMode: 'overlay',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
