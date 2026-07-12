// lt12 "House Breaking" — the NoaCG breaking-news banner, rebuilt from the brand kit's
// lower-third-breaking overlay: a solid accent label chip (dark mono ink) sitting on top
// of a void blur headline panel with the 8px house bar as its left border. Sibling of
// lt11 House Strap — same bar, same void, the chip turned up for urgency.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineVariant, lineClass } from './shared';

export const lt12: TemplateVariant = defineVariant(
  {
    id: 'lt12',
    category: 'lower-third',
    name: 'House Breaking',
    styleTag: 'noacg',
    description: 'Breaking banner: solid accent label chip over a void headline panel with the house bar.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Headline', sample: 'Coalition talks reach midnight deadline' },
      { title: 'Label', sample: 'Breaking' },
    ],
    hasLogoSlot: false,
    animationPresets: ['line-reveal', 'slide-fade', 'mask-wipe', 'fade', 'drop-in', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Breaking',
    description:
      'The house family with the urgency turned up: a solid accent chip (label in dark mono ' +
      'caps) stacked on a void blur panel whose left edge is the 8px house bar, carrying one ' +
      'bold headline. Sibling of lt11 House Strap.',
    uicolor: '6',
  },
  (o) => {
    // The chip (label, f1) sits ABOVE the headline (f0), so the masks are emitted in
    // visual order — chip first — instead of via lineMasks() (field order stays f0/f1).
    const mask = (i: number) =>
      `      <!-- ${o.lines[i].title} (f${i}) — SPX writes this field's value straight into the element. -->\n` +
      `      <div class="lower-third-mask"><span id="f${i}" class="${lineClass(i)}">${o.lines[i].sample}</span></div>`;
    const chip = o.lines.length > 1 ? mask(1) + '\n' : '';

    return {
      html: `    <!-- House Breaking: accent label chip stacked on the void headline panel. -->
    <div class="lower-third-box">
${chip}${mask(0)}
    </div>`,
      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The stack — transparent itself: the chip and the panel carry their own surfaces. */
.lower-third-box {
  display: flex;                   /* chip and headline stack… */
  flex-direction: column;          /* …top to bottom */
  align-items: flex-start;         /* both blocks hug the left edge */
  filter: drop-shadow(0 16px 50px rgba(0, 0, 0, 0.5));  /* one deep shadow under both blocks */
}

/* The label chip (f1) — a solid accent surface with dark mono ink and the house glow. */
.lower-third-title {
  display: inline-block;           /* a chip, not a full-width bar */
  padding: calc(9px * var(--scale)) calc(26px * var(--scale));  /* compact plate around the label */
  background: var(--accent);       /* the one solid accent surface */
  font-family: "JetBrains Mono", Consolas, "Courier New", monospace;  /* the house label face */
  font-size: calc(18px * var(--scale));  /* small — urgency comes from contrast, not size */
  font-weight: 700;                /* bold mono caps read as a stamp */
  letter-spacing: 0.24em;          /* wide tracking — the label breathes */
  text-transform: uppercase;       /* BREAKING, whatever the operator types */
  color: rgba(10, 12, 16, 0.95);   /* dark ink on the accent plate (house void) */
  box-shadow: 0 0 calc(26px * var(--scale)) color-mix(in srgb, var(--accent) 45%, transparent);
}

/* The headline panel (f0) — the house void with the 8px bar as its left border. */
.lower-third-name {
  display: inline-block;           /* the panel hugs the headline text */
  padding: calc(26px * var(--scale)) calc(60px * var(--scale)) calc(30px * var(--scale)) calc(32px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: blur(8px);      /* the house blur */
  -webkit-backdrop-filter: blur(8px);  /* Safari spelling of the same effect */
  border-left: calc(8px * var(--scale)) solid var(--accent);  /* the house bar, fused to the panel */
  font-size: calc(46px * var(--scale));  /* headline size — one strong statement */
  font-weight: 700;                /* full display weight */
  line-height: 1.12;               /* wrapped headlines stay compact */
  color: var(--text-color);        /* primary text color */
}`,
      hasAccent: false, // the accent moments are the chip and the panel border, not a bar element
    };
  },
);
