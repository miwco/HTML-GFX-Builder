// The duration/HOLD model — the ONE place the output timeline is computed.
//
// PURE MODULE (no DOM, no Vite-isms): imported by the editor UI (for the IN/HOLD/OUT
// breakdown and preflight errors) and by the Remotion composition in render-worker/
// (for the authoritative cue schedule after its own in-page measurement). Both sides
// run the same math, so they can only disagree if the measurements disagree — and they
// measure the same document with the same GSAP at the same resolution.
//
// The rule: the user picks the TOTAL duration. Every animation keeps its real measured
// duration; the remaining time becomes HOLD, split EQUALLY across the hold slots (after
// IN and after each played middle step — never after OUT, which ends the render exactly
// at the total). Continuous phases (repeat: -1 marquees) cost 0 fixed time — the hold
// absorbs the loop. Equal split is deliberate: steps carry no importance metadata, an
// evenly pacing operator is the natural default, and it is trivially explainable.

import type {
  MeasuredDurations,
  RenderCue,
  RenderSchedule,
  RenderSegment,
  RenderTiming,
} from './manifest.js';

export interface ScheduleIssue {
  level: 'error' | 'warning';
  code: 'too-short' | 'short-hold' | 'no-builders' | 'no-steps';
  message: string;
}

export interface ScheduleResult {
  /** null when an error makes the render impossible. */
  schedule: RenderSchedule | null;
  issues: ScheduleIssue[];
}

// Ceil to 0.1 s so "needs X s" is never displayed lower than the real requirement
// (14 039 ms must read 14.1 s, not "14 s" next to a 14 s total).
const fmtSec = (ms: number) => (Math.ceil(ms / 100) / 10).toFixed(1).replace(/\.0$/, '') + ' s';

/** Snap a cue time onto the frame grid (half-up) so cues land exactly on rendered frames. */
function snapToFrame(ms: number, fps: number): number {
  const frameMs = 1000 / fps;
  return Math.round(ms / frameMs) * frameMs;
}

/**
 * Compute the cue schedule + display segments for one render.
 *
 * @param measured   durations from __noacgRender.prepare() (or the client estimate pass)
 * @param timing     the user's timing choices (total duration, steps, out mode)
 * @param fps        output frame rate (cues snap to this grid)
 * @param dataJson   the JSON payload for the t=0 update() cue
 */
