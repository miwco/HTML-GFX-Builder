// Era 6 · T1/T2 — the timeline model (docs/TIMELINE_PLAN.md). Parses the marked ANIMATION
// region into tracks, and patches per-tween timing back into it. This is parsing BY
// CONSTRUCTION, not heuristics: the region is emitted by our presets (animPresets + the
// category preset modules), so the shapes are known — sequential tl.set / tl.to / tl.fromTo
// calls with `X / animSpeed` durations and optional position args ('-=N' overlaps, or the
// absolute `X / animSpeed` positions T2 writes). A hand-edited region that no longer parses
// returns null and the UI says so — the code always outranks the view.

export interface TimelineTween {
  /** Target list as written, cleaned for display (e.g. ".lower-third-box" or "#f0, #f1"). */
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
  /** T5: the drawer-editable values in a fromTo's FROM object (the "enters from" state —
   *  transforms as numbers, blur as a px amount; absent for set()/to() calls). */
  fromVars?: Partial<Record<DrawerProp, number>>;
  /** T6: the drawer-editable values in the LAST object (the "leaves to" state for an exit
   *  to()/fromTo — drives the out drawer; absent for set() ticks). */
  toVars?: Partial<Record<DrawerProp, number>>;
  /** Timeline v2 importer: EVERY animated value in the FROM/TO objects (numbers and
   *  quoted strings, bookkeeping stripped) — the legacy→data converter reads these. */
  fromAll?: Record<string, number | string>;
  toAll?: Record<string, number | string>;
}

/** T5 — the basic transform properties the per-layer drawer edits. Deliberately small:
 *  where an element enters FROM, settling to its designed position/state. */
export const TRANSFORM_PROPS = ['x', 'y', 'scale', 'opacity', 'rotation'] as const;
export type TransformProp = (typeof TRANSFORM_PROPS)[number];
/** The settled state — a from-value equal to its identity is a no-op and gets removed. */
export const TRANSFORM_IDENTITY: Record<TransformProp, number> = { x: 0, y: 0, scale: 1, opacity: 1, rotation: 0 };

/** T6.2 — the full drawer vocabulary: the transforms plus `blur`. Blur is a filter effect,
 *  not a transform, so it is edited as a px amount but serializes to `filter: 'blur(Npx)'`
 *  (identity 0 = no blur). Everything else in the drawer is a plain numeric transform. */
export const DRAWER_PROPS = ['x', 'y', 'scale', 'opacity', 'rotation', 'blur'] as const;
export type DrawerProp = (typeof DRAWER_PROPS)[number];
export const DRAWER_IDENTITY: Record<DrawerProp, number> = { x: 0, y: 0, scale: 1, opacity: 1, rotation: 0, blur: 0 };

/** Timeline v2 importer: one `tl.call(fnName)` lifecycle hook found in a phase, resolved to
 *  its start time on the phase's clock (docs/TIMELINE_V2_PLAN.md §3b). Zero-duration — it
 *  never advances the phase, exactly as GSAP treats a call. */
export interface TimelineCall {
  /** The named global function invoked (a bare identifier — `startClock`). */
  name: string;
  /** Start on the phase's clock, in seconds (position math shared with tweens). */
  start: number;
}

export interface TimelinePhase {
  id: 'in' | 'out';
  label: string;
  /** Total phase length in seconds (the last tween's end). */
  duration: number;
  tweens: TimelineTween[];
  /** Timeline v2: the phase's `tl.call(fnName)` lifecycle hooks (clock start/stop), in
   *  document order with their resolved positions. Empty for motion-only phases. */
  calls: TimelineCall[];
  /** True when the phase contains an endless loop (repeat: -1) — tickers, holds. */
  infinite: boolean;
}

