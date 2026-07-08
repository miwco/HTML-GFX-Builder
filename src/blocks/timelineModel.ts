// Era 6 · T1 — the read-only timeline model (docs/TIMELINE_PLAN.md). Parses the marked
// ANIMATION region into tracks. This is parsing BY CONSTRUCTION, not heuristics: the region
// is emitted by our presets (animPresets + the category preset modules), so the shapes are
// known — sequential tl.set / tl.to / tl.fromTo calls with `X / animSpeed` durations and
// optional '-=N' overlap positions. A hand-edited region that no longer parses returns null
// and the UI says so — the code always outranks the view.

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
  const positionMatch = args.match(/,\s*'-=([\d.]+)'\s*$/);

  return {
    targets,
    kind,
    props,
    duration: kind === 'set' ? 0 : durationMatch ? Number(durationMatch[1]) / animSpeed : 0,
    stagger: staggerMatch ? Number(staggerMatch[1]) / animSpeed : 0,
    overlap: positionMatch ? Number(positionMatch[1]) : 0,
  };
}

/** Parse one build function's body into positioned tweens (GSAP position semantics). */
function parsePhase(id: TimelinePhase['id'], body: string, animSpeed: number): TimelinePhase {
  const tweens: TimelineTween[] = [];
  let phaseEnd = 0;
  const re = /tl\.(set|to|fromTo)\(([\s\S]*?)\);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const parsed = parseCall(m[1] as TimelineTween['kind'], m[2], animSpeed);
    // A '-=N' position starts the tween N seconds before the current end of the timeline.
    const span = parsed.duration + parsed.stagger * Math.max(0, parsed.targets.length - 1);
    const start = Math.max(0, phaseEnd - parsed.overlap);
    const end = start + span;
    phaseEnd = Math.max(phaseEnd, end);
    tweens.push({ ...parsed, start, end });
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
  const region = js.match(/\/\* == ANIMATION[\s\S]*?== END ANIMATION == \*\//)?.[0];
  if (!region) return null;

  const animSpeed = Number(region.match(/var animSpeed = ([\d.]+)/)?.[1] ?? NaN);
  const easeIn = region.match(/var easeIn = '([^']+)'/)?.[1];
  const easeOut = region.match(/var easeOut = '([^']+)'/)?.[1];
  if (!animSpeed || !easeIn || !easeOut) return null;

  const phases: TimelinePhase[] = [];
  for (const [id, name] of [['in', 'buildInTimeline'], ['out', 'buildOutTimeline']] as const) {
    const body = region.match(new RegExp(`function ${name}\\(\\) \\{([\\s\\S]*?)\\n\\}`))?.[1];
    if (!body) return null;
    const phase = parsePhase(id, body, animSpeed);
    if (phase.tweens.length === 0) return null; // not a shape we recognize
    phases.push(phase);
  }

  return { animSpeed, easeIn, easeOut, phases };
}
