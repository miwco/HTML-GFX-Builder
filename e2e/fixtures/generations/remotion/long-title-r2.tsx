
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
  const line1 = String(fields.titleLine1 ?? 'THE LONG ROAD TO');
  const line2 = String(fields.titleLine2 ?? 'WESTMINSTER BRIDGE');
  const accent = String(fields.accent ?? '#cdb98a');

  const SERIF = '"Georgia", "Times New Roman", serif'; // editorial gravitas, no bundled serif exists

  // ── Timing constants (frames) ───────────────────────────────────────────
  const ruleStart = 15; // 0.5s - route line begins drawing
  const ruleDrawDur = 19; // ends frame 34
  const kickerStart = 34;
  const kickerDur = 11; // ends frame 45
  const line1Start = 45;
  const line1WordStagger = 3;
  const line2Start = 64;
  const line2WordStagger = 3;
  const holdStart = 78;
  const exitStart = 100; // decisive exit begins
  const textExitDur = 12; // ends frame 112
  const ruleExitStart = exitStart + 2; // 102
  const ruleExitDur = 10; // ends frame 112
  const blackoutStart = durationInFrames - 6; // 114

  // ── Background: layered graphite depth (gradient + mist + vignette) ────
  // Mist drifts left-to-right slowly across the whole 4s, continuous ambient travel.
  const mistDrift = interpolate(frame, [0, durationInFrames], [0, 30], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Route rule: draws left-to-right, then retracts right-to-left on exit ─
  const ruleXStart = width * 0.1;
  const ruleXEnd = width * 0.9;
  const ruleDraw = interpolate(frame, [ruleStart, ruleStart + ruleDrawDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ruleRetract = interpolate(frame, [ruleExitStart, ruleExitStart + ruleExitDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Draw fills left->right; retract removes from the right edge back to the left.
  const ruleLeft = ruleXStart;
  const ruleFullWidth = (ruleXEnd - ruleXStart) * ruleDraw;
  const ruleWidth = ruleFullWidth * (1 - ruleRetract);

  // ── Kicker ───────────────────────────────────────────────────────────────
  const kickerSpring = spring({
    frame: frame - kickerStart,
    fps,
    config: { damping: 24, stiffness: 160, mass: 0.9 },
  });
  const kickerRise = interpolate(kickerSpring, [0, 1], [12, 0]);
  const kickerOpacity = interpolate(frame, [kickerStart, kickerStart + kickerDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Word-by-word assembly helper ────────────────────────────────────────
  const words1 = line1.split(' ');
  const words2 = line2.split(' ');

  const wordStyle = (
    startFrame: number,
    index: number,
    stagger: number,
    overshootScale: number
  ) => {
    const s = spring({
      frame: frame - (startFrame + index * stagger),
      fps,
      config: { damping: 22, stiffness: 160, mass: 0.9 },
    });
    const rise = interpolate(s, [0, 1], [16, 0]);
    const opacity = interpolate(s, [0, 1], [0, 1]);
    const scale = interpolate(s, [0, 1], [1 - overshootScale, 1 + overshootScale * 0.3]);
    return { rise, opacity, scale };
  };

  // ── Hero title sizing: derived from its own string (capAdvance ~0.62) ──
  const capAdvance = 0.62;
  const heroChars = line2.length; // includes space, per plan
  const heroTargetWidth = width * 0.62;
  const heroFontSize = Math.round(heroTargetWidth / (heroChars * capAdvance));

  const supportFontSize = Math.round(height * 0.06);
  const kickerFontSize = Math.round(height * 0.028);

  // ── Whole-title-group exit: fade + lift, ease-in cubic (fast, decisive) ─
  const exitProgress = interpolate(frame, [exitStart, exitStart + textExitDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t, // ease-in cubic - accelerating exit
  });
  const exitLift = exitProgress * -60;
  const exitOpacity = 1 - exitProgress;

  // ── Ambient hold: gentle 1.5% scale creep on the whole title group ─────
  const holdScale = interpolate(frame, [holdStart, exitStart], [1, 1.015], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Final blackout fade ─────────────────────────────────────────────────
  const blackout = interpolate(frame, [blackoutStart, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Vertical anchor: title block sits at ~55-60% frame height, air above for skyline/mist
  const anchorY = height * 0.57;

  return (
    <AbsoluteFill style={{ background: '#0b0c0f' }}>
      {/* Layer 1: graphite vertical gradient - overcast Westminster dusk */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, #15171c 0%, #101216 55%, #0b0c0f 100%)',
        }}
      />

      {/* Layer 2: drifting mist / river band around 35% frame height */}
      <div
        style={{
          position: 'absolute',
          top: height * 0.33,
          left: -width * 0.15,
          width: width * 1.3,
          height: height * 0.09,
          background:
            'linear-gradient(90deg, transparent 0%, rgba(200,196,184,0.05) 25%, rgba(210,206,192,0.08) 50%, rgba(200,196,184,0.05) 75%, transparent 100%)',
          filter: 'blur(6px)',
          transform: `translateX(${mistDrift}px)`,
        }}
      />

      {/* Layer 3: vignette darkening edges, present from frame 1 */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Layer 4: hairline route rule - sits just beneath the title block */}
      <div
        style={{
          position: 'absolute',
          top: anchorY + height * 0.135,
          left: ruleLeft,
          width: Math.max(ruleWidth, 0),
          height: 1.5,
          background: accent,
          opacity: 0.7,
          boxShadow: `0 0 8px ${accent}`,
        }}
      />

      {/* Text group: kicker + two-line title, with soft drop shadow separating from bg */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: anchorY,
          transform: `translateY(${exitLift}px) translateY(-50%) scale(${holdScale})`,
          opacity: exitOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          paddingLeft: width * 0.19,
          filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))',
          zIndex: 10,
        }}
      >
        {/* Kicker: small-caps tracked label, warm pale gold */}
        <div
          style={{
            fontFamily: SERIF,
            fontSize: kickerFontSize,
            fontWeight: 400,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: accent,
            opacity: kickerOpacity,
            transform: `translateY(${kickerRise}px)`,
            marginBottom: height * 0.02,
          }}
        >
          {kicker}
        </div>

        {/* Support line: THE LONG ROAD TO - word by word */}
        <div
          style={{
            display: 'flex',
            gap: '0.3em',
            fontFamily: SERIF,
            fontSize: supportFontSize,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            color: '#ece7dd',
            marginBottom: height * 0.01,
          }}
        >
          {words1.map((w, i) => {
            const { rise, opacity, scale } = wordStyle(line1Start, i, line1WordStagger, 0.02);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity,
                  transform: `translateY(${rise}px) scale(${scale})`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>

        {/* Hero line: WESTMINSTER BRIDGE - largest, boldest, edge-lit */}
        <div
          style={{
            display: 'flex',
            gap: '0.28em',
            fontFamily: SERIF,
            fontSize: heroFontSize,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: '#f5f1e8',
            textShadow: `0 -1px 0 ${accent}66, 0 2px 10px rgba(0,0,0,0.4)`,
          }}
        >
          {words2.map((w, i) => {
            const { rise, opacity, scale } = wordStyle(line2Start, i, line2WordStagger, 0.03);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity,
                  transform: `translateY(${rise}px) scale(${scale})`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>

      {/* Final blackout fade - clean finish, nothing mid-motion at frame 120 */}
      <AbsoluteFill style={{ background: '#000000', opacity: blackout, zIndex: 20 }} />
    </AbsoluteFill>
  );
}
