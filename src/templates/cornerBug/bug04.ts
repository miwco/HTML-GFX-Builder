// bug04 "Hairline Bug" — the MINIMAL corner bug, sibling of lt01 "Hairline" / lt02 "Underline".
// No panel at all: the imported logo (or a hairline-keyline placeholder square) sits over the
// video above a short accent underline and a tiny tracked-caps caption. Whitespace does the
// work; a soft text shadow keeps it legible on bright footage. Minimal accent geometry (§8):
// a short 3px underline, never a slab.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';

export const bug04: TemplateVariant = defineBugVariant(
  {
    id: 'bug04',
    category: 'corner-bug',
    name: 'Hairline Bug',
    styleTag: 'minimal',
    description: 'A panel-free logo mark over a short accent underline and a tiny caps caption.',
    maxLines: 1,
    suggestedLines: [{ title: 'Caption', sample: 'LIVE' }],
    logo: 'built-in',
    // A quiet fade to match the minimal lower thirds; no pop, no blur.
    animationPresets: ['fade', 'slide-up', 'slide-down', 'blur-in', 'flip-3d'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'top-right',
  },
  {
    name: 'Hairline Bug',
    description:
      'No panel: the imported logo (or a hairline-keyline placeholder) sits bare over the ' +
      'video above a short accent underline and a tiny tracked-caps caption. Whitespace does ' +
      'the work, a soft text shadow carries it over bright footage. Sibling of the lt01 Hairline.',
    uicolor: '2',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist"): the operator picks a file from the
    // project's images/ folder and update() writes it into the <img>. Its id comes after every
    // wizard field so nothing collides; an empty value shows the keyline placeholder square.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';

    return {
      html: `    <!-- Hairline Bug: no panel — the logo (image field ${logoField}) over a short accent
         underline and the caption. When a logo path is set, .has-image hides the placeholder. -->
    <div class="corner-bug-box">
      <div class="corner-bug-media${logoPath ? ' has-image' : ''}">
        <div class="corner-bug-mark"></div>
        <img id="${logoField}" class="corner-bug-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>
      <!-- The accent underline — the design's single color moment (minimal geometry). -->
      <div class="corner-bug-rule"></div>
${bugLineMasks(o)}
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

      css: `/* No panel here: a bare vertical stack over the video — logo, a short accent rule,
   then the caption. Everything hugs the same axis and leans on whitespace. */
.corner-bug-box {
  display: flex;                   /* stack the three pieces… */
  flex-direction: column;          /* …top to bottom */
  align-items: center;             /* centered on the mark's axis */
  text-align: center;              /* wrapped caption rows center too */
  gap: calc(9px * var(--scale));   /* even air between the pieces */
}

/* The mark area: one square holding the placeholder outline and the logo. */
.corner-bug-media {
  position: relative;              /* the placeholder and the logo stack inside this square */
  width: calc(72px * var(--scale));   /* mark area width */
  height: calc(72px * var(--scale));  /* mark area height — a square either way */
}

/* The placeholder — a hairline keyline square (minimal draws lines, not fills). */
.corner-bug-mark {
  position: absolute;              /* fills the mark area */
  inset: 0;                        /* all four edges */
  border: var(--accent-weight) solid var(--accent);  /* the one accent moment, as a thin outline */
  border-radius: var(--panel-radius);  /* the family's near-square radius */
}
.corner-bug-media.has-image .corner-bug-mark {
  display: none;                   /* a picked logo replaces the placeholder */
}

/* The logo: fills the square without cropping (wordmarks stay whole). */
.corner-bug-logo {
  position: absolute;              /* covers the mark area */
  inset: 0;                        /* all four edges */
  width: 100%;                     /* fill the square… */
  height: 100%;                    /* …both ways */
  object-fit: contain;             /* show the whole logo, never crop */
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));  /* readable over bright footage */
}

/* The accent underline — short on purpose: a mark, not a rule across the caption. */
.corner-bug-rule {
  width: calc(28px * var(--scale));   /* a short stroke */
  height: var(--accent-weight);       /* the family's hairline weight */
  background: var(--accent);          /* the one accent color */
}

/* The caption (f0) — a tiny tracked-caps label, quiet and legible over footage. */
.corner-bug-name {
  font-size: calc(15px * var(--scale) * var(--type-scale));   /* small label size */
  font-weight: 600;                /* medium keeps tracked caps crisp at bug scale */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--text-color);        /* primary text — the caption is the readable line */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}`,

      hasAccent: false, // the accent moment is the .corner-bug-rule underline, not a drawn line element
    };
  },
);
