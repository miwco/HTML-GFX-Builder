import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// "Landfall Cold Open" - a 3s storm-warning stinger. Two collision slabs ram together,
// the wordmark slams onto their seam as the aftershock, radar arcs and alert bars pulse
// through the hold, then accelerating wipe bars punch the frame clear for the cut.
// Layering back-to-front: sky gradient -> radar arcs/scanlines -> alert bars -> slabs -> wordmark.

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
  const headline = String(fields.headline ?? 'LANDFALL');
  const accent = String(fields.accent ?? '#d98e2a');

  // ── Timing constants (frames), derived from fps so other frame rates hold ─
  const bgSnap = Math.round(fps * 0.1); // 3 frames @30fps
  const barsStart = 2;
  const barsEnd = 10;
  const slabStart = 12;
  const collideFrame = 22;
  const shudderEnd = collideFrame + 2;
  const wordStart = 25;
  const wordSettle = wordStart + 9; // ~34
  const holdStart = 34;
  const pulseFrame = 50;
  const exitStart = 75; // text punch-out begins
  const textFadeEnd = 80;
  const wipeStart = 83;
  const wipeEnd = 90;

  // ── Phase 1: background snaps in ────────────────────────────────────────
  const bgIn = interpolate(frame, [0, bgSnap], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Final resolve to solid ink-black in the very last frames of the wipe.
  const finalBlack = interpolate(frame, [wipeEnd - 3, wipeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Phase 1b: alert bars slide in from opposite edges ───────────────────
  const barsIn = interpolate(frame, [barsStart, barsEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // easeOutCubic-ish shaping via power curve
  const barsEase = 1 - Math.pow(1 - barsIn, 3);
  const topBarX = interpolate(barsEase, [0, 1], [-width, 0]);
  const bottomBarX = interpolate(barsEase, [0, 1], [width, 0]);

  // Heartbeat pulse on the alert bars once during the hold (0.7 -> 1.0 -> 0.85)
  let barOpacity = 0.7 + barsIn * 0.3 === undefined ? 1 : interpolate(barsIn, [0, 1], [0, 1]);
  barOpacity = barsEase; // base fade-in factor 0..1
  const pulse = interpolate(
    frame,
    [pulseFrame - 6, pulseFrame, pulseFrame + 10],
    [0.7, 1.0, 0.85],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const barAlpha = frame < barsEnd ? barOpacity : pulse;

  // ── Phase 2: radar sweep - one continuous ambient rotation (deliberate linear) ─
  const radarSpin = (frame / fps) * 18; // slow constant deg/sec, ambient only
  const radarVisible = interpolate(frame, [barsStart, slabStart + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Phase 3: collision slabs rocket in from left/right on a damped spring ─
  const slabSpring = spring({
    frame: frame - slabStart,
    fps,
    config: { damping: 18, mass: 1.1, stiffness: 220 },
  });
  const slabTravel = interpolate(slabSpring, [0, 1], [1, 0]);
  const landX = -width * 0.62 * slabTravel; // LAND slab enters from left
  const fallX = width * 0.62 * slabTravel; // FALL slab enters from right

  // Collision shudder: a 2-frame negative scale punch at impact, not a bounce.
  const shudder = interpolate(
    frame,
    [collideFrame, collideFrame + 1, shudderEnd],
    [1, 0.97, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Brief amber flash along the meeting seam at the moment of impact.
  const seamFlash = interpolate(
    frame,
    [collideFrame - 1, collideFrame, collideFrame + 6],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // ── Phase 4: wordmark slams onto the seam, staggered 2f after the collision ─
  const wordSpring = spring({
    frame: frame - wordStart,
    fps,
    config: { damping: 20, mass: 1, stiffness: 260 },
  });
  const wordScaleIn = interpolate(wordSpring, [0, 1], [1.05, 1]); // tiny overshoot only, no bounce chain
  const wordOpacityIn = interpolate(frame, [wordStart, wordStart + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Hold: slow 1.0 -> 1.02 scale creep across the full hero hold.
  const creep = interpolate(frame, [holdStart, exitStart], [1.0, 1.02], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Phase 5: warning punch-out - text exits first, fast ease-in ─────────
  const textExit = interpolate(frame, [exitStart, textFadeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textExitEase = textExit * textExit; // ease-in accelerate
  const wordX = -textExitEase * (width * 0.18); // half a slab-width back
  const wordOpacity = wordOpacityIn * (1 - textExitEase);

  // Combined settle scale (spring landing * hold creep * shudder, whichever phase applies)
  const wordScale = frame < holdStart ? wordScaleIn * shudder : creep;

  // ── Phase 6: accelerating wipe bars sweep from center outward, power2 ────
  const wipeT = interpolate(frame, [wipeStart, wipeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const wipeEase = wipeT * wipeT; // power2 accelerate
  const wipeLeftW = wipeEase * (width * 0.55);
  const wipeRightW = wipeEase * (width * 0.55);

  // Hero size derived from the string itself (condensed face, capAdvance ~0.62em)
  const chars = headline.length || 1;
  const fontSize = Math.min(height * 0.222, (width * 0.7) / (chars * 0.62));

  return (
    <AbsoluteFill>
      {/* Layer 1: graduated storm-sky background - never flat */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, #14181c 0%, #1a2222 55%, #1d2a2a 100%)',
          opacity: bgIn,
        }}
      />

      {/* Layer 2: faint rotating radar-sweep arcs (ambient, one deliberate linear motion) */}
      <AbsoluteFill style={{ opacity: radarVisible * 0.35, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: width * 1.4,
            height: width * 1.4,
            transform: `translate(-50%, -50%) rotate(${radarSpin}deg)`,
          }}
        >
          {[0.25, 0.45, 0.65, 0.85].map((r, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: width * 1.4 * r,
                height: width * 1.4 * r,
                marginLeft: -(width * 1.4 * r) / 2,
                marginTop: -(width * 1.4 * r) / 2,
                borderRadius: '50%',
                border: `1px solid rgba(217,142,42,${0.25 - i * 0.04})`,
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
              }}
            />
          ))}
        </div>
      </AbsoluteFill>

      {/* Subtle horizontal scanline texture for broadcast grit */}
      <AbsoluteFill
        style={{
          opacity: bgIn * 0.5,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 4px)',
        }}
      />

      {/* Layer 3: top and bottom amber alert bars */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: height * 0.04,
          backgroundColor: accent,
          opacity: barAlpha,
          transform: `translateX(${topBarX}px)`,
          boxShadow: 'inset 0 -2px 0 rgba(255,255,255,0.25)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: height * 0.04,
          backgroundColor: accent,
          opacity: barAlpha,
          transform: `translateX(${bottomBarX}px)`,
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.25)',
        }}
      />

      {/* Layer 4: collision slabs - lit surfaces with same-hue gradient + amber keyline seam */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            width: width * 0.86,
            height: height * 0.34,
            transform: `scale(${shudder})`,
          }}
        >
          {/* LAND slab - from left */}
          <div
            style={{
              flex: 1,
              height: '100%',
              transform: `translateX(${landX}px)`,
              background:
                'linear-gradient(90deg, #23282c 0%, #2c3438 70%, #343d40 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.4)',
              borderRight: `2px solid rgba(217,142,42,${0.6 + seamFlash * 0.4})`,
            }}
          />
          {/* FALL slab - from right */}
          <div
            style={{
              flex: 1,
              height: '100%',
              transform: `translateX(${fallX}px)`,
              background:
                'linear-gradient(270deg, #23282c 0%, #2c3438 70%, #343d40 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.4)',
              borderLeft: `2px solid rgba(217,142,42,${0.6 + seamFlash * 0.4})`,
            }}
          />
          {/* Seam flash overlay at impact */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              width: 6,
              height: '100%',
              transform: 'translateX(-50%)',
              backgroundColor: accent,
              opacity: seamFlash,
              filter: 'blur(2px)',
            }}
          />
        </div>
      </AbsoluteFill>

      {/* Layer 5: LANDFALL wordmark - topmost, off-white, tight tracking */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div
          style={{
            fontFamily: '"Archivo", "Arial Narrow", Arial, sans-serif',
            fontWeight: 900,
            fontSize: Math.round(fontSize),
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: '#f2efe9',
            textShadow: '0 2px 0 rgba(0,0,0,0.85)',
            whiteSpace: 'nowrap',
            opacity: wordOpacity,
            transform: `translateX(${wordX}px) scale(${wordScale})`,
          }}
        >
          {headline}
        </div>
      </AbsoluteFill>

      {/* Layer 6: accelerating wipe bars punch the frame clear */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: wipeLeftW,
          height: '100%',
          background: 'linear-gradient(90deg, #0e1114 0%, #1c2224 100%)',
          borderRight: wipeLeftW > 0 ? `2px solid ${accent}` : 'none',
          zIndex: 20,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: wipeRightW,
          height: '100%',
          background: 'linear-gradient(270deg, #0e1114 0%, #1c2224 100%)',
          borderLeft: wipeRightW > 0 ? `2px solid ${accent}` : 'none',
          zIndex: 20,
        }}
      />

      {/* Final resolve to solid ink-black so the cut lands clean */}
      <AbsoluteFill style={{ backgroundColor: '#0a0c0e', opacity: finalBlack, zIndex: 30 }} />
    </AbsoluteFill>
  );
}
