// Deterministic offline video provider - the AI-shaped fallback when no key/proxy is
// configured (same posture as ai/stubProvider.ts). Keyword-matches the brief onto a few
// hand-written sample compositions that follow the exact contract the real harness holds
// the model to (imports only react/remotion, everything frame-derived, assets via props),
// so the whole generate -> validate -> preview loop works with no key at all.

import type {
  VideoAIProvider,
  VideoGenerateContext,
  VideoGenerateResult,
  VideoValidator,
} from './provider';

/** The `assets` prop convention every sample follows (same as generated code). */
const ASSETS_PROP = '{ assets = {} }: { assets?: Record<string, string> }';

const TITLE_TSX = `// A clean title reveal: accent bar sweeps in, the title rises behind it, everything
// exits sharply before the end. All timing derives from the frame - fully deterministic.

import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition(${ASSETS_PROP}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const logo = Object.values(assets)[0];

  // Entrance: the bar sweeps, then the title springs up behind it.
  const bar = spring({ frame, fps, config: { damping: 18, stiffness: 160 } });
  const title = spring({ frame: frame - Math.round(fps * 0.25), fps, config: { damping: 16, stiffness: 120 } });

  // Exit: a decisive slide out over the last half second.
  const exitStart = durationInFrames - Math.round(fps * 0.5);
  const exit = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: \`translateX(\${exit * -width * 0.2}px)\`, opacity: 1 - exit }}>
        <div
          style={{
            width: 420 * bar,
            height: 6,
            background: '#f6a623',
            marginBottom: 24,
            borderRadius: 3,
          }}
        />
        <div
          style={{
            opacity: title,
            transform: \`translateY(\${(1 - title) * 60}px)\`,
            color: '#f4f4f5',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
          }}
        >
          Main Title
        </div>
        {logo && (
          <Img
            src={logo}
            style={{ marginTop: 28, height: 72, opacity: title, objectFit: 'contain' }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
}
`;

const COUNTDOWN_TSX = `// A broadcast countdown: one big number per second, each landing with a spring and a
// ring pulse. The count adapts to the composition duration automatically.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition(${ASSETS_PROP}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const totalSeconds = Math.max(1, Math.floor(durationInFrames / fps));
  const second = Math.min(totalSeconds - 1, Math.floor(frame / fps));
  const display = totalSeconds - second; // counts down to 1
  const local = frame - second * fps; // frame within the current second

  const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 180 } });
  const ring = interpolate(local, [0, fps], [0.6, 1.6], { extrapolateRight: 'clamp' });
  const ringFade = interpolate(local, [0, fps * 0.8], [0.5, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: '4px solid #f6a623',
          transform: \`scale(\${ring})\`,
          opacity: ringFade,
        }}
      />
      <div
        style={{
          transform: \`scale(\${0.7 + pop * 0.3})\`,
          opacity: pop,
          color: '#f4f4f5',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 260,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {display}
      </div>
    </AbsoluteFill>
  );
}
`;

const LOGO_TSX = `// A logo reveal: the mark scales in with a confident spring, a light sweep crosses it,
// then it settles and fades before the end. Uses the first uploaded asset as the logo.

import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export default function Composition(${ASSETS_PROP}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const logo = Object.values(assets)[0];

  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 110 } });
  const sweep = interpolate(frame, [fps * 0.4, fps * 1.1], [-60, 160], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(
    frame,
    [durationInFrames - Math.round(fps * 0.4), durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative',
          transform: \`scale(\${0.6 + enter * 0.4})\`,
          opacity: Math.min(enter, exit),
          overflow: 'hidden',
          padding: 24,
        }}
      >
        {logo ? (
          <Img src={logo} style={{ height: 280, objectFit: 'contain' }} />
        ) : (
          <div
            style={{
              color: '#f4f4f5',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: 120,
              fontWeight: 800,
            }}
          >
            LOGO
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)',
            transform: \`translateX(\${sweep}%)\`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
`;

function pickSample(prompt: string): { tsx: string; summary: string } {
  const p = prompt.toLowerCase();
  if (/countdown|count\s*down|\bcount\b/.test(p)) {
    return {
      tsx: COUNTDOWN_TSX,
      summary: 'A broadcast countdown - one bold number per second with a spring landing and a ring pulse.',
    };
  }
  if (/logo|reveal|sting|bumper|ident/.test(p)) {
    return {
      tsx: LOGO_TSX,
      summary: 'A logo reveal - the mark springs in, a light sweep crosses it, and it settles cleanly.',
    };
  }
  return {
    tsx: TITLE_TSX,
    summary: 'A clean title reveal - an accent bar sweeps in, the title rises, and everything exits sharply.',
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
    _ctx: VideoGenerateContext,
    validate?: VideoValidator,
  ): Promise<VideoGenerateResult> {
    const { tsx, summary } = pickSample(prompt);
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
