// lt47 "Glass Sign" — the glass card with the logo on the RIGHT: name and role first, then a soft
// accent divider, then the mark. It is the sponsored-segment lock-up — "brought to you by" reads
// as a signature when it closes the card, and as a takeover when it leads it.
//
// The slot is hand-authored rather than taken from templates/shared/logoSlot.ts, which stacks the
// mark above the text; this design needs it on the trailing edge of a single row.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt47: TemplateVariant = defineVariant(
  {
    id: 'lt47',
    category: 'lower-third',
    name: 'Glass Sign',
    styleTag: 'glass',
    description: 'A frosted card signed off on the right by a logo, behind a soft accent divider.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Sofia Lindqvist' },
      { title: 'Title', sample: 'Creative Director' },
    ],
    logo: 'optional',
    animationPresets: ['blur-in', 'pop-spring', 'fade', 'line-reveal', 'slide-up'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Glass Sign',
    description:
      'A frosted card with the mark on the trailing edge: name over a dimmed role, a soft accent ' +
      'divider, then the logo. Reads as a signature rather than a banner, which is what a ' +
      'sponsored or co-produced segment usually wants. Sibling of lt08 Frosted Card.',
    uicolor: '3',
  },
  (o) => {
    // A real SPX image field ("filelist"): SPX writes the picked file's path into the <img>,
    // and an empty value hides it (setFieldValue) without disturbing the row.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    const mark = o.logoEnabled
      ? `\n      <!-- Logo (image field ${logoField}) — signs off the card; hidden while empty. -->\n` +
        `      <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />`
      : '\n      <!-- No logo slot on this graphic — turn it on in the wizard to add one. -->';

    return {
      html: `    <!-- Glass Sign: [name / role] [soft accent divider] [logo] inside one frosted card. -->
    <div class="lower-third-box">
      <div class="lower-third-text">
${lineMasks(o, '        ')}
      </div>
      <div class="lower-third-accent"></div>${mark}
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

      css: `/* The card — the family's frosted surface, holding words, divider and mark on one row. */
.lower-third-box {
  display: flex;                   /* the three pieces sit side by side */
  align-items: center;             /* …vertically centred against each other */
  gap: calc(24px * var(--scale));  /* one even gap between all three pieces */
  padding: calc(18px * var(--scale)) calc(28px * var(--scale));
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The words. min-width: 0 lets this flex item shrink, so a long unbroken name wraps
   instead of pushing the mark out of the card. */
.lower-third-text {
  min-width: 0;                    /* the flexbox wrap fix — see above */
}

/* The divider — a soft accent-tinted rule with rounded ends, fading at both tips. It is
   the design's accent element, and it stays when the logo is off. */
.lower-third-accent {
  width: var(--accent-weight);     /* the family's accent weight */
  align-self: stretch;             /* as tall as the taller of words and mark */
  margin: calc(4px * var(--scale)) 0;  /* short of the card's full height — a soft divider */
  border-radius: var(--accent-weight);  /* rounded ends — glass geometry, never a hard slab */
  background: linear-gradient(to bottom,
              color-mix(in srgb, var(--accent) 25%, transparent) 0%,
              var(--accent) 50%,
              color-mix(in srgb, var(--accent) 25%, transparent) 100%);  /* strongest in the middle */
  flex: none;                      /* never squeezed by long text */
  will-change: transform;          /* hint the browser: presets animate this divider */
}

/* The mark (the ${logoField} image field) — sized to sit beside two lines of type. */
.lower-third-logo {
  width: calc(74px * var(--scale));   /* mark box width */
  height: calc(52px * var(--scale));  /* shorter than it is wide: wordmarks are the common case */
  object-fit: contain;             /* show the whole logo, never crop it */
  flex: none;                      /* long names never squeeze the mark */
}

/* Name — the line the viewer reads first. */
.lower-third-name {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.1;                /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* Title — a dimmed supporting line under the name. */
.lower-third-title {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 500;                /* medium — quiet next to the name */
  line-height: 1.25;               /* a touch of air at small sizes */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(4px * var(--scale));  /* name + title read as one unit */
}`,
      hasAccent: true,
    };
  },
);
