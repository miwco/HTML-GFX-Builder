// "Slab Snap" ident - three DNA bars (amber / pale grey / charcoal, echoing the icon's own
// internal bars) converge from opposite edges, flash-bloom and hard-cut into the real icon,
// which settles as an "ON AIR" tally lockup ignites beneath it. Graphite studio background
// with a slow same-hue glow and a drifting scanline texture keep the hold alive.

import {
  AbsoluteFill,
  Img,
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
  const wordmark = String(fields.wordmark ?? 'ON AIR');
  const accent = String(fields.accent ?? '#f5a623');
  const logoName = String(fields.logo ?? 'noacg-icon-512');
  const logo = assets[logoName];

  // ── Palette (icon's own three-bar DNA: amber / pale grey / charcoal) ────
  const paleGrey = '#eef1f4';
  const charcoal = '#4a4a4a';
  const graphiteBase = '#0d0d0f';

  // ── Timing constants (derived from fps, so any frame rate still works) ──
  const slabStart = 0;
  const snapFrame = Math.round(fps * 0.8); // 24f @30fps - flash bloom + hard cut to real icon
  const bloomFrames = 2;
  const wordmarkStart = snapFrame; // wordmark + dot spring in with the snap
  const exitStart = Math.round(fps * 2.2); // 66f
  const exitWordEnd = exitStart + Math.round(fps * 0.2); // 72f - wordmark gone
  const iconExitStart = exitStart + Math.round(fps * 0.067); // ~68f - icon begins shrink
  const iconExitEnd = iconExitStart + Math.round(fps * 0.33); // ~78f - icon fully gone
  const bgFadeStart = iconExitEnd; // 78f
  const bgFadeEnd = durationInFrames; // 90f

  // ── Icon geometry: locked to native aspect, sized from the frame ────────
  const iconSize = height * 0.34; // 34% of frame height at hold
  const iconCenterX = width * 0.5;
  const iconCenterY = height * 0.42;

  // ── Phase 1: slab assembly - three bars converge with staggered springs ─
  const slabConfig = { damping: 14, stiffness: 170 };
  const topSlab = spring({ frame: frame - slabStart, fps, config: slabConfig });
  const midSlab = spring({ frame: frame - (slabStart + 3), fps, config: slabConfig });
  const botSlab = spring({ frame: frame - (slabStart + 6), fps, config: slabConfig });

  // slabs travel from off-frame to their stacked resting positions (mirrors icon's bars)
  const stackH = height * 0.3; // total slab stack height
  const topX = interpolate(topSlab, [0, 1], [-width * 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const midX = interpolate(midSlab, [0, 1], [width * 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const botX = interpolate(botSlab, [0, 1], [-width * 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // slabs are visible only until the snap hard-cuts to the real icon
  const slabsVisible = frame < snapFrame;

  // ── Phase 2: flash-bloom disguising the hard cut, then the settled icon ─
  const bloom = interpolate(
    frame,
    [snapFrame, snapFrame + bloomFrames, snapFrame + bloomFrames * 2],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const iconRevealed = frame >= snapFrame;

  // Ambient breathing hold: scale creeps 1.0 -> 1.02 on a slow 3s sine, starting at 1.0
  const breathePhase = Math.max(0, frame - snapFrame) / fps;
  const breathe = iconRevealed ? 1 + (Math.sin(breathePhase * Math.PI * (2 / 3)) * 0.5 + 0.5) * 0.02 : 1;

  // Exit: icon holds briefly then eases down with fade
  const iconExit = interpolate(frame, [iconExitStart, iconExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const iconScale = breathe * interpolate(iconExit, [0, 1], [1, 0.9]);
  const iconOpacity = iconRevealed ? 1 - iconExit : 0;

  // ── Phase 3: tally dot + wordmark spring in beneath the icon ────────────
  const wordmarkIn = spring({
    frame: frame - wordmarkStart,
    fps,
    config: { damping: 16, stiffness: 200 },
  });
  const dotIn = spring({
    frame: frame - wordmarkStart,
    fps,
    config: { damping: 12, stiffness: 220 },
  });
  // Tally dot pulse: opacity 0.85-1 every 24 frames, sinusoidal
  const dotPulse = 0.85 + (Math.sin((frame / 24) * Math.PI * 2) * 0.5 + 0.5) * 0.15;

  // Exit: wordmark + dot accelerate upward and fade fast, ahead of the icon
  const wordExit = interpolate(frame, [exitStart, exitWordEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wordOpacity = interpolate(wordmarkIn, [0, 1], [0, 1]) * (1 - wordExit);
  const wordY =
    interpolate(wordmarkIn, [0, 1], [height * 0.03, 0]) - wordExit * height * 0.08;

  // Wordmark sized from its own string width (Archivo bold caps, ~0.74em per char)
  const capAdvance = 0.74;
  const trackedChars = wordmark.length * 1.15; // account for generous letter-spacing
  const targetLineWidth = width * 0.24; // 24% of frame width target
  const wordFontSize = Math.round(targetLineWidth / (capAdvance * trackedChars));

  // ── Background: same-hue radial glow + vignette + drifting scanlines ───
  const bgFade = 1 - interpolate(frame, [bgFadeStart, bgFadeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scanlineOffset = (frame * -2) % 40; // drifts upward at 2px/frame

  return (
    <AbsoluteFill style={{ backgroundColor: graphiteBase }}>
      {/* Layer 1: graphite base with a warm same-hue radial glow behind the icon */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, rgba(28,26,22,${0.9 * bgFade}) 0%, rgba(13,13,15,${0.6 * bgFade}) 45%, rgba(13,13,15,0) 75%)`,
          opacity: bgFade,
        }}
      />
      {/* Vertical vignette darkening top/bottom edges */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Layer 2: drifting scanline texture (broadcast/tech cue), low opacity */}
      <AbsoluteFill
        style={{
          opacity: 0.06 * bgFade,
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(238,241,244,0.9) 0px, rgba(238,241,244,0.9) 1px, transparent 1px, transparent 4px)',
          backgroundPosition: `0 ${scanlineOffset}px`,
        }}
      />

      {/* Layer 3: soft ambient glow disc directly behind the icon */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
        <div
          style={{
            position: 'absolute',
            left: iconCenterX,
            top: iconCenterY,
            width: iconSize * 2.2,
            height: iconSize * 2.2,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(245,166,35,${0.16 * bgFade}) 0%, rgba(245,166,35,0) 70%)`,
          }}
        />
      </AbsoluteFill>

      {/* Layer 4: slab-assembly proxy bars (visible only before the snap) */}
      {slabsVisible && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
          <div
            style={{
              position: 'absolute',
              left: iconCenterX,
              top: iconCenterY,
              width: iconSize,
              height: stackH,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              filter: `drop-shadow(0 0 ${8 + bloom * 30}px rgba(245,166,35,${0.4 + bloom * 0.6}))`,
            }}
          >
            <div
              style={{
                height: '42%',
                borderRadius: iconSize * 0.08,
                backgroundColor: accent,
                backgroundImage:
                  'linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.2) 100%)',
                transform: `translateX(${topX}px)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            />
            <div
              style={{
                height: '30%',
                borderRadius: iconSize * 0.08,
                backgroundColor: paleGrey,
                backgroundImage:
                  'linear-gradient(165deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.1) 100%)',
                transform: `translateX(${midX}px)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            />
            <div
              style={{
                height: '18%',
                borderRadius: iconSize * 0.08,
                backgroundColor: charcoal,
                backgroundImage:
                  'linear-gradient(165deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.3) 100%)',
                transform: `translateX(${botX}px)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            />
          </div>
        </AbsoluteFill>
      )}

      {/* Flash-bloom overlay disguising the hard cut */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 42%, rgba(245,166,35,${bloom}) 0%, rgba(245,166,35,0) 60%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Layer 5: the settled hero icon (real asset, never distorted) */}
      {iconRevealed && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
          <div
            style={{
              position: 'absolute',
              left: iconCenterX,
              top: iconCenterY,
              width: iconSize,
              height: iconSize,
              transform: `translate(-50%, -50%) scale(${iconScale})`,
              opacity: iconOpacity,
            }}
          >
            {logo ? (
              <Img
                src={logo}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              // Designed substitute lockup echoing the three-bar DNA, in case no asset resolves
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: iconSize * 0.2,
                  backgroundColor: '#141416',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: iconSize * 0.06,
                  padding: iconSize * 0.16,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ height: '28%', borderRadius: iconSize * 0.05, background: accent }} />
                <div style={{ height: '20%', borderRadius: iconSize * 0.05, background: paleGrey }} />
                <div style={{ height: '12%', borderRadius: iconSize * 0.05, background: charcoal }} />
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}

      {/* Layer 6: tally dot + ON AIR wordmark - painted last, never covered */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'flex-start',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: height * 0.66,
            transform: `translate(-50%, ${wordY}px)`,
            display: 'flex',
            alignItems: 'center',
            gap: wordFontSize * 0.4,
            opacity: wordOpacity,
          }}
        >
          {/* Amber tally dot: ignites with a glow-spring pop, pulses in the hold */}
          <div
            style={{
              width: wordFontSize * 0.5,
              height: wordFontSize * 0.5,
              borderRadius: '50%',
              backgroundColor: accent,
              transform: `scale(${dotIn})`,
              opacity: dotPulse,
              boxShadow: `0 0 ${wordFontSize * 0.6}px rgba(245,166,35,${0.7 * dotPulse})`,
            }}
          />
          <div
            style={{
              fontFamily: '"Archivo", Arial, sans-serif',
              fontWeight: 800,
              fontSize: wordFontSize,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: paleGrey,
              whiteSpace: 'nowrap',
            }}
          >
            {wordmark}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
