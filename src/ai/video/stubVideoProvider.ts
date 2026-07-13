// Deterministic offline video provider - the AI-shaped fallback when no key/proxy is
// configured (same posture as ai/stubProvider.ts). Keyword-matches the brief onto a few
// hand-written sample compositions that follow the exact contract the real harness holds
// the model to (imports only react/remotion, everything frame-derived, assets via props),
// so the whole generate -> validate -> preview loop works with no key at all.
//
// These samples double as the OFFLINE acceptance tests for the built-in example prompts:
// each is deliberately broadcast-grade (strong composition, real typographic hierarchy,
// professional easing, a designed background, a decisive exit) - never a placeholder box.
// When a logo is expected but none was uploaded, the reveal sets a typographic wordmark,
// exactly as the contract requires of the real model.

import type {
  VideoAIProvider,
  VideoGenerateContext,
  VideoGenerateResult,
  VideoValidator,
} from './provider';

/** The `assets` prop convention every sample follows (same as generated code). */
const ASSETS_PROP = '{ assets = {} }: { assets?: Record<string, string> }';

/** Background for the root fill - transparent projects paint nothing so the alpha survives. */
function rootBackground(transparent: boolean, opaqueCss: string): string {
  return transparent ? 'transparent' : opaqueCss;
}

// ── Sports stinger: full-frame angled panels sweep through, a heavy condensed title snaps
//    in at centre with a light sweep, everything clears out fast. ─────────────────────────
function stingerTsx(transparent: boolean): string {
  const background = rootBackground(transparent, 'linear-gradient(150deg, #0a0e14 0%, #16202f 55%, #0a0e14 100%)');
  return `// Sports stinger: three angled slabs slash across the frame, a condensed uppercase
// title snaps in behind a light sweep, then it all clears fast. Frame-derived + deterministic.

import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition(${ASSETS_PROP}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const logo = Object.values(assets)[0]; // optional - the layout works with or without it

  // ── Timing (frames, derived from fps so any rate works) ──────────────────
  const titleStart = Math.round(fps * 0.28);
  const exitStart = durationInFrames - Math.round(fps * 0.5);

  // Three full-width slabs sweep in with a tight stagger; they carry the entrance energy.
  const slabColors = ['#f6a623', '#1d2634', '#2c3a52'];
  const slabs = [0, 1, 2].map((i) => {
    const enter = spring({ frame: frame - i * 3, fps, config: { damping: 15, stiffness: 210 } });
    const exit = interpolate(frame, [exitStart + i * 2, exitStart + i * 2 + fps * 0.35], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const x = interpolate(enter, [0, 1], [-width * 1.3, 0]) + exit * width * 1.4;
    return { x, y: (i - 1) * height * 0.2, h: height * (0.2 - i * 0.03), color: slabColors[i] };
  });

  const titleIn = spring({ frame: frame - titleStart, fps, config: { damping: 14, stiffness: 200 } });
  const sweep = interpolate(frame, [titleStart + fps * 0.35, titleStart + fps * 1.0], [-30, 130], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleExit = interpolate(frame, [exitStart, exitStart + fps * 0.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '${background}' }}>
      {slabs.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: width * 1.1,
            height: s.h,
            background: s.color,
            transform: \`translate(-50%, -50%) translate(\${s.x}px, \${s.y}px) rotate(-11deg)\`,
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          }}
        />
      ))}

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            overflow: 'hidden',
            padding: '0.08em 0.28em',
            transform: \`translateX(\${titleExit * -width * 0.5}px)\`,
            opacity: 1 - titleExit,
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: Math.round(height * 0.03),
              transform: \`translateY(\${(1 - titleIn) * 120}%) skewX(-6deg)\`,
              color: '#f5f7fa',
              fontFamily: '"Arial Black", "Arial Bold", Arial, sans-serif',
              fontSize: Math.round(height * 0.16),
              fontWeight: 900,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            {logo && <Img src={logo} style={{ height: '1em', objectFit: 'contain' }} />}
            Game On
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.32) 50%, transparent 58%)',
                transform: \`translateX(\${sweep}%)\`,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`;
}

