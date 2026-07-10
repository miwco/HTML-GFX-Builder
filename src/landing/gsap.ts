// The landing page animates with the exact GSAP build the product bundles into every
// exported template (src/assets/gsap.min.js) — one GSAP in the repo, no npm dependency,
// no CDN. The UMD can't be imported as ESM (its global branch assigns `window.window`,
// which throws under strict mode), so evaluate the raw source in a classic sloppy-mode
// function scope, just like the product inlines it into preview/export documents.
import gsapSource from '../assets/gsap.min.js?raw';

new Function(gsapSource)();

type Target = string | Element | Element[] | NodeListOf<Element> | HTMLElement[];
type Vars = Record<string, unknown>;
type Position = string | number;

/** The slice of the GSAP API the landing uses (the vendored build ships untyped). */
export interface Timeline {
  to(target: Target, vars: Vars, position?: Position): Timeline;
  fromTo(target: Target, fromVars: Vars, toVars: Vars, position?: Position): Timeline;
  set(target: Target, vars: Vars, position?: Position): Timeline;
  call(callback: () => void, params?: unknown[], position?: Position): Timeline;
  play(from?: Position): Timeline;
  pause(): Timeline;
  restart(includeDelay?: boolean): Timeline;
  invalidate(): Timeline;
  kill(): Timeline;
  clear(): Timeline;
  paused(): boolean;
  duration(): number;
}

export interface Gsap {
  timeline(vars?: Vars): Timeline;
  to(target: Target, vars: Vars): Timeline;
  fromTo(target: Target, fromVars: Vars, toVars: Vars): Timeline;
  set(target: Target, vars: Vars): Timeline;
  killTweensOf(target: Target): void;
  globalTimeline: Timeline;
}

export const gsap: Gsap = (window as unknown as { gsap: Gsap }).gsap;
