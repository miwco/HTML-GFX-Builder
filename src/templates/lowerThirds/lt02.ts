// lt02 "Underline" — a panel-free minimal lower third. The name floats straight over the
// video; a short accent underline separates it from the small-caps title line. The underline
// is the design's single accent moment, so the line-reveal preset (its default) draws it first.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt02: TemplateVariant = defineVariant(
  {
    id: 'lt02',
    category: 'lower-third',
    name: 'Underline',
    styleTag: 'minimal',
    description: 'Panel-free name and title separated by a short accent underline.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Marcus Chen' },
      { title: 'Title', sample: 'Senior Analyst' },
    ],
    hasLogoSlot: false,
    animationPresets: ['line-reveal', 'slide-fade', 'fade', 'drop-in', 'flip-3d'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Underline',
    description:
      'No panel at all — the name sits straight over the picture, with a short accent ' +
      'underline between it and the dimmed small-caps title. The underline is the only ' +
      'color moment and draws in first on line-reveal.',
    uicolor: '2',
  },
  (o) => ({
    // The accent lives INSIDE the box so it moves with the text and can be slotted
    // between the name and the title purely by the flex `order` rules in the CSS.
    html: `    <!-- Underline: a plain text stack (no panel). The accent underline is the last
         child of the box; flex \`order\` places it visually between name and title. -->
    <div class="lower-third-box">
${lineMasks(o)}
      <!-- The accent underline — the design's single color moment. -->
      <div class="lower-third-accent"></div>
    </div>`,
    css: `/* The text block: a plain vertical stack — no panel, whitespace does the work. */
.lower-third-box {
  display: flex;                   /* flex so \`order\` can slot the underline between lines */
  flex-direction: column;          /* stack the lines vertically */
  gap: calc(10px * var(--scale));  /* small breathing room above and below the underline */
}

/* The accent underline — short on purpose: a mark, not a rule across the text. */
.lower-third-accent {
  order: 1;                        /* after the name (order 0), before the title (order 2) */
  width: calc(72px * var(--scale));  /* a short stroke — never stretched to the text width */
  height: calc(3px * var(--scale));  /* hairline weight */
  background: var(--accent);       /* the one accent color */
  will-change: transform;          /* hint the browser: line-reveal scales this */
}

/* Every line after the name drops below the underline (the name keeps default order 0). */
.lower-third-mask:nth-child(n + 2) {
  order: 2;                        /* below the underline (order 1) */
}

/* Name line — the big moment. */
.lower-third-name {
  font-size: calc(56px * var(--scale));  /* headline size */
  font-weight: 600;                /* strong without shouting */
  line-height: 1.08;               /* tight leading for big text */
  letter-spacing: -0.01em;         /* big text tightens */
  color: var(--text-color);        /* primary text color */
}

/* Title line — small caps, dimmed, quiet. */
.lower-third-title {
  font-size: calc(23px * var(--scale));  /* clearly subordinate to the name */
  font-weight: 400;                /* light against the semibold name */
  line-height: 1.3;                /* relaxed leading at small sizes */
  letter-spacing: 0.04em;          /* uppercase letters need room to breathe */
  text-transform: uppercase;       /* reads as a label, not a sentence */
  color: var(--text-dim);          /* dimmed — never pure white for both lines */
}`,
    hasAccent: true,
  }),
);
