// "Landfall Fracture" - a 3s storm-coverage cold open stinger.
// Concept: LANDFALL is struck apart along one diagonal fracture line; the two halves
// slam together from opposite edges and collide exactly on frame, the crack flashing
// bright at impact before settling to a faint ember hairline behind the type.
// Structure: charge (bars frame the band) -> fracture slam entrance -> hero hold
// (ambient drift only) -> sharp exit (flash cue, halves snap out, bars retract).

import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';

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
  const headline = String(fields.headline ?? 'LANDFALL').toUpperCase();
  const accent = String(fields.accent ?? '#f2efe9'); // bright flash / settled wordmark colour
  const emberAccent = String(fields.emberAccent ?? '#c9673a'); // steady hairline tint
  const barColor = String(fields.barColor ?? '#d8e4e2'); // restraint bar tint

  // ── Timing (frames, derived from fps @30 -> matches the 90-frame brief) ──
  const barsInEnd = Math.round(fps * 0.267); // frame 8: bars land
  const collideFrame = Math.round(fps * 0.8); // frame 24: halves collide
  const entranceStart = barsInEnd; // frame 8
  const entranceFrames = collideFrame - entranceStart; // 16 frames
  const flashFrames = 6; // impact flash duration
  const exitStart = Math.round(fps * 2.2); // frame 66
  const exitFrames = 10; // frame 76: fully off-frame
  const barsRetractEnd = Math.round(fps * (80 / 30)); // frame 80
  const holdMid = (collideFrame + exitStart) / 2;

  // Split into two halves for the fracture device (roughly even, on a syllable-ish break)
  const mid = Math.max(1, Math.min(headline.length - 1, Math.round(headline.length / 2)));
  const left = headline.slice(0, mid);
  const right = headline.slice(mid);

  // ── Type sizing: solve fontSize so the FULL word spans ~70% of frame width ──
  // Bebas Neue measured capAdvance ~0.38 em per uppercase character.
  const CAP_ADVANCE = 0.38;
  const targetWidth = width * 0.70;
  const fontSize = Math.round(targetWidth / (CAP_ADVANCE * headline.length));

  // ── Power curves (no springs - news-grade decisive easing) ──────────────
  const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);
  const power2In = (t: number) => t * t;

  // Entrance progress for the two halves (0..1 across entranceFrames, with overshoot)
  const rawEntrance = interpolate(frame, [entranceStart, entranceStart + entranceFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const easedEntrance = power3Out(rawEntrance);
  // Micro-overshoot: a brief 1.5% scale bump over the last ~2 frames of the entrance
  const overshootWindow = interpolate(
    frame,
    [entranceStart + entranceFrames - 2, entranceStart + entranceFrames, entranceStart + entranceFrames + 4],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const overshootScale = 1 + overshootWindow * 0.015;

  // Exit progress (power2-in accelerate, faster than entrance)
  const rawExit = interpolate(frame, [exitStart, exitStart + exitFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const easedExit = power2In(rawExit);

  // Horizontal travel distances (off-frame to center)
  const offLeft = -width * 0.75;
  const offRight = width * 0.75;
  const leftX = offLeft * (1 - easedEntrance) + offRight * -0 + easedExit * offLeft * 1.4;
  const rightX = offRight * (1 - easedEntrance) + easedExit * offRight * 1.4;

  const wordScale = overshootScale;

  // ── Restraint bars: slide inward on charge, hold, retract before exit end ──
  const barsIn = interpolate(frame, [0, barsInEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const barsOut = interpolate(frame, [exitStart + 2, barsRetractEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const barsProgress = barsIn * (1 - barsOut);
  const barSpanTarget = width * 0.6; // 20%-80% width = 60% span
  const barWidthNow = barSpanTarget * barsProgress;

  // ── Fracture flash: bright pulse at collision (frame 24) and again at exit cue (66) ──
  const flashAt = (start: number) =>
    interpolate(frame, [start, start + 1, start + flashFrames], [0, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const collideFlash = flashAt(collideFrame);
  const exitFlash = interpolate(frame, [exitStart, exitStart + 1, exitStart + 2], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const flashOpacity = Math.max(collideFlash, exitFlash);

  // Steady ember hairline: present once the word has landed, fades with the word on exit
  const wordVisible = interpolate(frame, [collideFrame - 3, collideFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wordExitFade = 1 - easedExit;
  const hairlineOpacity = wordVisible * wordExitFade * 0.55;

  // ── Ambient hold motion: slow gradient breathe + rain drift + tiny scale creep ──
  const breathe = 1 + Math.sin((frame / (fps * 3)) * Math.PI * 2) * 0.02;
  const rainDrift = (frame * 0.35) % 200; // continuous leftward drift, no clamp needed (looping texture)
  const holdCreep = 1 + Math.sin((frame - holdMid) / (fps * 2)) * 0.008;

  const wordOpacity = interpolate(frame, [entranceStart, entranceStart + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) * wordExitFade;

  // Rain-streak texture: generate stable diagonal lines via a seeded random field
  const streakCount = 14;
  const streaks = Array.from({ length: streakCount }, (_, i) => {
    const seed = random(`streak-${i}`);
    return {
      top: seed * height * 1.4 - height * 0.2,
      len: height * (0.5 + random(`len-${i}`) * 0.6),
      offset: seed * width,
    };
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #0b0d10 0%, #141a1e ${45 + Math.sin(frame / 40) * 3}%, #1c2429 100%)`,
        transform: `scale(${breathe})`,
        overflow: 'hidden',
      }}
    >
      {/* Layer 2: drifting rain-streak texture, low opacity, same-hue grey-teal */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.08, transform: `translateX(${-rainDrift}px)` }}>
        {streaks.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: s.top,
              left: s.offset - 200,
              width: 2,
              height: s.len,
              background: 'linear-gradient(180deg, transparent, #9fb3b0, transparent)',
              transform: 'rotate(18deg)',
            }}
          />
        ))}
        {streaks.map((s, i) => (
          <div
            key={`dup-${i}`}
            style={{
              position: 'absolute',
              top: s.top,
              left: s.offset - 200 + width,
              width: 2,
              height: s.len,
              background: 'linear-gradient(180deg, transparent, #9fb3b0, transparent)',
              transform: 'rotate(18deg)',
            }}
          />
        ))}
      </div>

      {/* Vignette: darkens corners so the eye holds the center band */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Layer 3: top/bottom horizontal restraint bars framing the title band */}
      <div
        style={{
          position: 'absolute',
          top: height * 0.28,
          left: '50%',
          width: barWidthNow,
          height: 4,
          transform: 'translateX(-50%)',
          background: `linear-gradient(90deg, transparent, ${barColor}, transparent)`,
          boxShadow: `0 0 12px ${barColor}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: height * 0.28,
          left: '50%',
          width: barWidthNow,
          height: 4,
          transform: 'translateX(-50%)',
          background: `linear-gradient(90deg, transparent, ${barColor}, transparent)`,
          boxShadow: `0 0 12px ${barColor}`,
        }}
      />

      {/* Layer 4: diagonal fracture line - steady ember hairline behind letters, flash on impact */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: width * 0.9,
          height: 2,
          background: emberAccent,
          opacity: hairlineOpacity,
          transform: 'translate(-50%, -50%) rotate(-9deg)',
          zIndex: 5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: width * 1.1,
          height: 6,
          background: accent,
          opacity: flashOpacity,
          boxShadow: `0 0 40px 8px ${accent}`,
          transform: 'translate(-50%, -50%) rotate(-9deg)',
          zIndex: 6,
        }}
      />

      {/* Layer 5: LANDFALL wordmark - two halves, painted last, fully unobstructed */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div
          style={{
            display: 'flex',
            transform: `scale(${wordScale * holdCreep})`,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontFamily: '"Bebas Neue", "Arial Narrow", Arial, sans-serif',
              fontSize,
              color: accent,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              transform: `translateX(${leftX}px)`,
              opacity: wordOpacity,
              filter: 'drop-shadow(0 10px 26px rgba(0,0,0,0.55))',
            }}
          >
            {left}
          </span>
          <span
            style={{
              display: 'inline-block',
              fontFamily: '"Bebas Neue", "Arial Narrow", Arial, sans-serif',
              fontSize,
              color: accent,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              transform: `translateX(${rightX}px)`,
              opacity: wordOpacity,
              filter: 'drop-shadow(0 10px 26px rgba(0,0,0,0.55))',
            }}
          >
            {right}
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
