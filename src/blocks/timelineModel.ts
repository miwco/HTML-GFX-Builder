// Era 6 · T1/T2 — the timeline model (docs/TIMELINE_PLAN.md). Parses the marked ANIMATION
// region into tracks, and patches per-tween timing back into it. This is parsing BY
// CONSTRUCTION, not heuristics: the region is emitted by our presets (animPresets + the
// category preset modules), so the shapes are known — sequential tl.set / tl.to / tl.fromTo
// calls with `X / animSpeed` durations and optional position args ('-=N' overlaps, or the
// absolute `X / animSpeed` positions T2 writes). A hand-edited region that no longer parses
// returns null and the UI says so — the code always outranks the view.

export interface TimelineTween {
  /** Target list as written, cleaned for display (e.g. ".l3-box" or "#f0, #f1"). */
  targets: string[];
  kind: 'set' | 'to' | 'fromTo';
  /** Animated property names (duration/stagger/ease bookkeeping stripped). */
  props: string[];
  /** Seconds, with the animSpeed knob applied. set() tweens are 0. */
  duration: number;
  /** Per-target stagger in seconds (0 when absent). */
  stagger: number;
  /** Computed start/end on the phase's clock, in seconds. */
  start: number;
  end: number;
  /**
   * T2: whether the timeline can rewrite this tween's timing — a real tween whose duration
   * is the emitted `N / animSpeed` literal. set() ticks and measured/computed durations
   * (e.g. a marquee's width-derived speed) stay read-only.
   */
  editable: boolean;
}

export interface TimelinePhase {
  id: 'in' | 'out';
  label: string;
  /** Total phase length in seconds (the last tween's end). */
  duration: number;
  tweens: TimelineTween[];
  /** True when the phase contains an endless loop (repeat: -1) — tickers, holds. */
  infinite: boolean;
}

export interface TimelineModel {
  animSpeed: number;
  easeIn: string;
  easeOut: string;
  phases: TimelinePhase[];
}

const BOOKKEEPING_PROPS = new Set(['duration', 'stagger', 'ease', 'transformOrigin', 'clearProps', 'repeat', 'delay', 'onComplete']);

const REGION_RE = /\/\* == ANIMATION[\s\S]*?== END ANIMATION == \*\//;
const CALL_RE = /tl\.(set|to|fromTo)\(([\s\S]*?)\);/g;

function fnBodyRe(name: string): RegExp {
  return new RegExp(`function ${name}\\(\\) \\{([\\s\\S]*?)\\n\\}`);
}

