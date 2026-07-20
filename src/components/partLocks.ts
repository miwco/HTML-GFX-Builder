// Canvas locks — the ONE definition of what "locked" means and which parts start that way.
//
// A locked part takes no direct-manipulation gesture: no drag, no handle, no marquee. It stays
// selectable by click, from the timeline, and from the Inspector, and everything else about it
// keeps working — locking is about the POINTER, never about editability.
//
// The state itself lives in the store (`partLocks`), which holds only what a user explicitly
// toggled. Anything with no entry falls back to the default here, so the canvas overlay and the
// Inspector's toggle can never disagree about a part nobody has touched yet.

/**
 * Does this part start locked? Exactly one does: an imported design's ARTWORK.
 *
 * It is a full-bleed image sitting UNDER every field placed on it, so unlocked it swallows the
 * press meant for the text on top. Locked, that press reaches the text, and a press on BARE
 * artwork falls through to the root's zone drag — which moves the whole graphic, the thing
 * dragging a design's background should do. Nothing else has a surprising answer, so nothing
 * else has a default.
 */
export function defaultPartLock(selector: string, designPrefix: string | null): boolean {
  return !!designPrefix && selector === `.${designPrefix}-art`;
}

/** Whether a part is locked right now: an explicit toggle wins, else the default above. */
export function partLocked(
  selector: string,
  locks: Record<string, boolean>,
  designPrefix: string | null,
): boolean {
  return locks[selector] ?? defaultPartLock(selector, designPrefix);
}
