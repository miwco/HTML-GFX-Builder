
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
  const title = String(fields.title ?? 'Sunday');
  const subtitle = String(fields.subtitle ?? 'KITCHEN');
  const kicker = String(fields.kicker ?? 'A Sunday Morning Cooking Series');
  const accent = String(fields.accent ?? '#B4622A'); // burnt amber, KITCHEN
  const titleColor = String(fields.titleColor ?? '#5C3A21'); // espresso, Sunday

  // ── Timing constants (frames) ───────────────────────────────────────────
  const plateFadeStart = 4;
  const plateFadeEnd = 10;
  const steamDrawStart = 6;
  const steamDrawEnd = 24;
  const rulesStart = 24;
  const rulesEnd = 34;
  const kickerStart = 26;
  const kickerEnd = 38;
  const steamDissolveStart = 42;
  const steamDissolveEnd = 52;
  const titleSettleFrame = 66;
  const kitchenStart = 68;
  const kitchenEnd = 78;
  const holdStart = 78;
  const holdEnd = 96;
  const rulesExitStart = 96;
  const rulesExitEnd = 104;
  const kickerExitStart = 100;
  const kickerExitEnd = 110;
  const heroExitStart = 106;
  const heroExitEnd = 118;

  // ── Background: layered warm daylight wash ──────────────────────────────
  // Final 6 frames deepen the tone slightly for a clean non-abrupt settle.
  const deepen = interpolate(frame, [durationInFrames - 6, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const blobDrift = interpolate(frame, [holdStart, holdEnd], [0, 15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Plate glyph (simple line-drawn ellipse) ─────────────────────────────
  const plateOpacity = interpolate(frame, [plateFadeStart, plateFadeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Steam curl draw-in then dissolve ────────────────────────────────────
  const steamDraw = interpolate(frame, [steamDrawStart, steamDrawEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const steamDissolve = interpolate(frame, [steamDissolveStart, steamDissolveEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const steamVisible = Math.min(steamDraw, steamDissolve);
  // gentle continuous sway while alive, sine-based (no snap)
  const steamSway = Math.sin((frame / fps) * Math.PI * 1.2) * 6;

  // ── Hairline rules draw-in from edges ───────────────────────────────────
  const rulesInSpring = spring({
    frame: frame - rulesStart,
    fps,
    config: { damping: 18, mass: 0.8 },
  });
  const rulesOutEase = interpolate(frame, [rulesExitStart, rulesExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t, // cubic-in, accelerating retract
  });
  const rulesExtent = Math.max(0, rulesInSpring - rulesOutEase);

  // ── Kicker text ──────────────────────────────────────────────────────────
  const kickerIn = interpolate(frame, [kickerStart, kickerEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const kickerOut = interpolate(frame, [kickerExitStart, kickerExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t,
  });
  const kickerOpacity = kickerIn * (1 - kickerOut);
  const kickerRise = (1 - kickerIn) * 8 + kickerOut * -8; // rises in, then fades down-out
  const kickerTracking = interpolate(frame, [kickerStart, kickerEnd], [0.4, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Hero "Sunday" resolve from steam ────────────────────────────────────
  const titleResolve = interpolate(frame, [steamDissolveStart, titleSettleFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleBlur = interpolate(frame, [steamDissolveStart, titleSettleFrame], [8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleSpring = spring({
    frame: frame - steamDissolveStart,
    fps,
    config: { damping: 18, mass: 0.8 },
  }); // slight overshoot suggests warmth
  const titleScaleIn = interpolate(titleSpring, [0, 1], [0.85, 1.03]);

  // Ambient breathing during hold, starting exactly at 1.0
  const breathePhase = Math.max(0, frame - holdStart);
  const breathe = 1 + Math.sin((breathePhase / fps) * Math.PI * 1.0) * 0.015 *
    interpolate(frame, [holdStart, holdStart + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const heroExit = interpolate(frame, [heroExitStart, heroExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t,
  });
  const heroOpacity = titleResolve * (1 - heroExit);
  const heroLift = heroExit * -10;
  const heroScale = (frame < heroExitStart ? titleScaleIn : interpolate(frame, [heroExitStart, heroExitEnd], [titleScaleIn, titleScaleIn * 0.98], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) * (frame >= holdStart && frame < heroExitStart ? breathe : 1);

  // ── KITCHEN tracks in beneath ────────────────────────────────────────────
  const kitchenIn = interpolate(frame, [kitchenStart, kitchenEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const kitchenTracking = interpolate(kitchenIn, [0, 1], [0.35, 0.18]);
  const kitchenOpacity = kitchenIn * (1 - heroExit);

  // Sizing: "Sunday" ~46% of frame width, Georgia italic (capAdvance approx for serif italic)
  const sundayCapAdvance = 0.56; // approx effective width per char incl. italics/kerning
  const sundayFontSize = (width * 0.46) / (title.length * sundayCapAdvance);
  // "KITCHEN" ~40% of frame width, Archivo-like sans, small caps tracked wide
  const kitchenCapAdvance = 0.74;
  const kitchenFontSize = (width * 0.4) / (subtitle.length * (kitchenCapAdvance + 0.18));

  return (
    <AbsoluteFill>
      {/* Layer 1: base gradient wash - warm cream to toasted amber, deepening at very end */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 120% at 20% 15%, ${deepen > 0 ? '#EFDFC4' : '#F7EAD4'} 0%, #E7C79A 45%, ${deepen > 0 ? '#C99A5E' : '#D8A868'} 100%)`,
          filter: deepen > 0 ? `brightness(${1 - deepen * 0.06})` : 'none',
        }}
      />
      {/* corner vignette for depth */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(140% 140% at 50% 50%, transparent 55%, rgba(138,90,52,0.22) 100%)',
        }}
      />

      {/* Layer 2: linen-grain texture overlay, low opacity diagonal hairlines */}
      <AbsoluteFill
        style={{
          opacity: 0.04,
          backgroundImage:
            'repeating-linear-gradient(45deg, #5C3A21 0px, #5C3A21 1px, transparent 1px, transparent 6px)',
        }}
      />

      {/* Layer 3: soft blurred ceramic-tone blobs */}
      <div
        style={{
          position: 'absolute',
          top: height * 0.08 - blobDrift * 0.4,
          right: width * 0.05 + blobDrift * 0.3,
          width: width * 0.34,
          height: width * 0.34,
          borderRadius: '48% 52% 55% 45% / 50% 45% 55% 50%',
          background: 'radial-gradient(circle at 35% 30%, #C97C56 0%, #B4622A 65%, transparent 100%)',
          filter: 'blur(38px)',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: height * 0.06 + blobDrift * 0.4,
          left: width * 0.04 - blobDrift * 0.3,
          width: width * 0.3,
          height: width * 0.3,
          borderRadius: '52% 48% 45% 55% / 55% 50% 50% 45%',
          background: 'radial-gradient(circle at 40% 35%, #9CAE8C 0%, #7C9169 65%, transparent 100%)',
          filter: 'blur(42px)',
          opacity: 0.42,
        }}
      />

      {/* Layer 4: plate glyph + steam curl (mid-ground supporting shapes) */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Simple line-drawn plate: an ellipse arc beneath the kicker */}
        <ellipse
          cx={width / 2}
          cy={height * 0.605}
          rx={width * 0.05}
          ry={height * 0.012}
          fill="none"
          stroke="#8A5A3F"
          strokeWidth={2}
          opacity={plateOpacity * 0.7}
        />
        <ellipse
          cx={width / 2}
          cy={height * 0.6}
          rx={width * 0.062}
          ry={height * 0.015}
          fill="none"
          stroke="#8A5A3F"
          strokeWidth={1.5}
          opacity={plateOpacity * 0.5}
        />

        {/* Steam curl: two overlapping bezier arcs, dash-reveal, gentle sway, then dissolve */}
        {steamVisible > 0 && (
          <g
            style={{
              opacity: steamVisible,
              transform: `translateX(${steamSway * steamVisible}px)`,
              transformOrigin: `${width / 2}px ${height * 0.5}px`,
            }}
          >
            <path
              d={`M ${width / 2 - 10} ${height * 0.58}
                  C ${width / 2 - 40} ${height * 0.5}, ${width / 2 + 30} ${height * 0.44}, ${width / 2 - 6} ${height * 0.37}
                  C ${width / 2 - 30} ${height * 0.31}, ${width / 2 + 20} ${height * 0.26}, ${width / 2} ${height * 0.2}`}
              fill="none"
              stroke="#B4622A"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={600}
              strokeDashoffset={600 * (1 - steamDraw)}
              opacity={0.55}
            />
            <path
              d={`M ${width / 2 + 8} ${height * 0.6}
                  C ${width / 2 + 34} ${height * 0.52}, ${width / 2 - 22} ${height * 0.45}, ${width / 2 + 4} ${height * 0.38}
                  C ${width / 2 + 26} ${height * 0.32}, ${width / 2 - 14} ${height * 0.27}, ${width / 2 + 6} ${height * 0.21}`}
              fill="none"
              stroke="#C97C56"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={600}
              strokeDashoffset={600 * (1 - steamDraw)}
              opacity={0.4}
            />
          </g>
        )}

        {/* Hairline rules converging toward center, flanking the kicker */}
        <line
          x1={width * 0.5 - width * 0.15 * rulesExtent - width * 0.03}
          y1={height * 0.42}
          x2={width * 0.5 - width * 0.03}
          y2={height * 0.42}
          stroke="#8A5A3F"
          strokeWidth={1}
          opacity={rulesExtent}
        />
        <line
          x1={width * 0.5 + width * 0.03}
          y1={height * 0.42}
          x2={width * 0.5 + width * 0.15 * rulesExtent + width * 0.03}
          y2={height * 0.42}
          stroke="#8A5A3F"
          strokeWidth={1}
          opacity={rulesExtent}
        />
      </svg>

      {/* Layer 5: kicker text */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: height * 0.44 }}>
        <div
          style={{
            fontFamily: '"Archivo", "Arial Narrow", Arial, sans-serif',
            fontSize: height * 0.028,
            fontWeight: 600,
            letterSpacing: `${kickerTracking}em`,
            textTransform: 'uppercase',
            color: '#8A5A3F',
            opacity: kickerOpacity,
            transform: `translateY(${kickerRise}px)`,
            whiteSpace: 'nowrap',
          }}
        >
          {kicker}
        </div>
      </AbsoluteFill>

      {/* Layer 6: hero wordmark - "Sunday" over "KITCHEN", topmost z-index */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: `translateY(${heroLift}px) scale(${heroScale})`,
          }}
        >
          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: sundayFontSize,
              fontWeight: 400,
              color: titleColor,
              backgroundImage: `linear-gradient(180deg, ${titleColor} 0%, #7A5030 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              opacity: heroOpacity,
              filter: `blur(${titleBlur}px)`,
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: height * 0.02,
              fontFamily: '"Archivo", "Arial Narrow", Arial, sans-serif',
              fontSize: kitchenFontSize,
              fontWeight: 700,
              letterSpacing: `${kitchenTracking}em`,
              textTransform: 'uppercase',
              color: accent,
              opacity: kitchenOpacity,
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
