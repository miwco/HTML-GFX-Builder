// card03 "Frosted Panel" — the info-card sibling of lt08 "Frosted Card": the same
// translucent glass recipe (blur 18, radius 18, keyline 0.18, one soft wide shadow) grown
// to card scale, with an optional rounded logo above the heading. See DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCardVariant, cardLineMasks } from './shared';

export const card03: TemplateVariant = defineCardVariant(
  {
    id: 'card03',
    category: 'info-card',
    name: 'Frosted Panel',
    styleTag: 'glass',
    description: 'A translucent blurred glass panel for schedules and lineups, with an optional logo slot.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Heading', sample: "Tonight's Lineup" },
      { title: 'Line 1', sample: '20:00 — Opening keynote' },
      { title: 'Line 2', sample: '21:15 — Live Q&A with the hosts' },
    ],
    hasLogoSlot: true,
    animationPresets: ['pop-spring', 'blur-in', 'slide-fade', 'fade', 'drop-in', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-right',
  },
  {
    name: 'Frosted Panel',
    description:
      'The glass card at info-card scale: a translucent white panel frosts whatever plays ' +
      'behind it, lifted by one soft shadow and a hairline keyline. An imported logo sits ' +
      'above the heading as a rounded square. Sibling of the lt08 Frosted Card lower third.',
    uicolor: '2',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist"): pick a file from the project's
    // images/ folder in SPX, or leave it empty — an empty value keeps the row collapsed.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';

    const logo = `      <!-- Logo (image field ${logoField}) — a rounded square above the heading. Empty = hidden. -->
      <img id="${logoField}" class="info-card-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
`;

    const logoCss = `

/* The logo: a rounded square leading the card, above the heading (hidden while empty). */
.info-card-logo {
  display: block;                  /* its own row — the heading starts below it */
  width: calc(56px * var(--scale));   /* logo square width */
  height: calc(56px * var(--scale));  /* logo square height */
  margin-bottom: calc(16px * var(--scale));  /* air between logo and heading */
  border-radius: calc(12px * var(--scale));  /* rounded corners echo the panel shape */
  object-fit: contain;             /* show the whole logo, never crop a wide wordmark */
}`;

    return {
      html: `    <!-- One frosted glass panel: logo + masked heading and body lines inside a single translucent card. -->
    <div class="info-card-box">
${logo}${cardLineMasks(o)}
    </div>`,

      extraFields: [
        {
          field: logoField,
          ftype: 'filelist',
          title: 'Logo',
          value: logoPath,
          assetfolder: './images/',
          extension: 'png',
        },
      ],

      css: `/* The frosted panel — translucent card, heavy backdrop blur, one soft lifting shadow. */
.info-card-box {
  padding: calc(26px * var(--scale)) calc(32px * var(--scale));  /* generous inner air at card scale */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: blur(18px);     /* frosts the video playing behind the card */
  -webkit-backdrop-filter: blur(18px);  /* Safari spelling of the same effect */
  border-radius: calc(18px * var(--scale));  /* soft, friendly card corners */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18),  /* 1px inner keyline catches the light */
              0 20px 60px rgba(0, 0, 0, 0.35);            /* one soft wide shadow lifts the card */
}

/* Line 1 — the heading leads the card. */
.info-card-name {
  font-size: calc(42px * var(--scale));  /* headline size */
  font-weight: 700;                /* bold enough to carry the card */
  line-height: 1.1;                /* tight leading — big text needs less */
  letter-spacing: -0.01em;         /* large text tightens slightly */
  color: var(--text-color);        /* primary text color */
}

/* Line 2 — the first body line sits quietly under the heading. */
.info-card-title {
  margin-top: calc(12px * var(--scale));  /* even gap — body lines read as a list */
  font-size: calc(23px * var(--scale));   /* half the heading — clear hierarchy */
  font-weight: 500;                /* medium — present but not competing */
  line-height: 1.3;                /* roomier leading at reading size */
  color: var(--text-dim);          /* dimmed secondary text */
}

/* Line 3 (optional) — a further body line in the same quiet voice. */
.info-card-extra {
  margin-top: calc(12px * var(--scale));  /* same gap keeps the list rhythm */
  font-size: calc(23px * var(--scale));   /* matches the line above — one list, one size */
  font-weight: 500;                /* medium — same voice as the line above */
  line-height: 1.3;                /* roomier leading at reading size */
  color: var(--text-dim);          /* dimmed secondary text */
}${logoCss}`,

      hasAccent: false,
    };
  },
);
