import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// "Aurora Vane Reveal" - a 5s stinger: gold ribbon slabs sweep in and cover the frame,
// then iris apart to unveil the wordmark via a mask-wipe (the reveal IS the curtain-open).
// Layering (back to front): stage gradient -> spotlight bloom + particles -> ribbon slabs
// -> kicker chip -> wordmark (always last, always on top once landed).

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
  const headline = String(fields.headline ?? 'AURORA VANE');
  const kicker = String(fields.kicker ?? 'WINNER · PUBLIC VOTE');
  const accent = String(fields.accent ?? '#e8c377');

  // ── Timing (frames, derived from fps so any frame rate works) ──────────
  const sweepStart = Math.round(fps * 0.6); // ribbons begin snapping in
  const coveredAt = Math.round(fps * 1.3); // fully covering the frame / iris begins
  const irisDur = Math.round(fps * 0.65); // spring duration to settled angled rest
  const wipeStart = coveredAt; // wordmark mask-wipe begins with the iris-open
  const wipeDur = 14; // clamped 14-frame reveal per spec
  const chipStart = wipeStart + 4; // kicker trails 4 frames behind
  const exitStart = Math.round(fps * 4.0); // ribbons accelerate off
  const exitDur = 13; // faster than the entrance

  // ── Background: graphite-to-warm-black stage gradient ──────────────────
  const bgGradient = 'linear-gradient(180deg, #0b0a10 0%, #120e0d 55%, #1a1410 100%)';

  // ── Spotlight bloom: fades in during anticipation, then breathes gently ─
  const bloomIn = interpolate(frame, [0, Math.round(fps * 0.6)], [0.2, 0.55], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomPulse = 1 + Math.sin((Math.max(0, frame - coveredAt) / fps) * Math.PI * (1 / 2)) * 0.03;
  const bloomScale = frame > coveredAt ? bloomPulse : 1;

  // ── Gold particle field: 24 seeded motes drifting linearly, never resetting look ─
  const particles = Array.from({ length: 24 }, (_, i) => {
    const seed = `mote-${i}`;
    const startX = random(seed + '-x') * width;
    const startY = random(seed + '-y') * height;
    const speed = 6 + random(seed + '-s') * 10; // px per second, slow drift
    const size = 1.5 + random(seed + '-sz') * 3;
    const opacity = 0.2 + random(seed + '-o') * 0.5;
    const driftY = (startY - (frame / fps) * speed) % (height + 40);
    const y = driftY < -20 ? driftY + height + 40 : driftY;
    return { x: startX, y, size, opacity, key: i };
  });

  // ── Ribbon slabs: sweep in (spring), iris apart (spring), then exit (ease-in) ──
  const buildSlab = (side: 'left' | 'right') => {
    const dir = side === 'left' ? -1 : 1;

    // Phase A: snap in from off-frame to covering the center (0.6s -> 1.3s)
    const sweepIn = spring({
      frame: frame - sweepStart,
      fps,
      config: { damping: 15, mass: 0.8, stiffness: 180 },
    });
    const coveredX = interpolate(sweepIn, [0, 1], [dir * width * 1.1, 0]);

    // Phase B: iris apart to settled angled rest positions either side of center
    const irisOpen = spring({
      frame: frame - coveredAt,
      fps,
      config: { damping: 14, mass: 0.8, stiffness: 150 },
    });
    const restX = dir * width * 0.32;
    const irisedX = interpolate(irisOpen, [0, 1], [0, restX]);

    // Phase C: accelerate off-frame further (ease-in, faster than entrance)
    const exitT = interpolate(frame, [exitStart, exitStart + exitDur], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const exitEase = exitT * exitT * exitT; // ease-in acceleration
    const exitX = dir * exitEase * width * 1.3;

    const x = frame < coveredAt ? coveredX : irisedX + exitX;
    const angle = dir * (8 + irisOpen * 4);

    // Subtle one-shot shimmer sweep across the gold surface during the hold
    const shimmerStart = Math.round(fps * 2.4);
    const shimmer = interpolate(frame, [shimmerStart, shimmerStart + Math.round(fps * 0.5)], [-40, 140], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return { x, angle, shimmer, side };
  };

  const leftSlab = buildSlab('left');
  const rightSlab = buildSlab('right');

  // ── Wordmark: sized from its own string so the settled line spans ~68% width ──
  const capAdvance = 0.42; // approx measured advance for the condensed display face used
  const charCount = headline.length || 10;
  const fontSize = Math.round((width * 0.68) / (charCount * capAdvance));

  const wipe = interpolate(frame, [wipeStart, wipeStart + wipeDur], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Kicker chip drops in with a quick spring settle above the wordmark
  const chipSpring = spring({
    frame: frame - chipStart,
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 200 },
  });
  const chipY = interpolate(chipSpring, [0, 1], [-24, 0]);
  const chipOpacity = interpolate(frame, [chipStart, chipStart + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: bgGradient }}>
      {/* Spotlight bloom, fixed above center, breathing gently during the hold */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 50% 32%, rgba(232,195,119,0.28) 0%, rgba(232,195,119,0.10) 45%, rgba(0,0,0,0) 75%)',
          opacity: bloomIn,
          transform: `scale(${bloomScale})`,
        }}
      />

      {/* Vignette to darken corners and pop the gold */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 75% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Drifting gold particle motes */}
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
            boxShadow: `0 0 ${p.size * 2}px rgba(232,195,119,0.6)`,
          }}
        />
      ))}

      {/* Ribbon slabs: rear darker panel + front brighter foil-lit panel, layered gold */}
      {[leftSlab, rightSlab].map((slab) => (
        <div
          key={slab.side}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: width * 0.62,
            height: height * 1.3,
            transform: `translate(-50%, -50%) translateX(${slab.x}px) rotate(${slab.angle}deg)`,
          }}
        >
          {/* rear, darker/desaturated gold panel for depth */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translateX(${slab.side === 'left' ? -1 : 1} * 3%)`,
              backgroundColor: '#5c4a2a',
              backgroundImage:
                'linear-gradient(100deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.4) 100%)',
              opacity: 0.9,
            }}
          />
          {/* front, brighter foil-lit gold panel with hairline highlight */}
          <div
            style={{
              position: 'absolute',
              inset: '0 6% 0 6%',
              backgroundColor: '#c79a4b',
              backgroundImage:
                'linear-gradient(100deg, rgba(255,240,210,0.55) 0%, rgba(232,195,119,0.9) 18%, rgba(150,105,45,0.95) 60%, rgba(90,62,25,0.95) 100%)',
              boxShadow: 'inset 1px 0 0 rgba(255,244,214,0.7), 0 25px 70px rgba(0,0,0,0.5)',
            }}
          >
            {/* one-shot shimmer sweep during the hold */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)',
                transform: `translateX(${slab.shimmer}%)`,
              }}
            />
          </div>
        </div>
      ))}

      {/* Kicker chip: sits above the wordmark, drops in staggered */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: `translateY(${-fontSize * 0.72}px)`,
          }}
        >
          <div
            style={{
              transform: `translateY(${chipY}px)`,
              opacity: chipOpacity,
              padding: `${Math.round(height * 0.012)}px ${Math.round(height * 0.03)}px`,
              borderRadius: 999,
              background: 'rgba(90,62,25,0.55)',
              border: '1px solid rgba(232,195,119,0.5)',
              marginBottom: Math.round(height * 0.02),
            }}
          >
            <span
              style={{
                fontFamily: '"JetBrains Mono", "Inter", Arial, sans-serif',
                fontSize: Math.round(height * 0.03),
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#f3ead8',
              }}
            >
              {kicker}
            </span>
          </div>

          {/* Wordmark: mask-wipe reveal left-to-right, gold foil with darker edge + shadow */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              lineHeight: 1,
            }}
          >
            <div
              style={{
                clipPath: `inset(0 ${100 - wipe}% 0 0)`,
                fontFamily: '"Archivo", "Arial Narrow", Arial, sans-serif',
                fontSize,
                fontWeight: 900,
                letterSpacing: '-0.015em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                color: accent,
                textShadow:
                  '0 0 24px rgba(232,195,119,0.45), 0 6px 18px rgba(0,0,0,0.55), 0 2px 0 #6b4d20',
                WebkitTextStroke: '1px #7a5a24',
              }}
            >
              {headline}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
