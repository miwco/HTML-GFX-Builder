// lt54 "House Ident" — the house strap that ends with a mark: name and mono role, then the amber
// bar, then the channel or partner logo. The bar does double duty here — it is still the family's
// 8 px accent, but it also divides the words from the mark, which is why this design puts it in
// the middle rather than on an edge.
//
// Sibling of lt11 House Strap and the right-hand counterpart of lt53 House Board's leading well.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineVariant, lineMasks } from './shared';

export const lt54: TemplateVariant = defineVariant(
  {
    id: 'lt54',
    category: 'lower-third',
    name: 'House Ident',
    styleTag: 'noacg',
    description: 'Name and mono role, the amber bar as a divider, then the channel mark.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Noa Haline' },
      { title: 'Title', sample: 'Anchor · Evening News' },
    ],
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Ident',
    description:
      'The house strap signed with a mark: the void panel carries the name and a mono role, the ' +
      '8 px amber bar divides, and the channel or partner logo closes the block. Leave the image ' +
      'field empty and the bar simply ends the panel. Sibling of lt11 House Strap.',
    uicolor: '4',
  },
  (o) => {
    // A real SPX image field ("filelist"): SPX writes the picked file's path into the <img>,
    // and an empty value hides it (setFieldValue) without disturbing the row.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    const mark = o.logoEnabled
      ? `\n      <!-- Logo (image field ${logoField}) — closes the strap; hidden while empty. -->\n` +
        `      <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />`
      : '\n      <!-- No logo slot on this graphic — turn it on in the wizard to add one. -->';

    return {
      html: `    <!-- House Ident: [void panel: name / mono role] [8px accent bar] [channel mark]. -->
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

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The panel — the house void, holding words, bar and mark on one row. */
.lower-third-box {
  display: flex;                    /* the three pieces sit side by side */
  align-items: stretch;             /* the bar runs the panel's full height */
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
}

/* The words. min-width: 0 lets this flex item shrink, so a long unbroken name wraps
   instead of pushing the mark out of the panel. */
.lower-third-text {
  min-width: 0;                     /* the flexbox wrap fix — see above */
  padding: calc(18px * var(--scale)) calc(34px * var(--scale)) calc(20px * var(--scale)) calc(28px * var(--scale));
}

/* The accent bar — the family's 8px bar, here dividing the words from the mark. */
.lower-third-accent {
  flex: none;                       /* never squeezed by long text */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The mark (the ${logoField} image field) — sits in the panel, past the bar. */
.lower-third-logo {
  width: calc(84px * var(--scale));   /* mark box width */
  height: calc(56px * var(--scale));  /* shorter than it is wide: wordmarks are the common case */
  object-fit: contain;              /* show the whole logo, never crop it */
  align-self: center;               /* centred against the two lines of type */
  margin: 0 calc(26px * var(--scale));  /* even air on both sides of the mark */
  flex: none;                       /* long names never squeeze the mark */
}

/* The name — the strap's one heavy element. */
.lower-third-name {
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — the house label voice: mono caps, tracked, in the accent colour. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* a single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* whatever the operator types reads as a label */
  color: var(--label-color);        /* the family's label colour (the accent) */
  margin-top: calc(8px * var(--scale));  /* clear air below the name */
}`,
      hasAccent: true,
    };
  },
);
