# src/landing - the public landing page's motion system

Loaded alongside the root CLAUDE.md when working in this directory. Keep it accurate. The
landing is the static `index.html` at `/` (no React); it loads motion.ts as a module script.

**POLICY: the landing never fakes product UI** (editor, Monaco, timeline) - it shows on-air
output and real screenshots only, and roadmap features are tagged planned/coming, never shown as
shipped.

- **gsap.ts** - evaluates the vendored UMD via `?raw` (it can't be ESM-imported; its global
  branch throws in strict mode).
- **lang.ts** - the motion language: EASE/DUR tokens + `data-reveal`/`data-reveal-group`
  IntersectionObserver reveals.
- **hero.ts** - the hero entrance timeline.
- **demo.ts** - the hero showcase: a program monitor looping five example GRAPHICS (lower third,
  ticker, title card, scorebug, countdown) - deliberately NOT an editor mockup; paused offscreen.
- **pipeline.ts** - the text-first workflow section's rundown rail: scroll-scrubbed fill + phase
  nodes, no ScrollTrigger.

Everything gates on `prefers-reduced-motion`; the page stays fully readable with no JS (the
`js-motion` pre-hide class is added pre-paint by an inline script and removed again if the
module fails to boot).
