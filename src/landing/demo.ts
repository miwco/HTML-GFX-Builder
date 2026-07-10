// The hero demo — a miniature of the real editor playing an actual lower third on a
// loop: cue IN, hold on air (the operator updates the name mid-hold, exactly what
// update(data) does), cue OUT, breathe, repeat. Entrances use Out-curves, the exit runs
// In-direction and faster, the playhead travels linear — the product's own doctrine.
import { gsap, type Timeline } from './gsap';
import { EASE } from './lang';

/** Rotating operator payloads, so the loop never plays the same card twice in a row. */
const PERSONAS: ReadonlyArray<readonly [string, string]> = [
  ['Maya Lindqvist', 'Political Correspondent'],
  ['Jon Okafor', 'Live · Election Night HQ'],
  ['Sara Vainio', 'Sports Desk'],
];

const T_IN = 0.9; // entrance beat
const T_HOLD = 4.4; // on-air hold (name swap happens inside it)
const T_OUT = 0.55; // exit — ~35% faster than the entrance
const T_SWAP = T_IN + 1.7; // when the operator pushes new data

export interface DemoHandle {
  start(): void;
}

export function initDemo(): DemoHandle | null {
  const root = document.querySelector<HTMLElement>('.demo');
  if (!root) return null;
  const q = (sel: string): HTMLElement | null => root.querySelector<HTMLElement>(sel);

  const l3 = q('.demo-l3');
  const bar = q('.demo-l3-bar');
  const name = q('.demo-l3-name');
  const role = q('.demo-l3-role');
  const playhead = q('.demo-playhead');
  const track = q('.demo-track');
  const pill = q('.demo-pill');
  const clock = q('.demo-clock');
  const cues = Array.from(root.querySelectorAll<HTMLElement>('.demo-cue'));
  if (!l3 || !bar || !name || !role || !playhead || !track || !pill || !clock) return null;

  let persona = 0; // index of the card currently in the graphic
  const setText = (i: number): void => {
    name.textContent = PERSONAS[i][0];
    role.textContent = PERSONAS[i][1];
  };

  const setCue = (id: 'in' | 'hold' | 'out' | null): void => {
    for (const cue of cues) cue.classList.toggle('on', cue.dataset.cue === id);
  };
  const setOnAir = (on: boolean): void => {
    pill.classList.toggle('on', on);
    pill.textContent = on ? 'ON AIR' : 'READY';
  };
  /** Pulse a line in the code pane — the code reacting to what the preview does. */
  const flashLine = (id: string): void => {
    const line = q(`[data-ln="${id}"]`);
    if (!line) return;
    gsap.fromTo(
      line,
      { backgroundColor: 'rgba(246, 166, 35, 0.16)' },
      { backgroundColor: 'rgba(246, 166, 35, 0)', duration: 0.9, ease: 'power2.out' },
    );
  };

  setText(persona);

  const tl: Timeline = gsap.timeline({
    paused: true,
    repeat: -1,
    repeatDelay: 1.6,
    onRepeat: () => {
      // The mid-hold swap showed persona+1; open the next cycle on persona+2.
      persona = (persona + 2) % PERSONAS.length;
      setText(persona);
    },
  });

  tl
    // ── Cue IN ──
    .call(() => {
      setCue('in');
      setOnAir(true);
      flashLine('play');
    }, undefined, 0)
    // Playhead travels the whole play linearly (function-based so it survives resizes).
    .fromTo(
      playhead,
      { x: 0 },
      { x: () => track.clientWidth - 2, duration: T_IN + T_HOLD + T_OUT, ease: 'none' },
      0,
    )
    .fromTo(l3, { x: -36, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, ease: EASE.reveal }, 0)
    .fromTo(bar, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.45, ease: EASE.major }, 0.08)
    .fromTo(
      [name, role],
      { yPercent: 120 },
      { yPercent: 0, duration: 0.55, ease: EASE.reveal, stagger: 0.09 },
      0.18,
    )
    // ── On air ──
    .call(() => setCue('hold'), undefined, T_IN)
    // The operator pushes new data: current lines mask out, new lines mask in.
    .call(() => flashLine('update'), undefined, T_SWAP - 0.05)
    .to([name, role], { yPercent: -120, duration: 0.28, ease: EASE.exit, stagger: 0.05 }, T_SWAP)
    .call(() => setText((persona + 1) % PERSONAS.length), undefined, T_SWAP + 0.38)
    .fromTo(
      [name, role],
      { yPercent: 120 },
      { yPercent: 0, duration: 0.5, ease: EASE.reveal, stagger: 0.08 },
      T_SWAP + 0.42,
    )
    // ── Cue OUT ──
    .call(() => {
      setCue('out');
      flashLine('stop');
    }, undefined, T_IN + T_HOLD)
    .to(l3, { x: -28, autoAlpha: 0, duration: T_OUT, ease: EASE.exit }, T_IN + T_HOLD)
    .call(() => {
      setCue(null);
      setOnAir(false);
    }, undefined, T_IN + T_HOLD + T_OUT);

  // Keep the linear playhead honest when the panel resizes.
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => tl.invalidate()).observe(track);
  }

  // The stage clock ticks real time-of-day — but only while the demo is on screen.
  const tick = (): void => {
    clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  };
  let clockTimer: number | undefined;
  let started = false;
  let onScreen = true;

  const sync = (): void => {
    if (started && onScreen) {
      if (tl.paused()) tl.play();
      if (clockTimer === undefined) {
        tick();
        clockTimer = window.setInterval(tick, 1000);
      }
    } else {
      if (!tl.paused()) tl.pause();
      if (clockTimer !== undefined) {
        window.clearInterval(clockTimer);
        clockTimer = undefined;
      }
    }
  };

  // Scrolled away = fully idle: no tweens, no timers (rAF already stops in hidden tabs).
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
        sync();
      },
      { threshold: 0.1 },
    ).observe(root);
  }

  return {
    start(): void {
      started = true;
      sync();
    },
  };
}