/** T3 — one Continue press: which line GROUP reveals, how long, with which ease. */
export interface TimelineStep {
  targets: string[];
  /** Seconds per line, with the animSpeed knob applied (multi-line groups stagger). */
  duration: number;
  /** Per-line stagger in seconds (0 in the legacy one-line shape). */
  stagger: number;
  /** The step's own ease literal, or null when it inherits the easeIn knob. */
  ease: string | null;
  /** T3.3: whether the group arrays exist in the region (regrouping is patchable). */
  groupable: boolean;
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

// ── The cue-segmented overview (Era 6 T4.2) ─────────────────────────────────
// One strip, the whole playout in order: In · each » press · the hold · Out. Every
// segment keeps its own REAL local clock (holds and presses wait for operator cues, so a
// single global time axis would fabricate times that don't exist on air). Rows are the
// template's parts; a multi-target tween expands onto each member's row at its true
// stagger offset. Pure derivation from the parsed model — the view stays declarative.

export interface OverviewSection {
  id: string; // 'in' | 'step-N' | 'hold' | 'out'
  kind: 'in' | 'step' | 'hold' | 'out';
  stepIndex?: number;
  /** Local-clock length in seconds (0 for the hold — it waits, it has no clock). */
  duration: number;
  infinite: boolean;
}

export interface OverviewBar {
  sectionId: string;
  /** The part/selector row this bar sits on. */
  rowKey: string;
  /** Tween index within its phase (the patchers' handle), or the step index for reveals. */
  tweenIndex: number;
  kind: 'set' | 'to' | 'fromTo' | 'reveal';
  /** Start/span on the section's local clock, member stagger applied. */
  start: number;
  span: number;
  editable: boolean;
  ease: string | null;
  props: string[];
  /** This bar's index within its tween's target list (0 = first). Splitting a joint tween
   *  by target needs it; reveal testids count it (r0, r1 …). */
  member: number;
  /** True on the tween's first target row — owns the ease chip. */
  firstMember: boolean;
}

export interface OverviewModel {
  sections: OverviewSection[];
  /** Row keys in display order: real bars first (registry order decided by the caller),
   *  set()-only targets dropped. */
  rowKeys: string[];
  bars: OverviewBar[];
}

/**
 * Flatten the parsed timeline into the overview matrix. `partOrder` (the registry's
 * selector order) sorts known rows first; unknown tween targets follow in first-seen
 * order. Rows whose only bars are set() ticks are dropped (bookkeeping, not choreography);
 * `alwaysRows` (e.g. assignable parts) survive even without bars.
 */
export function buildOverview(model: TimelineModel, partOrder: string[], alwaysRows: string[] = []): OverviewModel {
  const sections: OverviewSection[] = [
    { id: 'in', kind: 'in', duration: model.phases[0]?.duration ?? 0, infinite: model.phases[0]?.infinite ?? false },
    ...model.steps.map((s, k) => ({
      id: `step-${k + 2}`,
      kind: 'step' as const,
      stepIndex: k,
      duration: s.duration + s.stagger * Math.max(0, s.targets.length - 1),
      infinite: false,
    })),
    { id: 'hold', kind: 'hold', duration: 0, infinite: true },
    {
      id: 'out',
      kind: 'out',
      duration: model.phases[model.phases.length - 1]?.duration ?? 0,
      infinite: model.phases[model.phases.length - 1]?.infinite ?? false,
    },
  ];

  const bars: OverviewBar[] = [];
  for (const phase of model.phases) {
    phase.tweens.forEach((tw, tweenIndex) => {
      tw.targets.forEach((t, m) => {
        bars.push({
          sectionId: phase.id,
          rowKey: t,
          tweenIndex,
          kind: tw.kind,
          start: tw.start + m * tw.stagger,
          span: tw.kind === 'set' ? 0 : tw.duration,
          editable: tw.editable,
          ease: tw.ease,
          props: tw.props,
          member: m,
          firstMember: m === 0,
        });
      });
    });
  }
  model.steps.forEach((s, k) => {
    s.targets.forEach((t, m) => {
      bars.push({
        sectionId: `step-${k + 2}`,
        rowKey: t,
        tweenIndex: k,
        kind: 'reveal',
        start: m * s.stagger,
        span: s.duration,
        editable: true,
        ease: s.ease,
        props: [],
        member: m,
        firstMember: m === 0,
      });
    });
  });

  // Row order: registry parts first, then unknown targets as encountered.
  const withRealBars = new Set(bars.filter((b) => b.kind !== 'set').map((b) => b.rowKey));
  const keep = new Set([...withRealBars, ...alwaysRows]);
  const seen = new Set<string>();
  const rowKeys: string[] = [];
  for (const key of [...partOrder, ...bars.map((b) => b.rowKey), ...alwaysRows]) {
    if (keep.has(key) && !seen.has(key)) {
      seen.add(key);
      rowKeys.push(key);
    }
  }
  return { sections, rowKeys, bars: bars.filter((b) => keep.has(b.rowKey)) };
}

const BOOKKEEPING_PROPS = new Set(['duration', 'stagger', 'ease', 'transformOrigin', 'clearProps', 'repeat', 'delay', 'onComplete']);

const REGION_RE = /\/\* == ANIMATION[\s\S]*?== END ANIMATION == \*\//;
// Tween calls only — the tween-INDEX contract the patchers rely on (locateCall/splitTween
// count these). `tl.call` is NOT here: a lifecycle hook must never shift a tween's index.
const CALL_RE = /tl\.(set|to|fromTo)\(([\s\S]*?)\);/g;
// The full call surface parsePhase walks in document order — tweens PLUS `tl.call` hooks —
// so a call's position math sees the timeline end at the point it appears.
const PHASE_CALL_RE = /tl\.(set|to|fromTo|call)\(([\s\S]*?)\);/g;

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