export function computeSchedule(
  measured: MeasuredDurations,
  timing: RenderTiming,
  fps: number,
  dataJson: string,
): ScheduleResult {
  const issues: ScheduleIssue[] = [];
  const total = timing.totalDurationMs;

  // Imported/blank templates without the builder contract: we can play() but cannot
  // measure (or schedule) an exit — only a play-and-hold render is possible.
  if (!measured.hasBuilders) {
    if (timing.outMode === 'auto') {
      issues.push({
        level: 'error',
        code: 'no-builders',
        message:
          'This template has no timeline contract (imported or hand-written), so the exit cannot be scheduled. Render without an out animation instead.',
      });
      return { schedule: null, issues };
    }
    return {
      schedule: {
        cues: [
          { atMs: 0, action: 'update', payload: dataJson },
          { atMs: 0, action: 'play' },
        ],
        segments: [{ kind: 'hold', label: 'On air', startMs: 0, durationMs: total, continuous: true }],
        durationMs: total,
      },
      issues,
    };
  }

  const inMs = measured.continuous.in ? 0 : measured.inMs;
  const outMs = timing.outMode === 'none' || measured.continuous.out ? 0 : measured.outMs;

  const availableSteps = measured.stepMs.length;
  const stepsToPlay = Math.max(0, Math.min(timing.stepsToPlay ?? availableSteps, availableSteps));
  if (timing.stepsToPlay !== undefined && timing.stepsToPlay > availableSteps) {
    issues.push({
      level: 'warning',
      code: 'no-steps',
      message: `Only ${availableSteps} step(s) exist — playing ${stepsToPlay}.`,
    });
  }
  const stepMs = measured.stepMs.slice(0, stepsToPlay);

  const fixed = inMs + stepMs.reduce((a, b) => a + b, 0) + outMs;
  if (total < fixed - 1) {
    issues.push({
      level: 'error',
      code: 'too-short',
      message: `This graphic's animations need ${fmtSec(fixed)} (in ${fmtSec(measured.inMs)}${
        stepMs.length ? `, steps ${fmtSec(stepMs.reduce((a, b) => a + b, 0))}` : ''
      }${outMs ? `, out ${fmtSec(measured.outMs)}` : ''}) — the total duration is only ${fmtSec(total)}.`,
    });
    return { schedule: null, issues };
  }

  // Hold slots: after IN + after each played middle step.
  const slots = 1 + stepMs.length;
  const holdMs = Math.max(0, (total - fixed) / slots);
  if (holdMs > 0 && holdMs < timing.minHoldMs) {
    issues.push({
      level: 'warning',
      code: 'short-hold',
      message: `Each hold is only ${fmtSec(holdMs)} — the graphic barely settles before it moves on.`,
    });
  }

  const cues: RenderCue[] = [
    { atMs: 0, action: 'update', payload: dataJson },
    { atMs: 0, action: 'play' },
  ];
  const segments: RenderSegment[] = [];

  let cursor = 0;
  segments.push({
    kind: 'in',
    label: 'In',
    startMs: 0,
    durationMs: measured.continuous.in ? holdMs + inMs : inMs,
    continuous: measured.continuous.in || undefined,
  });
  cursor += inMs;

  const pushHold = (label: string) => {
    if (holdMs <= 0) return;
    segments.push({ kind: 'hold', label, startMs: cursor, durationMs: holdMs });
    cursor += holdMs;
  };
  // A continuous IN's segment already spans its hold visually; the cursor math is shared.
  if (!measured.continuous.in) pushHold('Hold');
  else cursor += holdMs;

  stepMs.forEach((ms, i) => {
    cues.push({ atMs: snapToFrame(cursor, fps), action: 'next' });
    segments.push({ kind: 'step', label: `Step ${i + 1}`, startMs: cursor, durationMs: ms });
    cursor += ms;
    pushHold('Hold');
  });

  if (timing.outMode === 'auto') {
    const stopAt = snapToFrame(total - (measured.continuous.out ? 0 : measured.outMs), fps);
    cues.push({ atMs: Math.max(0, stopAt), action: 'stop' });
    segments.push({
      kind: 'out',
      label: 'Out',
      startMs: total - measured.outMs,
      durationMs: measured.outMs,
      continuous: measured.continuous.out || undefined,
    });
  } else {
    // The final hold runs to the end — extend the last hold segment (or add one).
    const last = segments[segments.length - 1];
    if (last && last.kind === 'hold') last.durationMs = total - last.startMs;
    else if (total - cursor > 0) segments.push({ kind: 'hold', label: 'Hold', startMs: cursor, durationMs: total - cursor });
  }

  return { schedule: { cues, segments, durationMs: total }, issues };
}

/** The default png-still capture moment: the settled on-air look — IN end + half the
 *  first hold (falls back to the IN end when there is no hold). */
export function defaultStillTimeMs(measured: MeasuredDurations, timing: RenderTiming): number {
  if (!measured.hasBuilders) return Math.min(1000, timing.totalDurationMs / 2);
  const inMs = measured.continuous.in ? 0 : measured.inMs;
  const outMs = timing.outMode === 'none' || measured.continuous.out ? 0 : measured.outMs;
  const stepsTotal = measured.stepMs.reduce((a, b) => a + b, 0);
  const slots = 1 + measured.stepMs.length;
  const holdMs = Math.max(0, (timing.totalDurationMs - inMs - stepsTotal - outMs) / slots);
  return Math.min(timing.totalDurationMs, inMs + holdMs / 2);
}