/** Parse one tl.<kind>(...) call's argument text into a tween (position math done later). */
function parseCall(kind: TimelineTween['kind'], args: string, animSpeed: number) {
  // Targets: the first argument — a quoted selector or an array of quoted selectors.
  const arr = args.match(/^\s*\[([^\]]*)\]/);
  const single = args.match(/^\s*'([^']+)'/);
  const targets = arr
    ? arr[1].split(',').map((s) => s.replace(/['\s]/g, '')).filter(Boolean)
    : single
      ? [single[1]]
      : ['?'];

  // The animated props come from the LAST object literal (fromTo's "to" vars).
  const objects = args.match(/\{[^{}]*\}/g) ?? [];
  const vars = objects[objects.length - 1] ?? '';
  const props = [...vars.matchAll(/(\w+)\s*:/g)].map((m) => m[1]).filter((p) => !BOOKKEEPING_PROPS.has(p));

  const durationMatch = vars.match(/duration:\s*([\d.]+)\s*\/\s*animSpeed/);
  const staggerMatch = vars.match(/stagger:\s*([\d.]+)\s*\/\s*animSpeed/);

  // The position argument sits after the LAST object literal: '-=N' (overlap) or an
  // absolute `N / animSpeed` / bare number (what T2 writes).
  const tail = args.slice(args.lastIndexOf('}') + 1);
  const overlapMatch = tail.match(/,\s*'-=([\d.]+)'/);
  const absoluteMatch = tail.match(/,\s*([\d.]+)(\s*\/\s*animSpeed)?/);

  return {
    targets,
    kind,
    props,
    duration: kind === 'set' ? 0 : durationMatch ? Number(durationMatch[1]) / animSpeed : 0,
    stagger: staggerMatch ? Number(staggerMatch[1]) / animSpeed : 0,
    overlap: overlapMatch ? Number(overlapMatch[1]) : 0,
    absolute: !overlapMatch && absoluteMatch
      ? Number(absoluteMatch[1]) / (absoluteMatch[2] ? animSpeed : 1)
      : null,
    editable: kind !== 'set' && !!durationMatch,
  };
}

/** Parse one build function's body into positioned tweens (GSAP position semantics). */
function parsePhase(id: TimelinePhase['id'], body: string, animSpeed: number): TimelinePhase {
  const tweens: TimelineTween[] = [];
  let phaseEnd = 0;
  const re = new RegExp(CALL_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const parsed = parseCall(m[1] as TimelineTween['kind'], m[2], animSpeed);
    const span = parsed.duration + parsed.stagger * Math.max(0, parsed.targets.length - 1);
    // GSAP position semantics: default = append at the timeline's current end; '-=N' starts
    // N seconds before that end; an absolute number is a fixed start time.
    const start = parsed.absolute !== null ? parsed.absolute : Math.max(0, phaseEnd - parsed.overlap);
    const end = start + span;
    phaseEnd = Math.max(phaseEnd, end);
    tweens.push({
      targets: parsed.targets,
      kind: parsed.kind,
      props: parsed.props,
      duration: parsed.duration,
      stagger: parsed.stagger,
      start,
      end,
      editable: parsed.editable,
    });
  }
  return {
    id,
    label: id === 'in' ? 'In' : 'Out',
    duration: phaseEnd,
    tweens,
    infinite: /repeat:\s*-1/.test(body),
  };
}

/** Parse template.js into the timeline model, or null when the region isn't recognizable. */
export function parseTimeline(js: string): TimelineModel | null {
  const region = js.match(REGION_RE)?.[0];
  if (!region) return null;

  const animSpeed = Number(region.match(/var animSpeed = ([\d.]+)/)?.[1] ?? NaN);
  const easeIn = region.match(/var easeIn = '([^']+)'/)?.[1];
  const easeOut = region.match(/var easeOut = '([^']+)'/)?.[1];
  if (!animSpeed || !easeIn || !easeOut) return null;

  const phases: TimelinePhase[] = [];
  for (const [id, name] of [['in', 'buildInTimeline'], ['out', 'buildOutTimeline']] as const) {
    const body = region.match(fnBodyRe(name))?.[1];
    if (!body) return null;
    const phase = parsePhase(id, body, animSpeed);
    if (phase.tweens.length === 0) return null; // not a shape we recognize
    phases.push(phase);
  }

  return { animSpeed, easeIn, easeOut, phases };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * T2: rewrite one tween's timing inside the marked region — the parser in reverse. `start`
 * and `duration` are in ACTUAL seconds (the model's clock); literals are written pre-division
 * (`X / animSpeed`) so the speed knob keeps scaling everything. The tween gets an explicit
 * absolute position (replacing any '-=N' overlap), which is exactly how GSAP reads a numeric
 * position — the emitted call stays plain, readable code. Returns null when the tween can't
 * be located or isn't editable-shaped (the UI should not offer the drag in that case).
 */
export function patchTweenTiming(
  js: string,
  phaseId: 'in' | 'out',
  tweenIndex: number,
  timing: { start?: number; duration?: number },
): string | null {
  const regionMatch = js.match(REGION_RE);
  if (!regionMatch || regionMatch.index === undefined) return null;
  const region = regionMatch[0];
  const animSpeed = Number(region.match(/var animSpeed = ([\d.]+)/)?.[1] ?? NaN);
  if (!animSpeed) return null;

  const fnName = phaseId === 'in' ? 'buildInTimeline' : 'buildOutTimeline';
  const bodyMatch = region.match(fnBodyRe(fnName));
  if (!bodyMatch || bodyMatch.index === undefined) return null;
  const body = bodyMatch[1];
  const bodyStart = bodyMatch.index + bodyMatch[0].indexOf(body);

  // Locate the Nth tl call within the function body.
  const re = new RegExp(CALL_RE.source, 'g');
  let m: RegExpExecArray | null;
  let i = -1;
  while ((m = re.exec(body))) {
    i += 1;
    if (i === tweenIndex) break;
  }
  if (!m || i !== tweenIndex) return null;

  let call = m[0];

  if (timing.duration !== undefined) {
    const literal = round2(Math.max(0.05, timing.duration) * animSpeed);
    const next = call.replace(/duration:\s*[\d.]+\s*\/\s*animSpeed/, `duration: ${literal} / animSpeed`);
    if (next === call) return null; // no duration literal — not an editable tween
    call = next;
  }

  if (timing.start !== undefined) {
    const literal = round2(Math.max(0, timing.start) * animSpeed);
    const position = `${literal} / animSpeed`;
    // Replace an existing position arg (after the last object literal) or append one.
    const tailAt = call.lastIndexOf('}') + 1;
    const head = call.slice(0, tailAt);
    let tail = call.slice(tailAt); // e.g. ",\n    '-=0.3'  // comment\n  );" or "\n  );"
    if (/,\s*('-=[\d.]+'|[\d.]+(\s*\/\s*animSpeed)?)/.test(tail)) {
      tail = tail.replace(/,\s*('-=[\d.]+'|[\d.]+(\s*\/\s*animSpeed)?)/, `, ${position}`);
    } else {
      tail = tail.replace(/\);$/, `,\n    ${position}  // start time (timeline-tuned)\n  );`);
    }
    call = head + tail;
  }

  // Splice the modified call back: body → region → js.
  const newBody = body.slice(0, m.index) + call + body.slice(m.index + m[0].length);
  const newRegion = region.slice(0, bodyStart) + newBody + region.slice(bodyStart + body.length);
  return js.slice(0, regionMatch.index) + newRegion + js.slice(regionMatch.index + region.length);
}