  // T5/T6.2: the FROM object's drawer-editable values (fromTo only — a to() has none).
  let fromVars: Partial<Record<DrawerProp, number>> | undefined;
  const fromObj = objects[0];
  if (kind === 'fromTo' && objects.length >= 2 && fromObj) {
    fromVars = {};
    for (const prop of TRANSFORM_PROPS) {
      const m = fromObj.match(new RegExp(`(?:^|[,{\\s])${prop}:\\s*(-?[\\d.]+)`));
      if (m) fromVars[prop] = Number(m[1]);
    }
    const fb = fromObj.match(/filter:\s*'blur\((-?[\d.]+)px\)'/);
    if (fb) fromVars.blur = Number(fb[1]);
  }

  // T6/T6.2: the TO object's drawer-editable values — the "leaves to" state the out drawer
  // edits (present for any animating tween; identity for props it doesn't move).
  let toVars: Partial<Record<DrawerProp, number>> | undefined;
  if (kind !== 'set') {
    toVars = {};
    for (const prop of TRANSFORM_PROPS) {
      const m = vars.match(new RegExp(`(?:^|[,{\\s])${prop}:\\s*(-?[\\d.]+)`));
      if (m) toVars[prop] = Number(m[1]);
    }
    const tb = vars.match(/filter:\s*'blur\((-?[\d.]+)px\)'/);
    if (tb) toVars.blur = Number(tb[1]);
  }

  // Timeline v2 importer: capture every `key: number` / `key: 'string'` pair of an
  // object literal (bookkeeping stripped) — the full from/to values, not just the
  // drawer subset above.
  const allPairs = (obj: string | undefined): Record<string, number | string> => {
    const out: Record<string, number | string> = {};
    if (!obj) return out;
    for (const m of obj.matchAll(/(\w+)\s*:\s*(?:'([^']*)'|(-?[\d.]+))/g)) {
      if (BOOKKEEPING_PROPS.has(m[1])) continue;
      out[m[1]] = m[2] !== undefined ? m[2] : Number(m[3]);
    }
    return out;
  };
  const fromAll = kind === 'fromTo' && objects.length >= 2 ? allPairs(objects[0]) : undefined;
  const toAll = kind !== 'set' ? allPairs(vars) : allPairs(objects[objects.length - 1]);

  const durationMatch = vars.match(/duration:\s*([\d.]+)\s*\/\s*animSpeed/);
  const staggerMatch = vars.match(/stagger:\s*([\d.]+)\s*\/\s*animSpeed/);
  // A quoted ease is a per-tween override; `ease: easeIn/easeOut` inherits the phase knob.
  const easeMatch = vars.match(/ease:\s*'([^']+)'/);

  // The position argument sits after the LAST object literal: '-=N' (overlap) or an
  // absolute `N / animSpeed` / bare number (what T2 writes). Inline comments between the
  // object and the position arg are stripped first — mask-wipe's exit writes
  // `{...},  // …and wipe closed\n  '-=0.1');` and the overlap must still be seen.
  const tail = args.slice(args.lastIndexOf('}') + 1).replace(/\/\/[^\n]*/g, '');
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
    fromVars,
    toVars,
    fromAll,
    toAll,
  };
}

