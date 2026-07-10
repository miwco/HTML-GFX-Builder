// The NoaCG landing motion language — one vocabulary for the whole page so every reveal
// reads as part of the same broadcast package. It follows the house doctrine
// (docs/DESIGN_LANGUAGE.md §4 + the noacg family row): expo/power3 reveals and masked
// lines; entrances on Out-direction curves; exits In-direction and ~35% faster; Linear
// only for continuous travel (playheads, tickers); back.out reserved for tiny accents.
import { gsap } from './gsap';

export const EASE = {
  reveal: 'power3.out', // standard content entrance
  major: 'expo.out', // large UI surfaces (hero demo, story mockup)
  exit: 'power2.in', // anything leaving starts soft and gets out fast
  pop: 'back.out(1.6)', // tiny accents only (a tick, a pressed chip) — never layout
} as const;

export const DUR = {
  fast: 0.2, // micro feedback
  reveal: 0.6, // standard content reveal
  major: 1.0, // large UI surfaces
  exit: 0.4, // exits run ~35% faster than entrances
} as const;

/** Standard reveal travel in px — small on purpose; broadcast moves are tight. */
export const RISE = 24;
export const RISE_MAJOR = 30;

const qsa = (sel: string, scope: ParentNode = document): HTMLElement[] =>
  Array.from(scope.querySelectorAll<HTMLElement>(sel));

/**
 * Scroll reveals, one IntersectionObserver for the whole page.
 *
 * - `data-reveal` — standard reveal: fade + 24px rise, 0.6s power3.out.
 * - `data-reveal="major"` — large surface: fade + 30px rise + 0.98→1 scale, 1s expo.out.
 * - `data-reveal-group` — the element's children stagger in with the standard reveal.
 *
 * Initial hidden states are set here (not in CSS), so a no-JS or reduced-motion visit
 * never sees hidden content. `startDelay` lets the hero own the very first beat.
 */
export function initReveals(startDelay = 0.4): void {
  if (!('IntersectionObserver' in window)) return;

  const singles = qsa('[data-reveal]');
  const groups = qsa('[data-reveal-group]');

  for (const el of singles) {
    const major = el.dataset.reveal === 'major';
    gsap.set(el, { opacity: 0, y: major ? RISE_MAJOR : RISE, scale: major ? 0.98 : 1 });
  }
  for (const group of groups) {
    gsap.set(Array.from(group.children), { opacity: 0, y: RISE });
  }

  const play = (el: HTMLElement): void => {
    if (el.dataset.revealGroup !== undefined) {
      gsap.to(Array.from(el.children), {
        opacity: 1,
        y: 0,
        duration: DUR.reveal,
        ease: EASE.reveal,
        stagger: 0.08,
      });
    } else if (el.dataset.reveal === 'major') {
      gsap.to(el, { opacity: 1, y: 0, scale: 1, duration: DUR.major, ease: EASE.major });
    } else {
      gsap.to(el, { opacity: 1, y: 0, duration: DUR.reveal, ease: EASE.reveal });
    }
  };

  const pending = new Set<HTMLElement>([...singles, ...groups]);

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        pending.delete(el);
        play(el);
      }
    },
    // Fire a touch before the element is truly in frame so the reveal feels ready,
    // not late — but far enough in that the motion is actually seen.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  // An instant jump (anchor link, find-in-page) can leap right over an element without
  // it ever intersecting — it would sit hidden above the viewport forever. Sweep for
  // anything already passed and show it without ceremony.
  const sweep = (): void => {
    if (pending.size === 0) return;
    for (const el of [...pending]) {
      if (el.getBoundingClientRect().bottom >= 0) continue;
      pending.delete(el);
      io.unobserve(el);
      const targets = el.dataset.revealGroup !== undefined ? Array.from(el.children) : el;
      gsap.set(targets, { opacity: 1, y: 0, scale: 1 });
    }
  };
  let sweepQueued = false;
  window.addEventListener(
    'scroll',
    () => {
      if (sweepQueued || pending.size === 0) return;
      sweepQueued = true;
      requestAnimationFrame(() => {
        sweepQueued = false;
        sweep();
      });
    },
    { passive: true },
  );

  window.setTimeout(() => {
    sweep(); // the page may have loaded pre-scrolled (refresh restores position)
    for (const el of pending) io.observe(el);
  }, startDelay * 1000);
}
