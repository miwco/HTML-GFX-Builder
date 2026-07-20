// "Landfall Strike" - a 3s storm-coverage cold open. A single scan-line beam sweeps
// left-to-right once across a near-black radar-slate frame; each letter of the hero
// word snaps into place with a hard flash + stiff settle as the beam passes it.
// Layering (back to front): radial slate bg -> isobar arcs -> scan beam -> wordmark -> kicker.

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

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
  const kicker = String(fields.kicker ?? 'STORM COVERAGE').toUpperCase();
  const accent = String(fields.accent ?? '#DCEEF2');

  // ── Timing constants (frames, derived from fps so other rates still work) ─
  const isobarStart = 0;
  const isobarStagger = Math.round(fps * 0.1); // 3 frames @30fps
  const isobarDraw = Math.round(fps * 0.4); // 12 frames
  const kickerFadeStart = 0;
  const kickerFadeDur = Math.round(fps * 0.2); // 6 frames

  const sweepStart = Math.round(fps * 0.4); // 12
  const sweepEnd = Math.round(fps * 1.633); // ~49
  const sweepDur = sweepEnd - sweepStart;

  const residualSweepStart = Math.round(fps * 2.0); // 60
  const residualSweepEnd = Math.round(fps * 2.5); // 75

  const flashFrame = Math.round(fps * 2.833); // 85
  const cutDur = 2; // frames to hard-cut text after flash

  // ── Hero type: LANDFALL, sized from capAdvance so the settled line spans
  // ~72% of frame width. Anton/Bebas-style bundled face = Bebas Neue (capAdvance ~0.38em).
  const capAdvance = 0.38;
  const targetWidth = width * 0.72;
  const heroFontSize = Math.round(targetWidth / (headline.length * capAdvance));

  // ── Beam x-position across the sweep window (constant velocity, mechanical) ─
  const beamX = interpolate(frame, [sweepStart, sweepEnd], [-width * 0.05, width * 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Residual faint sweep during the hold, purely ambient (behind text) ────
  const residualX = interpolate(
    frame,
    [residualSweepStart, residualSweepEnd],
    [-width * 0.05, width * 1.05],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const residualActive = frame >= residualSweepStart && frame <= residualSweepEnd;

  // ── Flash-cut exit: everything text/kicker hard-cuts within cutDur frames ──
  const hardCutOpacity = interpolate(
    frame,
    [flashFrame, flashFrame + cutDur],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const whiteFlash = interpolate(
    frame,
    [flashFrame, flashFrame + 1, flashFrame + 2],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  // Structural layers (beam/isobars) snap off right at the flash too.
  const structuralCut = frame >= flashFrame ? 0 : 1;

  // ── Per-letter strike-in: each letter's arrival tied to beam passing its slot ─
  const letters = headline.split('');
  const totalLettersWidth = letters.length * heroFontSize * capAdvance;
  const startX = width / 2 - totalLettersWidth / 2;
  // Precompute each letter's center x (for beam-arrival calc) and stagger index.
  const letterMeta = letters.map((ch, i) => {
    const letterAdvance = heroFontSize * capAdvance;
    const centerX = startX + letterAdvance * (i + 0.5);
    // Beam arrival frame: proportionally along sweep, matching the letter's screen position.
    const arrivalFrame =
      sweepStart + (centerX / width) * sweepDur;
    return { ch, centerX, arrivalFrame };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0B0F14' }}>
      {/* Layer 1: storm-slate radial vignette, glow centered slightly below middle */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 80% 65% at 50% 58%, #131A22 0%, #0D1218 55%, #07090C 100%)',
        }}
      />

      {/* Layer 2: isobar arcs - three faint pressure-contour lines, drawn on then drifting */}
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, opacity: structuralCut }}
      >
        {[0, 1, 2].map((i) => {
          const drawStart = isobarStart + i * isobarStagger;
          const drawProgress = interpolate(
            frame,
            [drawStart, drawStart + isobarDraw],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          // Slow ambient drift during hold (2% translateX), only after fully drawn.
          const drift = interpolate(
            frame,
            [isobarDraw + drawStart, durationInFrames],
            [0, width * 0.02],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          const pathLen = width * 1.3;
          const yBase = height * (0.32 + i * 0.16);
          const sag = height * (0.06 + i * 0.02);
          const d = `M ${-width * 0.15} ${yBase} Q ${width * 0.5} ${yBase - sag}, ${width * 1.15} ${yBase}`;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={accent}
              strokeWidth={1}
              opacity={0.18}
              strokeDasharray={pathLen}
              strokeDashoffset={pathLen * (1 - drawProgress)}
              transform={`translate(${drift}, 0)`}
            />
          );
        })}
      </svg>

      {/* Layer 3: scan-line beam - the storm's leading edge, travels above rules below text */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: beamX,
          width: 6,
          height,
          background: accent,
          boxShadow: `0 0 40px 8px ${accent}, 0 0 90px 20px rgba(220,238,242,0.35)`,
          opacity: frame >= sweepStart && frame <= sweepEnd ? structuralCut : 0,
        }}
      />
      {/* Residual faint sweep during hold - ambient only, sits behind text (z-index default) */}
      {residualActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: residualX,
            width: 4,
            height,
            background: accent,
            opacity: 0.08 * structuralCut,
            filter: 'blur(2px)',
          }}
        />
      )}

      {/* Layer 4: LANDFALL wordmark - struck-metal slabs, letters land as beam passes */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div
          style={{
            display: 'flex',
            fontFamily: '"Bebas Neue", "Arial Narrow", Arial, sans-serif',
            fontSize: heroFontSize,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            opacity: hardCutOpacity,
          }}
        >
          {letterMeta.map(({ ch, arrivalFrame }, i) => {
            const flashWindow = 2;
            const isFlashing =
              frame >= arrivalFrame && frame < arrivalFrame + flashWindow;
            const settle = spring({
              frame: frame - arrivalFrame,
              fps,
              config: { damping: 22, mass: 0.6, stiffness: 220 },
            });
            const hasArrived = frame >= arrivalFrame;
            // Overshoot: starts at +2deg / 1.15x scale, settles to 0deg / 1.0x
            const rotation = hasArrived ? (1 - settle) * 2 : 0;
            const scale = hasArrived ? 1 + (1 - settle) * 0.15 : 0;
            const color = isFlashing ? '#FFFFFF' : '#F2F0EC';
            return (
              <span
                key={i}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  transform: `scale(${hasArrived ? scale : 0}) rotate(${rotation}deg)`,
                  color,
                  textShadow: isFlashing
                    ? `0 0 30px ${accent}, 0 0 60px ${accent}`
                    : '0 2px 0 rgba(0,0,0,0.5)',
                  backgroundImage: hasArrived
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 18%)'
                    : undefined,
                  WebkitBackgroundClip: hasArrived ? 'text' : undefined,
                  backgroundClip: hasArrived ? 'text' : undefined,
                  filter: hasArrived
                    ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.55))'
                    : undefined,
                }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Layer 5: kicker label, top-left inset - support scale, thin tracked small caps */}
      <div
        style={{
          position: 'absolute',
          top: height * 0.06,
          left: width * 0.06,
          fontFamily: '"Inter", Arial, Helvetica, sans-serif',
          fontSize: height * 0.028,
          fontWeight: 500,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: accent,
          opacity:
            hardCutOpacity *
            interpolate(frame, [kickerFadeStart, kickerFadeStart + kickerFadeDur], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          zIndex: 10,
        }}
      >
        {kicker}
      </div>

      {/* Final white flash + hard cut to black, then holds clean to the last frame */}
      <AbsoluteFill
        style={{
          backgroundColor: '#FFFFFF',
          opacity: whiteFlash,
          pointerEvents: 'none',
        }}
      />
      {frame >= flashFrame + cutDur && (
        <AbsoluteFill style={{ backgroundColor: '#000000' }} />
      )}
    </AbsoluteFill>
  );
}