/**
 * Parse a `tl.call(...)` hook's argument text into { name, start }. Handles the two shapes
 * the presets emit: `tl.call(fnName)` (appended at the current timeline end) and
 * `tl.call(fnName, null, position)` (an explicit `'-=N'` overlap or `N / animSpeed`
 * absolute). Returns null for anything else — an inline function, a computed callback — so
 * an unrecognized call is dropped rather than guessed (the honest fallback). `phaseEnd` is
 * the timeline end at the point the call appears, for the default append position.
 */
function parseCallHook(args: string, animSpeed: number, phaseEnd: number): TimelineCall | null {
  // Callbacks carry no eases or nested-comma objects, so a plain split is safe here.
  const parts = args.split(',').map((s) => s.trim());
  const nameMatch = parts[0]?.match(/^'?([A-Za-z_$][\w$]*)'?$/);
  if (!nameMatch) return null; // an inline/anonymous callback — not a named hook we can carry
  const name = nameMatch[1];

  // GSAP signature: call(callback, params, position). Default = append at the current end.
  let start = phaseEnd;
  const posTok = parts[2];
  if (posTok) {
    const overlap = posTok.match(/^'-=([\d.]+)'$/);
    if (overlap) {
      start = Math.max(0, phaseEnd - Number(overlap[1]));
    } else {
      const abs = posTok.match(/^([\d.]+)\s*(\/\s*animSpeed)?$/);
      if (abs) start = Number(abs[1]) / (abs[2] ? animSpeed : 1);
    }
  }
  return { name, start };
}

/** Parse one build function's body into positioned tweens (GSAP position semantics), plus
 *  any `tl.call` lifecycle hooks in the same document-ordered pass so their positions see
 *  the timeline end at the point each appears. */
