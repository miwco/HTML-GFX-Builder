// The scroll-controlled product story: a sticky mini-editor that morphs through the five
// moves — Design → Code → Timeline → Logic → Export — as the step copy scrolls past.
// CSS position:sticky does the pinning (robust, zero scroll-jacking); a rAF-throttled
// scroll listener just decides which step owns the frame and plays a short, fully
// deterministic transition. Cut-style state changes, not scrub-soup — like a vision mixer.
import { gsap, type Timeline } from './gsap';
import { EASE } from './lang';

/** Accents the "Design visually" beat cycles through — the user picking a brand color.
    Index-aligned with the .smock-dot swatches in the mockup's style layer. */
const ACCENTS = ['#f6a623', '#4ac47a'];

export function initStory(): void {
  const section = document.querySelector<HTMLElement>('.story');
  if (!section) return;
  const q = (sel: string): HTMLElement | null => section.querySelector<HTMLElement>(sel);

  const steps = Array.from(section.querySelectorAll<HTMLElement>('.story-step'));
  const tabs = Array.from(section.querySelectorAll<HTMLElement>('.smock-tab'));
  const layers = Array.from(section.querySelectorAll<HTMLElement>('.smock-p'));
  const mock = q('.smock');
  const strap = q('.smock-strap');
  const l3 = q('.smock-l3');
  const typed = q('.smock-typed');
  const caret = q('.smock-caret');
  const phFill = q('.smock-ph');
  const roleLine = q('.smock-l3-role');
  const continueBtn = q('.smock-btn-continue');
  const chips = Array.from(section.querySelectorAll<HTMLElement>('.smock-chip'));
  const tick = q('.smock-tick');
  if (!mock || !strap || !l3 || steps.length === 0 || layers.length === 0) return;

  let accent = 0;
  let active = -1;
  let stateTl: Timeline | null = null;

  // One short beat per step. Each runs on top of the normalized layer state and must be
  // safe to enter from either scroll direction.
  const beats: Array<(tl: Timeline) => void> = [
    // 01 — Design visually: pick a swatch, the graphic recolors through a CSS variable.
    (tl) => {
      accent = (accent + 1) % ACCENTS.length;
      const dots = Array.from(section.querySelectorAll<HTMLElement>('.smock-dot'));
      dots.forEach((dot, i) => dot.classList.toggle('on', i === accent));
      tl.to(mock, { '--sm-accent': ACCENTS[accent], duration: 0.5, ease: EASE.reveal }, 0.15);
    },
    // 02 — Edit the code: a line types itself, the on-air text follows it.
    (tl) => {
      if (!typed || !caret || !roleLine) return;
      const label = typed.dataset.text ?? '';
      tl.set(typed, { width: 0 }, 0)
        .set(caret, { opacity: 1 }, 0)
        .call(() => {
          typed.textContent = label;
        }, undefined, 0.15)
        .to(typed, { width: `${label.length}ch`, duration: 0.8, ease: `steps(${label.length})` }, 0.2)
        .fromTo(
          roleLine,
          { yPercent: 120 },
          { yPercent: 0, duration: 0.45, ease: EASE.reveal },
          1.05,
        )
        .to(caret, { opacity: 0, duration: 0.2 }, 1.3);
    },
    // 03 — Animate on the timeline: the playhead sweeps and the graphic replays its in.
    (tl) => {
      if (phFill) {
        tl.fromTo(
          phFill,
          { scaleX: 0, transformOrigin: '0 50%' },
          { scaleX: 1, duration: 1.1, ease: 'none' },
          0.15,
        );
      }
      tl.fromTo(l3, { x: -24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, ease: EASE.reveal }, 0.2);
    },
    // 04 — Add logic: the operator presses Continue and a second step reveals.
    (tl) => {
      if (continueBtn) {
        tl.fromTo(
          continueBtn,
          { scale: 0.92 },
          { scale: 1, duration: 0.35, ease: EASE.pop },
          0.25,
        );
      }
      tl.fromTo(
        strap,
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.5, ease: EASE.reveal },
        0.4,
      );
    },
    // 05 — Export anywhere: the target chips land, the validation tick pops.
    (tl) => {
      if (chips.length > 0) {
        tl.fromTo(
          chips,
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: EASE.reveal, stagger: 0.05 },
          0.15,
        );
      }
      if (tick) {
        tl.fromTo(tick, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: EASE.pop }, 0.5);
      }
    },
  ];

  const setState = (n: number): void => {
    if (n === active) return;
    active = n;
    steps.forEach((step, i) => step.classList.toggle('is-active', i === n));
    tabs.forEach((tab, i) => tab.classList.toggle('on', i === n));

    stateTl?.kill();
    const tl = gsap.timeline();
    stateTl = tl;

    // Normalize: exactly one panel layer visible; the strap exists from "Add logic" on.
    // A beat can be killed mid-run by a fast scroll, so every property a beat animates
    // is settled here too — except in the state whose beat owns it right now.
    layers.forEach((layer, i) => {
      tl.to(layer, { autoAlpha: i === n ? 1 : 0, y: i === n ? 0 : 8, duration: 0.35, ease: EASE.reveal }, 0);
    });
    if (n !== 3) {
      tl.to(strap, { autoAlpha: n > 3 ? 1 : 0, duration: 0.3 }, 0);
    }
    if (n !== 1 && roleLine) tl.to(roleLine, { yPercent: 0, duration: 0.3 }, 0);
    if (n !== 2) tl.to(l3, { x: 0, autoAlpha: 1, duration: 0.3 }, 0);
    if (n !== 3 && continueBtn) tl.to(continueBtn, { scale: 1, duration: 0.2 }, 0);

    beats[n]?.(tl);
  };

  // Which step owns the frame: the last one whose top has crossed the viewport's middle.
  let queued = false;
  const update = (): void => {
    queued = false;
    const line = window.innerHeight * 0.55;
    let n = 0;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].getBoundingClientRect().top <= line) n = i;
    }
    setState(n);
  };
  const onScroll = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}
