// The pipeline section — text-first, no product-UI mockups. Content reveals through the
// shared data-reveal system (lang.ts); this module only drives the broadcast-rundown
// rail: an amber fill that tracks scroll progress through the section, phase nodes that
// light as the reader passes them, and a gentle dim on phases that aren't current.
import { gsap } from './gsap';

export function initPipeline(): void {
  const flow = document.querySelector<HTMLElement>('.pl-flow');
  if (!flow) return;
  const fill = flow.querySelector<HTMLElement>('.pl-rail-fill');
  const phases = Array.from(flow.querySelectorAll<HTMLElement>('.pl-phase'));
  if (!fill || phases.length === 0) return;

  gsap.set(fill, { scaleY: 0, transformOrigin: '50% 0' });

  let queued = false;
  const update = (): void => {
    queued = false;
    const line = window.innerHeight * 0.6;
    const rect = flow.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (line - rect.top) / rect.height));
    gsap.set(fill, { scaleY: progress });

    // The current phase is the last one whose top has crossed the line; every phase
    // already passed keeps its lit node so the rundown reads as progress, not focus.
    let current = 0;
    phases.forEach((phase, i) => {
      const passed = phase.getBoundingClientRect().top <= line;
      phase.classList.toggle('is-passed', passed);
      if (passed) current = i;
    });
    phases.forEach((phase, i) => phase.classList.toggle('is-active', i === current));
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
