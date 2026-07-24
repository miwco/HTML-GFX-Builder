// lt36 "Frame Mark" — the cinematic strap with a LEADING mark: a production or channel logo, a
// hairline column, then the name and role. It is the credit-block lock-up used at the head of a
// documentary segment, and the family's answer to lt23 Mark Left — same anatomy, but the divider
// is a 1 px hairline and the whole thing sits on a scrim rather than in the open.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt36: TemplateVariant = defineVariant(
  {
    id: 'lt36',
    category: 'lower-third',
    name: 'Frame Mark',
    styleTag: 'cinematic',
    description: 'A leading production mark, a hairline column, then the name and role on a scrim.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Marine Biologist' },
    ],
    logo: 'optional',
    animationPresets: ['fade', 'blur-in', 'line-reveal', 'slide-up', 'mask-wipe'],
    defaultPalette: paletteById('noir'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Frame Mark',
    description:
      'The documentary credit lock-up: a production or channel mark, a hairline column, then the ' +
      'name over a wide-tracked role — all on a scrim that fades into the shot. Leave the image ' +
      'field empty and the hairline leads on its own. Sibling of lt32 Scrim.',
    uicolor: '5',
  },
  (o) => {
    // A real SPX image field ("filelist"): SPX writes the picked file's path into the <img>,
    // and an empty value hides it (setFieldValue) without disturbing the row.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    const mark = o.logoEnabled
      ? `\n      <!-- Logo (image field ${logoField}) — leads the lock-up; hidden while empty. -->\n` +
        `      <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />`
      : '\n      <!-- No logo slot on this graphic — turn it on in the wizard to add one. -->';

    return {
      html: `    <!-- Frame Mark: [production mark] [hairline column] [name / role] on a scrim. -->
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

      css: `/* The scrim — fades out toward the right, so the lock-up has no edge facing the
   subject; the wide right padding gives the fade room to happen. */
.lower-third-box {
  display: flex;                    /* mark, hairline and words on one row */
  align-items: center;              /* …vertically centred against each other */
  gap: calc(22px * var(--scale));   /* one even gap between all three pieces */
  padding: calc(46px * var(--scale)) calc(170px * var(--scale)) calc(46px * var(--scale)) calc(32px * var(--scale));
  background: radial-gradient(ellipse 88% 105% at 12% 50%,
              var(--panel-bg) 0%,
              color-mix(in srgb, var(--panel-bg) 55%, transparent) 48%,
              transparent 100%);   /* darkest under the lock-up, gone in every direction */
}

/* The mark (the ${logoField} image field) — a square that never distorts a wide wordmark. */
.lower-third-logo {
  width: calc(58px * var(--scale));   /* mark box width */
  height: calc(58px * var(--scale));  /* mark box height — square by design */
  object-fit: contain;              /* show the whole logo, never crop it */
  flex: none;                       /* long names never squeeze the mark */
}

/* The hairline column — the family's 1 px rule, standing between mark and words. */
.lower-third-accent {
  width: var(--accent-weight);      /* the family's 1px hairline */
  align-self: stretch;              /* as tall as the taller of mark and text */
  background: var(--accent);        /* bone by default — cinema colour, not signal colour */
  flex: none;                       /* never squeezed by long text */
  will-change: transform;           /* hint the browser: presets animate this rule */
}

/* The words. min-width: 0 lets this flex item shrink, so a long unbroken name wraps
   instead of pushing the mark out of the frame. */
.lower-third-text {
  min-width: 0;                     /* the flexbox wrap fix — see above */
}

/* The name — cinema setting: light weight, wide tracking, generous line height. */
.lower-third-name {
  font-size: calc(42px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight (400 — light, not bold) */
  line-height: 1.15;                /* light type needs more air than heavy type */
  letter-spacing: var(--display-tracking);  /* POSITIVE — the family's type opens up */
  color: var(--text-color);         /* primary text color */
}

/* The role — wide tracked caps, dimmed rather than accented. */
.lower-third-title {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* small — the tracking gives it presence */
  font-weight: 500;                 /* medium keeps tracked caps crisp at this size */
  line-height: 1.4;                 /* wide tracking needs matching leading */
  letter-spacing: var(--label-tracking);  /* 0.34em — the family's signature */
  text-transform: uppercase;        /* whatever the operator types reads as a caption */
  color: var(--label-color);        /* dimmed — colour belongs to the footage in this family */
  margin-top: calc(10px * var(--scale));  /* clear air below the name */
}`,
      hasAccent: true,
    };
  },
);
