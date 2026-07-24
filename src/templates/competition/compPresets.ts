// The competition pack's motion presets — one bank for all four competition categories
// (esports scorebugs, match-ups, results boards, reveals), prefix-parameterized exactly like
// the standard lower-third bank, so a scorebug and an award reveal share one choreography
// vocabulary and read as siblings.
//
// The competition structure contract (see shared.ts) is deliberately small, and these presets
// tween only what it guarantees:
//   .<prefix>          the root (opacity gate — CSS-hidden until play())
//   .<prefix>-box      the panel / stage
//   .<prefix>-head     the top block: kicker, title, the two team names of a scorebug
//   .<prefix>-body     the content block: rows, columns, sides, the subject of a reveal
//   .<prefix>-accent   the one accent flourish, when the design has one
//
// Four temperatures:
//   comp-rise     the analytical arrival — the panel rises, head then body settle. The
//                 default for boards and cards, and the one that never distracts.
//   comp-impact   the match-night slam — the panel charges in from its accent edge, the
//                 accent flashes, the head snaps. Scorebugs and match-ups.
//   comp-bloom    the ceremonial reveal — the stage glows up, the subject blooms out of the
//                 middle with a soft spring. Winners, awards, launches.
//   comp-cascade  the data arrival — the panel lands, then the rows cascade one per line the
//                 operator typed (MEASURED: compMotion.ts compCascade). Boards.
//
// Everything except the cascade is real keyframes on transform/opacity, so the region converts
// cleanly into the NOACG_ANIM data block at create (shared/standard.ts convertToDataRegion).
// Entrances use Out-easings, exits In-easings and run faster (docs/DESIGN_LANGUAGE.md §4).

import type { AnimPresetId } from '../../model/wizard';
import type { AnimPreset, PresetConfig } from '../lowerThirds/animPresets';

const MARK_OPEN = '/* == ANIMATION (generated — the Animation panel rewrites this block) == */';
const MARK_CLOSE = '/* == END ANIMATION == */';

export const COMP_RISE_ID: AnimPresetId = 'comp-rise';
export const COMP_IMPACT_ID: AnimPresetId = 'comp-impact';
export const COMP_BLOOM_ID: AnimPresetId = 'comp-bloom';
export const COMP_CASCADE_ID: AnimPresetId = 'comp-cascade';

function knobs(cfg: PresetConfig): string {
  return `var animSpeed = ${cfg.speed};  // 1 = normal · 0.75 = slower · 1.5 = faster
var easeIn = '${cfg.easeIn}';   // entrance ease — arrives fast, settles smooth
var easeOut = '${cfg.easeOut}';   // exit ease — starts naturally, leaves quickly`;
}

export const COMP_PRESETS: AnimPreset[] = [
  {
    id: COMP_RISE_ID,
    name: 'Board rise',
    description: 'The panel rises into place; the heading lands, then the content settles.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Board rise — the analytical arrival. The panel rises and fades up, the heading
// lands on top of it${cfg.hasAccent ? ', the accent rule draws across' : ''}, and the content settles in last. The exit
// drops the whole panel back down, faster.
${knobs(cfg)}

// buildInTimeline(): panel up → heading → ${cfg.hasAccent ? 'accent → ' : ''}content.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.${cfg.prefix}-box',
    { y: 36, opacity: 0 },                       // the panel rises into its resting place
    { y: 0, opacity: 1, duration: 0.5 / animSpeed },
    0
  );
  tl.fromTo('.${cfg.prefix}-head',
    { y: 16, opacity: 0 },                       // the heading lands once the panel is there
    { y: 0, opacity: 1, duration: 0.35 / animSpeed },
    0.18 / animSpeed
  );${
    cfg.hasAccent
      ? `
  tl.fromTo('.${cfg.prefix}-accent',
    { scaleX: 0, opacity: 0 },                   // the accent rule draws out from its origin
    { scaleX: 1, opacity: 1, duration: 0.4 / animSpeed },
    0.24 / animSpeed
  );`
      : ''
  }
  tl.fromTo('.${cfg.prefix}-body',
    { y: 20, opacity: 0 },                       // the content settles in last
    { y: 0, opacity: 1, duration: 0.4 / animSpeed },
    0.3 / animSpeed
  );
  return tl;
}