function parsePhase(id: TimelinePhase['id'], body: string, animSpeed: number): TimelinePhase {
  const tweens: TimelineTween[] = [];
  const calls: TimelineCall[] = [];
  let phaseEnd = 0;
  const re = new RegExp(PHASE_CALL_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (m[1] === 'call') {
      // A zero-duration hook: record it, never advance the phase (its index among tweens is
      // untouched — the patchers still count only set/to/fromTo).
      const hook = parseCallHook(m[2], animSpeed, phaseEnd);
      if (hook) calls.push(hook);
      continue;
    }
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
      fromVars: parsed.fromVars,
      toVars: parsed.toVars,
      fromAll: parsed.fromAll,
      toAll: parsed.toAll,
    });
  }
  return {
    id,
    label: id === 'in' ? 'In' : 'Out',
    duration: phaseEnd,
    tweens,
    calls,
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

/** Parse the multi-step block's knob arrays (emitted by stepsBlock in animPresets).
 *  Reads the T3.3 `stepGroups` shape; falls back to the earlier one-line `stepLines` shape
 *  (regrouping unavailable there until any Motion-panel apply re-emits the region). */
function parseSteps(region: string, animSpeed: number): TimelineStep[] {
  const durations = region.match(/var stepDurations = \[([^\]]*)\]/)?.[1];
  const eases = region.match(/var stepEases = \[([^\]]*)\]/)?.[1];
  if (!durations || !eases) return [];
  const durs = durations.split(',').map((s) => Number(s.trim()));
  const easeTokens = eases.split(',').map((s) => s.trim());
  // The group reveal's per-part stagger (one value for the whole steps block). The current
  // emit positions each part at `i * N / animSpeed`; older emits used a stagger: var.
  const stagger = Number(
    region.match(/function revealNextStep[\s\S]*?i \* ([\d.]+) \/ animSpeed/)?.[1] ??
      region.match(/function revealNextStep[\s\S]*?stagger:\s*([\d.]+)\s*\/\s*animSpeed/)?.[1] ??
      0,
  );
  const step = (targets: string[], i: number, groupable: boolean): TimelineStep => ({
    targets,
    duration: (Number.isFinite(durs[i]) ? durs[i] : 0.45) / animSpeed,
    stagger: groupable ? stagger / animSpeed : 0,
    ease: easeTokens[i]?.startsWith("'") ? easeTokens[i].slice(1, -1) : null,
    groupable,
  });

  const groupsText = region.match(/var stepGroups = \[([\s\S]*?)\];/)?.[1];
  if (groupsText) {
    const groups = [...groupsText.matchAll(/\[([^\]]*)\]/g)].map((m) =>
      m[1].split(',').map((s) => s.replace(/['\s]/g, '')).filter(Boolean),
    );
    return groups.map((targets, i) => step(targets, i, true));
  }
  const lines = region.match(/var stepLines = \[([^\]]*)\]/)?.[1];
  if (!lines) return [];
  const targets = lines.split(',').map((s) => s.replace(/['\s]/g, '')).filter(Boolean);
  return targets.map((t, i) => step([t], i, false));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Set, replace, or remove one numeric prop inside a GSAP vars object literal (shared by the
 *  enters-from and leaves-to drawer patchers). A null value removes the prop and tidies the
 *  adjacent comma/braces so the emitted literal stays clean. */
function setObjProp(obj: string, prop: string, value: number | null): string {
  if (value === null) {
    return obj
      .replace(new RegExp(`\\b${prop}:\\s*-?[\\d.]+\\s*,\\s*`), '')
      .replace(new RegExp(`,\\s*\\b${prop}:\\s*-?[\\d.]+`), '')
      .replace(new RegExp(`\\b${prop}:\\s*-?[\\d.]+`), '')
      .replace(/\{\s*,/, '{ ')
      .replace(/,\s*\}/, ' }');
  }
  if (new RegExp(`\\b${prop}:\\s*-?[\\d.]+`).test(obj)) {
    return obj.replace(new RegExp(`\\b${prop}:\\s*-?[\\d.]+`), `${prop}: ${value}`);
  }
  return obj.replace(/\s/g, '') === '{}'
    ? `{ ${prop}: ${value} }`
    : obj.replace(/\{\s*/, `{ ${prop}: ${value}, `);
}

/** Set, replace, or remove the blur filter inside a GSAP vars object literal. Blur lives as
 *  `filter: 'blur(Npx)'` (a quoted string, not a bare number), so it needs its own writer;
 *  a null px removes it and tidies the braces. */
function setObjBlur(obj: string, px: number | null): string {
  const has = /filter:\s*'blur\([^']*\)'/.test(obj);
  if (px === null) {
    if (!has) return obj;
    return obj
      .replace(/filter:\s*'blur\([^']*\)'\s*,\s*/, '')
      .replace(/,\s*filter:\s*'blur\([^']*\)'/, '')
      .replace(/filter:\s*'blur\([^']*\)'/, '')
      .replace(/\{\s*,/, '{ ')
      .replace(/,\s*\}/, ' }');
  }
  if (has) return obj.replace(/filter:\s*'blur\([^']*\)'/, `filter: 'blur(${px}px)'`);
  return obj.replace(/\s/g, '') === '{}'
    ? `{ filter: 'blur(${px}px)' }`
    : obj.replace(/\{\s*/, `{ filter: 'blur(${px}px)', `);
}

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
  const call = loc.call;

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

/**
 * T3.3: move a line from one Continue step to another — the regroup behind dragging a
 * line's bar onto a different » segment. `toStep === stepGroups.length` appends a NEW step
 * (default timing); a step left EMPTY is removed, its timing knobs spliced with it. All
 * three arrays are rewritten as one consistent patch. Returns null when the region doesn't
 * carry the group shape (older emits) or the move is a no-op.
 */
