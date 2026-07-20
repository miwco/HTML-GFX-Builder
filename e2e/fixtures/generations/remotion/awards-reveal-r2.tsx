// "Medal Reveal" - a 5s broadcast winner-reveal stinger for a music awards public vote.
// Concept: a gold monogram chip drops like a spotlight-struck medal, then cracks open
// into two sweeping gold wipe-rules that uncover the winner's full name lockup beneath.
// Structure: stage set -> chip impact -> crack/wipe reveal -> name+kicker reveal -> hold -> exit.

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
  const line1 = String(fields.nameLine1 ?? 'AURORA');
  const line2 = String(fields.nameLine2 ?? 'VANE');
  const monogram = String(fields.monogram ?? 'AV');
  const kickerText = String(fields.kicker ?? 'PUBLIC VOTE WINNER');
  const accent = String(fields.accent ?? '#d4af6a');
  const champagne = '#f3d98a';

  // ── Timing constants (frames, derived from fps so any rate works) ──────
  const panelInEnd = Math.round(fps * 0.35);       // stage wings land
  const chipDropStart = Math.round(fps * 0.5);
  const chipSettle = Math.round(fps * 0.85);
  const shockAt = Math.round(fps * 0.75);
  const crackStart = Math.round(fps * 1.1);
  const rulesParked = Math.round(fps * 1.6);
  const chipDemoteDone = Math.round(fps * 1.75);
  const kickerStart = Math.round(fps * 1.9);
  const kickerEnd = Math.round(fps * 2.15);
  const line1Start = Math.round(fps * 2.05);
  const line2Start = Math.round(fps * 2.1);
  const lockupDone = Math.round(fps * 2.6);
  const holdEnd = Math.round(fps * 4.0);
  const textExitStart = holdEnd;
  const textExitDur = 6;
  const kickerExitStart = holdEnd + 2;
  const shapesExitStart = Math.round(fps * 4.3);
  const shapesExitDur = Math.round(fps * 0.3);
  const panelsExitStart = shapesExitStart + shapesExitDur;
  const panelsExitDur = Math.round(fps * 0.45); // ends ~4.75s

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3); // cubic ease-out helper

  // ── Background: graphite stage gradient + vignette ──────────────────────
  const bgGradient =
    'linear-gradient(180deg, #16181f 0%, #0e1015 55%, #0b0d12 100%)';

  // ── Particle field: sparse soft gold flecks drifting upward ─────────────
  const particles = Array.from({ length: 26 }, (_, i) => {
    const seed = `spark-${i}`;
    const x = random(seed + 'x') * width;
    const baseY = random(seed + 'y') * height;
    const speed = 8 + random(seed + 's') * 14; // px per second, upward
    const y = ((baseY - (frame / fps) * speed) % (height + 40) + (height + 40)) % (height + 40) - 20;
    const size = 1.5 + random(seed + 'sz') * 3;
    const opacity = 0.15 + random(seed + 'o') * 0.35;
    return { x, y, size, opacity, key: seed };
  });

  // ── Phase 1: stage-wing panels slide in from far left/right ─────────────
  const panelSpring = spring({ frame, fps, config: { damping: 15, mass: 0.9 } });
  const panelsExit = interpolate(
    frame,
    [panelsExitStart, panelsExitStart + panelsExitDur],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const leftPanelX =
    interpolate(panelSpring, [0, 1], [-width * 0.6, 0]) - panelsExit * width * 0.7;
  const rightPanelX =
    interpolate(panelSpring, [0, 1], [width * 0.6, 0]) + panelsExit * width * 0.7;

  // ── Phase 2: chip impact - drop, overshoot, settle ──────────────────────
  const chipDropSpring = spring({
    frame: frame - chipDropStart,
    fps,
    config: { damping: 14, mass: 0.8 },
  });
  const chipDropY = interpolate(chipDropSpring, [0, 1], [-height * 0.7, 0]);
  // overshoot to 1.06 then settle to 1.0 by ~0.85s
  const overshootProgress = interpolate(
    frame,
    [chipDropStart, chipSettle],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const overshootScale = 1 + Math.sin(overshootProgress * Math.PI) * 0.06 * (1 - overshootProgress * 0.3);
  const chipScaleBase = frame < chipDropStart ? 0.001 : overshootScale;

  // shock-bloom flash at impact (single soft pulse)
  const shockFlash = interpolate(
    frame,
    [shockAt - 2, shockAt, shockAt + 8],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  // 1.5% single-frame camera shake at impact
  const shakeWindow = frame >= shockAt && frame < shockAt + 3;
  const shakeX = shakeWindow ? (random('shakeX' + frame) - 0.5) * height * 0.015 : 0;
  const shakeY = shakeWindow ? (random('shakeY' + frame) - 0.5) * height * 0.015 : 0;

  // ── Phase 3: chip demotes upward + shrinks to badge position ────────────
  const demoteProgress = interpolate(
    frame,
    [crackStart, chipDemoteDone],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const demoteEased = easeOut(demoteProgress);
  const chipTargetY = -height * 0.2; // demoted upper-center offset from stage center
  const chipY = frame < chipDropStart ? -height * 0.7 : chipDropY + demoteEased * chipTargetY;
  const chipScale = frame >= crackStart ? overshootScale - demoteEased * 0.3 : chipScaleBase;

  // chip / shapes exit: slides up along its entry vector
  const chipExit = interpolate(
    frame,
    [shapesExitStart, shapesExitStart + shapesExitDur],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const chipFinalY = chipY - chipExit * height * 0.8;

  // ── Phase 4: gold wipe-rules crack outward from chip center ────────────
  const wipeProgress = interpolate(
    frame,
    [crackStart, rulesParked],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 2.2) }
  );
  const ruleGap = height * 0.16; // half-distance the rules travel to park
  const topRuleY = -ruleGap * wipeProgress;
  const bottomRuleY = ruleGap * wipeProgress;
  const ruleWidth = interpolate(wipeProgress, [0, 1], [width * 0.05, width * 0.42], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rulesExitX = interpolate(
    frame,
    [shapesExitStart, shapesExitStart + shapesExitDur],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // pulsing sheen during the hold
  const holdPulse = frame >= lockupDone && frame < holdEnd
    ? 0.5 + Math.sin(((frame - lockupDone) / fps) * Math.PI * 1.4) * 0.5
    : 0;

  // ── Phase 5: kicker masked reveal ───────────────────────────────────────
  const kickerReveal = interpolate(
    frame,
    [kickerStart, kickerEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );
  const kickerExitProgress = interpolate(
    frame,
    [kickerExitStart, kickerExitStart + textExitDur],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const kickerY = (1 - kickerReveal) * 100 + kickerExitProgress * -100; // masked up-reveal, exits upward with text

  // ── Phase 6: name lines masked reveal ────────────────────────────────────
  const line1Reveal = interpolate(
    frame,
    [line1Start, line1Start + Math.round(fps * 0.3)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );
  const line2Reveal = interpolate(
    frame,
    [line2Start, line2Start + Math.round(fps * 0.3)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut }
  );
  const textExitProgress = interpolate(
    frame,
    [textExitStart, textExitStart + textExitDur],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const line1Y = (1 - line1Reveal) * 100 + textExitProgress * 100; // reveal from below, exit downward
  const line2Y = (1 - line2Reveal) * 100 + textExitProgress * 100;

  // ── Ambient hold breathing: starts exactly at 1.0 at holdStart ──────────
  const breathe =
    frame >= lockupDone
      ? 1 + Math.sin(((frame - lockupDone) / fps) * Math.PI * 0.9) * 0.01
      : 1;

  // ── Sizing: fontSize worked from the string width (display face) ───────
  // capAdvance ≈ 0.62 * fontSize; longest line "AURORA" targets ~62% of width.
  const longestLen = Math.max(line1.length, line2.length);
  const heroFontSize = Math.min(
    (width * 0.62) / (longestLen * 0.62),
    height * 0.3
  );
  const kickerFontSize = height * 0.03;
  const monogramFontSize = height * 0.16;

  const displayFace = '"Archivo", "Arial Black", Arial, sans-serif';
  const supportFace = '"Inter", Arial, Helvetica, sans-serif';

  return (
    <AbsoluteFill style={{ background: bgGradient, overflow: 'hidden' }}>
      {/* Radial vignette for depth - darker at edges */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0) 35%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Particle field: sparse gold flecks drifting upward, soft-focus */}
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
            background: champagne,
            opacity: p.opacity,
            filter: 'blur(1px)',
          }}
        />
      ))}

      {/* Stage-wing panels: charcoal, same-hue lit surfaces, angled at center thirds */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          width: width * 0.42,
          height: height * 1.3,
          transform: `translate(${leftPanelX - width * 0.21}px, -50%) rotate(-6deg)`,
          background: 'linear-gradient(100deg, #22262f 0%, #1a1d24 60%, #14161c 100%)',
          boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.06), 20px 0 50px rgba(0,0,0,0.45)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: 0,
          width: width * 0.42,
          height: height * 1.3,
          transform: `translate(${rightPanelX + width * 0.21}px, -50%) rotate(6deg)`,
          background: 'linear-gradient(260deg, #22262f 0%, #1a1d24 60%, #14161c 100%)',
          boxShadow: 'inset -2px 0 0 rgba(255,255,255,0.06), -20px 0 50px rgba(0,0,0,0.45)',
        }}
      />

      {/* Gold wipe-rules: parked top/bottom of the name block once cracked open */}
      <div
        style={{
          position: 'absolute',
          top: `calc(50% + ${topRuleY - height * 0.02}px)`,
          left: '50%',
          width: ruleWidth * (1 + rulesExitX * -0.4),
          transform: `translate(${-50 - rulesExitX * 60}%, -50%)`,
          height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${accent} 20%, ${champagne} 50%, ${accent} 80%, transparent 100%)`,
          opacity: (0.6 + holdPulse * 0.4) * (1 - rulesExitX),
          boxShadow: `0 0 ${12 + holdPulse * 10}px ${accent}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `calc(50% + ${bottomRuleY + height * 0.02}px)`,
          left: '50%',
          width: ruleWidth * (1 + rulesExitX * -0.4),
          transform: `translate(${-50 + rulesExitX * 60}%, -50%)`,
          height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${accent} 20%, ${champagne} 50%, ${accent} 80%, transparent 100%)`,
          opacity: (0.6 + holdPulse * 0.4) * (1 - rulesExitX),
          boxShadow: `0 0 ${12 + holdPulse * 10}px ${accent}`,
        }}
      />

      {/* Monogram chip: gold-to-champagne lit disc, shock-bloom on impact */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${shakeX}px), calc(-50% + ${chipFinalY + shakeY}px)) scale(${chipScale * breathe})`,
          width: height * 0.28,
          height: height * 0.28,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${champagne} 0%, ${accent} 55%, #a67f3f 100%)`,
          boxShadow: `inset 0 2px 6px rgba(255,255,255,0.5), inset 0 -6px 14px rgba(0,0,0,0.35), 0 0 ${
            30 + shockFlash * 60
          }px rgba(212,175,106,${0.4 + shockFlash * 0.5}), 0 10px 30px rgba(0,0,0,0.5)`,
          border: `1px solid rgba(255,255,255,0.25)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontFamily: displayFace,
            fontWeight: 800,
            fontSize: monogramFontSize,
            color: '#1a1206',
            letterSpacing: '-0.02em',
            textShadow: '0 1px 0 rgba(255,255,255,0.35)',
          }}
        >
          {monogram}
        </span>
      </div>

      {/* Shock-bloom flash overlay at impact moment */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(243,217,138,${shockFlash * 0.35}) 0%, transparent 60%)`,
          zIndex: 4,
        }}
      />

      {/* Text lockup: kicker + hero name lines - topmost layer, on top of every shape */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Kicker - masked reveal, small-caps tracked-out */}
          <div style={{ overflow: 'hidden', marginBottom: height * 0.02 }}>
            <div
              style={{
                transform: `translateY(${kickerY}%)`,
                fontFamily: supportFace,
                fontSize: kickerFontSize,
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'rgba(247,240,222,0.8)',
              }}
            >
              {kickerText}
            </div>
          </div>

          {/* Hero name: two stacked masked lines, breathing on hold */}
          <div style={{ transform: `scale(${breathe})` }}>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  transform: `translateY(${line1Y}%)`,
                  fontFamily: displayFace,
                  fontWeight: 900,
                  fontSize: heroFontSize,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  lineHeight: 1.02,
                  textAlign: 'center',
                  background: `linear-gradient(180deg, ${champagne} 0%, ${accent} 60%, #b98f4e 100%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {line1}
              </div>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  transform: `translateY(${line2Y}%)`,
                  fontFamily: displayFace,
                  fontWeight: 900,
                  fontSize: heroFontSize,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  lineHeight: 1.02,
                  textAlign: 'center',
                  background: `linear-gradient(180deg, ${champagne} 0%, ${accent} 60%, #b98f4e 100%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {line2}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
