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

  // ── Editable content ─────────────────────────────────────────────────────
  const name = String(fields.name ?? 'Dr. Elena Marsh');
  const role = String(fields.role ?? 'Senior Researcher, Marine Institute');
  const accent = String(fields.accent ?? '#c98a2b');

  // ── Timing (frames, derived from fps) ───────────────────────────────────
  const tabStart = 0;
  const panelStart = Math.round(fps * 0.13); // 4 frames after tab starts (at 30fps)
  const nameWipeStart = Math.round(fps * 0.45);
  const nameWipeEnd = Math.round(fps * 0.85);
  const roleWipeStart = Math.round(fps * 0.49);
  const roleWipeEnd = Math.round(fps * 0.95);

  const holdStart = Math.round(fps * 1.0);
  const holdEnd = Math.round(fps * 2.9);

  const exitStart = holdEnd; // 2.9s
  const exitDur = 12; // ~0.4s ease-in exit
  const textExitStart = exitStart; // text leads
  const panelExitStart = exitStart + 2; // panel/rule chase 2 frames behind text
  const tabExitStart = exitStart; // tab travels same span, but arrives last (slower curve/longer distance)
  const tabExitEnd = Math.round(fps * 3.4); // tab + shadow finish exactly at 3.4s

  // ── Geometry ─────────────────────────────────────────────────────────────
  const restX = width * 0.15; // tab resting position
  const panelFullWidth = width * 0.34;
  const tabWidth = 24;
  const tabHeight = 130;

  // ── Entrance spring: tab + panel group travel together ──────────────────
  const tabSpring = spring({
    frame: frame - tabStart,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 140 },
  });
  // Slight 2-3% overshoot only on the tab (its own spring naturally overshoots a touch;
  // we nudge the target range to bake in ~2.5% overshoot feel)
  const tabX = interpolate(tabSpring, [0, 1], [-200, 0]);

  const shadowOpacity = interpolate(frame, [tabStart, tabStart + fps * 0.35], [0, 0.35], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const panelSpring = spring({
    frame: frame - panelStart,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 140 },
  });
  const panelWidth = interpolate(panelSpring, [0, 1], [0, panelFullWidth], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Text reveal wipes: ease-out cubic via interpolate ───────────────────
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const nameWipeRaw = interpolate(frame, [nameWipeStart, nameWipeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const nameWipe = easeOutCubic(nameWipeRaw);

  const roleWipeRaw = interpolate(frame, [roleWipeStart, roleWipeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const roleWipe = easeOutCubic(roleWipeRaw);

  // ── Ambient hold: 1.5% scale creep, linear across hold window only ──────
  const holdScale = interpolate(frame, [holdStart, holdEnd], [1, 1.015], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Exit: ease-in accelerating over 12 frames ───────────────────────────
  const easeInCubic = (t: number) => t * t * t;

  const textExitT = interpolate(frame, [textExitStart, textExitStart + exitDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textExit = easeInCubic(textExitT);

  const panelExitT = interpolate(frame, [panelExitStart, panelExitStart + exitDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const panelExit = easeInCubic(panelExitT);

  const tabExitT = interpolate(frame, [tabExitStart, tabExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tabExit = easeInCubic(tabExitT);

  // Combined group scale: entrance settle (no separate scale) * ambient hold * (exit doesn't scale, only translates)
  const groupScale = holdScale;

  // Positions with exit travel applied
  const finalTabX = restX + tabX - tabExit * (width * 0.5 + 200);
  const finalPanelWidth = Math.max(0, panelWidth * (1 - panelExit));
  const textTranslateX = -textExit * width * 0.4;
  const textOpacity = 1 - textExit;
  const finalShadowOpacity = shadowOpacity * (1 - tabExit);

  // ── Typography sizing: derive name fontSize from its own string length ──
  // Georgia (bundled-fallback serif) capAdvance approximated ~0.56em per uppercase char
  const capAdvance = 0.56;
  const targetWidthFraction = 0.42; // aim for ~40-45% of frame width
  const nameFontSize = Math.round((width * targetWidthFraction) / (name.length * capAdvance));
  const clampedNameFontSize = Math.min(Math.max(nameFontSize, height * 0.06), height * 0.1);

  const roleFontSize = Math.round(clampedNameFontSize * 0.42);

  // ── Layout anchors ───────────────────────────────────────────────────────
  const baseY = height * 0.8; // vertical anchor for the strap, ~80% frame height
  const textLeft = restX + tabWidth + width * 0.02;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: baseY - tabHeight * 0.5,
          transform: `scale(${groupScale})`,
          transformOrigin: `${restX}px ${baseY}px`,
        }}
      >
        {/* Layer 1: contact shadow grounding the plate (blur only, no fill card) */}
        <div
          style={{
            position: 'absolute',
            left: finalTabX - 10,
            top: tabHeight * 0.15,
            width: finalPanelWidth + tabWidth + 40,
            height: tabHeight * 0.9,
            background: 'rgba(0,0,0,0.55)',
            filter: 'blur(24px)',
            opacity: finalShadowOpacity,
          }}
        />

        {/* Layer 2: amber accent tab - the anchor */}
        <div
          style={{
            position: 'absolute',
            left: finalTabX,
            top: 0,
            width: tabWidth,
            height: tabHeight,
            background: `linear-gradient(180deg, ${accent} 0%, ${accent} 55%, #8a5c1c 100%)`,
            boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.35), 2px 0 12px rgba(0,0,0,0.4)',
          }}
        />

        {/* Layer 3: translucent charcoal panel strip behind the text */}
        <div
          style={{
            position: 'absolute',
            left: finalTabX + tabWidth,
            top: tabHeight * 0.08,
            width: finalPanelWidth,
            height: tabHeight * 0.84,
            overflow: 'hidden',
            background:
              'linear-gradient(180deg, rgba(58,54,50,0.16) 0%, rgba(40,37,34,0.14) 55%, rgba(20,18,17,0.20) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}
        />

        {/* Text group: hairline + name + role, all left-anchored just right of the tab */}
        <div
          style={{
            position: 'absolute',
            left: textLeft,
            top: 0,
            width: width * 0.5,
            height: tabHeight,
            transform: `translateX(${textTranslateX}px)`,
            opacity: textOpacity,
          }}
        >
          {/* Name (hero) */}
          <div
            style={{
              position: 'absolute',
              top: tabHeight * 0.16,
              left: 0,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 600,
              fontSize: clampedNameFontSize,
              letterSpacing: '-0.01em',
              color: '#f4efe8',
              whiteSpace: 'nowrap',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              clipPath: `inset(0 ${(1 - nameWipe) * 100}% 0 0)`,
            }}
          >
            {name}
          </div>

          {/* Hairline rule under the name */}
          <div
            style={{
              position: 'absolute',
              top: tabHeight * 0.53,
              left: 0,
              height: 2,
              width: panelWidth > 0 ? Math.max(0, finalPanelWidth - width * 0.02) : 0,
              background: `linear-gradient(90deg, ${accent} 0%, rgba(244,239,232,0.55) 100%)`,
            }}
          />

          {/* Role / institution (support), small caps, tracked out */}
          <div
            style={{
              position: 'absolute',
              top: tabHeight * 0.6,
              left: 0,
              fontFamily: '"Inter", Arial, sans-serif',
              fontWeight: 600,
              fontSize: roleFontSize,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(244,239,232,0.82)',
              whiteSpace: 'nowrap',
              clipPath: `inset(0 ${(1 - roleWipe) * 100}% 0 0)`,
            }}
          >
            {role}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