// buildOutTimeline(): content and heading go first, then the panel drops away.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-body', { y: 14, opacity: 0, duration: 0.24 / animSpeed }, 0);
  tl.to('.${cfg.prefix}-head', { y: 10, opacity: 0, duration: 0.24 / animSpeed }, 0.05 / animSpeed);${
    cfg.hasAccent
      ? `
  tl.to('.${cfg.prefix}-accent', { scaleX: 0, opacity: 0, duration: 0.25 / animSpeed }, 0.05 / animSpeed);`
      : ''
  }
  tl.to('.${cfg.prefix}-box', { y: 28, opacity: 0, duration: 0.32 / animSpeed }, 0.12 / animSpeed);
  tl.set('.${cfg.prefix}', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: COMP_IMPACT_ID,
    name: 'Match impact',
    description: 'The panel charges in from its edge, the heading snaps and the content punches up.',
    autoEase: { easeIn: 'power4.out', easeOut: 'power3.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Match impact — the match-night arrival. The panel charges in from its accent edge,
// ${cfg.hasAccent ? 'the accent flashes on the impact, ' : ''}the heading snaps into place and the content punches up behind it.
${knobs(cfg)}

// buildInTimeline(): charge → impact (${cfg.hasAccent ? 'accent flash + ' : ''}heading snap) → content.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.${cfg.prefix}-box',
    { x: -90, opacity: 0 },                      // the panel charges in from its own edge
    { x: 0, opacity: 1, duration: 0.42 / animSpeed },
    0
  );${
    cfg.hasAccent
      ? `
  tl.fromTo('.${cfg.prefix}-accent',
    { opacity: 0, scaleY: 1.6 },                 // the accent flashes on the impact
    { opacity: 1, scaleY: 1, duration: 0.28 / animSpeed, ease: 'back.out(2.2)' },
    0.3 / animSpeed
  );`
      : ''
  }
  tl.fromTo('.${cfg.prefix}-head',
    { y: 22, opacity: 0 },                       // the heading snaps in on the landing
    { y: 0, opacity: 1, duration: 0.3 / animSpeed, ease: 'back.out(1.7)' },
    0.28 / animSpeed
  );
  tl.fromTo('.${cfg.prefix}-body',
    { scale: 0.94, opacity: 0 },                 // the content punches up behind it
    { scale: 1, opacity: 1, duration: 0.34 / animSpeed, ease: 'back.out(1.4)' },
    0.36 / animSpeed
  );
  return tl;
}

// buildOutTimeline(): the charge in reverse — everything leaves the way it arrived, faster.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-body', { scale: 0.96, opacity: 0, duration: 0.2 / animSpeed }, 0);
  tl.to('.${cfg.prefix}-head', { y: 14, opacity: 0, duration: 0.2 / animSpeed }, 0.04 / animSpeed);${
    cfg.hasAccent
      ? `
  tl.to('.${cfg.prefix}-accent', { opacity: 0, duration: 0.2 / animSpeed }, 0.04 / animSpeed);`
      : ''
  }
  tl.to('.${cfg.prefix}-box', { x: -70, opacity: 0, duration: 0.3 / animSpeed }, 0.1 / animSpeed);
  tl.set('.${cfg.prefix}', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: COMP_BLOOM_ID,
    name: 'Ceremony bloom',
    description: 'The stage glows up and the subject blooms out of the middle with a soft spring.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    emit: (cfg) => `${MARK_OPEN}
// Preset: Ceremony bloom — the reveal temperature. The stage glows up under everything, the
// heading rises through it${cfg.hasAccent ? ', the accent blooms' : ''}, and the subject scales out of the middle with a
// soft spring. Slower than a match graphic on purpose: this is the moment, not the score.
${knobs(cfg)}

// buildInTimeline(): stage glow → heading → ${cfg.hasAccent ? 'accent → ' : ''}subject bloom.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.${cfg.prefix}-box',
    { opacity: 0, scale: 1.03 },                 // the stage glows up, easing back to rest
    { opacity: 1, scale: 1, duration: 0.6 / animSpeed },
    0
  );
  tl.fromTo('.${cfg.prefix}-head',
    { y: 26, opacity: 0 },                       // the kicker/title rises through the glow
    { y: 0, opacity: 1, duration: 0.5 / animSpeed },
    0.25 / animSpeed
  );${
    cfg.hasAccent
      ? `
  tl.fromTo('.${cfg.prefix}-accent',
    { scaleX: 0.2, opacity: 0 },                 // the accent blooms out from the center
    { scaleX: 1, opacity: 1, duration: 0.55 / animSpeed },
    0.4 / animSpeed
  );`
      : ''
  }
  tl.fromTo('.${cfg.prefix}-body',
    { scale: 0.86, opacity: 0 },                 // the subject blooms out of the middle
    { scale: 1, opacity: 1, duration: 0.7 / animSpeed, ease: 'back.out(1.6)' },
    0.5 / animSpeed
  );
  return tl;
}

