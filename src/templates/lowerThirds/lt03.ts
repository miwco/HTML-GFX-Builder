// lt03 "Side Tag" — a quiet dark panel with a hairline keyline and a slim vertical accent
// bar on its left edge. Understated broadcast professionalism: the whitespace and the type
// hierarchy do the work; the accent appears in one small, sharp dose.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt03: TemplateVariant = defineVariant(
  {
    id: 'lt03',
    category: 'lower-third',
    name: 'Side Tag',
    styleTag: 'minimal',
    description: 'A quiet keyline panel with a slim vertical accent bar - understated and professional.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Dr. Amara Okafor' },
      { title: 'Title', sample: 'Climate Researcher' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'line-reveal', 'mask-wipe', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Side Tag',
    description:
      'A calm dark panel with a 1px keyline border and a 4px accent bar hugging its left edge. '
      + 'Big confident name, dimmed title, optional small-caps kicker in the accent color.',
    uicolor: '3',
  },
  (o) => ({
    html: `    <!-- Structure: a vertical accent bar overlaying the panel's left edge, then the
         panel (.lower-third-box) holding one mask-wrapped element per text line. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${lineMasks(o)}
    </div>`,

    css: `/* The panel: a quiet dark card with generous padding and a hairline keyline. */
.lower-third-box {
  background: var(--panel-bg);                     /* the panel color (retint via :root) */
  border: 1px solid rgba(255, 255, 255, 0.14);     /* hairline keyline lifts the panel off video */
  border-radius: calc(2px * var(--scale));         /* barely-there corner rounding (minimal style) */
  padding: calc(18px * var(--scale)) calc(28px * var(--scale));  /* generous breathing room */
}

/* The accent moment: a slim vertical bar hugging the panel's left edge, full height. */
.lower-third-accent {
  position: absolute;                              /* positioned over the panel's left edge */
  left: 0;                                         /* flush with the panel's left side */
  top: 0;                                          /* stretches from the panel's top… */
  bottom: 0;                                       /* …to its bottom (full height) */
  width: calc(4px * var(--scale));                 /* slim bar — the one sharp dose of accent */
  background: var(--accent);                       /* the single accent color */
  will-change: transform, opacity;                 /* hint the browser: this element animates */
}

/* Line 1 — the name: big and confident, pure white. */
.lower-third-name {
  font-size: calc(48px * var(--scale) * var(--type-scale));            /* headline scale */
  font-weight: 700;                                /* bold carries the hierarchy */
  line-height: 1.1;                                /* tight — big text needs less leading */
  letter-spacing: -0.01em;                         /* big text tightens slightly */
  color: var(--text-color);                        /* primary text color */
}

/* Line 2 — the title: half the size, dimmed, clearly secondary. */
.lower-third-title {
  font-size: calc(24px * var(--scale) * var(--type-scale));            /* ~2:1 ratio under the name */
  font-weight: 400;                                /* regular weight keeps it quiet */
  line-height: 1.3;                                /* comfortable for a smaller line */
  color: var(--text-dim);                          /* dimmed — never pure white twice */
}

/* Line 3 (optional) — a small-caps kicker in the accent color. */
.lower-third-extra {
  font-size: calc(19px * var(--scale) * var(--type-scale));            /* smallest line in the stack */
  font-weight: 600;                                /* semibold keeps small caps legible */
  line-height: 1.3;                                /* matches the title's rhythm */
  text-transform: uppercase;                       /* small-caps label treatment */
  letter-spacing: 0.12em;                          /* small caps breathe */
  color: var(--accent);                            /* the accent's second, tiny appearance */
}

/* Lines read as one unit: a small, even gap between them. */
.lower-third-mask + .lower-third-mask {
  margin-top: calc(6px * var(--scale));            /* gap between stacked lines */
}`,

    hasAccent: true,
  }),
);
