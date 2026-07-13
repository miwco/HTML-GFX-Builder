// The mounted player bridge, registered by VideoPlayerFrame so sibling surfaces (the AI
// chat's live validator) can reach it at call time. One video shell = at most one bridge;
// no reactivity needed - consumers look it up when they run.

import type { PlayerBridge } from './playerBridge';

let active: PlayerBridge | null = null;

export function setActiveBridge(bridge: PlayerBridge | null): void {
  active = bridge;
}

export function getActiveBridge(): PlayerBridge | null {
  return active;
}
