// lt49 "Glass Board" — the largest glass design: a frosted card led by a rounded logo well and
// carrying four lines — name, role, organisation and a handle or topic line. It is the panel-show
// board: the graphic you leave up while a remote guest talks, holding everything the viewer needs
// to place them.
//
// Four lines on a glass card only work because the voices step down properly: two reading lines,
// then two label lines, the last of them in the accent colour.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt49: TemplateVariant = defineVariant(
  {
    id: 'lt49',
    category: 'lower-third',
    name: 'Glass Board',
    styleTag: 'glass',
    description: 'A frosted card with a logo well and four lines — the remote-guest board.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Name', sample: 'Sofia Lindqvist' },
      { title: 'Role', sample: 'Creative Director' },
      { title: 'Organisation', sample: 'Northlight Studio' },
      { title: 'Handle', sample: '@northlight' },
    ],
    logo: 'optional',
    animationPresets: ['blur-in', 'pop-spring', 'fade', 'line-reveal', 'slide-up'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Glass Board',
    description:
      'The remote-guest board: a rounded logo well, an accent edge, then name, role, organisation ' +
      'and a handle. Built to stay on screen for a whole answer, so every line after the role ' +
      'drops to a label voice and only the last one takes colour. Sibling of lt08 Frosted Card.',
    uicolor: '3',
  },
  (o) => {
    // A real SPX image field ("filelist"): SPX writes the picked file's path into the <img>,
    // and an empty value hides it (setFieldValue), leaving a clean well.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    // The well is FURNITURE FOR THE SLOT: with the logo turned off there is no mark to hold,
    // so the whole well is left out rather than shipped as an empty tinted square.
    const mark = o.logoEnabled
      ? `
      <div class="lower-third-well">
        <!-- Logo (image field ${logoField}) — the guest's mark; hidden while empty, the well stays. -->
        <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>`
      : `
      <!-- No logo well on this graphic — turn the logo slot on in the wizard to add one. -->`;

    return {
      html: `    <!-- Glass Board: [logo well] [accent edge] [name / role / organisation / handle]. -->
    <div class="lower-third-box">${mark}
      <div class="lower-third-accent"></div>
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

      css: `/* The card — the family's frosted surface at its largest, holding well, edge and words. */
.lower-third-box {
  display: flex;                   /* the three pieces sit side by side */
  align-items: center;             /* …vertically centred against each other */
  gap: calc(22px * var(--scale));  /* one even gap between all three pieces */
  padding: calc(20px * var(--scale)) calc(44px * var(--scale)) calc(20px * var(--scale)) calc(20px * var(--scale));
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's panel radius */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

${
        o.logoEnabled
          ? `/* The logo well — a rounded square tinted a shade lighter than the card, so a dark mark
   still separates from the glass behind it. */
.lower-third-well {
  flex: none;                      /* fixed size; long names never squeeze it */
  width: calc(84px * var(--scale));   /* well width */
  height: calc(84px * var(--scale));  /* …square */
  display: flex;                   /* centre the mark inside */
  align-items: center;             /* …vertically */
  justify-content: center;         /* …horizontally */
  padding: calc(12px * var(--scale));  /* breathing room around the mark */
  border-radius: calc(12px * var(--scale));  /* a softer square inside the card's own radius */
  background: color-mix(in srgb, var(--text-color) 10%, transparent);  /* the well's lift */
}

/* The mark itself (the ${logoField} image field). */
.lower-third-logo {
  width: 100%;                     /* fill the well's width… */
  height: 100%;                    /* …and its height… */
  object-fit: contain;             /* …without distorting the artwork */
}

`
          : ''
      }/* The accent edge — a soft rule between the well and the words. */
.lower-third-accent {
  width: var(--accent-weight);     /* the family's accent weight */
  align-self: stretch;             /* as tall as the taller of well and text */
  margin: calc(6px * var(--scale)) 0;  /* short of the card's full height — a soft divider */
  border-radius: var(--accent-weight);  /* rounded ends — glass geometry, never a hard slab */
  background: linear-gradient(to bottom,
              var(--accent) 0%,
              color-mix(in srgb, var(--accent) 25%, transparent) 100%);  /* fades down — glass gradient edge */
  flex: none;                      /* never squeezed by long text */
  will-change: transform;          /* hint the browser: presets animate this edge */
}

/* The words. min-width: 0 lets this flex item shrink, so a long unbroken name wraps
   instead of pushing the well out of the card. */
.lower-third-text {
  min-width: 0;                    /* the flexbox wrap fix — see above */
}

/* Name (f0) — the line the viewer reads first. */
.lower-third-name {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the glass families run heavier weights */
  line-height: 1.1;                /* tight — big text needs little leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* Role (f1) — the second reading voice. */
.lower-third-title {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 500;                /* medium — quiet next to the name */
  line-height: 1.25;               /* a touch of air at small sizes */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(4px * var(--scale));  /* name + role read as one unit */
}

/* Organisation and handle (f2, f3) — both drop to the label voice, which is what keeps
   four lines from reading as a paragraph. */
.lower-third-extra {
  font-family: var(--font-label);  /* the family's label face */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* the smallest voice on the card */
  font-weight: 600;                /* small caps need weight to stay crisp */
  line-height: 1.35;               /* tight rows — the two labels are one band */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* whatever the operator types reads as a label */
  color: var(--text-dim);          /* the band sits dim… */
}

/* The organisation row opens the label band. */
.lower-third-text .lower-third-mask:nth-child(3) {
  margin-top: calc(12px * var(--scale));  /* air below the role */
}

/* …and the last line (the handle) is the one that takes the accent, so the card ends on
   its single colour moment. Selected by position, so field renumbering can't break it. */
.lower-third-text .lower-third-mask:nth-child(4) .lower-third-extra {
  color: var(--label-color);       /* the family's label colour (the accent) */
}`,
      hasAccent: true,
    };
  },
);
