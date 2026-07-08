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
  /**
   * T2.5: this tween's OWN ease literal (e.g. "back.out(1.6)"), or null when it inherits
   * the phase knob (the `ease: easeIn/easeOut` variables or the timeline defaults).
   */
  ease: string | null;
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

/** T3 — one Continue press: which line reveals, how long, with which ease. */
export interface TimelineStep {
  target: string;
  /** Seconds, with the animSpeed knob applied. */
  duration: number;
  /** The step's own ease literal, or null when it inherits the easeIn knob. */
  ease: string | null;
}

export interface TimelineModel {
  animSpeed: number;
  easeIn: string;
  easeOut: string;
  phases: TimelinePhase[];
  /** T3 — the Continue chain between In and Out (empty when the template has no steps,
   *  or when its steps block predates the per-step knob arrays). */
  steps: TimelineStep[];
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
  // A quoted ease is a per-tween override; `ease: easeIn/easeOut` inherits the phase knob.
  const easeMatch = vars.match(/ease:\s*'([^']+)'/);

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
    ease: easeMatch ? easeMatch[1] : null,
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
      ease: parsed.ease,
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

  return { animSpeed, easeIn, easeOut, phases, steps: parseSteps(region, animSpeed) };
}

/** Parse the multi-step block's knob arrays (emitted by stepsBlock in animPresets). */
function parseSteps(region: string, animSpeed: number): TimelineStep[] {
  const lines = region.match(/var stepLines = \[([^\]]*)\]/)?.[1];
  const durations = region.match(/var stepDurations = \[([^\]]*)\]/)?.[1];
  const eases = region.match(/var stepEases = \[([^\]]*)\]/)?.[1];
  // Older emits have stepLines but no per-step arrays — no step segments for those until
  // the region is re-emitted (any Motion-panel apply upgrades it).
  if (!lines || !durations || !eases) return [];
  const targets = lines.split(',').map((s) => s.replace(/['\s]/g, '')).filter(Boolean);
  const durs = durations.split(',').map((s) => Number(s.trim()));
  const easeTokens = eases.split(',').map((s) => s.trim());
  return targets.map((target, i) => ({
    target,
    duration: (Number.isFinite(durs[i]) ? durs[i] : 0.45) / animSpeed,
    ease: easeTokens[i]?.startsWith("'") ? easeTokens[i].slice(1, -1) : null,
  }));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Locate the Nth tl call of a phase's build function inside the marked region. */
function locateCall(js: string, phaseId: 'in' | 'out', tweenIndex: number) {
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

  const re = new RegExp(CALL_RE.source, 'g');
  let m: RegExpExecArray | null;
  let i = -1;
  while ((m = re.exec(body))) {
    i += 1;
    if (i === tweenIndex) break;
  }
  if (!m || i !== tweenIndex) return null;

  return { js, regionIndex: regionMatch.index, region, bodyStart, body, callIndex: m.index, call: m[0], animSpeed };
}

/** Splice a modified call back: body → region → js. */
function spliceCall(loc: NonNullable<ReturnType<typeof locateCall>>, call: string): string {
  const newBody = loc.body.slice(0, loc.callIndex) + call + loc.body.slice(loc.callIndex + loc.call.length);
  const newRegion = loc.region.slice(0, loc.bodyStart) + newBody + loc.region.slice(loc.bodyStart + loc.body.length);
  return loc.js.slice(0, loc.regionIndex) + newRegion + loc.js.slice(loc.regionIndex + loc.region.length);
}

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
  const loc = locateCall(js, phaseId, tweenIndex);
  if (!loc) return null;
  let call = loc.call;

  if (timing.duration !== undefined) {
    const literal = round2(Math.max(0.05, timing.duration) * loc.animSpeed);
    const next = call.replace(/duration:\s*[\d.]+\s*\/\s*animSpeed/, `duration: ${literal} / animSpeed`);
    if (next === call) return null; // no duration literal — not an editable tween
    call = next;
  }

  if (timing.start !== undefined) {
    const literal = round2(Math.max(0, timing.start) * loc.animSpeed);
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

  return spliceCall(loc, call);
}

/**
 * T2.5: set (or clear) one tween's OWN ease inside the marked region. `ease` is a GSAP ease
 * string from the easing vocabulary (written as a quoted literal in the tween's vars, so the
 * code shows exactly what plays); null removes the override and the tween falls back to the
 * phase's easeIn/easeOut knob (the timeline defaults).
 */
export function patchTweenEase(
  js: string,
  phaseId: 'in' | 'out',
  tweenIndex: number,
  ease: string | null,
): string | null {
  const loc = locateCall(js, phaseId, tweenIndex);
  if (!loc) return null;
  let call = loc.call;

  if (ease === null) {
    // Remove a quoted per-tween override; `ease: easeIn/easeOut` refs ARE the default.
    const next = call.replace(/,\s*ease:\s*'[^']*'/, '').replace(/ease:\s*'[^']*'\s*,\s*/, '');
    if (next === call) return js; // nothing to remove — already inheriting
    return spliceCall(loc, next);
  }

  if (/ease:\s*'[^']*'/.test(call)) {
    // Replace an existing quoted override.
    return spliceCall(loc, call.replace(/ease:\s*'[^']*'/, `ease: '${ease}'`));
  }
  if (/ease:\s*(easeIn|easeOut)\b/.test(call)) {
    // Replace a knob reference with the explicit literal.
    return spliceCall(loc, call.replace(/ease:\s*(easeIn|easeOut)\b/, `ease: '${ease}'`));
  }
  // Insert into the LAST vars object (fromTo's "to" vars) before its closing brace.
  const lastBrace = call.lastIndexOf('}');
  if (lastBrace === -1) return null;
  const before = call.slice(0, lastBrace).replace(/\s*$/, '');
  const needsComma = !before.endsWith('{') && !before.endsWith(',');
  return spliceCall(loc, `${before}${needsComma ? ',' : ''} ease: '${ease}' ${call.slice(lastBrace)}`);
}

/** Replace one element of a step knob array (`var <name> = [ … ]`) in the region. */
function patchStepArray(js: string, name: string, index: number, value: string): string | null {
  const re = new RegExp(`(var ${name} = \\[)([^\\]]*)(\\])`);
  const m = js.match(re);
  if (!m) return null;
  const parts = m[2].split(',').map((s) => s.trim());
  if (index < 0 || index >= parts.length) return null;
  parts[index] = value;
  return js.replace(re, `$1${parts.join(', ')}$3`);
}

/** T3.2: set one Continue step's duration (actual seconds; written pre-division). */
export function patchStepTiming(js: string, stepIndex: number, duration: number): string | null {
  const region = js.match(REGION_RE)?.[0];
  const animSpeed = Number(region?.match(/var animSpeed = ([\d.]+)/)?.[1] ?? NaN);
  if (!animSpeed) return null;
  return patchStepArray(js, 'stepDurations', stepIndex, String(round2(Math.max(0.05, duration) * animSpeed)));
}

/** T3.2: set (or clear → inherit the easeIn knob) one Continue step's ease. */
export function patchStepEase(js: string, stepIndex: number, ease: string | null): string | null {
  return patchStepArray(js, 'stepEases', stepIndex, ease === null ? 'easeIn' : `'${ease}'`);
}
