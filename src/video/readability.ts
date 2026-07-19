// How the two engines' validators READ the runtime readability findings their probes bring
// back (the checks themselves are shared too - src/video/textChecks.js, inlined into both
// isolated runtimes). Both engines pick the same frames and apply the same persistence
// rule, so a composition is judged identically whichever way it was authored.

import type { ProbeTextIssue } from './playerBridge';

/**
 * The frames the readability checks run on: two points inside the HOLD, where the hero must
 * be legible. Never frame 0 or the last frame - an entrance sliding out of a mask and an
 * exit wiping away are legitimately mid-clip, and flagging them would reject good work.
 */
export function holdFrames(durationInFrames: number): number[] {
  if (durationInFrames < 4) return [];
  const mid = Math.floor(durationInFrames / 2);
  const later = Math.min(durationInFrames - 2, mid + Math.max(1, Math.round(durationInFrames * 0.15)));
  return [...new Set([mid, later])];
}

/**
 * Keep only findings present at EVERY checked hold frame. A composition still animating
 * through the first sample (a reveal that lands late, type still settling) clears itself by
 * the second one; a genuinely cropped headline is cut at both. This is the main defence
 * against burning a repair round on a false positive.
 *
 * Occlusion rides the SAME rule rather than the bench's looser majority. The bench samples
 * three points in the hold and accepts two, because it is a reporting tool and a missed
 * observation costs nothing. This is a gate: a finding here spends a repair round, and a
 * transition that legitimately sweeps a panel across the hero would be flagged by a majority
 * of two. Requiring the hero to be covered at every checked frame keeps that case clean and
 * still catches the failure that was measured shipping - text parked behind a panel for the
 * whole hold, covered at every sample.
 */
export function persistentTextIssues(
  issues: ProbeTextIssue[],
  frames: number[],
): { rule: string; message: string }[] {
  if (frames.length === 0 || issues.length === 0) return [];
  const seen = new Map<string, { frames: Set<number>; kind: string; message: string; minLossPct: number }>();
  for (const i of issues) {
    const entry = seen.get(i.key) ?? {
      frames: new Set<number>(),
      kind: i.kind,
      message: i.message,
      minLossPct: Number.POSITIVE_INFINITY,
    };
    entry.frames.add(i.frame);
    // The LOWEST loss across the checked frames, for the same reason the finding has to
    // appear at every one of them: escalating on the worst frame would let a line that is
    // merely mid-entrance at one sample be judged as if it never arrived.
    entry.minLossPct = Math.min(entry.minLossPct, i.lossPct ?? Number.POSITIVE_INFINITY);
    seen.set(i.key, entry);
  }
  return [...seen.values()]
    .filter((e) => e.frames.size >= frames.length)
    .map((e) => ({ rule: ruleFor(e.kind, e.minLossPct), message: e.message }));
}

/**
 * The validator rule each runtime finding reports under.
 *
 * `text-clip` and `text-safe-area` are SOFT (the provider's SOFT_RULES): they drive repair
 * rounds, but once those rounds are spent they demote to warnings rather than throw away a
 * composition the user waited for - the right call when the finding might be a false positive
 * or a legible near-miss.
 *
 * `text-occluded` is soft for the same reason as `text-clip`: the hit test samples five points
 * and can be fooled by a decorative layer that is technically painted, so it drives repair
 * rounds but does not throw finished work away on its own.
 *
 * `text-clip-total` is NOT soft, and is deliberately absent from SOFT_RULES. At 100% loss the
 * visible extent of the line is zero: nothing of it is painted at any checked hold frame.
 * That is not a marginal crop and it cannot be a false positive, so demoting it ships a
 * composition whose text the viewer will never see - measured happening (docs/
 * HYPERFRAMES_QUALITY.md, the re-measurement's r1, which shipped both lines fully clipped
 * after two failed repair rounds). A partial crop keeps the old, forgiving behaviour.
 */
function ruleFor(kind: string, minLossPct: number): string {
  if (kind === 'safe-area') return 'text-safe-area';
  if (kind === 'occlusion') return 'text-occluded';
  return minLossPct >= TOTAL_CLIP_PCT ? 'text-clip-total' : 'text-clip';
}

/** Loss at which a clipped line has nothing left on screen (textChecks.js rounds the
 *  percentage, so this catches a visible extent of zero and nothing else). */
const TOTAL_CLIP_PCT = 100;
