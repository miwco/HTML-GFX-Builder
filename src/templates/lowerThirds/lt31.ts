// lt31 "Standfirst" — the editorial NAME-ONLY strap: a short rule, then one line of type on a flat
// printed panel. It is the compact end of the editorial family and the counterpart of lt19 Rule
// Under: same job, opposite construction — lt19 has no panel and puts its rule below the name,
// this one sits on ink and opens with the rule, the way a standfirst opens a printed piece.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt31: TemplateVariant = defineVariant(
  {
    id: 'lt31',
    category: 'lower-third',
    name: 'Standfirst',
    styleTag: 'editorial',
    description: 'Name only, opened by a short rule, set on a flat printed panel.',
    maxLines: 1,
    suggestedLines: [{ title: 'Name', sample: 'Alexandra Riva' }],
    logo: 'none',
    animationPresets: ['line-reveal', 'mask-wipe', 'fade', 'slide-up', 'slide-left'],
    defaultPalette: paletteById('vermilion'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Standfirst',
    description:
      'One name on a flat ink panel, opened by a short accent rule. The compact editorial strap ' +
      'for when the role is already known — a returning guest, a named correspondent, a host. ' +
      'Set in condensed Oswald by default, which is the printed-headline voice of the family.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Standfirst: [short rule] then [one name] on a flat printed panel. -->
    <div class="lower-third-box">
      <div class="lower-third-accent"></div>
${lineMasks(o, '      ')}
    </div>`,
    css: `/* The panel — editorial's flat printed surface: no radius, no blur, no chip. */
.lower-third-box {
  display: flex;                    /* the rule and the name sit side by side */
  align-items: center;              /* …vertically centred against each other */
  gap: calc(20px * var(--scale));   /* the printed margin between them */
  padding: calc(16px * var(--scale)) calc(34px * var(--scale)) calc(18px * var(--scale)) calc(26px * var(--scale));
  background: var(--panel-bg);      /* ink by default; paper on the Broadsheet palette */
  box-shadow: var(--panel-shadow);  /* the family's restrained lift */
}

/* The rule — short, vertical, opening the line the way a standfirst mark does. */
.lower-third-accent {
  width: var(--accent-weight);      /* the family's printed-rule weight */
  align-self: stretch;              /* full height of the panel's text row */
  background: var(--accent);        /* the one accent surface in the design */
  flex: none;                       /* never squeezed by a long name */
  will-change: transform;           /* hint the browser: presets animate this rule */
}

/* The name — the graphic's only voice. Condensed, so a long name still fits one row. */
.lower-third-name {
  font-size: calc(50px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.06;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}`,
    hasAccent: true,
  }),
);