export function patchStepRegroup(js: string, target: string, fromStep: number, toStep: number): string | null {
  const region = js.match(REGION_RE)?.[0];
  const animSpeed = Number(region?.match(/var animSpeed = ([\d.]+)/)?.[1] ?? NaN);
  if (!region || !animSpeed) return null;
  const groupsText = region.match(/var stepGroups = \[([\s\S]*?)\];/)?.[1];
  const durations = region.match(/var stepDurations = \[([^\]]*)\]/)?.[1];
  const eases = region.match(/var stepEases = \[([^\]]*)\]/)?.[1];
  if (!groupsText || !durations || !eases) return null;

  const groups = [...groupsText.matchAll(/\[([^\]]*)\]/g)].map((m) =>
    m[1].split(',').map((s) => s.replace(/['\s]/g, '')).filter(Boolean),
  );
  const durs = durations.split(',').map((s) => s.trim());
  const easeTokens = eases.split(',').map((s) => s.trim());

  if (fromStep === toStep || fromStep < 0 || fromStep >= groups.length) return null;
  if (toStep < 0 || toStep > groups.length) return null;
  if (!groups[fromStep].includes(target)) return null;

  groups[fromStep] = groups[fromStep].filter((t) => t !== target);
  if (toStep === groups.length) {
    groups.push([target]); // a brand-new step at the end of the chain
    durs.push('0.45');
    easeTokens.push('easeIn');
  } else {
    groups[toStep].push(target);
  }
  // An emptied step disappears — a Continue press must never do nothing.
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].length === 0) {
      groups.splice(i, 1);
      durs.splice(i, 1);
      easeTokens.splice(i, 1);
    }
  }
  if (groups.length === 0) return null; // would remove the last step — not a regroup's job

  const groupsLiteral = groups.map((g) => `[${g.map((t) => `'${t}'`).join(', ')}]`).join(', ');
  let out = js.replace(/var stepGroups = \[[\s\S]*?\];/, `var stepGroups = [${groupsLiteral}];`);
  out = out.replace(/var stepDurations = \[[^\]]*\];/, `var stepDurations = [${durs.join(', ')}];`);
  out = out.replace(/var stepEases = \[[^\]]*\];/, `var stepEases = [${easeTokens.join(', ')}];`);
  return out;
}

/**
 * T5.1: split a multi-target tween into one call PER TARGET, so each layer edits
 * independently. Every member keeps its exact current timing: absolute positions replace
 * the shared stagger (member m starts at tweenStart + m·stagger), and the emitted calls
 * stay the plain readable shape everything else parses. The phase's total length is
 * unchanged, so following '-=' overlaps keep their meaning. Returns null when the tween
 * isn't a splittable shape (single target, set(), or unparsable).
 */
export function splitTween(js: string, phaseId: 'in' | 'out', tweenIndex: number): string | null {
  const loc = locateCall(js, phaseId, tweenIndex);
  if (!loc) return null;
  const phase = parsePhase(phaseId, loc.body, loc.animSpeed);
  const tween = phase.tweens[tweenIndex];
  if (!tween || tween.kind === 'set' || !tween.editable || tween.targets.length < 2) return null;

  // The call's own indentation — member calls line up under the original.
  const lineStart = loc.body.lastIndexOf('\n', loc.callIndex) + 1;
  const indent = loc.body.slice(lineStart, loc.callIndex).match(/^\s*$/)
    ? loc.body.slice(lineStart, loc.callIndex)
    : '  ';

  const memberCalls = tween.targets.map((target, m) => {
    let call = loc.call;
    // The target array becomes this member's single selector.
    call = call.replace(/\(\s*\[[^\]]*\]/, `('${target}'`);
    // The shared stagger goes — each member gets its own absolute start instead.
    call = call.replace(/,?\s*stagger:\s*[\d.]+\s*\/\s*animSpeed/, '').replace(/,\s*}/g, ' }');
    // Absolute position (replace any existing position arg, or append one).
    const literal = round2((tween.start + m * tween.stagger) * loc.animSpeed);
    const position = `${literal} / animSpeed`;
    const tailAt = call.lastIndexOf('}') + 1;
    const head = call.slice(0, tailAt);
    let tail = call.slice(tailAt);
    if (/,\s*('-=[\d.]+'|[\d.]+(\s*\/\s*animSpeed)?)/.test(tail)) {
      tail = tail.replace(/,\s*('-=[\d.]+'|[\d.]+(\s*\/\s*animSpeed)?)/, `, ${position}`);
    } else {
      tail = tail.replace(/\);$/, `,\n${indent}  ${position}\n${indent});`);
    }
    return head + tail;
  });

  return spliceCall(loc, memberCalls.join(`\n${indent}`));
}

/**
 * T5.2: set one tween's "enters from" transform values — the per-layer drawer's patch.
 * Each prop is written into the FROM object with its identity counterpart ensured in the
 * TO object (the element settles at its designed state); a value equal to its identity
 * removes the pair again, keeping the emitted code minimal. A `to()` call gains an empty
 * FROM object first (becoming a fromTo) so there is always somewhere to enter from.
 */