// ── News intro: precise horizontal rules extend across a deep navy field, a grotesque
//    headline slides from behind a mask, one amber keyline lands last. Restrained. ─────────
function newsTsx(transparent: boolean): string {
  const background = rootBackground(transparent, 'radial-gradient(120% 140% at 50% 0%, #16233b 0%, #0a1424 70%)');
  return `// News intro: horizontal rules extend, a headline slides in from behind a mask, an
// amber keyline lands last. Authority through restraint - measured, precise, deterministic.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition(${ASSETS_PROP}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const ruleGrow = spring({ frame, fps, config: { damping: 22, stiffness: 150 } });
  const textStart = Math.round(fps * 0.3);
  const textIn = spring({ frame: frame - textStart, fps, config: { damping: 24, stiffness: 170 } });
  const keyline = spring({ frame: frame - Math.round(fps * 0.6), fps, config: { damping: 20, stiffness: 200 } });

  const exitStart = durationInFrames - Math.round(fps * 0.45);
  const exit = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const centerY = height * 0.5;
  const barW = width * 0.62;

  return (
    <AbsoluteFill style={{ background: '${background}', opacity: 1 - exit }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: barW, transform: \`translateX(\${exit * -width * 0.15}px)\` }}>
          {/* Top rule extends from the left */}
          <div style={{ height: 2, width: \`\${ruleGrow * 100}%\`, background: 'rgba(255,255,255,0.55)', marginBottom: Math.round(height * 0.03) }} />

          {/* Headline rises from behind a masked line box */}
          <div style={{ overflow: 'hidden', padding: '0.02em 0' }}>
            <div
              style={{
                transform: \`translateY(\${(1 - textIn) * 100}%)\`,
                color: '#f3f6fb',
                fontFamily: '"Helvetica Neue", Arial, sans-serif',
                fontSize: Math.round(height * 0.1),
                fontWeight: 700,
                letterSpacing: '-0.01em',
                lineHeight: 1.02,
              }}
            >
              Top Story
            </div>
          </div>

          {/* Kicker + amber keyline land last */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: Math.round(height * 0.03), opacity: keyline }}>
            <div style={{ width: Math.round(width * 0.05) * keyline, height: 4, background: '#f6a623' }} />
            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontFamily: '"Helvetica Neue", Arial, sans-serif',
                fontSize: Math.round(height * 0.03),
                fontWeight: 600,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
              }}
            >
              Live · Tonight
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
`;
}

// ── Logo reveal: the uploaded mark (or a designed WORDMARK when none is provided) settles
//    in with an overshoot, a light sweep passes across it, it breathes, then clears. ───────
function logoTsx(transparent: boolean): string {
  const background = rootBackground(transparent, 'radial-gradient(130% 130% at 50% 40%, #232a33 0%, #0e1116 70%)');
  return `// Logo reveal: the mark settles in with a confident overshoot, a specular light sweep
// crosses it, it breathes on the hold, then clears. With no uploaded logo it reveals a
// designed wordmark instead - never a placeholder. Fully frame-derived + deterministic.

import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition(${ASSETS_PROP}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, height } = useVideoConfig();
  const logo = Object.values(assets)[0];

  const enter = spring({ frame, fps, config: { damping: 12, stiffness: 130 } }); // overshoots
  const sweep = interpolate(frame, [fps * 0.45, fps * 1.15], [-70, 170], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Gentle breathing on the settled hold so it never feels frozen.
  const breathe = 1 + Math.sin((frame / fps) * Math.PI * 0.9) * 0.012;
  const exit = interpolate(
    frame,
    [durationInFrames - Math.round(fps * 0.4), durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ background: '${background}', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '0.18em 0.34em',
          transform: \`scale(\${(0.82 + enter * 0.18) * breathe})\`,
          opacity: Math.min(enter, exit),
        }}
      >
        {logo ? (
          <Img src={logo} style={{ height: Math.round(height * 0.34), objectFit: 'contain' }} />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.06em',
              fontFamily: '"Arial Black", "Arial Bold", Arial, sans-serif',
              fontSize: Math.round(height * 0.2),
              fontWeight: 900,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            <span style={{ color: '#f5f7fa' }}>Studio</span>
            <span style={{ color: '#f6a623' }}>.</span>
          </div>
        )}
        {/* Specular light sweep clipped to the mark */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.32) 50%, transparent 60%)',
            transform: \`translateX(\${sweep}%)\`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
`;
}