// buildOutTimeline(): the moment folds back into the stage — faster than the entrance.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-body', { scale: 0.92, opacity: 0, duration: 0.3 / animSpeed }, 0);
  tl.to('.${cfg.prefix}-head', { y: 18, opacity: 0, duration: 0.28 / animSpeed }, 0.06 / animSpeed);${
    cfg.hasAccent
      ? `
  tl.to('.${cfg.prefix}-accent', { scaleX: 0.3, opacity: 0, duration: 0.3 / animSpeed }, 0.06 / animSpeed);`
      : ''
  }
  tl.to('.${cfg.prefix}-box', { opacity: 0, duration: 0.35 / animSpeed }, 0.14 / animSpeed);
  tl.set('.${cfg.prefix}', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },

  {
    id: COMP_CASCADE_ID,
    name: 'Rows cascade',
    description: 'The panel lands and the rows arrive one per line — measured from the data.',
    autoEase: { easeIn: 'power3.out', easeOut: 'power2.in' },
    // STRUCTURAL: the cascade is MEASURED (compMotion.ts compCascade reads the rebuilt rows),
    // so it only works in a template whose runtime ships that builder. Applying it to an
    // arbitrary graphic after creation would name a function that isn't there.
    structural: true,
    emit: (cfg) => `${MARK_OPEN}
// Preset: Rows cascade — the data arrival. The panel lands with its heading${cfg.hasAccent ? ' and accent rule' : ''},
// then the rows arrive one after another: one row per line the operator typed. That count is
// their data, so the cascade is MEASURED at play time (compCascade, in the runtime above)
// rather than written down as keyframes here.
${knobs(cfg)}

// buildInTimeline(): panel up → heading${cfg.hasAccent ? ' → accent' : ''} → the measured row cascade.
function buildInTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeIn } });
  tl.set('.${cfg.prefix}', { opacity: 1 });               // reveal the (CSS-hidden) graphic
  tl.fromTo('.${cfg.prefix}-box',
    { y: 30, opacity: 0 },                       // the panel rises into its resting place
    { y: 0, opacity: 1, duration: 0.45 / animSpeed },
    0
  );
  tl.fromTo('.${cfg.prefix}-head',
    { y: 14, opacity: 0 },                       // the heading lands on the panel
    { y: 0, opacity: 1, duration: 0.32 / animSpeed },
    0.16 / animSpeed
  );${
    cfg.hasAccent
      ? `
  tl.fromTo('.${cfg.prefix}-accent',
    { scaleX: 0, opacity: 0 },                   // the accent rule draws under the heading
    { scaleX: 1, opacity: 1, duration: 0.38 / animSpeed },
    0.2 / animSpeed
  );`
      : ''
  }
  // The rows carry their own reveal — one per line the operator typed, measured at play time.
  tl.add(compCascade('.${cfg.prefix}-body'), 0.3 / animSpeed);
  return tl;
}

// buildOutTimeline(): the board leaves as one unit — a reverse cascade would out-run the cut.
function buildOutTimeline() {
  var tl = gsap.timeline({ defaults: { ease: easeOut } });
  tl.to('.${cfg.prefix}-body', { y: 16, opacity: 0, duration: 0.26 / animSpeed }, 0);
  tl.to('.${cfg.prefix}-head', { y: 10, opacity: 0, duration: 0.24 / animSpeed }, 0.05 / animSpeed);${
    cfg.hasAccent
      ? `
  tl.to('.${cfg.prefix}-accent', { scaleX: 0, opacity: 0, duration: 0.24 / animSpeed }, 0.05 / animSpeed);`
      : ''
  }
  tl.to('.${cfg.prefix}-box', { y: 24, opacity: 0, duration: 0.32 / animSpeed }, 0.12 / animSpeed);
  tl.set('.${cfg.prefix}', { opacity: 0 });               // fully hidden; ready to play again
  return tl;
}
${MARK_CLOSE}`,
  },
];

export function compPresetById(id: AnimPresetId): AnimPreset {
  const p = COMP_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown competition preset: ${id}`);
  return p;
}
