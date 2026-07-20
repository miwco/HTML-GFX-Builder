// card05 "House Title" — the NoaCG title card, rebuilt from the brand kit's
// title-card-fullframe overlay: a mono kicker in the accent color, one huge display
// title, and a quiet subtitle, composited over the show's own picture with a soft
// radial accent glow painted behind the block. (The brand overlay's opaque backdrop
// stays a brand-kit thing — in the catalog the card composites, like every graphic.)
// Sibling of lt11 House Strap.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineCardVariant, cardLineClass } from './shared';

export const card05: TemplateVariant = defineCardVariant(
  {
    id: 'card05',
    category: 'info-card',
    name: 'House Title',
    styleTag: 'noacg',
    description: 'The house title card: mono kicker, huge display title, quiet subtitle, soft accent glow.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Title', sample: 'The Results Show' },
      { title: 'Kicker', sample: 'Elections 2026' },
      { title: 'Subtitle', sample: 'Live from the studio · 20:00' },
    ],
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'blur-in', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Title',
    description:
      'The NoaCG show opener: a tracked mono kicker in the accent color above one huge ' +
      'display title and a quiet subtitle, lifted off the picture by a soft radial accent ' +
      'glow painted behind the block. Sibling of lt11 House Strap.',
    uicolor: '4',
  },
  (o) => {
    // Visual order is kicker (f1) → title (f0) → subtitle (f2), so the masks are emitted
    // by hand instead of via cardLineMasks() (field order stays f0/f1/f2).
    const mask = (i: number) =>
      `      <!-- ${o.lines[i].title} (f${i}) — SPX writes this field's value straight into the element. -->\n` +
      `      <div class="info-card-mask"><span id="f${i}" class="${cardLineClass(i)}">${o.lines[i].sample}</span></div>`;
    const kicker = o.lines.length > 1 ? mask(1) + '\n' : '';
    const subtitle = o.lines.length > 2 ? '\n' + mask(2) : '';

    return {
      html: `    <!-- House Title: mono kicker, huge display title, quiet subtitle. -->
    <div class="info-card-box">
${kicker}${mask(0)}${subtitle}
    </div>`,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The block — no panel: the type composites straight over the picture, lifted by a
   soft radial accent glow painted on a pseudo-layer no preset ever tweens. */
.info-card-box {
  position: relative;              /* anchors the painted glow (::before) */
}

/* The glow — a large, very quiet radial accent wash behind the block (brand overlay's
   backdrop moment, kept transparent so the card works over any picture). */
.info-card-box::before {
  content: '';                     /* pseudo-elements need content to render */
  position: absolute;              /* pinned behind the text block */
  inset: calc(-120px * var(--scale));  /* reaches well past the type on every side */
  background: radial-gradient(60% 80% at 30% 60%,
              color-mix(in srgb, var(--accent) 14%, transparent) 0%,
              transparent 65%);    /* fades to nothing — a wash, not a shape */
  pointer-events: none;            /* purely decorative */
  z-index: -1;                     /* behind every line */
}

/* The kicker (f1) — the house label voice announcing the show. */
.info-card-title {
  display: block;                  /* its own row above the title */
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* label scale — clearly subordinate */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the label's authored tracking */
  text-transform: uppercase;       /* ELECTIONS 2026, whatever the operator types */
  color: var(--label-color);       /* the family's label color */
  margin-bottom: calc(22px * var(--scale));  /* clear air before the title lands */
}

/* The title (f0) — the biggest type in the house family: one huge display statement. */
.info-card-name {
  font-size: calc(96px * var(--scale) * var(--type-scale));  /* full-frame headline scale */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.02;               /* huge text sits tight */
  letter-spacing: var(--display-tracking);  /* the title's authored tracking */
  color: var(--text-color);        /* primary text color */
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.55);  /* keeps the title crisp over any picture */
}

/* The subtitle (f2) — the quiet closing voice. */
.info-card-extra {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* well below the title — clear hierarchy */
  font-weight: 400;                /* regular — the title did the shouting */
  line-height: 1.3;                /* room if the subtitle wraps */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(22px * var(--scale));  /* mirrors the kicker's air above the title */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);  /* readable over bright footage */
}`,

      hasAccent: false, // the accent moments are the kicker and the glow, not a bar element
      tokens: {
        labelTracking: '0.28em',
        displayTracking: '-0.02em',
      },
    };
  },
);
