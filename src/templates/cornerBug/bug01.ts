// bug01 "Glass Mark" — the corner-bug sibling of lt08 "Frosted Card" / lt09 "Gradient
// Pill": one small frosted tile (blur 18, radius 16, keyline 0.18, one soft wide shadow)
// holding the imported logo — or a tasteful accent diamond when no logo is imported —
// with a tiny caps caption beneath. Sits ~150px square in the top-right safe area.
// See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';

export const bug01: TemplateVariant = defineBugVariant(
  {
    id: 'bug01',
    category: 'corner-bug',
    name: 'Glass Mark',
    styleTag: 'glass',
    description: 'A small frosted tile with a logo slot and a tiny caption — the persistent on-air mark.',
    maxLines: 1,
    suggestedLines: [{ title: 'Caption', sample: 'LIVE' }],
    hasLogoSlot: true,
    animationPresets: ['blur-in', 'pop-spring', 'slide-fade', 'fade', 'drop-in', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-right',
  },
  {
    name: 'Glass Mark',
    description:
      'A compact frosted glass tile that lives in the corner all show long: the imported ' +
      'logo (or an accent diamond placeholder) above a tiny caps caption, lifted by one ' +
      'soft shadow and a hairline keyline. Sibling of the lt08 Frosted Card lower third.',
    uicolor: '2',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist"): the operator picks a file from the
    // project's images/ folder and update() writes it into the <img>. The field id comes
    // after every wizard field so nothing collides.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';

    const mark = `      <!-- The mark area: your logo (image field ${logoField}) sits on top of a placeholder
           diamond. When a logo path is set, .has-image hides the diamond. -->
      <div class="corner-bug-media${logoPath ? ' has-image' : ''}">
        <div class="corner-bug-mark"></div>
        <img id="${logoField}" class="corner-bug-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>`;

    const markCss = `/* The mark area: one square box holding both the placeholder diamond and the logo.
   update() toggles .has-image here, so the CSS decides which of the two shows. */
.corner-bug-media {
  position: relative;              /* the mark and the logo stack inside this square */
  width: calc(84px * var(--scale));   /* mark area width */
  height: calc(84px * var(--scale));  /* mark area height — the tile keeps its shape either way */
}

/* The placeholder mark: an untransformed sizing box; the rotation lives on the
   ::before layer only, so animation presets never tween a rotated element. */
.corner-bug-mark {
  position: absolute;              /* fills the mark area */
  inset: 0;                        /* all four edges */
}
.corner-bug-mark::before {
  content: '';                     /* pseudo-elements need content to render */
  position: absolute;              /* centered inside the mark box */
  left: 50%;                       /* to the middle… */
  top: 50%;                        /* …both ways */
  width: calc(54px * var(--scale));   /* diamond edge length */
  height: calc(54px * var(--scale));  /* square before rotation */
  transform: translate(-50%, -50%) rotate(45deg);  /* center it, then turn it into a diamond */
  background: var(--accent);       /* the one accent moment on the tile */
  border-radius: calc(10px * var(--scale));  /* softened points — friendly, not sharp */
}
.corner-bug-media.has-image .corner-bug-mark {
  display: none;                   /* a picked logo replaces the placeholder */
}

/* The logo: a rounded square filling the mark area (contain — wordmarks must not crop). */
.corner-bug-logo {
  position: absolute;              /* covers the mark area */
  inset: 0;                        /* all four edges */
  width: 100%;                     /* fill the square… */
  height: 100%;                    /* …both ways */
  border-radius: calc(12px * var(--scale));  /* rounded corners echo the tile shape */
  object-fit: contain;             /* show the whole logo, never crop a wide wordmark */
}`;

    return {
      html: `    <!-- One frosted tile: the logo mark above a tiny caps caption. -->
    <div class="corner-bug-box">
${mark}
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

      css: `/* The tile — a small frosted square: translucent glass, heavy backdrop blur,
   hairline keyline, one soft lifting shadow. Everything stacks and centers inside it. */
.corner-bug-box {
  display: flex;                   /* mark and caption stack as one column */
  flex-direction: column;          /* mark on top, caption beneath */
  align-items: center;             /* both centered on the tile's axis */
  text-align: center;              /* wrapped caption rows center too (overrides the zone alignment) */
  padding: calc(18px * var(--scale));  /* even air on all four sides */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: blur(18px);     /* frosts the video playing behind the tile */
  -webkit-backdrop-filter: blur(18px);  /* Safari spelling of the same effect */
  border-radius: calc(16px * var(--scale));  /* soft tile corners */
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18),  /* 1px inner keyline catches the light */
              0 20px 60px rgba(0, 0, 0, 0.35);            /* one soft wide shadow lifts the tile */
}

${markCss}

/* The caption — a tiny caps label under the mark (e.g. LIVE, or a channel name). */
.corner-bug-name {
  margin-top: calc(10px * var(--scale));  /* air between the mark and the caption */
  font-size: calc(16px * var(--scale));   /* small label size */
  font-weight: 700;                /* bold keeps small caps legible at bug scale */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: 0.18em;          /* small caps need room to breathe */
  text-transform: uppercase;       /* label voice */
  color: var(--text-color);        /* primary text — the accent stays on the mark */
}`,

      hasAccent: false, // the accent moment is the placeholder diamond, not a separate shape
    };
  },
);