// ── Countdown: one bold number per second, each landing with a spring and a ring pulse on
//    the beat; the final number is amplified. The count adapts to the duration. ────────────
function countdownTsx(transparent: boolean): string {
  const background = rootBackground(transparent, 'radial-gradient(120% 120% at 50% 45%, #1b2230 0%, #0a0d12 72%)');
  return `// A broadcast countdown: one big number per second, each landing with a spring and a
// ring pulse; the final number gets an amplified landing. Adapts to the composition duration.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition(${ASSETS_PROP}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, height } = useVideoConfig();

  const totalSeconds = Math.max(1, Math.floor(durationInFrames / fps));
  const second = Math.min(totalSeconds - 1, Math.floor(frame / fps));
  const display = totalSeconds - second; // counts down to 1
  const local = frame - second * fps;    // frame within the current second
  const isFinal = display === 1;

  const pop = spring({ frame: local, fps, config: { damping: isFinal ? 11 : 15, stiffness: 190 } });
  const ring = interpolate(local, [0, fps], [0.55, isFinal ? 2.0 : 1.5], { extrapolateRight: 'clamp' });
  const ringFade = interpolate(local, [0, fps * 0.75], [0.55, 0], { extrapolateRight: 'clamp' });
  const ringSize = Math.round(height * 0.5);
  const scale = (isFinal ? 0.85 : 0.7) + pop * (isFinal ? 0.45 : 0.3);

  return (
    <AbsoluteFill style={{ background: '${background}', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'absolute',
          width: ringSize,
          height: ringSize,
          borderRadius: '50%',
          border: '4px solid #f6a623',
          transform: \`scale(\${ring})\`,
          opacity: ringFade,
        }}
      />
      <div
        style={{
          transform: \`scale(\${scale})\`,
          opacity: pop,
          color: '#f5f7fa',
          fontFamily: '"Arial Black", "Arial Bold", Arial, sans-serif',
          fontSize: Math.round(height * 0.5),
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 12px 40px rgba(0,0,0,0.45)',
        }}
      >
        {display}
      </div>
    </AbsoluteFill>
  );
}
`;
}

// ── Default title: an accent bar sweeps in, the title rises behind it, a kicker fades up,
//    everything exits cleanly. The general-purpose fallback. ──────────────────────────────
function titleTsx(transparent: boolean): string {
  const background = rootBackground(transparent, 'linear-gradient(155deg, #10151d 0%, #1a2432 60%, #10151d 100%)');
  return `// A clean title reveal: an accent bar sweeps, the title rises behind it, a kicker fades
// up, and everything exits sharply. All timing derives from the frame - fully deterministic.

import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition(${ASSETS_PROP}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const logo = Object.values(assets)[0];

  const bar = spring({ frame, fps, config: { damping: 20, stiffness: 170 } });
  const title = spring({ frame: frame - Math.round(fps * 0.22), fps, config: { damping: 16, stiffness: 140 } });
  const kicker = spring({ frame: frame - Math.round(fps * 0.45), fps, config: { damping: 20, stiffness: 160 } });

  const exitStart = durationInFrames - Math.round(fps * 0.5);
  const exit = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: '${background}', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: \`translateX(\${exit * -width * 0.18}px)\`, opacity: 1 - exit }}>
        <div
          style={{
            width: Math.round(width * 0.34) * bar,
            height: 6,
            background: '#f6a623',
            marginBottom: Math.round(height * 0.035),
            borderRadius: 3,
          }}
        />
        <div style={{ overflow: 'hidden', padding: '0.02em 0' }}>
          <div
            style={{
              transform: \`translateY(\${(1 - title) * 100}%)\`,
              color: '#f4f6fa',
              fontFamily: '"Arial Black", "Arial Bold", Arial, sans-serif',
              fontSize: Math.round(height * 0.13),
              fontWeight: 900,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              lineHeight: 1.02,
            }}
          >
            Main Title
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: Math.round(height * 0.028),
            opacity: kicker,
          }}
        >
          {logo && <Img src={logo} style={{ height: Math.round(height * 0.05), objectFit: 'contain' }} />}
          <span
            style={{
              color: 'rgba(255,255,255,0.66)',
              fontFamily: '"Helvetica Neue", Arial, sans-serif',
              fontSize: Math.round(height * 0.03),
              fontWeight: 600,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
            }}
          >
            Subtitle Here
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}
`;
}

