
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// "Hand-Built Strap" - a documentary lower-third that unfolds from a single brass tick:
// tick -> name panel -> role panel, text wipes in, holds with a faint drift, then
// peels/collapses in reverse. Transparent root; panels are lit surfaces, text paints last.

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
  const name = String(fields.name ?? 'SARA OYELARAN');
  const role = String(fields.role ?? 'DOCUMENTARY FILMMAKER');
  const institution = String(fields.institution ?? 'ATLAS FIELD INSTITUTE');
  const accent = String(fields.accent ?? '#B8935B');
  const panelColor = String(fields.panelColor ?? '#2E2A26');
  const paperColor = String(fields.paperColor ?? '#EDE3D2');

  // ── Timing constants (frames, derived so fps changes still work) ───────
  const tickInEnd = 8;
  const namePanelStart = 6;
  const namePanelEnd = 22;
  const rolePanelStart = 12;
  const rolePanelEnd = 25;
  const nameTextStart = 15;
  const nameTextEnd = 27;
  const roleTextStart = 19;
  const roleTextEnd = 31;

  const roleExitStart = 87;
  const roleExitEnd = 97;
  const nameExitStart = 91;
  const nameExitEnd = 103;

  const rolePanelCollapseStart = 100;
  const rolePanelCollapseEnd = 112;
  const namePanelCollapseStart = 104;
  const namePanelCollapseEnd = 118;
  const tickOutStart = 114;
  const tickOutEnd = 120;

  // ── Layout anchors, all derived from frame size ─────────────────────────
  const tickX = width * 0.08;
  const nameTop = height * 0.62;
  const nameHeight = height * 0.09;
  const roleHeight = height * 0.055;

  // ── Tick: fast snap-in, and a shrink-to-point fade on exit ──────────────
  const tickInSpring = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });
  const tickInScale = interpolate(frame, [0, tickInEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tickOutFade = interpolate(frame, [tickOutStart, tickOutEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tickOutScale = interpolate(frame, [tickOutStart, tickOutEnd], [1, 0.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tickScale = Math.min(tickInSpring, tickInScale) * tickOutScale;
  const tickOpacity = tickOutFade;

  // ── Name panel: width spring in (with overshoot), collapse spring out ───
  const namePanelSpring = spring({
    frame: frame - namePanelStart,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 160 },
  });
  const namePanelOvershoot = interpolate(namePanelSpring, [0, 1], [0, 1.02]);
  const namePanelInWidth = interpolate(
    frame,
    [namePanelStart, namePanelEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  ) > 0
    ? Math.min(namePanelOvershoot, 1.02) * (frame > namePanelEnd ? 1 : namePanelOvershoot)
    : 0;
  const namePanelCollapse = spring({
    frame: frame - namePanelCollapseStart,
    fps,
    config: { damping: 24, stiffness: 200 },
  });
  const namePanelWidthFactor =
    frame < namePanelCollapseStart
      ? Math.max(0, Math.min(1.02, namePanelSpring * 1.02))
      : Math.max(0, (1 - namePanelCollapse) * 1.0);

  // ── Role panel: width spring in, collapse spring out ────────────────────
  const rolePanelSpring = spring({
    frame: frame - rolePanelStart,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 160 },
  });
  const rolePanelCollapse = spring({
    frame: frame - rolePanelCollapseStart,
    fps,
    config: { damping: 24, stiffness: 200 },
  });
  const rolePanelWidthFactor =
    frame < rolePanelCollapseStart
      ? Math.max(0, Math.min(1.02, rolePanelSpring * 1.02))
      : Math.max(0, (1 - rolePanelCollapse) * 1.0);

  // ── Hero type sized from its own string (capAdvance solve) ─────────────
  // "Oswald" condensed serif-leaning display: capAdvance ~0.52 em/char.
  const nameCapAdvance = 0.52;
  const targetNameWidth = width * 0.58; // aim for ~58% of frame width
  const nameFontSize = Math.round(targetNameWidth / (nameCapAdvance * name.length));
  const namePanelWidth = Math.max(width * 0.02, targetNameWidth / 0.86); // panel wider than text for padding

  // Role panel width: ~70% of name panel's settled width
  const rolePanelWidth = namePanelWidth * 0.7;

  // Support type size from frame height (contract-specified ~0.03)
  const roleFontSize = Math.round(height * 0.03);

  // ── Text reveal wipes (clip-mask, not opacity-only) ─────────────────────
  const nameWipe = interpolate(frame, [nameTextStart, nameTextEnd], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3), // easeOut cubic
  });
  const roleWipe = interpolate(frame, [roleTextStart, roleTextEnd], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  // ── Text exits: accelerate left + fade, ahead of their panel collapsing ─
  const roleExitProgress = interpolate(frame, [roleExitStart, roleExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t, // easeIn cubic
  });
  const nameExitProgress = interpolate(frame, [nameExitStart, nameExitEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t,
  });

  const nameTextOpacity = 1 - nameExitProgress;
  const roleTextOpacity = 1 - roleExitProgress;
  const nameTextTranslate = -nameExitProgress * width * 0.08;
  const roleTextTranslate = -roleExitProgress * width * 0.08;

  // ── Ambient hold drift: whole group breathes ±2px on a slow 3s sine ─────
  const driftPeriodFrames = fps * 3;
  const drift = Math.sin((frame / driftPeriodFrames) * Math.PI * 2) * 2;

  // ── Brass keyline shimmer: subtle single sweep during the hold ──────────
  const shimmerSweep = interpolate(frame, [50, 70], [-20, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shimmerActive = frame >= 50 && frame <= 70 ? 1 : 0;

  return (
    <AbsoluteFill>
      {/* Whole strap group: anchored lower-left, drifting gently during the hold */}
      <div
        style={{
          position: 'absolute',
          left: tickX,
          top: nameTop,
          transform: `translateX(${drift}px)`,
        }}
      >
        {/* Brass tick anchor - the seed the whole strap unfolds from */}
        <div
          style={{
            position: 'absolute',
            left: -6,
            top: -(nameHeight * 0.15),
            width: 6,
            height: height * 0.14,
            background: `linear-gradient(180deg, ${accent} 0%, #8f713f 100%)`,
            transform: `scaleY(${tickScale})`,
            transformOrigin: 'center center',
            opacity: tickOpacity,
            borderRadius: 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          }}
        />

        {/* Name panel: charcoal-ink lit surface, sits bottom layer */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: Math.max(0, namePanelWidth * namePanelWidthFactor),
            height: nameHeight,
            overflow: 'hidden',
            background: `linear-gradient(180deg, ${panelColor} 0%, #221e1b 100%)`,
            boxShadow: 'inset 0 6px 10px rgba(0,0,0,0.35), 0 14px 22px rgba(0,0,0,0.3)',
          }}
        >
          {/* Brass hairline keyline along the top edge */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: accent,
              opacity: 0.95,
            }}
          />
          {/* Subtle shimmer sweep across the keyline during the hold */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${shimmerSweep}%`,
              width: '20%',
              height: 2,
              background: 'rgba(255,255,255,0.9)',
              opacity: shimmerActive * 0.04,
            }}
          />

          {/* Guest name - topmost paint, revealed via clip wipe */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '5%',
              transform: `translateY(-50%) translateX(${nameTextTranslate}px)`,
              whiteSpace: 'nowrap',
              fontFamily: '"Oswald", "Arial Narrow", Arial, sans-serif',
              fontSize: nameFontSize,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              color: '#F3ECE0',
              opacity: nameTextOpacity,
              clipPath: `inset(0 ${100 - nameWipe}% 0 0)`,
            }}
          >
            {name}
          </div>
        </div>

        {/* Role panel: warm paper tone, overlaps name panel's bottom-left corner */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: nameHeight - 8,
            width: Math.max(0, rolePanelWidth * rolePanelWidthFactor),
            height: roleHeight,
            overflow: 'hidden',
            background: `linear-gradient(90deg, #F4ECE0 0%, ${paperColor} 100%)`,
            boxShadow: '0 10px 18px rgba(0,0,0,0.28)',
          }}
        >
          {/* Thinner brass echo keyline on the role panel */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1.5,
              background: accent,
              opacity: 0.8,
            }}
          />

          {/* Role + institution - topmost paint, revealed via clip wipe */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '5%',
              transform: `translateY(-50%) translateX(${roleTextTranslate}px)`,
              whiteSpace: 'nowrap',
              fontFamily: '"Manrope", Arial, sans-serif',
              fontSize: roleFontSize,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#2A2320',
              opacity: roleTextOpacity,
              clipPath: `inset(0 ${100 - roleWipe}% 0 0)`,
            }}
          >
            {role}
            <span style={{ margin: '0 0.5em', color: accent }}>·</span>
            {institution}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
