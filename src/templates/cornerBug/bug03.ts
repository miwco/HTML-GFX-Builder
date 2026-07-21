// bug03 "Slab Bug" — the SPORT corner bug, sibling of lt05 "Angle Slab" / lt06 "Split Bar".
// A solid dark slab with a chunky accent slab fused to its left edge (the sport accent
// geometry, DESIGN_LANGUAGE §8), holding the imported logo — or an accent-square placeholder —
// beside a heavy condensed-caps caption. Zero radius, no blur: a hard sticker on the corner.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';

export const bug03: TemplateVariant = defineBugVariant(
  {
    id: 'bug03',
    category: 'corner-bug',
    name: 'Slab Bug',
    styleTag: 'sport',
    description: 'A solid slab with a chunky accent edge, holding a logo and a heavy caps caption.',
    maxLines: 1,
    suggestedLines: [{ title: 'Caption', sample: 'LIVE' }],
    logo: 'built-in',
    // Sport pops onto the corner; the family's other bugs fade or blur in.
    animationPresets: ['pop-spring', 'slide-up', 'slide-down', 'fade', 'blur-in', 'flip-3d'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'top-right',
  },
  {
    name: 'Slab Bug',
    description:
      'A solid dark slab sitting hard in the corner, a chunky accent slab fused to its left ' +
      'edge in the sport way. The imported logo (or an accent-square placeholder) sits beside ' +
      'a heavy condensed-caps caption. Zero radius, no blur. Sibling of the lt06 Split Bar.',
    uicolor: '5',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist"): the operator picks a file from the
    // project's images/ folder and update() writes it into the <img>. Its id comes after every
    // wizard field so nothing collides; an empty value shows the accent-square placeholder.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';

    return {
      html: `    <!-- Slab Bug: a solid slab with an accent edge; the logo (image field ${logoField}) sits
         beside the caption. When a logo path is set, .has-image hides the placeholder square. -->
    <div class="corner-bug-box">
      <div class="corner-bug-media${logoPath ? ' has-image' : ''}">
        <div class="corner-bug-mark"></div>
        <img id="${logoField}" class="corner-bug-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>
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

      css: `/* The slab — a solid dark tile with the logo and caption in a row. The accent lives
   on ::before as a slab fused to the left edge, so no preset ever tweens it out of place. */
.corner-bug-box {
  position: relative;              /* anchors the accent edge (::before) */
  display: flex;                   /* logo and caption sit side by side */
  align-items: center;             /* both centered on the slab's axis */
  gap: calc(14px * var(--scale));  /* air between the mark and the caption */
  padding: calc(14px * var(--scale)) calc(20px * var(--scale));  /* slab padding */
  padding-left: calc(20px * var(--scale) + var(--accent-weight));  /* clear the accent edge */
  background: var(--panel-bg);     /* the solid slab behind everything */
}

/* The accent edge: a chunky slab fused to the slab's left side — sport's accent geometry. */
.corner-bug-box::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* pinned to the slab's left edge… */
  left: 0;                         /* …flush left */
  top: 0;                          /* full height, top… */
  bottom: 0;                       /* …to bottom */
  width: var(--accent-weight);     /* the family's accent slab thickness */
  background: var(--accent);       /* the one loud color moment */
}

/* The mark area: one square holding the placeholder and the logo. */
.corner-bug-media {
  position: relative;              /* the placeholder and the logo stack inside this square */
  flex: none;                      /* never squeezed by a long caption */
  width: calc(52px * var(--scale));   /* mark area width */
  height: calc(52px * var(--scale));  /* mark area height — a square either way */
}

/* The placeholder — a solid accent square (sport draws slabs, not soft diamonds). */
.corner-bug-mark {
  position: absolute;              /* fills the mark area */
  inset: 0;                        /* all four edges */
  background: var(--accent);       /* the accent moment when no logo is set */
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
}

/* The caption (f0) — a heavy condensed caps label, the sport voice at bug scale. */
.corner-bug-name {
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* the slab's focal text */
  font-weight: 700;                /* heavy — sport shouts */
  line-height: 1.05;               /* tight, single strong line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* condensed caps */
  color: var(--text-color);        /* primary text color */
  white-space: nowrap;             /* the caption stays on one line beside the mark */
}`,

      hasAccent: false, // the accent moment is the fused ::before edge + placeholder square
    };
  },
);
