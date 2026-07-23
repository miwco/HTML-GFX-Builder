// lt23 "Mark Left" — the minimal strap with a LEADING LOGO: a square mark on the left, a thin
// accent divider, then the name and role. It hand-authors its own slot rather than taking the
// shared one (templates/shared/logoSlot.ts), because the shared slot stacks the logo ABOVE the
// text and this design's whole point is the horizontal lock-up: mark, rule, words.
//
// With the logo off, the divider becomes the design's left rule and the lock-up still reads —
// the layout is one flex row either way, so nothing collapses.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt23: TemplateVariant = defineVariant(
  {
    id: 'lt23',
    category: 'lower-third',
    name: 'Mark Left',
    styleTag: 'minimal',
    description: 'A square logo mark, an accent divider, then the name and role — one lock-up.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Title', sample: 'Chief Correspondent' },
    ],
    logo: 'optional',
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Mark Left',
    description:
      'A horizontal lock-up: the channel or club mark on the left, a thin accent divider, then ' +
      'the name over a dimmed role. The mark is a real SPX image field — leave it empty and the ' +
      'divider simply becomes the strap\'s left rule.',
    uicolor: '1',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist") when the slot is on: SPX writes the
    // picked file's path into the <img>, and an empty value hides it (setFieldValue).
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    const mark = o.logoEnabled
      ? `\n      <!-- Logo (image field ${logoField}) — hidden while empty; the divider then leads. -->\n` +
        `      <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />`
      : '\n      <!-- No logo slot on this graphic — turn it on in the wizard to add one. -->';

    return {
      html: `    <!-- Mark Left: [logo mark] [accent divider] [name / role] — one horizontal row. -->
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

      css: `/* The lock-up — mark, divider and words on one baseline-sharing row. */
.lower-third-box {
  display: flex;                   /* the three pieces sit side by side */
  align-items: center;             /* …vertically centred against each other */
  gap: calc(22px * var(--scale));  /* one even gap between all three pieces */
}

/* The mark (the ${logoField} image field) — a square that never distorts a wide wordmark. */
.lower-third-logo {
  width: calc(64px * var(--scale));   /* mark box width */
  height: calc(64px * var(--scale));  /* mark box height — square by design */
  object-fit: contain;             /* show the whole logo, never crop it */
  flex: none;                      /* long names never squeeze the mark */
}

/* The divider — a thin accent rule between the mark and the words. With the logo off it
   becomes the strap's left rule, so the design still has its accent element either way. */
.lower-third-accent {
  width: var(--accent-weight);     /* the family's accent-line weight */
  align-self: stretch;             /* as tall as the taller of mark and text */
  background: var(--accent);       /* the one small, sharp dose of accent color */
  flex: none;                      /* never squeezed by long text */
  will-change: transform;          /* hint the browser: presets animate this rule */
}

/* The words. min-width: 0 lets this flex item shrink, so a long unbroken name wraps
   instead of pushing the mark out of the frame. */
.lower-third-text {
  min-width: 0;                    /* the flexbox wrap fix — see above */
}

/* Name — the line the viewer reads first. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;               /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  color: var(--text-color);        /* primary text color */
}

/* Title — quiet on purpose: smaller, lighter, dimmed. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 400;                /* regular weight; contrast comes from the name */
  line-height: 1.3;                /* secondary text gets room to breathe */
  color: var(--text-dim);          /* dimmed — never pure white twice */
  margin-top: calc(4px * var(--scale));  /* name + title read as one unit */
}`,
      hasAccent: true,
    };
  },
);
