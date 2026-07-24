// lt20 "Quiet Center" — the CENTRE-ANCHORED minimal lower third: a short accent rule over a
// centred name and role, parked at bottom-centre. DESIGN_LANGUAGE §1 allows centring only for a
// centre-anchored, genuinely symmetric composition — which is exactly this one, and why the
// centring lives in the design's own CSS rather than being inherited from the zone: move the
// graphic to a corner and the block stays a symmetric unit instead of falling apart.
//
// The rule is centred with `left: 50%` + a negative margin rather than a translate, because the
// animation presets own `transform` on this element (line-reveal scales it from 0).

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt20: TemplateVariant = defineVariant(
  {
    id: 'lt20',
    category: 'lower-third',
    name: 'Quiet Center',
    styleTag: 'minimal',
    description: 'A short accent rule over a centred name and role — symmetric, bottom-centre.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Title', sample: 'Chief Correspondent' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'fade', 'slide-up', 'blur-in', 'slide-down'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Quiet Center',
    description:
      'A symmetric centre-stage strap: a short accent rule, then the name, then a dimmed role ' +
      'line, all centred under it. Made for single-presenter shots, stage cameras and any ' +
      'framing where the subject sits mid-screen and a left-anchored strap would fight them.',
    uicolor: '1',
  },
  (o) => ({
    html: `    <!-- Quiet Center: [short accent rule] over [centred name / role]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,
    css: `/* The rule — a short accent mark centred above the text. Centred with left + a negative
   margin (never a translate): the presets own this element's transform. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  top: 0;                           /* the topmost element of the composition */
  left: 50%;                        /* start at the block's centre… */
  margin-left: calc(-30px * var(--scale));  /* …and step back half the rule's width */
  width: calc(60px * var(--scale));  /* a short mark, not a full-width rule */
  height: var(--accent-weight);     /* the family's accent-line weight */
  background: var(--accent);        /* the one small, sharp dose of accent color */
  will-change: transform;           /* hint the browser: presets draw this rule in */
}

/* The text block — transparent and centred by the DESIGN, so the composition survives a
   move to any anchor zone. */
.lower-third-box {
  text-align: center;               /* the symmetric composition this design is built on */
  padding-top: calc(24px * var(--scale));  /* clears the rule above */
}

/* The name — the line the viewer reads first. */
.lower-third-name {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);         /* primary text color */
}

/* The role — quiet, tracked slightly wider so the two centred lines read as a pair. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* ≈2.2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.3;                 /* secondary text gets room to breathe */
  letter-spacing: 0.04em;           /* a touch open — centred short lines look tight otherwise */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(8px * var(--scale));  /* name + role read as one unit */
}`,
    hasAccent: true,
  }),
);
