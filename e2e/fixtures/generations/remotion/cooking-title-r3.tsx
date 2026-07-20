// "Sunday Steam" - 4s title card for a relaxed Sunday-morning cooking show.
// One concept: morning steam curls rise off a tabletop rule and gather into the
// wordmark as it settles, then keep drifting gently through the hold before
// dissipating on exit. Structure: ENTRANCE (bloom + rising steam) -> HERO ASSEMBLY
// (rule, wordmark, kicker) -> HOLD (breathing + ambient steam sway) -> EXIT
// (type lifts away fast, steam clears last, background settles static).

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition({
  assets = {},
  fields = {},
}: {
  assets?: Record<string, string>;
  fields?: Record<string, string | number>;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ── Editable content ────────────────────────────────────────────────────
  const headline = String(fields.headline ?? 'SUNDAY KITCHEN');
  const kickerText = String(fields.kicker ?? 'A SLOW START TO THE DAY');
  const accent = String(fields.accent ?? '#B9713F');
  const heroColor = String(fields.heroColor ?? '#4A3324');

  // ── Timing constants (frames) ───────────────────────────────────────────
  const bloomStart = 6;
  const bloomDur = 12;
  const steamStarts = [10, 16, 22]; // staggered steam curl entrances
  const steamDrawDur = 26;
  const ruleStart = 36; // 1.2s
  const ruleDur = 10;
  const heroStart = 39; // 1.3s
  const heroSettle = 48;
  const kickerStart = 43;
  const kickerSettle = 52;
  const holdStart = 54;
  const heroExitStart = 96;
  const heroExitDur = 14; // done 110
  const kickerExitStart = 99;
  const kickerExitDur = 14; // done 113
  const ambientDissipateStart = 104;
  const ambientDissipateEnd = 120;

  // ── Background: layered daylight-warm gradient + grain + vignette ──────
  // Static wash (no fade-in needed) - radial butter-cream to toasted-clay.
  const bg = `radial-gradient(120% 100% at 50% 38%, #F3E3C8 0%, #EAD1A0 45%, #D9A968 100%)`;

  // Light bloom: eases in early, then drifts slowly rightward through the hold.
  const bloomOpacity = interpolate(frame, [bloomStart, bloomStart + bloomDur], [0, 0.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomDissipate = interpolate(frame, [ambientDissipateStart, ambientDissipateEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bloomDrift = interpolate(frame, [holdStart, holdStart + fps * 2.5], [0, 15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Steam curls: three tapering strokes rising from the tabletop rule ──
  // Entrance draws them up (stroke-dashoffset style reveal via clipPath height),
  // hold phase adds continuous sine sway so vapor never looks frozen, exit
  // dissipates opacity with a touch of extra upward drift.
  const steamCenterX = width * 0.5;
  const steamBaseY = height * 0.62;
  const steamOffsets = [-width * 0.09, 0, width * 0.09];

  const steamLayers = steamOffsets.map((offsetX, i) => {
    const start = steamStarts[i];
    const draw = interpolate(frame, [start, start + steamDrawDur], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => t * t * (3 - 2 * t), // smoothstep ease-in-out
    });
    // Continuous sway during hold - period ~2s, phase offset per curl.
    const sway = Math.sin((frame / fps) * Math.PI * (1 / 1.0) + i * 1.6) * 10;
    const riseHeight = height * 0.34 * draw;
    const dissipate = interpolate(
      frame,
      [ambientDissipateStart + i * 3, ambientDissipateEnd],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const extraLift = interpolate(frame, [ambientDissipateStart, ambientDissipateEnd], [0, -height * 0.08], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { offsetX, riseHeight, sway, dissipate, extraLift, i };
  });

  // ── Hairline rule beneath wordmark: left-to-right ease-out draw ────────
  const ruleDraw = interpolate(frame, [ruleStart, ruleStart + ruleDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
  });
  const ruleExit = interpolate(frame, [kickerExitStart, kickerExitStart + kickerExitDur], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Hero wordmark: spring settle + slow breathing hold + fast exit ─────
  const heroSpring = spring({
    frame: frame - heroStart,
    fps,
    config: { damping: 20, stiffness: 120 },
  });
  const heroRiseY = interpolate(heroSpring, [0, 1], [20, 0]);
  const heroScaleIn = interpolate(heroSpring, [0, 1], [0.94, 1]);
  const heroOpacityIn = interpolate(frame, [heroStart, heroSettle], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Breathing: starts exactly at 1.0 at holdStart on a slow 2.4s ease-in-out cycle.
  const breathT = Math.max(0, frame - holdStart) / (fps * 2.4);
  const breathe = 1 + Math.sin(breathT * Math.PI * 2) * 0.0075 + 0.0075; // settles ~1.0->1.015->1.0
  const heroExit = interpolate(frame, [heroExitStart, heroExitStart + heroExitDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t, // accelerating ease-in
  });
  const heroFinalOpacity = heroOpacityIn * (1 - heroExit);
  const heroFinalScale = heroScaleIn * breathe;
  const heroFinalY = heroRiseY - heroExit * 30;

  // ── Kicker: rises 24px in, holds, exits slightly after wordmark ────────
  const kickerIn = interpolate(frame, [kickerStart, kickerSettle], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const kickerExit = interpolate(frame, [kickerExitStart, kickerExitStart + kickerExitDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t,
  });
  const kickerOpacity = kickerIn * (1 - kickerExit);
  const kickerY = (1 - kickerIn) * 24 - kickerExit * 30;

  // ── Sizing: hero solved from its own string (Georgia bold capAdvance ~0.62em) ─
  const longestLine = 'SUNDAY KITCHEN';
  const capAdvance = 0.62;
  const heroFontSize = Math.round((width * 0.62) / (longestLine.length * capAdvance));
  const kickerFontSize = Math.round(height * 0.03);

  return (
    <AbsoluteFill style={{ background: bg }}>
      {/* Layer 1: subtle paper/linen grain via repeating radial dots, low opacity */}
      <AbsoluteFill
        style={{
          opacity: 0.08,
          backgroundImage:
            'repeating-radial-gradient(circle at 2px 2px, rgba(74,51,36,0.5) 0px, transparent 1.4px)',
          backgroundSize: '5px 5px',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Layer 1b: soft wooden-tabletop base band grounding the bottom edge */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to top, rgba(90,58,32,0.38) 0%, rgba(90,58,32,0.16) 22%, transparent 45%)',
        }}
      />

      {/* Layer 2: warm morning light bloom, upper-left, drifting rightward */}
      <div
        style={{
          position: 'absolute',
          top: -height * 0.15,
          left: -width * 0.1 + bloomDrift,
          width: width * 0.65,
          height: width * 0.65,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,244,220,0.9) 0%, rgba(255,244,220,0) 70%)',
          opacity: bloomOpacity * bloomDissipate,
          filter: 'blur(2px)',
        }}
      />

      {/* Layer 3: three rising steam curls, threading behind the wordmark */}
      <AbsoluteFill>
        {steamLayers.map(({ offsetX, riseHeight, sway, dissipate, extraLift, i }) => (
          <svg
            key={i}
            width={width * 0.22}
            height={height * 0.42}
            style={{
              position: 'absolute',
              left: steamCenterX + offsetX - (width * 0.22) / 2,
              top: steamBaseY - riseHeight + extraLift,
              opacity: 0.4 * dissipate,
              transform: `translateX(${sway}px)`,
              overflow: 'visible',
            }}
          >
            <path
              d={`M ${width * 0.11} ${height * 0.4}
                  C ${width * 0.11 + sway * 0.6} ${height * 0.28},
                    ${width * 0.11 - sway * 0.6} ${height * 0.18},
                    ${width * 0.11} ${height * 0.06}`}
              stroke={i === 1 ? accent : '#EFE0C4'}
              strokeWidth={i === 1 ? 5 : 3.5}
              strokeLinecap="round"
              fill="none"
              style={{
                strokeDasharray: riseHeight * 3,
                strokeDashoffset: riseHeight * 3 * (1 - Math.min(riseHeight / (height * 0.34), 1)),
              }}
            />
          </svg>
        ))}
      </AbsoluteFill>

      {/* Text stack: rule, kicker, hero - painted last, hero topmost */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Hero wordmark: two-line stack, tight/open tracking rhythm, lit gradient fill */}
          <div
            style={{
              opacity: heroFinalOpacity,
              transform: `translateY(${heroFinalY}px) scale(${heroFinalScale})`,
              textAlign: 'center',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 700,
              lineHeight: 0.95,
              backgroundImage: `linear-gradient(180deg, #C99A5B 0%, ${heroColor} 55%, ${heroColor} 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 2px 10px rgba(74,51,36,0.15)',
            }}
          >
            <div style={{ fontSize: heroFontSize, letterSpacing: '-0.01em' }}>SUNDAY</div>
            <div style={{ fontSize: heroFontSize, letterSpacing: '0.01em' }}>KITCHEN</div>
          </div>

          {/* Hairline rule beneath wordmark, draws left-to-right */}
          <div
            style={{
              marginTop: Math.round(height * 0.03),
              width: width * 0.16,
              height: 2,
              background: accent,
              opacity: ruleDraw * ruleExit,
              transform: `scaleX(${ruleDraw})`,
              transformOrigin: 'left center',
            }}
          />

          {/* Kicker: small-caps, tracked out, terracotta */}
          <div
            style={{
              marginTop: Math.round(height * 0.022),
              fontFamily: '"Inter", Georgia, serif',
              fontSize: kickerFontSize,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: accent,
              opacity: kickerOpacity,
              transform: `translateY(${kickerY}px)`,
            }}
          >
            {kickerText}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
