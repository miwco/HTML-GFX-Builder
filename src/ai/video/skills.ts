// The motion/design skill library: focused prompt fragments loaded per request so the
// base prompt stays light. Keyword heuristics pick skills first (free, deterministic);
// only a request that matches nothing falls back to one cheap Haiku classification call.
// broadcast-motion-basics is ALWAYS included.

export interface VideoSkill {
  id: string;
  keywords: RegExp;
  prompt: string;
}

export const BASE_SKILL: VideoSkill = {
  id: 'broadcast-motion-basics',
  keywords: /$^/,
  prompt: `### Broadcast motion basics
- Structure every piece as ENTRANCE -> HERO HOLD -> EXIT. The hold carries subtle ambient
  motion (a slow drift, a gentle scale creep of 1-3%) so the frame never feels frozen.
- Entrances are decisive: primary elements land within the first 20-35% of the duration.
  Exits are FASTER than entrances and clear the frame completely by the final frame.
- Stagger related elements by 2-5 frames - never everything at once, never a slow parade.
- One dominant motion direction per piece; counter-movement is an accent, not a second theme.
- Respect safe margins: keep text inside the central ~90% of the frame.`,
};

export const SKILLS: VideoSkill[] = [
  {
    id: 'stingers',
    keywords: /sting|bumper|transition to|swish|wipe/i,
    prompt: `### Stingers
- A stinger is 1.5-4s and must FILL the frame at its midpoint (it hides an edit underneath).
- Build it as: fast directional sweep of large shapes -> logo/title snap at center ON TOP of
  the settled panels -> equally fast clear-out (text leaves first, panels after). The
  midpoint frame should be ~100% covered.
- Use 2-4 large geometric panels sweeping with 2-4 frame stagger, slight angles (8-15deg),
  layered z-order with all text above every panel. Keep each panel visibly distinct - vary
  tone, angle, and offset, with an edge highlight or shadow where layers meet - so the cover
  moment reads as layered depth, never one flat colour wall.
- Sharp spring configs (damping 12-16, stiffness 150-220).`,
  },
  {
    id: 'logo-reveals',
    keywords: /logo|ident|mark\b|brand reveal/i,
    prompt: `### Logo reveals
- The logo is the hero: it gets the center, the most travel, and the longest hold.
- Reveal patterns that read premium: scale-in with an overshooting spring; a masked wipe;
  a light sweep (a moving specular gradient) across the settled mark; elements assembling.
- Never distort a logo's aspect ratio; never rotate it more than a few degrees.
- Give the settled logo a subtle life: 1-2% scale breathing or a slow light pass.`,
  },
  {
    id: 'sports-graphics',
    keywords: /sport|match|fighter|team|score|derby|versus|vs\b|game\b|league|goal/i,
    prompt: `### Sports graphics
- Energy comes from speed and angles: italic/oblique type, 8-15deg slashes, hard cuts.
- Strong condensed uppercase typography, big weight contrast (900 vs 400); support lines
  sized from the frame (about height*0.028), high-contrast against what they sit on.
- Team/brand colors as bold panels, not tints - but every bold panel is a LIT surface:
  same-hue shading, an edge keyline where slabs meet, layered shadows between them.
  Metallic/dark backgrounds read premium; one flat colour wall never does.
- Punchy springs (stiffness 180-260) and short travels - impact over float.`,
  },
  {
    id: 'news-graphics',
    keywords: /news|election|breaking|headline|bulletin|politic/i,
    prompt: `### News graphics
- Authority through restraint: clean grotesque type, precise alignment, measured pace.
- Blues/dark neutrals with ONE alert accent. No playful easing - power2/power3-style curves
  (springs with damping 20+, no overshoot).
- Straight horizontal reveals: bars extend, text slides from behind rules, thin keylines.`,
  },
  {
    id: 'kinetic-typography',
    keywords: /typograph|text animation|kinetic|words?\b.*animate|quote/i,
    prompt: `### Kinetic typography
- Animate text by UNIT (word or line, occasionally letter) with per-unit stagger, computed
  from index: delay = i * 2-4 frames.
- Masked reveals (overflow hidden line boxes, translateY 100% -> 0) read broadcast-grade.
- Scale/weight/tracking changes carry emphasis; never rotate body text.
- Hold each readable unit at least 20 frames per 3-4 words.`,
  },
  {
    id: 'editorial-motion',
    keywords: /editorial|documentary|elegant|cinematic|title sequence|film/i,
    prompt: `### Editorial / cinematic motion
- Slow, confident: long eases (springs damping 200, or interpolate with gentle curves),
  large type with generous tracking, slow letter-spacing expansion (0.02em -> 0.06em).
- Subtle parallax between layers (background drifts 20-40px while type holds).
- Fades are acceptable here; combine with 20-40px rises. Nothing bounces.`,
  },
  {
    id: 'lower-thirds',
    keywords: /lower.third|name ?strap|caption bar|byline/i,
    prompt: `### Lower thirds (as fixed-duration video)
- Anchor to the lower-left or lower-center safe area; never dead-center vertically.
- Bar/panel enters first (width or x sweep), text reveals 3-6 frames later from behind a
  mask; accent details (a keyline, a tick) land last.
- Exit reverses the hierarchy quickly: text first, panel last.`,
  },
  {
    id: 'countdowns',
    keywords: /count ?down|timer|10.*to.*1|final seconds/i,
    prompt: `### Countdowns
- Each number owns exactly one second: enters with impact (spring scale/weight), holds,
  yields cleanly. Compute the number from Math.floor(frame / fps) - never state.
- Add a per-second pulse (a ring expanding, a tick, a flash) synchronized to the beat.
- Tabular numerals (fontVariantNumeric: 'tabular-nums') so digits don't jitter.
- The final number ("1" or "0") gets an amplified landing - bigger scale, stronger pulse.`,
  },
  {
    id: 'transitions',
    keywords: /transition|reveal the video|wipe|between scenes/i,
    prompt: `### Transitions
- Choreograph shapes that ENTER covering the frame and EXIT revealing it - the covered
  midpoint is the cut point. Offset panel timings by 2-4 frames for a layered feel.
- Move along one axis with slight angle variance; accelerate in, decelerate out.`,
  },
  {
    id: 'data-visualization',
    keywords: /chart|graph|data|statistic|percentage|poll|infographic/i,
    prompt: `### Data visualization
- Bars/lines/counters animate from zero to value with interpolate + clamp; stagger series.
- Numbers count up in sync with their bar (Math.round(interpolate(...))).
- Label first, then value - the viewer needs the context before the number.
- Grid lines and axes fade in before the data, out after it.`,
  },
  {
    id: 'particles',
    keywords: /particle|confetti|sparks?|dust|snow|floating/i,
    prompt: `### Particles
- Generate N particles from a seeded loop: EVERY property (x, y, size, speed, phase)
  derives from random('seed-' + i) - fully deterministic, computed inline per frame.
- Move them as pure functions of frame: y = start + frame * speed; wrap with modulo.
- 20-60 particles max; vary size 2-3x and opacity 0.2-0.8 for depth. Particles support
  the subject - keep them behind or around the hero, never over text.`,
  },
  {
    id: 'social-video',
    keywords: /social|instagram|tiktok|reel|story|vertical|9:16/i,
    prompt: `### Social video
- Design for the aspect ratio given (often vertical): stack hierarchy top-to-bottom,
  bigger type relative to frame width than broadcast.
- Faster cuts and bolder color than broadcast; hooks land in the first second.
- Keep critical content in the middle 70% vertically (UI chrome eats the edges).`,
  },
  {
    id: 'premium-corporate',
    keywords: /corporate|premium|luxur|business|keynote|product launch/i,
    prompt: `### Premium corporate motion
- Restraint is the luxury: deep neutral backgrounds, one metallic or brand accent,
  thin keylines, generous negative space.
- Slow confident reveals (damping 18-24 springs), micro-staggers, no bounce ever.
- Light sweeps and 1-2% scale drifts carry the hold. Type: light weights, wide tracking.`,
  },
  {
    id: 'minimal-nordic',
    keywords: /minimal|nordic|scandi|clean|simple|flat/i,
    prompt: `### Minimal / nordic motion
- Few elements, lots of air. Off-whites/greys/near-blacks with at most one muted accent.
- Motion is small and precise: 20-60px travels, opacity + position only, crisp timing.
- Alignment does the design work - a strict grid, optically balanced margins.`,
  },
];

/** Pick skills by keyword (cap 3 beyond the base). */
export function detectSkillsByKeyword(prompt: string): VideoSkill[] {
  return SKILLS.filter((s) => s.keywords.test(prompt)).slice(0, 3);
}

export function skillById(id: string): VideoSkill | undefined {
  return SKILLS.find((s) => s.id === id);
}
