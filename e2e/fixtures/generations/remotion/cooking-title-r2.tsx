// "Steam Into Type" - a 4s title card for a Sunday-morning cooking show.
// Concept: three soft steam ribbons rise from the bottom, curl, and settle/flatten into
// the horizontal strokes of the wordmark "Sunday" - steam literally becomes the type -
// then the wordmark holds like a lifted lid before everything dissipates cleanly.
// Layering (back to front): gradient bg + vignette -> linen grain -> butter glow ->
// steam ribbons -> hairline rule -> sun-arc flourish -> hero wordmark -> kicker.
// Text always paints last and exits last (or with) the layers beneath it.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, random } from 'remotion';

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
  const title = String(fields.title ?? 'Sunday');
  const kicker = String(fields.kicker ?? 'Kitchen').toUpperCase();
  const accent = String(fields.accent ?? '#B5713F');
  const heroColor = String(fields.heroColor ?? '#4A2E1D');

  // ── Timing constants (frames, derived from fps so any rate still works) ─
  const glowInEnd = Math.round(fps * (10 / 30)); // butter glow fades in 0-10f @30fps base
  const ribbonStart = 0;
  const ribbonStagger = 4;
  const ribbonMidBy = Math.round(fps * 0.9); // ribbons reach mid-frame by 0.9s
  const morphStart = Math.round(fps * 1.0); // ribbons begin flattening into strokes
  const wordmarkStart = Math.round(fps * 0.9);
  const wordmarkEnd = Math.round(fps * 1.4);
  const kickerStart = Math.round(fps * 1.3);
  const kickerEnd = Math.round(fps * 1.6);
  const ruleStart = Math.round(fps * 1.4);
  const ruleEnd = Math.round(fps * 1.7);
  const flourishStart = Math.round(fps * 1.9);
  const flourishEnd = Math.round(fps * 2.3);

  const steamExitStart = Math.round(fps * 3.0);
  const steamExitEnd = Math.round(fps * 3.5);
  const ruleExitStart = Math.round(fps * 3.2);
  const ruleExitEnd = Math.round(fps * 3.4);
  const kickerExitStart = Math.round(fps * 3.33);
  const kickerExitEnd = Math.round(fps * 3.9);
  const heroExitStart = Math.round(fps * 3.5);
  const heroExitEnd = durationInFrames; // 4.0s, fully gone by last frame

  // ── Hero sizing: derived from the string itself, not a height fraction ──
  // serif capAdvance ~0.62em per char; "Sunday " (incl. trailing space) = 6 chars
  const heroChars = (title + ' ').length;
  const capAdvance = 0.62;
  const targetWidthFrac = 0.68; // aim for ~68% of frame width
  const heroFontSize = Math.round((width * targetWidthFrac) / (heroChars * capAdvance));

  const kickerFontSize = Math.round(height * 0.03);

  // ── Ambient continuous motion (sine drift, non-linear feel) ─────────────
  const t = frame / fps;
  const sway = Math.sin(t * Math.PI * 0.9) * 6; // steam sways +-6px
  const glowPulse = 0.96 + (Math.sin(t * Math.PI * 0.7) * 0.5 + 0.5) * 0.04; // 96%-100%

  // ── Phase 1: steam ribbons rise from below, S-curve sway ────────────────
  const ribbonConfigs = [
    { x: 0.42, delay: 0 },
    { x: 0.5, delay: ribbonStagger },
    { x: 0.58, delay: ribbonStagger * 2 },
  ];

  const ribbons = ribbonConfigs.map((r, i) => {
    const riseProgress = spring({
      frame: frame - (ribbonStart + r.delay),
      fps,
      config: { damping: 200, mass: 0.9 },
    });
    // Travel from below frame bottom up to mid-frame, reaching there ~0.9s
    const y = interpolate(riseProgress, [0, 1], [height * 0.65, height * 0.02]);

    // Morph phase: ribbons flatten (scaleY down) and dim as they become strokes
    const morphProgress = interpolate(frame, [morphStart, morphStart + Math.round(fps * 0.5)], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const scaleY = interpolate(morphProgress, [0, 1], [1, 0.35]);
    const baseOpacity = interpolate(morphProgress, [0, 1], [0.7, 0.4]);

    // Exit: ribbons resume rising, stretch and fade first
    const exitProgress = interpolate(frame, [steamExitStart, steamExitEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (x) => x * x, // ease-in acceleration
    });
    const exitY = interpolate(exitProgress, [0, 1], [0, -height * 0.5]);
    const exitScaleY = interpolate(exitProgress, [0, 1], [1, 1.6]);
    const exitOpacity = 1 - exitProgress;

    const sVal = Math.sin(t * Math.PI * (0.8 + i * 0.15) + i) * 6;

    return {
      key: i,
      left: width * r.x,
      top: y + exitY,
      opacity: baseOpacity * exitOpacity,
      scaleY: scaleY * exitScaleY,
      swayX: sVal,
    };
  });

  // ── Phase 2: wordmark crossfades in on top of the flattened ribbons ─────
  const heroSpring = spring({ frame: frame - wordmarkStart, fps, config: { damping: 200, mass: 0.9 } });
  const heroFadeIn = interpolate(frame, [wordmarkStart, wordmarkEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const heroScale = interpolate(heroSpring, [0, 1], [0.95, 1.02]); // slight 2% overshoot, scale only
  const heroSettle = interpolate(frame, [wordmarkEnd, wordmarkEnd + Math.round(fps * 0.3)], [heroScale, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Hero exit: rises + fades, ease-in
  const heroExitP = interpolate(frame, [heroExitStart, heroExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => x * x,
  });
  const heroY = interpolate(heroExitP, [0, 1], [0, -20]);
  const heroOpacity = heroFadeIn * (1 - heroExitP);

  // ── Kicker: masked reveal (translateY 100% -> 0), ease-out cubic ────────
  const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
  const kickerRaw = interpolate(frame, [kickerStart, kickerEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const kickerIn = easeOutCubic(kickerRaw);
  const kickerExitP = interpolate(frame, [kickerExitStart, kickerExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => x * x,
  });
  const kickerY = interpolate(kickerIn, [0, 1], [24, 0]) - kickerExitP * 15;
  const kickerOpacity = kickerIn * (1 - kickerExitP);

  // ── Rule: scales in from center ──────────────────────────────────────────
  const ruleRaw = interpolate(frame, [ruleStart, ruleEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ruleIn = easeOutCubic(ruleRaw);
  const ruleExitP = interpolate(frame, [ruleExitStart, ruleExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => x * x,
  });
  const ruleScale = ruleIn * (1 - ruleExitP);
  const ruleWidth = width * 0.22;

  // ── Sun-arc flourish: drawn-on via stroke-dashoffset ─────────────────────
  const flourishRaw = interpolate(frame, [flourishStart, flourishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const flourishDraw = easeOutCubic(flourishRaw);
  const flourishExitP = interpolate(frame, [ruleExitStart, ruleExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => x * x,
  });
  const flourishOpacity = flourishDraw * (1 - flourishExitP);
  const arcLen = 80;

  // ── Butter glow: fades in, then pulses gently, holds to the last frame ──
  const glowIn = interpolate(frame, [0, glowInEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const glowOpacity = glowIn * glowPulse * 0.12;

  // Linen grain: a stable per-frame noise pattern via remotion's random (seeded, not Math.random)
  const grainSeed = 'linen-grain';
  const grainDrift = interpolate(t, [0, 4], [0, 6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse 80% 65% at 50% 38%, #F6ECD9 0%, #EAD3AE 45%, #C97C4B 100%)',
      }}
    >
      {/* Vignette: same-hue darkening at corners for depth */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 120% 100% at 50% 50%, rgba(0,0,0,0) 55%, rgba(74,46,29,0.28) 100%)',
        }}
      />

      {/* Linen-grain texture overlay: low-opacity repeating noise dots, drifting subtly */}
      <div
        style={{
          position: 'absolute',
          inset: -20,
          opacity: 0.05,
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(74,46,29,0.5) 0px, rgba(74,46,29,0.5) 1px, transparent 1px, transparent 4px)',
          transform: `translate(${grainDrift}px, ${grainDrift * 0.6}px)`,
        }}
      />

      {/* Butter-glow ellipse behind the wordmark, like morning light through a window */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '42%',
          width: width * 0.55,
          height: height * 0.4,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, #F3D9A4 0%, rgba(243,217,164,0) 70%)',
          opacity: glowOpacity,
          filter: 'blur(6px)',
        }}
      />

      {/* Steam ribbons: soft translucent vertical strokes that rise, curl, and flatten
          into the horizontal letterforms, then re-rise and dissipate on exit. */}
      {ribbons.map((r) => (
        <div
          key={r.key}
          style={{
            position: 'absolute',
            left: r.left,
            top: r.top,
            width: width * 0.08,
            height: height * 0.4,
            transform: `translate(-50%, -50%) translateX(${r.swayX}px) scaleY(${r.scaleY})`,
            borderRadius: '50%',
            background:
              'linear-gradient(180deg, rgba(246,236,217,0) 0%, rgba(243,217,164,0.55) 35%, rgba(197,124,75,0.35) 65%, rgba(246,236,217,0) 100%)',
            filter: 'blur(14px)',
            opacity: r.opacity,
          }}
        />
      ))}

      {/* Hairline rule beneath the wordmark, scaling in from center */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '58%',
          width: ruleWidth,
          height: 2,
          transform: `translate(-50%, -50%) scaleX(${ruleScale})`,
          background: accent,
          opacity: 0.85,
        }}
      />

      {/* Sun-arc flourish: a thin quarter-circle arc with three short rays, drawn on */}
      <svg
        width={arcLen * 2}
        height={arcLen}
        viewBox="0 0 160 80"
        style={{
          position: 'absolute',
          left: '50%',
          top: '62%',
          transform: 'translate(-50%, 0)',
          opacity: flourishOpacity,
        }}
      >
        <path
          d="M 20 60 A 40 40 0 0 1 100 60"
          fill="none"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={110}
          strokeDashoffset={110 * (1 - flourishDraw)}
        />
        {[0, 1, 2].map((i) => (
          <line
            key={i}
            x1={45 + i * 15}
            y1={30}
            x2={45 + i * 15}
            y2={18}
            stroke={accent}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={flourishDraw}
          />
        ))}
      </svg>

      {/* Text block: paints LAST, above every layer. Hero serif wordmark + sans kicker. */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: 'translateY(-3%)',
          }}
        >
          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: heroFontSize,
              color: heroColor,
              fontWeight: 400,
              letterSpacing: '0.01em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              opacity: heroOpacity,
              transform: `translateY(${heroY}px) scale(${heroSettle})`,
              textShadow: '0 2px 12px rgba(74,46,29,0.15)',
            }}
          >
            {title}
          </div>

          <div style={{ overflow: 'hidden', marginTop: Math.round(height * 0.02) }}>
            <div
              style={{
                fontFamily: '"Manrope", Arial, sans-serif',
                fontSize: kickerFontSize,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: accent,
                opacity: kickerOpacity * 0.85,
                transform: `translateY(${kickerY}px)`,
              }}
            >
              {kicker}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
