// lt28 "Feature Center" — the centre-anchored editorial strap: a tracked kicker, a rule under it,
// then the name and role centred beneath. It is the title-page grammar of a feature article, which
// is symmetric by construction — the case DESIGN_LANGUAGE §1 allows centring for.
//
// The rule is a FLEX ITEM in the same column as the lines, not an absolutely positioned bar at a
// hard-coded offset: the kicker can wrap, the text scale can change, and the rule still lands
// exactly between the kicker and the name. Its place in the column comes from `order` plus DOM
// order — flex breaks an order tie by document position, which puts it after the kicker's mask.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt28: TemplateVariant = defineVariant(
  {
    id: 'lt28',
    category: 'lower-third',
    name: 'Feature Center',
    styleTag: 'editorial',
    description: 'Centred kicker, a rule, then the name and role — a feature title page on air.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Alexandra Riva' },
      { title: 'Role', sample: 'Chief Correspondent' },
      { title: 'Section', sample: 'The Long Read' },
    ],
    logo: 'none',
    animationPresets: ['fade', 'line-reveal', 'blur-in', 'slide-up', 'mask-wipe'],
    defaultPalette: paletteById('broadsheet'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Feature Center',
    description:
      'A feature title page as a lower third: the section or strand name as a centred kicker, a ' +
      'rule under it, then the name and role. Ships on the light Broadsheet palette — ink on ' +
      'paper — so it reads as print rather than as an overlay. Sibling of lt25 Masthead.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Feature Center: [section kicker] / [rule] / [name] / [role], all centred. -->
    <div class="lower-third-box">
${lineMasks(o, '      ')}
      <div class="lower-third-accent"></div>
    </div>`,
    css: `/* The paper — editorial's flat printed surface. No radius, no blur, no chip: the family
   uses a panel only where the type needs a page to sit on. The box is a flex COLUMN, which is
   what lets the kicker and the rule be ordered independently of the field order. */
.lower-third-box {
  display: flex;                    /* the lines and the rule are ordered flex items */
  flex-direction: column;           /* one item per row, top to bottom */
  text-align: center;               /* the symmetric composition this design is built on */
  padding: calc(24px * var(--scale)) calc(56px * var(--scale)) calc(28px * var(--scale));
  background: var(--panel-bg);      /* paper by default (Broadsheet), ink on a dark palette */
  box-shadow: var(--panel-shadow);  /* the family's restrained lift */
}

/* The rule — an item in the column, so it always lands between the kicker and the name
   however the kicker wraps. It shares the kicker's order value; flex breaks the tie by
   document order, and the rule comes after the masks in the HTML. */
.lower-third-accent {
  order: -1;                        /* up with the kicker, above name and role */
  height: var(--accent-weight);     /* the family's printed-rule weight */
  margin: calc(14px * var(--scale)) 0 calc(20px * var(--scale));  /* the air the rule sits inside */
  background: var(--accent);        /* the one accent surface in the design */
  will-change: transform;           /* hint the browser: presets draw this rule in */
}

/* The section kicker (f2) — printed first, above the rule, though it is the last data
   field: ordering moves the flex ITEM (the mask div), so the operator's field order stands. */
.lower-third-mask:nth-child(3) {
  order: -1;                        /* renders above the name and role */
}
.lower-third-extra {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* small — the tracking gives it presence */
  font-weight: 600;                 /* small caps need weight to stay crisp */
  line-height: 1.3;                 /* a single tight kicker line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* whatever the operator types reads as a kicker */
  color: var(--label-color);        /* the family's label colour (the accent) */
}

/* The name — editorial weight: set, not shouted. */
.lower-third-name {
  font-size: calc(48px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.08;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The role — the quiet closing line. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 400;                 /* regular weight; contrast comes from the name */
  line-height: 1.3;                 /* secondary text gets room to breathe */
  letter-spacing: 0.03em;           /* a touch open — short centred lines look tight otherwise */
  color: var(--text-dim);           /* dimmed — never full-strength ink twice */
  margin-top: calc(6px * var(--scale));  /* name + role read as one unit */
}`,
    hasAccent: true,
  }),
);
