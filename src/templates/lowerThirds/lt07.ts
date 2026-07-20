// lt07 "Number Badge" — sport style. A solid accent badge (the logo slot) bolted to a dark
// text slab: flat colors, zero radius, one hard offset shadow. Reads like a matchday sticker.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt07: TemplateVariant = defineVariant(
  {
    id: 'lt07',
    category: 'lower-third',
    name: 'Number Badge',
    styleTag: 'sport',
    description: 'A solid accent logo badge bolted to a dark text slab — zero radius, hard shadow.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'THE TITANS' },
      { title: 'Subtitle', sample: 'HOME · GAME 4' },
    ],
    logo: 'optional',
    animationPresets: ['snap-stinger', 'pop-spring', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'bebas-neue',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Number Badge',
    description:
      'A square accent badge for a team logo or crest, locked to a dark text slab. Flat color, ' +
      'zero radius, and a hard offset shadow give it a sticker-slab, matchday feel.',
    uicolor: '7',
  },
  (o) => {
    // The badge holds a real SPX image field ("filelist") when the logo slot is on: SPX
    // writes the file path straight into the <img>, and an empty value keeps the badge a
    // clean accent square (setFieldValue hides an <img> without a value).
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    const badge = o.logoEnabled
      ? `\n        <!-- Logo (image field ${logoField}) — empty keeps the badge a clean accent square. -->\n        <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />\n      `
      : '<!-- Empty accent square — turn on the logo slot in the wizard to fill it. -->';

    return {
      html: `    <!-- One flex slab: the accent badge (logo slot) on the left, the text stack on the right. -->
    <div class="lower-third-box">
      <div class="lower-third-accent">${badge}</div>
      <div class="lower-third-text">
${lineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: o.logoEnabled
        ? [
            {
              field: logoField,
              ftype: 'filelist',
              title: 'Logo',
              value: logoPath,
              assetfolder: './images/',
              extension: 'png',
            },
          ]
        : [],
      css: `/* The slab: badge and text panel fused into one hard-edged unit (zero radius on purpose). */
.lower-third-box {
  display: flex;                   /* badge and text sit side by side */
  align-items: stretch;            /* the badge stretches to the text panel's height */
  background: var(--panel-bg);     /* dark panel behind the text stack */
  box-shadow: var(--panel-shadow);  /* the slab's authored panel lift */
}

/* The badge: a solid accent square holding the logo — the one bold accent moment. */
.lower-third-accent {
  flex: 0 0 calc(96px * var(--scale));    /* fixed badge width; long text never squeezes it */
  min-height: calc(96px * var(--scale));  /* stays roughly square even with one short line */
  display: flex;                   /* center the logo inside the badge */
  align-items: center;             /* …vertically */
  justify-content: center;         /* …horizontally */
  background: var(--accent);       /* the accent used boldly, sport-style */
}

/* The logo inside the badge (the ${logoField} image field — hidden while empty). */
.lower-third-logo {
  width: 100%;                     /* fill the badge width… */
  height: 100%;                    /* …and its height… */
  object-fit: contain;             /* …without distorting the artwork */
  padding: calc(12px * var(--scale));  /* breathing room around the logo */
}

/* The text stack: name on top, support lines beneath, centered against the badge. */
.lower-third-text {
  display: flex;                   /* stack the lines vertically */
  flex-direction: column;          /* top to bottom */
  justify-content: center;         /* keep the stack vertically centered in the slab */
  min-width: 0;                    /* let this flex item shrink so long unbroken words wrap instead of overflowing */
  gap: calc(6px * var(--scale));   /* lines sit close — they read as one unit */
  padding: calc(18px * var(--scale)) calc(30px * var(--scale));  /* generous panel padding */
}

/* Line 1 — the name / headline. Bebas is single-weight, so size does the shouting. */
.lower-third-name {
  font-size: calc(60px * var(--scale) * var(--type-scale));  /* headline size */
  line-height: 1.05;               /* big display text sits tight */
  color: var(--text-color);        /* primary text */
  text-transform: uppercase;       /* all-caps matchday voice */
}

/* Line 2 — the subtitle (fixture, score line, role). */
.lower-third-title {
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* clearly subordinate to the name (≈2.2:1 vs the headline) */
  line-height: 1.2;                /* a touch more air than the headline */
  color: var(--label-color);       /* the support label's authored colour */
  letter-spacing: var(--label-tracking);  /* the support label's authored tracking */
  text-transform: uppercase;       /* matches the headline's voice */
}

/* Line 3 — an optional kicker (venue, sponsor). Only present with three lines. */
.lower-third-extra {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* the smallest voice in the stack */
  line-height: 1.2;                /* same rhythm as the subtitle */
  color: var(--label-color);       /* the kicker label's authored colour */
  letter-spacing: var(--label-tracking);  /* the kicker label's authored tracking */
  text-transform: uppercase;       /* keeps the stack uniform */
}`,
      hasAccent: true,
      tokens: {
        panelShadow: '0 calc(10px * var(--scale)) 0 rgba(0, 0, 0, 0.25)',
        labelTracking: '0.14em',
        labelColor: 'var(--text-dim)',
      },
    };
  },
);
