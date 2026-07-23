// mu03 "Frost Match-up" — the glass match-up, sibling of lt08 Frosted Card. Each side sits on
// its own frosted panel, with a soft accent seam between them; the winner's panel brightens
// and takes an accent ring while the other loses its blur. The studio-desk take: a pundits'
// prediction card rather than a match-night stinger.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { compFieldsFor } from '../shared';
import {
  MATCHUP_FIELDS,
  MATCHUP_RUNTIME_JS,
  P,
  defineMatchupVariant,
  matchupMarkup,
  matchupStructureCss,
} from './shared';

export const mu03: TemplateVariant = defineMatchupVariant(
  {
    id: 'mu03',
    category: 'matchup',
    name: 'Frost Match-up',
    styleTag: 'glass',
    description: 'Two frosted panels either side of a soft seam — the pick brightens one.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Side A', sample: 'TEAM LIQUID' },
      { title: 'Side B', sample: 'NAVI' },
      { title: 'Event line', sample: 'GRAND FINAL · BEST OF 5' },
    ],
    logo: 'none',
    animationPresets: ['comp-bloom', 'comp-rise', 'comp-impact'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Match-up',
    description:
      'The glass match-up card: each side on its own frosted, softly-rounded panel with a ' +
      'gradient accent seam between them. The picked winner brightens and takes an accent ' +
      'ring; the other loses its lift.',
    uicolor: '2',
  },
  (o) => ({
    html: matchupMarkup(o),
    fields: compFieldsFor(MATCHUP_FIELDS, o),
    hasAccent: true,
    runtimeExtraJs: MATCHUP_RUNTIME_JS,
    css: `${matchupStructureCss()}

/* The stage — a cool wash the frosted panels sit on. */
.${P}-box {
  background: linear-gradient(160deg,
    rgba(14, 20, 30, 0.82) 0%,
    rgba(8, 12, 20, 0.92) 55%,
    rgba(6, 9, 15, 0.96) 100%);
}

/* Each side is its own frosted panel. */
.${P}-side {
  padding: calc(28px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);
  backdrop-filter: var(--panel-blur);
  -webkit-backdrop-filter: var(--panel-blur);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow), var(--panel-keyline);
}

/* The accent seam — a soft, fully-rounded rule between the panels. */
.${P}-accent {
  position: absolute;
  left: calc(50% - calc(var(--accent-weight) / 2));
  top: 30%;
  bottom: 30%;
  width: var(--accent-weight);
  border-radius: 999px;
  background: linear-gradient(180deg,
    transparent,
    color-mix(in srgb, var(--accent) 90%, transparent) 30%,
    color-mix(in srgb, var(--accent) 90%, transparent) 70%,
    transparent);
  transform-origin: center;
}

/* The event line — the glass label voice. */
.${P}-event {
  font-family: var(--font-label);
  font-size: calc(20px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--label-color);
}

/* The competitor name. */
.${P}-name {
  font-size: calc(58px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1.04;
  letter-spacing: var(--display-tracking);
  color: var(--text-color);
}

/* The note under the name. */
.${P}-note {
  font-size: calc(16px * var(--scale) * var(--type-scale));
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* The VS mark — a glass pill in the corridor. */
.${P}-vs {
  padding: calc(12px * var(--scale)) calc(20px * var(--scale));
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  color: var(--text-color);
  font-size: calc(30px * var(--scale) * var(--type-scale));
  font-weight: var(--display-weight);
  line-height: 1;
}

/* The crest slot — a glass plate until a file lands in it. */
.${P}-logo {
  border-radius: calc(14px * var(--scale));
  background: rgba(255, 255, 255, 0.1);
  padding: calc(10px * var(--scale));
}
.${P}-logo.has-image {
  background: transparent;
}

/* The verdict chip — an accent pill under the winner's note. */
.${P}-verdict {
  padding: calc(5px * var(--scale)) calc(16px * var(--scale));
  border-radius: 999px;
  background: var(--accent);
  /* A HARD dark ink, not var(--accent-ink): the glass family resolves that token to
     var(--panel-bg), which in a glass palette is a translucent white — light type on a light
     accent fill, which is unreadable. Anything sitting ON the accent here says so itself. */
  color: #08101a;
  font-size: calc(15px * var(--scale) * var(--type-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
}

/* ── The pick (applied by the machine's states, never by a data update). ── */

/* The winner's panel brightens and takes an accent ring. */
.${P}-win {
  background: rgba(255, 255, 255, 0.18);
  box-shadow: var(--panel-shadow), inset 0 0 0 calc(2px * var(--scale)) var(--accent);
}

/* The beaten side loses its lift and most of its light. */
.${P}-lose {
  opacity: 0.5;
  box-shadow: none;
}

/* Locked — the seam runs longer and the ring holds: the pick is final. */
.${P}-locked .${P}-accent {
  top: 20%;
  bottom: 20%;
}`,
  }),
);
