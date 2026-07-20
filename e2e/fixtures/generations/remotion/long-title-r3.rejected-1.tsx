
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

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
  const kicker = String(fields.kicker ?? 'A DOCUMENTARY FILM');
  const supportLine = String(fields.supportLine ?? 'THE LONG ROAD TO');
  const heroLine = String(fields.heroLine ?? 'WESTMINSTER BRIDGE');
  const accent = String(fields.accent ?? '#c98a3a');

  // ── Palette ─────────────────────────────────────────────────────────────
  const stone = '#c9c0ab'; // the "road" keyline base tone
  const ink = '#f2efe8'; // near-white for hero/support text

  // ── Timing (frames) ─────────────────────────────────────────────────────
  const horizonEnd = Math.round(fps * 0.8); // 0-24: rule extends
  const kickerStart = Math.round(fps * 0.2); // 6
  const kickerEnd = Math.round(fps * 0.67); // 20
  const supportStart = Math.round(fps * 0.47); // 14
  const supportEnd = Math.round(fps * 1.13); // 34
  const heroStart = Math.round(fps * 0.8); // 24
  const heroEnd = Math.round(fps * 1.67); // 50
  const holdStart = 50;
  const holdEnd = 95;
  const textExitStart = 96;
  const textExitEnd = 106;
  const finalExitStart = 106;
  const finalExitEnd = 114;

  // ── Phase 1: horizon rule extends center-out, fast start soft stop ─────
  const horizonProgress = interpolate(frame, [0, horizonEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
  });

  // Horizon + kicker exit at the very end
  const finalFade = interpolate(frame, [finalExitStart, finalExitEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Phase 2: kicker fade + rise ───────────────────────────────────────
  const kickerSpring = spring({
    frame: frame - kickerStart,
    fps,
    config: { damping: 200, stiffness: 220 },
    durationInFrames: kickerEnd - kickerStart,
  });
  const kickerOpacity = kickerSpring * finalFade;
  const kickerY = (1 - kickerSpring) * 20;

  // ── Phase 3: support line settle ────────────────────────────────────────
  const supportSpring = spring({
    frame: frame - supportStart,
    fps,
    config: { damping: 200, stiffness: 180 },
    durationInFrames: supportEnd - supportStart,
  });
  const supportY = (1 - supportSpring) * 24;

  // ── Phase 4: hero line settle + letter-spacing expansion ───────────────
  const heroSpring = spring({
    frame: frame - heroStart,
    fps,
    config: { damping: 200, stiffness: 160 },
    durationInFrames: heroEnd - heroStart,
  });
  const heroY = (1 - heroSpring) * 30;
  const heroTracking = interpolate(heroSpring, [0, 1], [0.01, 0.03], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const underlineWidth = interpolate(frame, [heroStart, heroEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  // ── Phase 5: ambient hold - scale creep + strata drift ─────────────────
  const holdT = interpolate(frame, [holdStart, holdEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ambientScale = 1 + holdT * 0.015;
  const strataDrift = Math.sin((frame / fps) * Math.PI * 0.5) * 6;

  // ── Phase 6: text exit - fade + rise, faster than entrance ─────────────
  const textExit = interpolate(frame, [textExitStart, textExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t, // accelerating away
  });
  const textOpacity = (1 - textExit) * (frame < textExitStart ? 1 : 1);
  const textRise = textExit * -16;

  // Combine entrance + hold + exit for support/hero (opacity gates)
  const supportOpacity = supportSpring * (1 - textExit);
  const heroOpacity = heroSpring * (1 - textExit);

  // ── Type sizing: derived from string length & face capAdvance ──────────
  // Serif editorial face fallback (no bundled serif, so Georgia-class stack).
  const serifFace = 'Georgia, "Times New Roman", serif';
  const serifCapAdvance = 0.5; // approximate cap-height advance for Georgia-class serif

  const supportChars = supportLine.length;
  const supportFontSize = (width * 0.6) / (supportChars * serifCapAdvance);

  const heroChars = heroLine.length;
  const heroFontSize = (width * 0.78) / (heroChars * serifCapAdvance);

  return (
    <AbsoluteFill>
      {/* Layer 1: charcoal-slate gradient with vignette toward edges */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(120% 100% at 50% 50%, #15171c 0%, #101217 55%, #0b0c10 100%)',
        }}
      />

      {/* Layer 2: faint tonal horizontal strata bands - riverbank/embankment feel */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {[0, 1, 2, 3].map((i) => {
          const bandTop = height * (0.3 + i * 0.11);
          const bandOpacity = 0.05 - i * 0.008;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: bandTop,
                left: -20,
                right: -20,
                height: height * 0.06,
                background: i % 2 === 0 ? '#ffffff' : '#000000',
                opacity: Math.max(bandOpacity, 0.015),
                transform: `translateX(${strataDrift * (i % 2 === 0 ? 1 : -1)}px)`,
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* Layer 3: the brass horizon keyline - extends from center outward */}
      <div
        style={{
          position: 'absolute',
          top: height * 0.52,
          left: '50%',
          width: width * horizonProgress,
          height: 2,
          transform: 'translate(-50%, -50%)',
          background: `linear-gradient(90deg, transparent 0%, ${stone} 12%, ${accent} 50%, ${stone} 88%, transparent 100%)`,
          opacity: 0.85 * finalFade,
          boxShadow: `0 0 8px rgba(201,138,58,0.25)`,
        }}
      />

      {/* Layer 4-6: text block, painted last, on top of everything */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          transform: `scale(${ambientScale})`,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: `translateY(${textRise}px)`,
          }}
        >
          {/* Kicker label */}
          <div
            style={{
              fontFamily: '"Inter", Arial, Helvetica, sans-serif',
              fontSize: Math.round(height * 0.028),
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: accent,
              opacity: kickerOpacity,
              transform: `translateY(${kickerY}px)`,
              marginBottom: Math.round(height * 0.045),
            }}
          >
            {kicker}
          </div>

          {/* Support line - just above the horizon */}
          <div
            style={{
              fontFamily: serifFace,
              fontWeight: 400,
              fontSize: Math.round(supportFontSize),
              letterSpacing: '0.01em',
              color: ink,
              opacity: supportOpacity,
              transform: `translateY(${supportY}px)`,
              whiteSpace: 'nowrap',
              marginBottom: Math.round(height * 0.005),
            }}
          >
            {supportLine}
          </div>

          {/* Gap: 0.4x hero line-height between support and hero */}
          <div style={{ height: heroFontSize * 0.4 }} />

          {/* Hero line - the destination, oversized, directly beneath support */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: heroOpacity,
              transform: `translateY(${heroY}px)`,
            }}
          >
            <div
              style={{
                fontFamily: serifFace,
                fontWeight: 700,
                fontSize: Math.round(heroFontSize),
                letterSpacing: `${heroTracking}em`,
                color: ink,
                whiteSpace: 'nowrap',
              }}
            >
              {heroLine}
            </div>
            {/* Brass underline beneath the hero line */}
            <div
              style={{
                marginTop: Math.round(heroFontSize * 0.12),
                width: `${underlineWidth * 100}%`,
                maxWidth: '100%',
                height: 3,
                background: accent,
                boxShadow: `0 0 6px rgba(201,138,58,0.35)`,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
