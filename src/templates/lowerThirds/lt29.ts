// lt29 "Imprint" — the editorial strap with the logo on the RIGHT: name and role first, then a
// divider, then the publication's mark closing the block like a printed imprint. The pack needed a
// right-hand slot as much as a left-hand one: a channel mark reads as authorship when it FOLLOWS
// the name and as ownership when it precedes it, and both are real editorial choices.
//
// The slot is hand-authored (not the shared one from templates/shared/logoSlot.ts) because the
// shared slot leads the box — which is precisely the side this design does not want.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt29: TemplateVariant = defineVariant(
  {
    id: 'lt29',
    category: 'lower-third',
    name: 'Imprint',
    styleTag: 'editorial',
    description: 'Name and role, a divider, then the publication mark closing the block on the right.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Chief Correspondent' },
    ],
    logo: 'optional',
    animationPresets: ['line-reveal', 'fade', 'mask-wipe', 'slide-up', 'blur-in'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Imprint',
    description:
      'The editorial lock-up with the mark on the trailing edge: name over a tracked role, a thin ' +
      'accent divider, then the publication or channel logo. Reads as a byline credit rather than ' +
      'a branded banner. Leave the image field empty and the divider closes the block on its own.',
    uicolor: '2',
  },
  (o) => {
    // A real SPX image field ("filelist"): SPX writes the picked file's path into the <img>,
    // and an empty value hides it (setFieldValue) without disturbing the row.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    const mark = o.logoEnabled
      ? `\n      <!-- Logo (image field ${logoField}) — closes the block; hidden while empty. -->\n` +
        `      <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />`
      : '\n      <!-- No logo slot on this graphic — turn it on in the wizard to add one. -->';

    return {
      html: `    <!-- Imprint: [name / role] [accent divider] [publication mark] — one row, mark last. -->
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

      css: `/* The lock-up — words, divider, mark, in that reading order. */
.lower-third-box {
  display: flex;                    /* the three pieces sit side by side */
  align-items: center;              /* …vertically centred against each other */
  gap: calc(24px * var(--scale));   /* one even gap between all three pieces */
}

/* The words. min-width: 0 lets this flex item shrink, so a long unbroken name wraps
   instead of pushing the mark out of the frame. */
.lower-third-text {
  min-width: 0;                     /* the flexbox wrap fix — see above */
}

/* The divider — the printed rule between the words and the mark, and the design's one
   accent element. It stays when the logo is off, closing the block on its own. */
.lower-third-accent {
  width: var(--accent-weight);      /* the family's printed-rule weight */
  align-self: stretch;              /* as tall as the taller of words and mark */
  background: var(--accent);        /* the one accent surface in the design */
  flex: none;                       /* never squeezed by long text */
  will-change: transform;           /* hint the browser: presets animate this rule */
}

/* The mark (the ${logoField} image field) — sized to sit beside two lines of type. */
.lower-third-logo {
  width: calc(72px * var(--scale));   /* mark box width */
  height: calc(56px * var(--scale));  /* shorter than it is wide: wordmarks are the common case */
  object-fit: contain;              /* show the whole logo, never crop it */
  flex: none;                       /* long names never squeeze the mark */
}

/* The name — editorial weight: set, not shouted. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.06;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — the tracked caps line, in the accent colour. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* small — the tracking gives it presence */
  font-weight: 600;                 /* small caps need weight to stay crisp */
  line-height: 1.3;                 /* a single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* whatever the operator types reads as a kicker */
  color: var(--label-color);        /* the family's label colour (the accent) */
  margin-top: calc(10px * var(--scale));  /* clear air below the name */
}`,
      hasAccent: true,
    };
  },
);
