// "The Long Road" title card - a single hairline amber rule draws itself across the
// frame like a surveyor's road, and the title's ranked lines settle onto it in the
// order a road is walked. The rule is the ownable signature mark in place of a logo.

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

  // ── Editable content ───────────────────────────────────────────────────────
  const line1 = String(fields.line1 ?? 'THE LONG ROAD');
  const line2 = String(fields.line2 ?? 'TO');
  const line3 = String(fields.line3 ?? 'WESTMINSTER BRIDGE');
  const kicker = String(fields.kicker ?? 'A PUBLIC-AFFAIRS DOCUMENTARY');
  const accent = String(fields.accent ?? '#c8974a');

  // ── Timing (frames, derived from fps so any frame rate works) ─────────────
  const ruleDrawStart = Math.round(fps * 0.1); // 3f
  const ruleDrawEnd = Math.round(fps * 0.87); // 26f
  const line1Start = Math.round(fps * 0.7); // 21f
  const line2Start = line1Start + 5;
  const line3Start = line2Start + 5;
  const kickerStart = Math.round(fps * 1.6); // 48f
  const kickerEnd = Math.round(fps * 2.2); // 66f
  const holdEnd = Math.round(fps * 3.1); // 93f - exit begins
  const exitStart = holdEnd;
  const ruleErase = Math.round(fps * 0.47); // 14f erase duration

  // ── Background: same-hue radial vignette + faint grain + drifting sweep ────
  // Ambient diagonal sweep drifts continuously (the one acceptable linear use).
  const sweepDrift = (frame / fps) * 18; // px/sec drift
  const grainBars = Array.from({ length: 40 }, (_, i) => i);

  // ── Phase 1: the rule draws itself left-to-right (deliberate, no bounce) ───
  const ruleProgress = interpolate(
    frame,
    [ruleDrawStart, ruleDrawEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3) }
  );
  // Erase wipe on exit: right-to-left, accelerating (easeInCubic)
  const eraseT = interpolate(
    frame,
    [exitStart, exitStart + ruleErase],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => t * t * t }
  );
  const ruleLeft = eraseT * width; // left edge sweeps rightward as it erases
  const ruleRight = width * (1 - ruleProgress); // right edge recedes during draw
  const ruleVisibleWidth = Math.max(0, width - ruleLeft - ruleRight);
  const markerX = ruleProgress < 1 ? width - ruleRight : width * (1 - eraseT);
  const markerPulse = 1 + Math.sin((frame / fps) * Math.PI * 3) * 0.12;

  // ── Phase 2: three title lines spring up, staggered ────────────────────────
  const lineSpring = (start: number) =>
    spring({ frame: frame - start, fps, config: { damping: 24, mass: 0.9, stiffness: 170 } });
  const exitSpring = (delayFrames: number) =>
    spring({ frame: frame - (exitStart + delayFrames), fps, config: { damping: 18, stiffness: 200 } });

  const l1In = lineSpring(line1Start);
  const l2In = lineSpring(line2Start);
  const l3In = lineSpring(line3Start);
  const l1Out = exitSpring(0);
  const l2Out = exitSpring(2);
  const l3Out = exitSpring(4);

  const lineStyle = (inVal: number, outVal: number, staggerPx: number) => {
    const rise = interpolate(inVal, [0, 1], [26, 0]);
    const fadeIn = interpolate(inVal, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const riseOut = interpolate(outVal, [0, 1], [0, -36]);
    const fadeOut = interpolate(outVal, [0, 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return {
      transform: `translateY(${rise + riseOut}px) translateX(${staggerPx}px)`,
      opacity: Math.min(fadeIn, fadeOut),
    };
  };

  // ── Phase 3: kicker tracks in (0.30em -> 0.18em) ────────────────────────────
  const kickerIn = interpolate(frame, [kickerStart, kickerEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const kickerTracking = interpolate(kickerIn, [0, 1], [0.3, 0.18]);
  const kickerOut = exitSpring(1);
  const kickerRise = interpolate(kickerOut, [0, 1], [0, -30]);
  const kickerFadeOut = interpolate(kickerOut, [0, 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Ambient hold: whole type block creeps scale ~1.5% ──────────────────────
  const holdBreath = 1 + Math.min(Math.max((frame - kickerEnd) / (holdEnd - kickerEnd || 1), 0), 1) * 0.015;

  const serif = 'Georgia, "Times New Roman", serif';
  const supportFont = '"Inter", Arial, sans-serif';

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 50% 46%, #26221d 0%, #201d19 45%, #1c1a17 70%, #141210 100%)',
      }}
    >
      {/* Faint vertical paper-grain texture for material tooth */}
      <AbsoluteFill style={{ opacity: 0.06, overflow: 'hidden' }}>
        {grainBars.map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i / grainBars.length) * 100}%`,
              top: 0,
              width: 2,
              height: '100%',
              background: i % 2 === 0 ? '#fff' : '#000',
            }}
          />
        ))}
      </AbsoluteFill>

      {/* Diagonal warm sweep highlight, drifting slowly during the hold */}
      <AbsoluteFill
        style={{
          opacity: 0.12,
          background: `linear-gradient(115deg, transparent 30%, ${accent} 48%, transparent 62%)`,
          transform: `translateX(${(sweepDrift % (width * 0.6)) - width * 0.3}px)`,
        }}
      />

      {/* ── The amber rule: the "road" device, drawing/erasing left-to-right ── */}
      <div
        style={{
          position: 'absolute',
          top: '58%',
          left: ruleLeft,
          width: ruleVisibleWidth,
          height: 2,
          background: accent,
          boxShadow: `0 0 8px ${accent}88`,
        }}
      />
      {/* Traveling marker dot - a surveying pin leading the rule's edge */}
      {ruleVisibleWidth > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '58%',
            left: markerX - 5,
            width: 10 * markerPulse,
            height: 10 * markerPulse,
            borderRadius: '50%',
            background: accent,
            transform: 'translateY(-50%)',
            boxShadow: `0 0 16px ${accent}aa, 0 0 4px ${accent}`,
          }}
        />
      )}

      {/* ── Title block: three ranked serif lines, staggered left edges ────── */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: height * 0.06,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: `scale(${holdBreath})`,
          }}
        >
          <div
            style={{
              ...lineStyle(l1In, l1Out, -8),
              fontFamily: serif,
              fontSize: height * 0.075,
              fontWeight: 500,
              letterSpacing: '0.03em',
              color: '#eee7db',
              textTransform: 'uppercase',
            }}
          >
            {line1}
          </div>
          <div
            style={{
              ...lineStyle(l2In, l2Out, 6),
              fontFamily: serif,
              fontSize: height * 0.045,
              fontWeight: 400,
              letterSpacing: '0.08em',
              color: '#d8cdb9',
              textTransform: 'uppercase',
              marginTop: height * 0.008,
            }}
          >
            {line2}
          </div>
          <div
            style={{
              ...lineStyle(l3In, l3Out, -4),
              fontFamily: serif,
              fontSize: height * 0.108,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: '#f5efe4',
              textTransform: 'uppercase',
              marginTop: height * 0.01,
              whiteSpace: 'nowrap',
              backgroundImage: 'linear-gradient(180deg, #fbf6ec 0%, #e9dcc4 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {line3}
          </div>
        </div>
      </AbsoluteFill>

      {/* ── Kicker: small-caps label below the rule, tracking in ───────────── */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: height * 0.63,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontFamily: supportFont,
            fontSize: height * 0.028,
            fontWeight: 600,
            letterSpacing: `${kickerTracking}em`,
            color: '#a89a86',
            textTransform: 'uppercase',
            opacity: kickerIn * kickerFadeOut,
            transform: `translateY(${interpolate(kickerIn, [0, 1], [12, 0]) + kickerRise}px)`,
          }}
        >
          {kicker}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
