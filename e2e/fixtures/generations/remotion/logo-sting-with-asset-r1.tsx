// "Bar Assembly Ident" - 3s channel ident. The icon's three bars fly in on independent
// vectors and slam together, then an ON AIR lockup mask-wipes into view beneath it.
// Palette is drawn entirely from the icon's own tones: graphite base, ice-white, amber.
// Structure: PRE-ROLL CHARGE -> BAR ASSEMBLY -> MASK-WIPE REVEAL -> HERO HOLD -> EXIT.

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
  const accent = String(fields.accent ?? '#f5a623');
  const logoName = String(fields.logo ?? 'noacg-icon-512');
  const logo = assets[logoName] || assets['noacg-icon-512'];

  const ICE = '#e9edf0';
  const GRAPHITE = '#0d0d10';

  // ── Timing (frames) ─────────────────────────────────────────────────────
  const scanIn = [0, 10];
  const barStart = 10;
  const amberLand = 18;
  const whiteLand = 22;
  const greyLand = 26;
  const iconSettled = 30;
  const wipeStart = 30;
  const wipeDur = 8; // ends at 38
  const holdEnd = 70;
  const exitStart = 70;
  const exitFadeDur = 12; // clears by 82
  const dimStart = 82; // background dims to black over final 8 frames

  // ── Background: graphite gradient + vignette + scanlines ────────────────
  const scanOpacity = interpolate(frame, scanIn, [0, 0.04], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bgDim = interpolate(frame, [dimStart, durationInFrames - 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Ambient amber glow bloom: pulses pre-roll, drifts on hold, flashes on exit ──
  const glowPulse = interpolate(frame, [0, 10], [0.35, 0.55], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glowLandBoost = spring({ frame: frame - iconSettled, fps, config: { damping: 16, mass: 0.9 } });
  const glowDrift = Math.sin(((frame - 38) / fps) * Math.PI * 0.4) * width * 0.02;
  const glowFlash = interpolate(frame, [exitStart, exitStart + 3, exitStart + 8], [0.5, 1, 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const glowOpacity = frame < iconSettled
    ? glowPulse
    : frame < exitStart
    ? 0.45 + glowLandBoost * 0.15
    : glowFlash;

  // ── Icon assembly: three bars on independent staggered springs ──────────
  const iconSize = height * 0.34; // icon commands upper-middle at 34% frame height
  const iconCenterY = height * 0.4; // centered at ~40% frame height from top

  const amberSpring = spring({ frame: frame - (amberLand - 8), fps, config: { damping: 14, mass: 0.9 } });
  const whiteSpring = spring({ frame: frame - (whiteLand - 8), fps, config: { damping: 14, mass: 0.9 } });
  const greySpring = spring({ frame: frame - (greyLand - 8), fps, config: { damping: 14, mass: 0.9 } });

  // Settle wobble: 3-degree rotation that resolves to 0 as each bar lands (amber only, per brief)
  const amberWobble = interpolate(amberSpring, [0, 0.7, 1], [0, 3, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Bars travel from off-frame vectors into their resting position (which is simply
  // the assembled icon image position - they converge to 0,0 offset).
  const amberOffset = interpolate(amberSpring, [0, 1], [-height * 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const whiteOffsetX = interpolate(whiteSpring, [0, 1], [-width * 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const greyOffsetX = interpolate(greySpring, [0, 1], [width * 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const greyOffsetY = interpolate(greySpring, [0, 1], [height * 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Whether each bar has begun its flight (controls visibility before frame 10)
  const barsVisible = frame >= barStart - 8;

  // Icon overall entrance: before fully assembled, we still show it early (bars visible
  // individually is represented via slight offset shake, but since we only have ONE icon
  // asset - not separate bar assets - we simulate the "assembly" by combining a converging
  // group of three faux bar-shaped highlight slivers that fly toward the real icon, which
  // itself fades/scales in as they converge, landing exactly on lock frame.
  const iconLockProgress = spring({ frame: frame - (greyLand - 6), fps, config: { damping: 15, mass: 0.9 } });
  const iconScaleIn = interpolate(iconLockProgress, [0, 1], [0.7, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const iconOpacityIn = interpolate(frame, [barStart, amberLand], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Breathing hold: 1.0 -> 1.015 sine cycle, eased in from exactly 1.0 at settle
  const breatheProgress = interpolate(frame, [iconSettled, iconSettled + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const breathe = frame >= iconSettled
    ? 1 + Math.sin(((frame - iconSettled) / fps) * Math.PI) * 0.015 * breatheProgress
    : 1;

  // Exit: icon + wordmark scale up 6% and fade over 12 frames, accelerating ease-in
  const exitT = interpolate(frame, [exitStart, exitStart + exitFadeDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitEase = exitT * exitT * exitT; // steep accelerating curve
  const exitScale = 1 + exitEase * 0.06;
  const exitOpacity = 1 - exitEase;

  const iconTransform = `translate(-50%, -50%) scale(${iconScaleIn * breathe * exitScale}) rotate(${amberWobble * 0}deg)`;

  // ── ON AIR mask-wipe: revealed left-to-right beneath the icon ────────────
  const wipeProgress = interpolate(frame, [wipeStart, wipeStart + wipeDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const underlinePulse = 0.8 + Math.sin(((frame - 38) / fps) * Math.PI * 0.6) * 0.1 + 0.1;

  const wordmarkFontSize = Math.round(height * 0.05);
  const wordmarkWidthEstimate = wordmarkFontSize * wordmark.length * 0.68 * 1.15; // Inter cap advance + tracking

  return (
    <AbsoluteFill style={{ background: GRAPHITE, overflow: 'hidden' }}>
      {/* Layer 1: graphite gradient + radial vignette lightening toward icon position */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, #1a1a1f 0%, #121216 45%, ${GRAPHITE} 85%)`,
          opacity: 1 - bgDim,
        }}
      />
      {/* Final dim to solid black for the clean cut */}
      <AbsoluteFill style={{ background: '#000000', opacity: bgDim }} />

      {/* Scanline texture, faint broadcast feel */}
      <AbsoluteFill
        style={{
          opacity: scanOpacity * (1 - bgDim),
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Layer 2: ambient amber glow bloom behind the icon */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: iconCenterY,
          width: iconSize * 1.8,
          height: iconSize * 1.8,
          transform: `translate(-50%, -50%) translateX(${glowDrift}px)`,
          background: `radial-gradient(circle, ${accent}66 0%, ${accent}22 45%, transparent 75%)`,
          filter: 'blur(30px)',
          opacity: glowOpacity * (1 - bgDim),
        }}
      />

      {/* Layer 3: the assembled icon, with faux converging bar slivers pre-lock */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: iconCenterY,
          width: iconSize,
          height: iconSize,
          transform: iconTransform,
          opacity: iconOpacityIn * exitOpacity,
          filter: `drop-shadow(0 ${iconSize * 0.06}px ${iconSize * 0.12}px rgba(0,0,0,0.5))`,
        }}
      >
        {logo ? (
          <Img src={logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          // Designed substitute wordmark-monogram if no icon asset is present
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '18%',
              background: `linear-gradient(180deg, #1c1c22 0%, ${GRAPHITE} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: iconSize * 0.06,
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ width: '60%', height: '18%', borderRadius: 6, background: accent, boxShadow: `0 0 20px ${accent}` }} />
            <div style={{ width: '60%', height: '18%', borderRadius: 6, background: ICE }} />
            <div style={{ width: '60%', height: '18%', borderRadius: 6, background: '#4a4a4f' }} />
          </div>
        )}

        {/* Faux bar-flight highlight slivers, visible only during assembly, converging onto icon */}
        {barsVisible && frame < iconSettled + 4 && (
          <>
            <div
              style={{
                position: 'absolute',
                left: '20%',
                top: '18%',
                width: '60%',
                height: '16%',
                borderRadius: 6,
                background: accent,
                boxShadow: `0 0 24px ${accent}`,
                transform: `translateY(${amberOffset}px) rotate(${amberWobble}deg)`,
                opacity: interpolate(amberSpring, [0, 0.15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (1 - interpolate(frame, [amberLand + 2, iconSettled], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })),
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '20%',
                top: '42%',
                width: '60%',
                height: '16%',
                borderRadius: 6,
                background: ICE,
                transform: `translateX(${whiteOffsetX}px)`,
                opacity: interpolate(whiteSpring, [0, 0.15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (1 - interpolate(frame, [whiteLand + 2, iconSettled], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })),
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '20%',
                top: '66%',
                width: '60%',
                height: '16%',
                borderRadius: 6,
                background: '#4a4a4f',
                transform: `translate(${greyOffsetX}px, ${greyOffsetY}px)`,
                opacity: interpolate(greySpring, [0, 0.15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (1 - interpolate(frame, [greyLand + 2, iconSettled], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })),
              }}
            />
          </>
        )}
      </div>

      {/* Layer 4: ON AIR lockup, mask-wiped into view directly beneath the icon */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: iconCenterY + iconSize * 0.72,
          transform: `translate(-50%, 0) scale(${exitScale})`,
          opacity: exitOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            width: wordmarkWidthEstimate,
            height: wordmarkFontSize * 1.3,
            clipPath: `inset(0 ${100 - wipeProgress * 100}% 0 0)`,
          }}
        >
          <div
            style={{
              fontFamily: '"Archivo", "Arial Black", Arial, sans-serif',
              fontSize: wordmarkFontSize,
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: ICE,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              width: '100%',
            }}
          >
            {wordmark}
          </div>
        </div>
        <div
          style={{
            marginTop: wordmarkFontSize * 0.22,
            width: wordmarkWidthEstimate * wipeProgress,
            height: Math.max(2, Math.round(height * 0.0035)),
            background: accent,
            boxShadow: `0 0 12px ${accent}`,
            opacity: frame >= 38 ? underlinePulse : wipeProgress,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
