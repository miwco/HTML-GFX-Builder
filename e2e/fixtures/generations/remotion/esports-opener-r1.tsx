// "Rift Ejection" - a 4s (120f @30fps) broadcast stinger for the esports show NOVA RIFT.
// Concept: a jagged neon crack tears the frame diagonally; two dark slab panels snap apart
// from the seam; the wordmark NOVA / RIFT is ejected out of the crack in two structurally
// distinct type weights, holds, then is sucked back into the fault line as the crack collapses.
//
// Layering (back to front, matches the plan): base gradient -> scanline texture ->
// two angled slab panels -> glowing crack + sparks -> wordmark -> kicker label.

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
  const topWord = String(fields.titleTop ?? 'NOVA');
  const bottomWord = String(fields.titleBottom ?? 'RIFT');
  const kickerText = String(fields.kicker ?? 'LIVE TONIGHT');
  const accent = String(fields.accent ?? '#C13BFF');
  const accentDeep = '#7A2FFF'; // fixed second stop of the crack gradient, same hue family

  // ── Timing constants (frames) ───────────────────────────────────────────
  const seamFlash = 2; // hairline seam appears
  const panelSnapEnd = 15; // slabs finish snapping apart, glow ignites
  const flashOutStart = 2;
  const flashOutEnd = 4; // 2-frame hard white flash
  const riftStart = 15;
  const riftSettle = 26;
  const novaStart = 18; // 3 frames after RIFT starts (per plan: RIFT 15-30, NOVA 3f later)
  const novaSettle = 38;
  const kickerStart = 34;
  const kickerEnd = 42;
  const holdEnd = 87;
  const kickerExitStart = 87;
  const kickerExitEnd = 96;
  const riftExitStart = 96;
  const riftExitEnd = 108;
  const novaExitStart = 100;
  const novaExitEnd = 112;
  const collapseStart = 108;
  const collapseEnd = 120;
  const blackoutStart = 117;

  // ── Phase 1: seam flash + panel snap-apart ─────────────────────────────
  const seamVisible = frame >= seamFlash ? 1 : 0;
  const panelSpring = spring({
    frame: frame - seamFlash,
    fps,
    config: { damping: 16, stiffness: 220, mass: 1 },
  });
  // Panels travel from a collapsed centerline (0) to their full diagonal split (1)
  const panelSplit = interpolate(panelSpring, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const flashOpacity = interpolate(frame, [flashOutStart, flashOutStart + 1, flashOutEnd], [0, 0.4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Phase 4/6: exit - panels + crack race off screen (fast, ease-in) ───
  const cubicIn = (t: number) => t * t * t;
  const collapseT = interpolate(frame, [collapseStart, collapseEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const collapseEase = cubicIn(collapseT);
  const blackout = interpolate(frame, [blackoutStart, durationInFrames - 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Panel offsets: enter via spring (overshoot), exit via fast cubic-in race-off
  const panelOffsetUL = -width * (1 - panelSplit) + collapseEase * -width * 1.4;
  const panelOffsetLR = width * (1 - panelSplit) + collapseEase * width * 1.4;

  // ── Crack glow: ignite by frame 15, ambient pulse during hold, collapse on exit ─
  const glowIgnite = interpolate(frame, [seamFlash, panelSnapEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pulseCycle = Math.sin((frame / fps) * Math.PI * (1 / 1)) * 0.5 + 0.5; // ~2s sine cycle
  const glowPulse = 1 + pulseCycle * 0.03; // 1.0 - 1.03 breathing bloom
  const glowCollapse = 1 - collapseEase; // shrinks to a point on exit
  const glowScale = glowIgnite * glowPulse * glowCollapse;
  const glowThickness = interpolate(glowScale, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Spark particles scattered along the crack - staggered pop-in, gentle flicker in hold
  const sparkCount = 8;
  const sparks = new Array(sparkCount).fill(0).map((_, i) => {
    const seed = `spark-${i}`;
    const t = random(seed); // stable position along the seam
    const popFrame = panelSnapEnd + i * 2; // staggered 2-frame offsets
    const pop = spring({ frame: frame - popFrame, fps, config: { damping: 14, stiffness: 260 } });
    const flicker = i % 2 === 0 ? 1 + Math.sin(frame / 9 + i) * 0.25 : 1; // 2 of them drift/flicker
    return { t, pop: Math.max(0, pop) * flicker * glowCollapse, seedSize: 0.6 + random(seed + 'size') * 0.8 };
  });

  // ── Wordmark: RIFT slams in first, NOVA follows, both snap back on exit ─
  const riftIn = spring({ frame: frame - riftStart, fps, config: { damping: 16, stiffness: 220 } });
  const novaIn = spring({ frame: frame - novaStart, fps, config: { damping: 16, stiffness: 220 } });

  const riftExitT = interpolate(frame, [riftExitStart, riftExitEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const novaExitT = interpolate(frame, [novaExitStart, novaExitEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const riftExitEase = cubicIn(riftExitT);
  const novaExitEase = cubicIn(novaExitT);

  // RIFT travels from lower-right along the diagonal; NOVA from upper-left
  const riftX = interpolate(riftIn, [0, 1], [width * 0.5, 0]) + riftExitEase * width * 0.5;
  const riftY = interpolate(riftIn, [0, 1], [height * 0.35, 0]) + riftExitEase * height * 0.35;
  const riftScale = Math.min(1.04, riftIn) * (1 - riftExitEase);

  const novaX = interpolate(novaIn, [0, 1], [-width * 0.5, 0]) + novaExitEase * -width * 0.5;
  const novaY = interpolate(novaIn, [0, 1], [-height * 0.3, 0]) + novaExitEase * -height * 0.3;
  const novaScale = Math.min(1.04, novaIn) * (1 - novaExitEase);

  // Chromatic-snap fringe: visible briefly right after each word lands, resolves in 4 frames
  const riftFringe = interpolate(frame, [riftSettle, riftSettle + 4], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const novaFringe = interpolate(frame, [novaSettle, novaSettle + 4], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ── Kicker: fades + slides up into place, exits first (fast, downward, fade) ──
  const kickerIn = interpolate(frame, [kickerStart, kickerEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const kickerExitT = interpolate(frame, [kickerExitStart, kickerExitEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const kickerExitEase = cubicIn(kickerExitT);
  const kickerOpacity = kickerIn * (1 - kickerExitEase);
  const kickerY = interpolate(kickerIn, [0, 1], [20, 0]) + kickerExitEase * 40;

  // ── Type sizing: measured cap-advance for the condensed heavy face (Archivo ~0.74em cap) ──
  // Target line widths: NOVA ~30% of frame width, RIFT ~62% of frame width.
  const capAdvance = 0.74; // Archivo
  const novaFont = Math.round((width * 0.3) / (capAdvance * topWord.length));
  const riftFont = Math.round((width * 0.62) / (capAdvance * bottomWord.length));

  // Slab panel breathing during hold: +/-3% brightness so nothing sits frozen
  const breathe = 1 + Math.sin(frame / 24) * 0.03;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #0B0A14 0%, #14101F 100%)`, overflow: 'hidden' }}>
      {/* Faint diagonal scanline texture for broadcast grit */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px)',
          opacity: 0.6,
        }}
      />

      {/* Slab panel: upper-left graphite shoulder of the rift */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${panelOffsetUL}px, ${panelOffsetUL * 0.15}px)`,
          clipPath: 'polygon(0 0, 100% 0, 34% 100%, 0 100%)',
          background: `linear-gradient(122deg, rgba(60,52,82,${0.95 * breathe}) 0%, rgba(30,26,42,0.98) 65%, #14101c 100%)`,
          boxShadow: 'inset -2px 0 0 rgba(193,59,255,0.25)',
        }}
      />
      {/* Slab panel: lower-right near-black shoulder of the rift */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${panelOffsetLR}px, ${panelOffsetLR * 0.15}px)`,
          clipPath: 'polygon(34% 100%, 100% 0, 100% 100%, 0 100%)',
          background: `linear-gradient(302deg, rgba(20,16,28,${0.9 * breathe}) 0%, rgba(6,5,10,0.99) 60%, #030305 100%)`,
          boxShadow: 'inset 2px 0 0 rgba(193,59,255,0.18)',
        }}
      />

      {/* The glowing rift crack: thin magenta-violet core + soft outer bloom, on the seam */}
      <div
        style={{
          position: 'absolute',
          left: '34%',
          top: 0,
          bottom: 0,
          width: 3,
          transform: `rotate(12deg) scaleY(${Math.max(0.02, glowThickness)}) scale(${glowScale > 0 ? glowPulse : 1})`,
          transformOrigin: 'center',
          background: `linear-gradient(180deg, ${accent} 0%, ${accentDeep} 100%)`,
          boxShadow: `0 0 ${40 * glowThickness}px 10px ${accent}, 0 0 ${90 * glowThickness}px 30px ${accentDeep}88`,
          opacity: Math.min(1, seamVisible),
          zIndex: 5,
        }}
      />
      {/* Hard white flash-frame for impact */}
      <AbsoluteFill style={{ background: '#ffffff', opacity: flashOpacity, zIndex: 6 }} />

      {/* Spark particles scattered along the crack */}
      {sparks.map((s, i) => {
        const seamX = width * 0.34 + s.t * width * 0.28 + Math.tan((12 * Math.PI) / 180) * (s.t * height - height / 2) * -1;
        const seamY = s.t * height;
        const size = 10 * s.seedSize;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: seamX,
              top: seamY,
              width: size,
              height: size,
              transform: `rotate(45deg) scale(${Math.max(0, s.pop)})`,
              background: accent,
              boxShadow: `0 0 12px 4px ${accent}`,
              opacity: 0.85,
              zIndex: 6,
            }}
          />
        );
      })}

      {/* Wordmark lockup - centered across the seam, painted above everything else */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* NOVA - smaller, above-left, medium weight */}
          <div
            style={{
              position: 'relative',
              transform: `translate(${novaX}px, ${novaY}px) scale(${novaScale}) translateX(-8%)`,
              color: '#f3f1f7',
              fontFamily: '"Archivo", Arial, sans-serif',
              fontSize: novaFont,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              textShadow: novaFringe > 0.02 ? `${2 * novaFringe}px 0 ${accent}, -${2 * novaFringe}px 0 #ffffff` : 'none',
            }}
          >
            {topWord}
          </div>
          {/* RIFT - dramatically larger, below-right, heavy weight, overlaps the seam */}
          <div
            style={{
              position: 'relative',
              transform: `translate(${riftX}px, ${riftY}px) scale(${riftScale}) translateX(6%)`,
              color: '#ffffff',
              fontFamily: '"Archivo", Arial, sans-serif',
              fontSize: riftFont,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              lineHeight: 0.95,
              marginTop: Math.round(riftFont * -0.08),
              textShadow: riftFringe > 0.02
                ? `${3 * riftFringe}px 0 ${accent}, -${3 * riftFringe}px 0 #ffffff, 0 0 30px rgba(193,59,255,0.35)`
                : '0 0 30px rgba(193,59,255,0.25)',
            }}
          >
            {bottomWord}
          </div>

          {/* Kicker label - centered beneath the lockup, exits first */}
          <div
            style={{
              marginTop: Math.round(height * 0.03),
              opacity: kickerOpacity,
              transform: `translateY(${kickerY}px)`,
              fontFamily: '"Inter", Arial, sans-serif',
              fontSize: Math.round(height * 0.03),
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#b9aecf',
            }}
          >
            {kickerText}
          </div>
        </div>
      </AbsoluteFill>

      {/* Final clean blackout - nothing mid-motion at the last frames */}
      <AbsoluteFill style={{ background: '#000000', opacity: blackout, zIndex: 20 }} />
    </AbsoluteFill>
  );
}
