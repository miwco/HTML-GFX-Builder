
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

  // ── Editable content ────────────────────────────────────────────────────
  const wordmark = String(fields.wordmark ?? 'ON AIR');
  const accent = String(fields.accent ?? '#F5A623');
  const logoName = String(fields.logo ?? 'noacg-icon-512');
  const logo = assets[logoName];

  // ── Timing constants (frames) ───────────────────────────────────────────
  const chargeEnd = 12; // 0.00-0.40s pre-entrance glow
  const barsStart = 12;
  const lockFrame = 27; // 0.93s - bars converge
  const ringEnd = 34; // tally flash fades
  const ruleStart = 34;
  const ruleDuration = 6;
  const lettersStart = 40; // after rule draws
  const holdEnd = 72; // hero hold ends
  const exitStart = 74;
  const exitDuration = 12; // clears by frame 90 (with 2f glow head start at 72)

  // ── Background: graphite base + warm radial glow behind icon ────────────
  const glowIn = interpolate(frame, [0, chargeEnd], [0, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const glowFadeStart = interpolate(frame, [72, 74], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const glowOpacity = frame < 72 ? glowIn : glowIn * glowFadeStart;

  // ── Icon assembly: three bars flying in from three vectors ─────────────
  const amberSpring = spring({ frame: frame - barsStart, fps, config: { damping: 14, mass: 0.8, stiffness: 180 } });
  const paleSpring = spring({ frame: frame - (barsStart + 3), fps, config: { damping: 14, mass: 0.8, stiffness: 180 } });
  const charSpring = spring({ frame: frame - (barsStart + 6), fps, config: { damping: 14, mass: 0.8, stiffness: 180 } });

  // Amber overshoots slightly more (impact energy) - nudge past 1 briefly.
  const amberX = interpolate(amberSpring, [0, 1], [-width * 0.5, 0]);
  const paleX = interpolate(paleSpring, [0, 1], [width * 0.5, 0]);
  const charY = interpolate(charSpring, [0, 1], [height * 0.5, 0]);

  // ── Impact punch at lock: scale-punch + micro frame-shake ───────────────
  const punch = interpolate(
    frame,
    [lockFrame, lockFrame + 3, lockFrame + 6],
    [1, 1.06, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const shakeActive = frame >= lockFrame && frame < lockFrame + 2;
  const shakeX = shakeActive ? (frame % 2 === 0 ? 1 : -1) * width * 0.015 : 0;
  const shakeY = shakeActive ? (frame % 2 === 0 ? -1 : 1) * height * 0.015 : 0;

  // Tile silhouette fades in behind the bars at the lock moment.
  const tileOpacity = interpolate(frame, [lockFrame, lockFrame + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Tally-light ring: blooms then fades within 10 frames of lock.
  const ringOpacity = interpolate(
    frame,
    [lockFrame, lockFrame + 2, ringEnd],
    [0, 0.9, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const ringScale = interpolate(frame, [lockFrame, ringEnd], [0.92, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Ambient hold: slow scale-breathing (sine easeInOut, ~2s period) ─────
  const breathe = 1 + Math.sin((frame / fps) * Math.PI * (2 / 2)) * 0.015;

  // ── Exit: fast cubic ease-in scale/fade, clears by frame 90 ─────────────
  const exitT = interpolate(frame, [exitStart, exitStart + exitDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitEase = exitT * exitT * exitT; // cubic ease-in
  const exitScale = interpolate(exitEase, [0, 1], [1, 0.92]);
  const exitOpacity = 1 - exitEase;

  const iconGroupScale = punch * breathe * exitScale;
  const iconGroupOpacity = frame < exitStart ? 1 : exitOpacity;

  // ── Icon sizing: locked square, ~30% of frame height ────────────────────
  const iconSize = height * 0.3;

  // ── ON AIR rule + letters ────────────────────────────────────────────────
  const ruleWidthT = interpolate(frame, [ruleStart, ruleStart + ruleDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Size the hero support line from its own string (capAdvance for Archivo ~0.74em).
  const capAdvance = 0.74;
  const targetWidth = width * 0.35;
  const charCount = wordmark.length || 1;
  const fontSize = Math.round(targetWidth / (capAdvance * charCount));
  const ruleWidth = targetWidth * ruleWidthT;

  const letters = wordmark.split('');

  return (
    <AbsoluteFill style={{ backgroundColor: '#0d0d10' }}>
      {/* Background vignette: subtle darker edges */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Warm radial glow seated behind the icon's future position */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 38%, rgba(26,23,18,${glowOpacity}) 0%, rgba(26,23,18,0) 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 38%, rgba(245,166,35,${glowOpacity * 0.12}) 0%, rgba(245,166,35,0) 55%)`,
        }}
      />

      {/* Hero lockup: icon + wordmark, centered upper-middle third */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: height * 0.18 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: `translate(${shakeX}px, ${shakeY}px)`,
          }}
        >
          {/* Icon assembly stage */}
          <div
            style={{
              position: 'relative',
              width: iconSize,
              height: iconSize,
              transform: `scale(${iconGroupScale})`,
              opacity: iconGroupOpacity,
            }}
          >
            {/* Tile silhouette - fades in at collision, sits behind bars */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: iconSize * 0.22,
                background: 'linear-gradient(160deg, #1c1c20 0%, #0f0f12 100%)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
                opacity: tileOpacity,
              }}
            />

            {/* Tally-light ring flash */}
            <div
              style={{
                position: 'absolute',
                inset: -iconSize * 0.06,
                borderRadius: iconSize * 0.28,
                border: `${Math.max(2, iconSize * 0.015)}px solid ${accent}`,
                opacity: ringOpacity,
                transform: `scale(${ringScale})`,
                boxShadow: `0 0 ${iconSize * 0.15}px ${accent}`,
              }}
            />

            {/* The three assembled bars (from the single icon asset), each flying its own vector */}
            {logo ? (
              <>
                {/* Amber bar - from left */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: 'inset(0% 0% 66.6% 0%)',
                    transform: `translateX(${amberX}px)`,
                  }}
                >
                  <Img src={logo} style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
                </div>
                {/* Pale bar - from right */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: 'inset(33.3% 0% 33.3% 0%)',
                    transform: `translateX(${paleX}px)`,
                  }}
                >
                  <Img src={logo} style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
                </div>
                {/* Charcoal bar - from below */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: 'inset(66.6% 0% 0% 0%)',
                    transform: `translateY(${charY}px)`,
                  }}
                >
                  <Img src={logo} style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
                </div>
              </>
            ) : (
              // Designed substitute: three stacked bars forming a typographic monogram tile
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: iconSize * 0.22,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: iconSize * 0.06,
                  padding: iconSize * 0.18,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: iconSize * 0.14,
                    borderRadius: iconSize * 0.04,
                    background: accent,
                    boxShadow: `0 0 ${iconSize * 0.1}px ${accent}`,
                    transform: `translateX(${amberX}px)`,
                  }}
                />
                <div
                  style={{
                    width: '100%',
                    height: iconSize * 0.14,
                    borderRadius: iconSize * 0.04,
                    background: '#EDEDEF',
                    transform: `translateX(${paleX}px)`,
                  }}
                />
                <div
                  style={{
                    width: '100%',
                    height: iconSize * 0.14,
                    borderRadius: iconSize * 0.04,
                    background: '#4a4a4d',
                    transform: `translateY(${charY}px)`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Wordmark lockup: rule + ON AIR, directly beneath icon */}
          <div
            style={{
              marginTop: height * 0.045,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: `scale(${frame < exitStart ? 1 : exitScale})`,
              opacity: frame < exitStart ? 1 : exitOpacity,
            }}
          >
            {/* Thin amber hairline rule, draws left-to-right, width matches text */}
            <div
              style={{
                width: ruleWidth,
                height: 2,
                background: accent,
                marginBottom: height * 0.02,
                boxShadow: `0 0 6px ${accent}`,
              }}
            />
            <div
              style={{
                display: 'flex',
                fontFamily: '"Archivo", Arial, sans-serif',
                fontSize,
                fontWeight: 900,
                letterSpacing: '-0.005em',
                textTransform: 'uppercase',
                color: '#EDEDEF',
              }}
            >
              {letters.map((ch, i) => {
                const letterStart = lettersStart + i * 2;
                const t = interpolate(frame, [letterStart, letterStart + 6], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const y = interpolate(t, [0, 1], [20, 0]);
                return (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      whiteSpace: 'pre',
                      transform: `translateY(${y}px)`,
                      opacity: t,
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