function pickSample(prompt: string, transparent: boolean): { tsx: string; summary: string } {
  const p = prompt.toLowerCase();
  if (/countdown|count\s*down|\bcount\b|timer/.test(p)) {
    return {
      tsx: countdownTsx(transparent),
      summary: 'A broadcast countdown - one bold number per second with a spring landing and a ring pulse, the final number amplified.',
    };
  }
  if (/sting|bumper|sport|match|team|derby|versus|\bvs\b|game\b|league/.test(p)) {
    return {
      tsx: stingerTsx(transparent),
      summary: 'A sports stinger - angled slabs slash across the frame, a condensed title snaps in with a light sweep, then a fast clear-out.',
    };
  }
  if (/news|breaking|headline|bulletin|election|politic/.test(p)) {
    return {
      tsx: newsTsx(transparent),
      summary: 'A modern news intro - horizontal rules extend, a headline slides in from behind a mask, and an amber keyline lands last.',
    };
  }
  if (/logo|reveal|ident|\bmark\b|brand|wordmark/.test(p)) {
    return {
      tsx: logoTsx(transparent),
      summary: 'A premium logo reveal - the mark (or a designed wordmark) settles in with an overshoot, a light sweep crosses it, and it breathes before a clean close.',
    };
  }
  return {
    tsx: titleTsx(transparent),
    summary: 'A clean title reveal - an accent bar sweeps in, the title rises behind it, a kicker fades up, and everything exits sharply.',
  };
}

async function finish(
  tsx: string,
  summary: string,
  validate?: VideoValidator,
): Promise<VideoGenerateResult> {
  const validation = validate ? await validate(tsx) : null;
  return { summary, tsx, motionPlan: null, skills: [], validation };
}

class StubVideoProvider implements VideoAIProvider {
  generateVideo(
    prompt: string,
    ctx: VideoGenerateContext,
    validate?: VideoValidator,
  ): Promise<VideoGenerateResult> {
    const { tsx, summary } = pickSample(prompt, ctx.settings.transparent);
    return finish(tsx, `${summary} (offline sample - add an AI key for real generation)`, validate);
  }

  refineVideo(
    request: string,
    current: { tsx: string },
    _ctx: VideoGenerateContext,
    validate?: VideoValidator,
  ): Promise<VideoGenerateResult> {
    // A couple of honest deterministic tweaks; anything else keeps the module unchanged.
    const r = request.toLowerCase();
    let tsx = current.tsx;
    let summary = 'No offline rule matches that request - add an AI key in settings for real edits.';
    if (/faster|quicker|snappier/.test(r)) {
      tsx = tsx.replace(/stiffness: (\d+)/g, (_, n) => `stiffness: ${Math.round(Number(n) * 1.5)}`);
      summary = 'Made the motion snappier (stiffer springs). Offline sample edit.';
    } else if (/slower|calmer|gentler/.test(r)) {
      tsx = tsx.replace(/stiffness: (\d+)/g, (_, n) => `stiffness: ${Math.max(40, Math.round(Number(n) * 0.6))}`);
      summary = 'Calmed the motion down (softer springs). Offline sample edit.';
    }
    return finish(tsx, summary, validate);
  }
}

export const stubVideoProvider: VideoAIProvider = new StubVideoProvider();
