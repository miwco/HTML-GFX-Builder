// lt04 "Kicker" — a light, minimal lower third. A porcelain (near-white) card carries a
// heavy near-black name with a small uppercase kicker label above it. The kicker is data
// field f1 but renders on top: flexbox `order` reorders it visually (see the CSS comment),
// so the operator still fills in "Name" first, "Kicker" second.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt04: TemplateVariant = defineVariant(
  {
    id: 'lt04',
    category: 'lower-third',
    name: 'Kicker',
    styleTag: 'minimal',
    description: 'A light porcelain card: a small accent kicker above a heavy headline name.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Isabella Fontaine' },
      { title: 'Kicker', sample: 'EXCLUSIVE' },
    ],
    logo: 'none',
    animationPresets: ['mask-wipe', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('porcelain'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Kicker',
    description:
      'A near-white editorial card. The name sits big and heavy in near-black type, with a ' +
      'small uppercase kicker in the accent color perched above it — quiet, headline-first, ' +
      'built for interviews and exclusives on any background.',
    uicolor: '4',
  },
  (o) => ({
    // Structure: one light panel (.lower-third-box) holding the masked text lines. No accent shape —
    // the kicker's accent color IS this design's accent moment.
    html: `    <!-- The porcelain card. Lines are masked for reveals; the kicker (f1) is lifted
         above the name (f0) purely with CSS order — data order stays Name, Kicker. -->
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,

    css: `/* The card: a light panel that hugs its text (fit-content comes from the shared rules). */
.lower-third-box {
  display: flex;                   /* lay the lines out as a column… */
  flex-direction: column;          /* …so \`order\` can visually reorder them */
  gap: calc(10px * var(--scale));  /* breathing room between kicker and name */
  padding: calc(20px * var(--scale)) calc(32px * var(--scale));  /* generous inner space */
  background: var(--panel-bg);     /* the near-white porcelain panel */
  border-radius: calc(3px * var(--scale));  /* barely-rounded corners (minimal style) */
  box-shadow: 0 calc(14px * var(--scale)) calc(44px * var(--scale)) rgba(0, 0, 0, 0.18);  /* one soft shadow lifts the card off the video */
}

/* The order trick: the SECOND field (f1, the kicker) renders FIRST. :nth-child(2) is the
   second line's mask, and \`order: -1\` pulls it above the name inside the flex column —
   the operator's data order (Name, then Kicker) never changes. With only one line filled
   in, this selector matches nothing and just the name shows. */
.lower-third-mask:nth-child(2) {
  order: -1;                       /* lift this line to the top of the column */
}

/* The name (f0): the big line the graphic exists for. */
.lower-third-name {
  font-size: calc(52px * var(--scale) * var(--type-scale));  /* headline scale */
  font-weight: 800;                /* maximum contrast against the small kicker */
  line-height: 1.1;                /* tight leading — big text needs less air */
  letter-spacing: -0.01em;         /* big text tightens slightly */
  color: var(--text-color);        /* near-black on the light panel */
}

/* The kicker (f1): a small, loud label chip in the accent color. */
.lower-third-title {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* small on purpose — a label, not a headline */
  font-weight: 700;                /* bold enough to read at this size */
  line-height: 1.2;                /* a touch of air inside its reveal mask */
  text-transform: uppercase;       /* all caps read as a category tag */
  letter-spacing: 0.16em;          /* wide tracking — small caps breathe */
  color: var(--accent);            /* the design's one accent moment */
}`,

    hasAccent: false, // no accent shape — presets fall back to their box-only choreography
  }),
);
