// lt53 "House Board" — the extended house strap: the amber bar, a logo well, and four lines —
// name, role, organisation and a mono status line. It is the house graphic for a long interview
// segment, where the viewer joins late and still has to be able to place the speaker.
//
// The status line takes the mono label face and the accent colour, so the block ends on the one
// house colour moment rather than fading out into more grey text.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineVariant, lineMasks } from './shared';

export const lt53: TemplateVariant = defineVariant(
  {
    id: 'lt53',
    category: 'lower-third',
    name: 'House Board',
    styleTag: 'noacg',
    description: 'The house bar, a logo well, and four lines — name, role, organisation, status.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Name', sample: 'Dr. Leena Virtanen' },
      { title: 'Role', sample: 'Director of Research' },
      { title: 'Organisation', sample: 'Climate Policy Institute' },
      { title: 'Status', sample: 'Live · Helsinki' },
    ],
    logo: 'optional',
    animationPresets: ['line-reveal', 'mask-wipe', 'slide-up', 'fade', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Board',
    description:
      'The house board for long-form interviews: the amber bar, a logo well for the guest\'s ' +
      'institution, then name, role, organisation and a mono status line in the accent colour. ' +
      'Built for steps mode — reveal a line per Continue. Sibling of lt13 House Interview.',
    uicolor: '4',
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
        <!-- Logo (image field ${logoField}) — the institution's mark; hidden while empty, the well stays. -->
        <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>`
      : `
      <!-- No logo well on this graphic — turn the logo slot on in the wizard to add one. -->`;

    return {
      html: `    <!-- House Board: [8px accent bar] | [void panel: logo well + name / role / org / status]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">${mark}
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

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void, holding the well and the four lines on one row. */
.lower-third-box {
  display: flex;                    /* well and words sit side by side */
  align-items: center;              /* …vertically centred against each other */
  gap: calc(24px * var(--scale));   /* the gap between the well and the words */
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(20px * var(--scale)) calc(52px * var(--scale)) calc(22px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
}

${
        o.logoEnabled
          ? `/* The logo well — a square lifted a shade off the void, so a dark mark still separates.
   Zero radius: the house family puts no rounding on its surfaces. */
.lower-third-well {
  flex: none;                       /* fixed size; long names never squeeze it */
  width: calc(82px * var(--scale));   /* well width */
  height: calc(82px * var(--scale));  /* …square */
  display: flex;                    /* centre the mark inside */
  align-items: center;              /* …vertically */
  justify-content: center;          /* …horizontally */
  padding: calc(11px * var(--scale));  /* breathing room around the mark */
  background: color-mix(in srgb, var(--text-color) 8%, transparent);  /* the well's lift */
}

/* The mark itself (the ${logoField} image field). */
.lower-third-logo {
  width: 100%;                      /* fill the well's width… */
  height: 100%;                     /* …and its height… */
  object-fit: contain;              /* …without distorting the artwork */
}

`
          : ''
      }/* The words. min-width: 0 lets this flex item shrink, so a long unbroken name wraps
   instead of pushing the well out of the panel. */
.lower-third-text {
  min-width: 0;                     /* the flexbox wrap fix — see above */
}

/* Name (f0) — the block's one heavy element. */
.lower-third-name {
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* Role (f1) — the second reading voice. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.25;                /* room if the role wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(4px * var(--scale));  /* name + role read as one unit */
}

/* Organisation (f2) — still a reading line, one step quieter than the role. */
.lower-third-extra {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* below the role, above the status line */
  font-weight: 400;                 /* regular weight — this line is not a label */
  line-height: 1.25;                /* room if the organisation wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(2px * var(--scale));  /* sits close under the role: one credential unit */
}

/* Status (f3) — the house label voice: mono caps, tracked, in the accent colour. Selected
   by POSITION, so field renumbering can never break it. */
.lower-third-text .lower-third-mask:nth-child(4) .lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* the smallest voice in the block */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* LIVE · HELSINKI, whatever the operator types */
  color: var(--label-color);        /* the family's label colour (the accent) */
  margin-top: calc(12px * var(--scale));  /* separated — the status line is its own beat */
}`,
      hasAccent: true,
    };
  },
);
