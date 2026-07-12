// lt08 "Frosted Card" — the signature glass lower third: a translucent white card that
// frosts the video behind it (backdrop blur), with an optional rounded logo docked on the
// left. Modern stream/social premium feel. See docs/DESIGN_LANGUAGE.md §3 "glass".

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt08: TemplateVariant = defineVariant(
  {
    id: 'lt08',
    category: 'lower-third',
    name: 'Frosted Card',
    styleTag: 'glass',
    description: 'A translucent blurred glass card with an optional rounded logo slot.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Sofia Lindqvist' },
      { title: 'Title', sample: 'Creative Director' },
    ],
    hasLogoSlot: true,
    animationPresets: ['pop-spring', 'blur-in', 'slide-fade', 'fade', 'drop-in', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Frosted Card',
    description:
      'The signature glass card: a translucent white panel frosts whatever plays behind it, ' +
      'lifted by one soft shadow and a hairline keyline. An imported logo docks beside the ' +
      'text as a rounded square. Premium stream/social feel.',
    uicolor: '2',
  },
  (o) => {
    // The logo is rendered only when an image was actually imported — never an empty src.
    const logo = o.logoAssetPath
      ? `      <!-- Imported logo — docked to the card's left edge (see .lower-third-logo). -->
      <img class="lower-third-logo" src="${o.logoAssetPath}" alt="" />
`
      : '';

    // Extra declarations the card needs only when the logo is present.
    const boxLogoDecls = o.logoAssetPath
      ? `
  position: relative;              /* anchor for the absolutely-placed logo */
  padding-left: calc(112px * var(--scale));  /* 30 padding + 64 logo + 18 gap */`
      : '';

    const logoCss = o.logoAssetPath
      ? `

/* The imported logo: a rounded square, vertically centered against the text block. */
.lower-third-logo {
  position: absolute;              /* out of flow — the card's left padding reserves its space */
  left: calc(30px * var(--scale)); /* aligned with the card's horizontal padding */
  top: 50%;                        /* centered on the card… */
  transform: translateY(-50%);     /* …whatever the number of text lines */
  width: calc(64px * var(--scale));   /* logo square width */
  height: calc(64px * var(--scale));  /* logo square height */
  border-radius: calc(12px * var(--scale));  /* rounded corners echo the card shape */
  object-fit: cover;               /* fill the square without distorting the image */
}`
      : '';

    return {
      html: `    <!-- One frosted glass card: ${o.logoAssetPath ? 'logo + ' : ''}masked text lines inside a single translucent panel. -->
    <div class="lower-third-box">
${logo}${lineMasks(o)}
    </div>`,

      css: `/* The frosted card — translucent panel, heavy backdrop blur, one soft lifting shadow. */
.lower-third-box {
  padding: calc(22px * var(--scale)) calc(30px * var(--scale));  /* generous inner air */${boxLogoDecls}
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: blur(18px);     /* frosts the video playing behind the card */
  -webkit-backdrop-filter: blur(18px);  /* Safari spelling of the same effect */
  border-radius: calc(18px * var(--scale));  /* soft, friendly card corners */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18),  /* 1px inner keyline catches the light */
              0 20px 60px rgba(0, 0, 0, 0.35);            /* one soft wide shadow lifts the card */
}

/* Line 1 — the name leads. */
.lower-third-name {
  font-size: calc(46px * var(--scale));  /* headline size */
  font-weight: 700;                /* bold enough to carry the card */
  line-height: 1.1;                /* tight leading — big text needs less */
  letter-spacing: -0.01em;         /* large text tightens slightly */
  color: var(--text-color);        /* primary text color */
}

/* Line 2 — the title/role sits quietly under the name. */
.lower-third-title {
  margin-top: calc(6px * var(--scale));  /* small gap: name + title read as one unit */
  font-size: calc(23px * var(--scale));  /* half the name — clear hierarchy */
  font-weight: 500;                /* medium — present but not competing */
  line-height: 1.3;                /* roomier leading at reading size */
  color: var(--text-dim);          /* dimmed secondary text */
}

/* Line 3 (optional) — a small-caps kicker, e.g. a handle or a location. */
.lower-third-extra {
  margin-top: calc(10px * var(--scale));  /* a touch more air before the kicker */
  font-size: calc(17px * var(--scale));   /* small label size */
  font-weight: 600;                /* semibold keeps small caps legible */
  line-height: 1.2;                /* compact single-line label */
  letter-spacing: 0.14em;          /* small caps need room to breathe */
  text-transform: uppercase;       /* label voice */
  color: var(--accent);            /* the one accent moment on the card */
}${logoCss}`,

      hasAccent: false,
    };
  },
);
