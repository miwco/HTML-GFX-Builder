// "Rift Punch" - a 4s esports stinger: a vertical seam of light builds tension, then two
// slate slabs snap apart along a jagged diagonal crack, throwing violet-cyan light through
// the gap as the NOVA RIFT wordmark punches forward. Hold breathes with ambient energy,
// then everything punches back into the crack and the slabs slam shut for a clean cut.
//
// Layering (back to front): background gradient + grid -> slabs (lit surfaces) -> rift
// crack glow -> speed-line particles -> kicker + wordmark (topmost, painted last).

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
  const hero = String(fields.hero ?? 'RIFT');
  const riser = String(fields.riser ?? 'NOVA');
  const kicker = String(fields.kicker ?? 'Late Night Esports');
  const violet = String(fields.violet ?? '#8b5cf6');
  const cyan = String(fields.cyan ?? '#22d3ee');

  // ── Timing constants (frames) ───────────────────────────────────────────
  const seamStart = 4;          // frame the pre-crack seam appears
  const snapStart = 16;         // slabs begin tearing apart
  const snapSettle = 30;        // slabs settle (with overshoot) by here
  const glowFlashEnd = snapStart + 4; // crack glow reaches full intensity
  const kickerStart = 34;       // kicker springs in
  const riserStart = 38;        // NOVA punches in
  const heroStart = 42;         // RIFT punches in
  const holdStart = 50;
  const holdEnd = 100;
  const exitStart = 100;        // text begins accelerating back into crack
  const textGoneBy = 108;
  const crackCollapseBy = 112;
  const slabsShutBy = 118;      // slabs meet and fill frame

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  // ── Phase 1: charge — thin seam of light builds anticipation ───────────
  const seamOpacity = interpolate(frame, [seamStart, seamStart + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const seamWidth = interpolate(frame, [seamStart, snapStart], [1, 6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // subtle background pulse during charge phase
  const chargePulse = 1 + Math.sin((clamp(frame, 0, snapStart) / fps) * Math.PI * 2) * 0.004;

  // ── Phase 2: rift snap — slabs tear apart along the diagonal ────────────
  const snapProgress = spring({
    frame: frame - snapStart,
    fps,
    config: { damping: 18, stiffness: 220 },
  });
  // Ease-in used for the exit collapse (slabs slam shut)
  const exitProgress = interpolate(frame, [exitStart + 8, slabsShutBy], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t, // accelerating ease-in
  });
  // Slab travel: 0 = closed (meeting at center), 1 = fully torn open
  const slabOpen = snapProgress * (1 - exitProgress);
  const slabTravel = width * 0.42; // how far each slab travels when fully open

  // Ambient hold: slow scale creep + gentle sine drift on the whole lockup
  const holdT = clamp(frame, holdStart, holdEnd);
  const ambientScale = 1 + (Math.sin((holdT / fps) * Math.PI * (2 / 2)) * 0.5 + 0.5) * 0.02;

  // Crack glow: sharp clamped flash up, gentle pulse in hold, sharp collapse on exit
  const glowFlash = interpolate(frame, [snapStart, glowFlashEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const glowPulse = 0.85 + (Math.sin((holdT / fps) * Math.PI) * 0.5 + 0.5) * 0.15;
  const glowCollapse = interpolate(frame, [exitStart, crackCollapseBy], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const glowIntensity = glowFlash * (frame < holdStart ? 1 : glowPulse) * glowCollapse;

  // ── Phase 3: wordmark punch-through ──────────────────────────────────────
  const kickerSpring = spring({ frame: frame - kickerStart, fps, config: { damping: 18, stiffness: 220 } });
  const riserSpring = spring({ frame: frame - riserStart, fps, config: { damping: 17, stiffness: 220 } });
  const heroSpring = spring({ frame: frame - heroStart, fps, config: { damping: 17, stiffness: 220 } });

  // Exit: text accelerates back into the crack and scales down while fading
  const textExit = interpolate(frame, [exitStart, textGoneBy], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t, // ease-in acceleration
  });
  const textOpacity = (1 - textExit) * (frame < exitStart ? 1 : 1);
  const textScale = (0.92 + heroSpring * 0.08) * ambientScale * (1 - textExit * 0.4);

  // ── Hero sizing: RIFT sized from its own string (Anton-like face, ~0.5 em/char) ──
  const heroCapAdvance = 0.5; // approx cap-height advance for a condensed heavy face
  const heroChars = hero.length;
  const targetLineWidth = width * 0.62;
  const heroFontSize = Math.round(targetLineWidth / (heroCapAdvance * Math.max(heroChars, 1)));
  const riserFontSize = Math.round(heroFontSize * 0.38);
  const kickerFontSize = Math.round(height * 0.03);

  // ── Speed-line particles radiating from the crack (deterministic via random()) ──
  const particleCount = 14;
  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const seed = `rift-particle-${i}`;
    const angle = (random(seed + '-angle') - 0.5) * 50 - 45; // roughly diagonal spread
    const dist = 0.3 + random(seed + '-dist') * 0.9;
    const len = 60 + random(seed + '-len') * 180;
    const baseOpacity = 0.15 + random(seed + '-op') * 0.45;
    const speed = 0.4 + random(seed + '-speed') * 0.8;
    const drift = ((frame - snapStart) * speed) % 200;
    return { angle, dist, len, baseOpacity, drift, i };
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0b0a12 0%, #0e0c18 55%, #171226 100%)',
        overflow: 'hidden',
        transform: `scale(${chargePulse})`,
      }}
    >
      {/* Faint diagonal micro-grid texture for screen-surface depth */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(139,92,246,0.05) 0px, rgba(139,92,246,0.05) 1px, transparent 1px, transparent 26px), repeating-linear-gradient(-45deg, rgba(34,211,238,0.04) 0px, rgba(34,211,238,0.04) 1px, transparent 1px, transparent 26px)',
          opacity: 0.6,
        }}
      />

      {/* Pre-crack tension seam (only visible before the slabs tear) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          width: seamWidth,
          height: '100%',
          background: `linear-gradient(180deg, ${cyan}, ${violet})`,
          transform: 'translateX(-50%) rotate(6deg)',
          opacity: frame < snapStart ? seamOpacity : 0,
          filter: 'blur(1px)',
          boxShadow: `0 0 30px 6px ${cyan}88`,
        }}
      />

      {/* Slab: upper-left — a lit surface, same-hue charcoal-to-slate gradient + keyline */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-20%',
          width: '110%',
          height: '110%',
          background: 'linear-gradient(135deg, #23212f 0%, #171622 60%, #0e0d16 100%)',
          transform: `skewY(-8deg) translate(${-slabOpen * slabTravel}px, ${-slabOpen * slabTravel * 0.6}px)`,
          clipPath: 'polygon(0 0, 100% 0, 45% 100%, 0% 100%)',
          boxShadow: `inset -2px 0 0 ${violet}aa, 8px 8px 40px rgba(0,0,0,0.55)`,
          backgroundImage:
            'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      {/* Slab: lower-right — mirrored lit surface */}
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-20%',
          width: '110%',
          height: '110%',
          background: 'linear-gradient(-45deg, #23212f 0%, #171622 60%, #0e0d16 100%)',
          transform: `skewY(-8deg) translate(${slabOpen * slabTravel}px, ${slabOpen * slabTravel * 0.6}px)`,
          clipPath: 'polygon(55% 0, 100% 0, 100% 100%, 0% 100%)',
          boxShadow: `inset 2px 0 0 ${cyan}aa, -8px -8px 40px rgba(0,0,0,0.55)`,
          backgroundImage:
            'linear-gradient(-45deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      {/* Rift crack glow — violet core, cyan edge, running diagonally through the gap */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '10%',
          height: '160%',
          transform: 'translate(-50%, -50%) rotate(-8deg)',
          background: `linear-gradient(90deg, transparent 0%, ${cyan}00 15%, ${cyan}cc 38%, ${violet}ff 50%, ${cyan}cc 62%, ${cyan}00 85%, transparent 100%)`,
          opacity: glowIntensity,
          filter: `blur(${4 + glowIntensity * 10}px)`,
          zIndex: 5,
        }}
      />

      {/* Speed-line particles radiating from the crack, behind the type */}
      <AbsoluteFill style={{ zIndex: 6 }}>
        {particles.map((p) => {
          const cx = width / 2 + Math.cos((p.angle * Math.PI) / 180) * p.dist * width * 0.5;
          const cy = height / 2 + Math.sin((p.angle * Math.PI) / 180) * p.dist * height * 0.5;
          return (
            <div
              key={p.i}
              style={{
                position: 'absolute',
                top: cy,
                left: cx,
                width: p.len,
                height: 2,
                background: p.i % 2 === 0 ? cyan : violet,
                opacity: p.baseOpacity * glowIntensity,
                transform: `rotate(-8deg) translateX(${p.drift}px)`,
                filter: 'blur(0.5px)',
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* Wordmark lockup — topmost layer, riding the gap */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: `scale(${textScale})`,
            opacity: textOpacity,
          }}
        >
          {/* Kicker: small-caps broadcast lower-third feel */}
          <div
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
              fontSize: kickerFontSize,
              fontWeight: 600,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: `${cyan}cc`,
              marginBottom: Math.round(height * 0.02),
              opacity: interpolate(kickerSpring, [0, 1], [0, 1]),
              transform: `translateY(${(1 - kickerSpring) * -20}px)`,
            }}
          >
            {kicker}
          </div>

          {/* NOVA riser — smaller, wider tracking, distinct from hero scale */}
          <div
            style={{
              fontFamily: '"Oswald", "Arial Narrow", Arial, sans-serif',
              fontSize: riserFontSize,
              fontWeight: 700,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: '#f4f2fb',
              lineHeight: 1,
              opacity: interpolate(riserSpring, [0, 1], [0, 1]),
              transform: `scale(${interpolate(riserSpring, [0, 1], [0.92, 1])})`,
              textShadow: `0 0 24px ${violet}66`,
            }}
          >
            {riser}
          </div>

          {/* RIFT hero — huge, tight negative tracking, sized from its own string */}
          <div
            style={{
              fontFamily: '"Oswald", "Arial Narrow", Arial, sans-serif',
              fontSize: heroFontSize,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              lineHeight: 0.95,
              whiteSpace: 'nowrap',
              backgroundImage: `linear-gradient(90deg, ${cyan}, #f4f2fb 45%, ${violet})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              opacity: interpolate(heroSpring, [0, 1], [0, 1]),
              transform: `scale(${interpolate(heroSpring, [0, 1], [0.92, 1])})`,
              filter: `drop-shadow(0 0 ${18 + glowIntensity * 30}px ${violet}aa)`,
            }}
          >
            {hero}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
