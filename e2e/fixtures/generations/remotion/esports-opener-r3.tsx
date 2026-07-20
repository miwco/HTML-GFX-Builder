
import { AbsoluteFill, interpolate, spring, random, useCurrentFrame, useVideoConfig } from 'remotion';

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
  const titleMain = String(fields.titleMain ?? 'NOVA');
  const titleAccent = String(fields.titleAccent ?? 'RIFT');
  const kickerText = String(fields.kicker ?? 'Late Night Esports');
  const colorA = String(fields.colorA ?? '#4DE8FF'); // cyan
  const colorB = String(fields.colorB ?? '#9B5CFF'); // violet

  // ── Timing constants (frames) ──────────────────────────────────────────
  const panelMeet = 14; // panels converge to form the seam
  const flashStart = 18;
  const flashPeak = 20;
  const ringStart = 22;
  const ringEnd = 30;
  const novaIn = 34;
  const riftIn = 38;
  const kickerIn = 40;
  const kickerSettled = 46;
  const holdStart = 48;
  const kickerExit = 94;
  const wordExitStart = 100;
  const wordExitEnd = 108;
  const shardFadeEnd = 108;
  const panelExitStart = 108;
  const panelExitEnd = 118;

  // ── Panels: rocket in from opposite edges, slam shut on exit ───────────
  const panelSpring = spring({ frame, fps, config: { damping: 16, stiffness: 220 } });
  const panelInX = interpolate(panelSpring, [0, 1], [1, 0]);
  const panelExit = interpolate(frame, [panelExitStart, panelExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t, // ease-in cubic, fast accelerate out
  });
  const leftPanelX = -width * 0.62 * panelInX - panelExit * width * 1.2;
  const rightPanelX = width * 0.62 * panelInX + panelExit * width * 1.2;

  // Slight punch-apart when the ring bursts, revealing depth in the seam.
  const ringPunch = interpolate(frame, [ringStart, ringEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const punchGap = ringPunch * width * 0.012 * (1 - panelExit);

  // ── Rift crack flash: sharp attack, exponential-feeling decay ──────────
  const flashAttack = interpolate(frame, [flashStart, flashPeak], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const flashDecay = interpolate(frame, [flashPeak, flashPeak + 10], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - (1 - t) * (1 - t) * (1 - t), // fast decay curve
  });
  const flashOpacity = frame < flashPeak ? flashAttack : flashDecay;

  // Crack races top-to-bottom along the fault (frames 20-26)
  const crackProgress = interpolate(frame, [flashPeak, 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Shockwave ring: bursts at 22, expands/fades by 30, then a gentle breathing loop
  const ringBurst = interpolate(frame, [ringStart, ringEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const ringOpacity = interpolate(frame, [ringStart, ringStart + 3, ringEnd], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const breathe = 1 + Math.sin((frame / fps) * Math.PI * 1.4) * 0.02; // 1-3% scale-creep
  const ringScale = 0.2 + ringBurst * 1.6 * (frame < ringEnd ? 1 : breathe);
  const ringHoldOpacity = frame >= holdStart && frame < kickerExit ? 0.35 : ringOpacity;

  // ── Wordmark: NOVA then RIFT snap in with slight overshoot ─────────────
  const novaSpring = spring({ frame: frame - novaIn, fps, config: { damping: 16, stiffness: 220 } });
  const riftSpring = spring({ frame: frame - riftIn, fps, config: { damping: 16, stiffness: 220 } });
  const novaY = interpolate(novaSpring, [0, 1], [40, 0]);
  const riftY = interpolate(riftSpring, [0, 1], [40, 0]);
  const novaOpacity = interpolate(novaSpring, [0, 1], [0, 1]);
  const riftOpacity = interpolate(riftSpring, [0, 1], [0, 1]);

  const wordExit = interpolate(frame, [wordExitStart, wordExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t, // fast ease-in accelerate
  });
  const wordY = wordExit * -height * 0.6;
  const wordOpacity = 1 - interpolate(frame, [wordExitStart + 2, wordExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Kicker: fades/slides up, then snaps down + fades on exit ───────────
  const kickerProgress = interpolate(frame, [kickerIn, kickerSettled], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const kickerExitProgress = interpolate(frame, [kickerExit, kickerExit + 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const kickerY = interpolate(kickerProgress, [0, 1], [20, 0]) + kickerExitProgress * 24;
  const kickerOpacity = kickerProgress * (1 - kickerExitProgress);

  // ── Speed-line shards: staggered diagonal streaks through the hold ─────
  const shardCount = 4;
  const shards = new Array(shardCount).fill(0).map((_, i) => {
    const seed = `shard-${i}`;
    const stagger = 18 * i + Math.floor(random(seed) * 6);
    const start = holdStart + stagger;
    const cycle = 18;
    // Repeat streaks across the hold using a sawtooth-like modulo progress
    const localFrame = frame - start;
    const period = Math.max(1, cycle);
    const cyclePos = ((localFrame % period) + period) % period;
    const active = frame >= start && frame < shardFadeEnd;
    const travel = interpolate(cyclePos, [0, period], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const x = interpolate(travel, [0, 1], [-width * 0.3, width * 1.3]);
    const y = height * (0.2 + i * 0.18) + Math.sin(i) * 20;
    const opacity = active ? interpolate(travel, [0, 0.15, 0.85, 1], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) : 0;
    return { x, y, opacity, color: i % 2 === 0 ? colorA : colorB, key: i };
  });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: 'linear-gradient(180deg, #0A0B14 0%, #14152A 100%)' }}>
      {/* Radial glow breathing behind center - desaturated violet */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(120,90,180,${0.18 + Math.sin(frame / fps * Math.PI) * 0.03}) 0%, rgba(120,90,180,0) 60%)`,
        }}
      />

      {/* Scanline texture - far back, subtle broadcast grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px)',
        }}
      />

      {/* ── Slab panels: torn fault line, same-hue shading + hairline keyline ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: width * 1.3,
          height: height * 1.6,
          background: 'linear-gradient(100deg, #241a3a 0%, #180f2a 55%, #120a20 100%)',
          backgroundImage:
            'linear-gradient(100deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.35) 100%)',
          transform: `translate(-50%,-50%) translateX(${leftPanelX - punchGap}px) rotate(-8deg) translateX(-${width * 0.32}px)`,
          boxShadow: 'inset -2px 0 0 rgba(77,232,255,0.35), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: width * 1.3,
          height: height * 1.6,
          background: 'linear-gradient(100deg, #12222a 0%, #0d1a22 55%, #0a1418 100%)',
          backgroundImage:
            'linear-gradient(100deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.35) 100%)',
          transform: `translate(-50%,-50%) translateX(${rightPanelX + punchGap}px) rotate(-8deg) translateX(${width * 0.32}px)`,
          boxShadow: 'inset 2px 0 0 rgba(155,92,255,0.35), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      />

      {/* ── Rift crack: white-hot flash decaying into cyan-violet racing seam ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 6,
          height: height * 1.4,
          transform: 'translate(-50%,-50%) rotate(-8deg)',
          background: `linear-gradient(180deg, ${colorA} 0%, ${colorB} 100%)`,
          opacity: flashOpacity * 0.9,
          boxShadow: `0 0 ${40 * flashOpacity}px 10px rgba(200,220,255,${flashOpacity})`,
          clipPath: `polygon(0 0, 100% 0, 100% ${crackProgress * 100}%, 0 ${crackProgress * 100}%)`,
          zIndex: 5,
        }}
      />

      {/* ── Shockwave ring ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: width * 0.35,
          height: width * 0.35,
          borderRadius: '50%',
          border: `2px solid ${colorA}`,
          transform: `translate(-50%,-50%) scale(${ringScale})`,
          opacity: ringHoldOpacity,
          boxShadow: `0 0 30px ${colorB}55`,
          zIndex: 5,
        }}
      />

      {/* ── Speed-line shards: behind type, above panels ── */}
      {shards.map((s) => (
        <div
          key={s.key}
          style={{
            position: 'absolute',
            top: s.y,
            left: 0,
            width: width * 0.4,
            height: 4,
            background: `linear-gradient(90deg, transparent 0%, ${s.color} 50%, transparent 100%)`,
            transform: `translateX(${s.x}px) rotate(-8deg)`,
            opacity: s.opacity,
            zIndex: 6,
          }}
        />
      ))}

      {/* ── Wordmark + kicker: paints last, dead center ── */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transform: `translateY(${wordY}px)`,
            opacity: wordOpacity,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: '"Archivo", "Arial Black", Arial, sans-serif',
              fontSize: 150,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            <span
              style={{
                color: '#F4F5F8',
                transform: `translateY(${novaY}px)`,
                opacity: novaOpacity,
                marginRight: '0.18em',
              }}
            >
              {titleMain}
            </span>
            <span
              style={{
                background: `linear-gradient(100deg, ${colorA} 0%, ${colorB} 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                transform: `translateY(${riftY}px)`,
                opacity: riftOpacity,
              }}
            >
              {titleAccent}
            </span>
          </div>

          <div
            style={{
              marginTop: 8,
              fontFamily: '"Oswald", "Arial Narrow", Arial, sans-serif',
              fontSize: Math.round(height * 0.03),
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#B9BCD4',
              opacity: kickerOpacity,
              transform: `translateY(${kickerY}px)`,
            }}
          >
            {kickerText}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