export function patchTweenVars(
  js: string,
  phaseId: 'in' | 'out',
  tweenIndex: number,
  changes: Partial<Record<DrawerProp, number>>,
): string | null {
  const loc = locateCall(js, phaseId, tweenIndex);
  if (!loc) return null;
  let call = loc.call;

  if (/^tl\.set\(/.test(call)) return null;
  if (/^tl\.to\(/.test(call)) {
    // Convert to fromTo with an empty FROM: unlisted props keep tweening from the current
    // state, exactly like the to() did.
    const afterTarget = call.indexOf(',');
    if (afterTarget === -1) return null;
    call = `tl.fromTo(${call.slice('tl.to('.length, afterTarget)}, { },${call.slice(afterTarget + 1)}`;
  }

  // The FROM object is the first {...}; the TO object is the last.
  const objects = [...call.matchAll(/\{[^{}]*\}/g)];
  if (objects.length < 2) return null;

  let fromObj = objects[0][0];
  let toObj = objects[objects.length - 1][0];
  for (const [prop, raw] of Object.entries(changes)) {
    const value = round2(raw as number);
    const identity = DRAWER_IDENTITY[prop as DrawerProp];
    if (prop === 'blur') {
      // Enters from a blur, settling to blur(0px). Removing the from-blur also drops the
      // managed settle counterpart, so a zeroed blur leaves the code clean.
      if (value === 0) {
        fromObj = setObjBlur(fromObj, null);
        if (/filter:\s*'blur\(0px\)'/.test(toObj)) toObj = setObjBlur(toObj, null);
      } else {
        fromObj = setObjBlur(fromObj, value);
        if (!/filter:/.test(toObj)) toObj = setObjBlur(toObj, 0);
      }
      continue;
    }
    if (value === identity) {
      fromObj = setObjProp(fromObj, prop, null);
      // Only strip the TO counterpart when it IS the identity we manage (never a preset's
      // own differing to-value).
      if (new RegExp(`\\b${prop}:\\s*${identity}(?![\\d.])`).test(toObj)) toObj = setObjProp(toObj, prop, null);
    } else {
      fromObj = setObjProp(fromObj, prop, value);
      if (!new RegExp(`\\b${prop}:`).test(toObj)) toObj = setObjProp(toObj, prop, identity);
    }
  }

  // Splice the objects back (from first, then re-find the to — its offset moved with the
  // from object's new length).
  const fromStart = objects[0].index!;
  call = call.slice(0, fromStart) + fromObj + call.slice(fromStart + objects[0][0].length);
  const toMatches = [...call.matchAll(/\{[^{}]*\}/g)];
  const last = toMatches[toMatches.length - 1];
  call = call.slice(0, last.index!) + toObj + call.slice(last.index! + last[0].length);

  return spliceCall(loc, call);
}

/**
 * T5.3: give a part its own entrance tween when it has none (e.g. a logo slot that just
 * appears with the graphic) — the drawer's insert path. Appended at the end of
 * buildInTimeline's choreography, entering at position 0, plain and commented.
 */
export function insertPartTween(
  js: string,
  selector: string,
  changes: Partial<Record<DrawerProp, number>>,
): string | null {
  const regionMatch = js.match(REGION_RE);
  if (!regionMatch || regionMatch.index === undefined) return null;
  const region = regionMatch[0];
  const bodyMatch = region.match(fnBodyRe('buildInTimeline'));
  if (!bodyMatch || bodyMatch.index === undefined) return null;
  const body = bodyMatch[1];
  const returnAt = body.lastIndexOf('return tl;');
  if (returnAt === -1) return null;

  const fromPairs: string[] = [];
  const toPairs: string[] = [];
  for (const [prop, raw] of Object.entries(changes)) {
    const value = round2(raw as number);
    if (value === DRAWER_IDENTITY[prop as DrawerProp]) continue;
    if (prop === 'blur') {
      fromPairs.push(`filter: 'blur(${value}px)'`);
      toPairs.push(`filter: 'blur(0px)'`); // materialises sharp
    } else {
      fromPairs.push(`${prop}: ${value}`);
      toPairs.push(`${prop}: ${TRANSFORM_IDENTITY[prop as TransformProp]}`);
    }
  }
  if (fromPairs.length === 0) return null; // all identity — nothing to animate

  const insert = `tl.fromTo('${selector}',
    { ${fromPairs.join(', ')} },
    { ${toPairs.join(', ')}, duration: 0.5 / animSpeed },
    0  // enters with the graphic (layer-drawer added)
  );
  `;
  const newBody = body.slice(0, returnAt) + insert + body.slice(returnAt);
  const bodyStart = bodyMatch.index + bodyMatch[0].indexOf(body);
  const newRegion = region.slice(0, bodyStart) + newBody + region.slice(bodyStart + body.length);
  return js.slice(0, regionMatch.index) + newRegion + js.slice(regionMatch.index + region.length);
}

/**
 * T6: set one out tween's "leaves to" transform values — the per-layer drawer, exit side.
 * Edits the LAST object literal (the exit's to-vars). A transform prop equal to its identity
 * is removed (a no-op leave direction), but opacity is never stripped — it is the fade that
 * makes the exit actually leave. Returns null when the tween is a set() or unlocatable.
 */
export function patchTweenToVars(
  js: string,
  phaseId: 'in' | 'out',
  tweenIndex: number,
  changes: Partial<Record<DrawerProp, number>>,
): string | null {
  const loc = locateCall(js, phaseId, tweenIndex);
  if (!loc) return null;
  const call = loc.call;
  if (/^tl\.set\(/.test(call)) return null;

  const objects = [...call.matchAll(/\{[^{}]*\}/g)];
  if (objects.length === 0) return null;
  const last = objects[objects.length - 1];
  let toObj = last[0];
  for (const [prop, raw] of Object.entries(changes)) {
    const value = round2(raw as number);
    if (prop === 'blur') {
      toObj = setObjBlur(toObj, value === 0 ? null : value); // leaves toward a blur (0 = none)
      continue;
    }
    const identity = TRANSFORM_IDENTITY[prop as TransformProp];
    toObj = setObjProp(toObj, prop, value === identity && prop !== 'opacity' ? null : value);
  }

  const patched = call.slice(0, last.index!) + toObj + call.slice(last.index! + last[0].length);
  return spliceCall(loc, patched);
}

/**
 * T6: give a part its own EXIT tween when it has none — the out drawer's insert path. The
 * part leaves toward the given transform offset and fades (opacity 0 unless the caller set
 * it), entering at position 0 of buildOutTimeline so it runs with the rest of the exit. The
 * root's own hide (the trailing set) still fires after, so nothing lingers.
 */
export function insertPartOutTween(
  js: string,
  selector: string,
  changes: Partial<Record<DrawerProp, number>>,
): string | null {
  const regionMatch = js.match(REGION_RE);
  if (!regionMatch || regionMatch.index === undefined) return null;
  const region = regionMatch[0];
  const bodyMatch = region.match(fnBodyRe('buildOutTimeline'));
  if (!bodyMatch || bodyMatch.index === undefined) return null;
  const body = bodyMatch[1];
  const returnAt = body.lastIndexOf('return tl;');
  if (returnAt === -1) return null;

  // Setting a transform to its identity on a layer that has no exit tween is a no-op —
  // there is nothing to leave toward, so don't manufacture a bare fade.
  const meaningful = Object.entries(changes).some(
    ([prop, raw]) => prop === 'opacity' || round2(raw as number) !== DRAWER_IDENTITY[prop as DrawerProp],
  );
  if (!meaningful) return null;

  const pairs: string[] = [];
  for (const [prop, raw] of Object.entries(changes)) {
    const value = round2(raw as number);
    if (value === DRAWER_IDENTITY[prop as DrawerProp] && prop !== 'opacity') continue;
    pairs.push(prop === 'blur' ? `filter: 'blur(${value}px)'` : `${prop}: ${value}`);
  }
  if (!pairs.some((p) => p.startsWith('opacity'))) pairs.push('opacity: 0'); // it must actually leave

  const insert = `tl.to('${selector}', { ${pairs.join(', ')}, duration: 0.35 / animSpeed }, 0);  // leaves with the exit (layer-drawer added)
  `;
  const newBody = body.slice(0, returnAt) + insert + body.slice(returnAt);
  const bodyStart = bodyMatch.index + bodyMatch[0].indexOf(body);
  const newRegion = region.slice(0, bodyStart) + newBody + region.slice(bodyStart + body.length);
  return js.slice(0, regionMatch.index) + newRegion + js.slice(regionMatch.index + region.length);
}
