
// "Straightedge Strap" - a documentary lower-third stinger.
// Concept: a single amber tick bar leads the entrance, unfurling a dark glass panel
// behind it like a straightedge drawing the name onto the frame. Text reveals after the
// panel lands, holds with slow ambient drift, then exits text-first while the tick -
// the element that led the entrance - is the last thing to leave.

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
  const name = String(fields.name ?? 'Dr. Elena Marsh');
  const role = String(fields.role ?? 'Marine Biologist, Woods Hole Institute');
  const accent = String(fields.accent ?? '#d9a441');

  // ── Layout anchors ──────────────────────────────────────────────────────
  const safeLeft = width * 0.07; // left-safe margin where the tick rests
  const panelBottom = height * 0.86; // panel anchored lower-left
  const panelHeight = height * 0.22;
  const tickWidth = 10;
  const panelWidth = width * 0.34;

  // Size the hero (name) from its own string so it spans a designed share of the width.
  // Bebas Neue-style tight serif substitute: using a bundled serif/humanist display face.
  const capAdvance = 0.62; // approximate per-character advance for the chosen face at fontSize
  const targetSpan = width * 0.6; // aim for ~60% of frame width
  const nameFontSize = Math.min(
    Math.round(targetSpan / (capAdvance * Math.max(name.length, 6))),
    Math.round(height * 0.09)
  );
  const roleFontSize = Math.round(height * 0.03);

  // ── Timing constants (frames) ───────────────────────────────────────────
  const tickInStart = 0;
  const tickInEnd = 16;
  const panelInStart = 3;
  const nameInStart = 12;
  const nameInEnd = 25;
  const roleInStart = 17;
  const roleInEnd = 25;

  const textExitStart = 87; // name/role fade+slide first
  const textExitEnd = 100;
  const strapExitStart = 95; // rule + panel accelerate off
  const strapExitEnd = 116; // tick fully gone by here
  const holdEnd = durationInFrames - 4; // fully clear by 116-120

  // ── Entrance: tick leads on a decisive spring, panel trails 3 frames ────
  const tickSpring = spring({
    frame: frame - tickInStart,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 170 },
  });
  const tickEnterX = interpolate(tickSpring, [0, 1], [-140, 0]);

  const panelSpring = spring({
    frame: frame - panelInStart,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 160 }, // slight overshoot then settle
  });
  const panelEnterX = interpolate(panelSpring, [0, 1], [-140, 0]);

  // ── Exit: text first (quick ease-in slide+fade), then rule/panel, tick last ─
  const textExit = interpolate(frame, [textExitStart, textExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textExitEase = textExit * textExit; // ease-in cubic-ish feel

  const strapExitRaw = interpolate(frame, [strapExitStart, strapExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const strapExitEase = strapExitRaw * strapExitRaw * strapExitRaw; // accelerating ease-in cubic

  // Tick trails the strap exit by leading it out last - travels slightly further/faster.
  const tickExitRaw = interpolate(frame, [strapExitStart, strapExitEnd - 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tickExitEase = tickExitRaw * tickExitRaw * tickExitRaw;

  // Combined X offsets: entrance position + exit travel (exit only fires after hold).
  const panelX = panelEnterX - strapExitEase * (width * 0.55);
  const tickX = tickEnterX - tickExitEase * (width * 0.7) - 60; // tick overtakes, clears past -160px

  // ── Hero hold: slow single-cycle ambient drift (never during entrance/exit) ─
  const holdProgress = interpolate(frame, [25, 87], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const driftY = Math.sin(holdProgress * Math.PI) * 6; // +/-6px single cycle
  const scaleBreath = 1 + Math.sin(holdProgress * Math.PI) * 0.015; // 1.5% creep and back

  // Panel fully hidden once we're past the clear-frame window
  const panelVisible = frame < holdEnd + 4;

  // ── Text entrance (name) ────────────────────────────────────────────────
  const nameIn = interpolate(frame, [nameInStart, nameInEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const nameRise = interpolate(nameIn, [0, 1], [28, 0]);

  // ── Rule + role entrance ────────────────────────────────────────────────
  const roleIn = interpolate(frame, [roleInStart, roleInEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const roleRise = interpolate(roleIn, [0, 1], [16, 0]);

  const nameOpacity = nameIn * (1 - textExitEase);
  const roleOpacity = roleIn * (1 - textExitEase);
  const textSlideOut = textExitEase * -24;

  const ruleOpacity = roleIn * (1 - strapExitRaw);

  if (!panelVisible) {
    return <AbsoluteFill />;
  }

  return (
    <AbsoluteFill>
      {/* Panel: a lit warm-charcoal glass surface, anchored lower-left */}
      <div
        style={{
          position: 'absolute',
          left: safeLeft,
          bottom: height - panelBottom,
          width: panelWidth,
          height: panelHeight,
          transform: `translateX(${panelX}px) translateY(${driftY}px) scale(${scaleBreath})`,
          transformOrigin: 'left center',
          background: 'linear-gradient(180deg, #3a3530 0%, #221f1c 55%, #14120f 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(224,180,110,0.35), 0 22px 45px rgba(0,0,0,0.45)',
          zIndex: 5,
        }}
      />

      {/* Amber tick bar: the leading accent, sits proud on the panel's left edge */}
      <div
        style={{
          position: 'absolute',
          left: safeLeft,
          bottom: height - panelBottom,
          width: tickWidth,
          height: panelHeight,
          transform: `translateX(${tickX}px) translateY(${driftY}px)`,
          background: `linear-gradient(180deg, ${accent} 0%, ${accent} 100%)`,
          boxShadow: `0 0 18px ${accent}88`,
          zIndex: 6,
        }}
      />

      {/* Text lockup: paints last, above panel and tick */}
      <div
        style={{
          position: 'absolute',
          left: safeLeft + tickWidth + width * 0.02,
          bottom: height - panelBottom,
          height: panelHeight,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: height * 0.012,
          transform: `translateY(${driftY}px) translateX(${textSlideOut}px)`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: nameFontSize,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: '#f4ede2',
            opacity: nameOpacity,
            transform: `translateY(${nameRise}px)`,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>

        {/* Hairline amber rule separating the two tiers */}
        <div
          style={{
            width: 120,
            height: 2,
            background: accent,
            opacity: ruleOpacity,
          }}
        />

        <div
          style={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontSize: roleFontSize,
            fontWeight: 400,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(244,237,226,0.82)',
            opacity: roleOpacity,
            transform: `translateY(${roleRise}px)`,
            whiteSpace: 'nowrap',
          }}
        >
          {role}
        </div>
      </div>
    </AbsoluteFill>
  );
}
