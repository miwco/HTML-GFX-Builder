// ls12 "Caster Deck" — the shoutcaster's own strap.
//
// A caster is not a player and is not a pundit: they are on the broadcast every match, they
// are known by a handle rather than by a surname, and the thing an audience wants from their
// strap is where to follow them. So this graphic leads with the handle — set as a handle,
// with the @ drawn by the CSS so nobody types it into a field — puts the human name beneath
// it, and marks the job with a chip rather than a line of type.
//
// The house look, because a caster strap is the broadcaster's furniture: it is up several
// times an hour for a whole tournament, and it has to sit quietly under that repetition.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls12: TemplateVariant = defineVariant(
  {
    id: 'ls12',
    category: 'lower-third',
    name: 'Caster Deck',
    styleTag: 'noacg',
    description: 'The caster handle led large, with the human name beneath and a role chip.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Handle', sample: 'valkyrie' },
      { title: 'Name', sample: 'Priya Raghavan' },
      { title: 'Role', sample: 'Play-by-play' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'line-reveal', 'mask-wipe', 'pop-spring', 'fade', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Caster Deck',
    description:
      'The desk strap: the caster handle set large with the @ drawn by the CSS, the human ' +
      'name beneath it, and the job carried by a small mono chip rather than another line of ' +
      'type. Built for repetition — it is on screen several times an hour across a whole ' +
      'tournament, so it stays quiet.',
    uicolor: '4',
  },
  (o) => {
    const roleChip = hasLine(o, 2)
      ? `      <!-- ${o.lines[2].title} (f2) — the job, as a chip rather than a third line of type. -->
      <div class="lower-third-mask lower-third-chipwrap"><span id="f2" class="lower-third-extra">${o.lines[2].sample}</span></div>
`
      : '';

    return {
      html: `    <!-- House structure: [8px accent bar] | [void panel: handle, name, role chip]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${slot(o, 0, 'lower-third-name')}
      <div class="lower-third-footrow">
${slot(o, 1, 'lower-third-title', '        ')}
${roleChip}      </div>
    </div>`,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The accent bar — 8px, fused to the panel's left edge, with the house's one glow. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's accent glow */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void, starting where the accent bar ends. */
.lower-third-box {
  margin-left: calc(8px * var(--scale));    /* starts where the accent bar ends */
  padding: calc(20px * var(--scale)) calc(52px * var(--scale)) calc(22px * var(--scale)) calc(30px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
}

/* The handle (f0) — the strap's headline. The @ is DRAWN, so an operator types the handle
   and never the sigil, and a value pasted with one already on it doesn't end up with two. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}
.lower-third-name::before {
  content: "@";                     /* owned by the design, never by the field */
  margin-right: calc(3px * var(--scale));  /* sits tight against the handle */
  color: var(--accent);             /* the sigil is the accent's one appearance in the type */
}

/* The foot row: the human name and the role chip, on one baseline. */
.lower-third-footrow {
  display: flex;                    /* name and chip in a row… */
  flex-wrap: wrap;                  /* …wrapping only when they genuinely don't fit */
  align-items: baseline;            /* the chip sits on the name's baseline */
  gap: calc(14px * var(--scale));
  margin-top: calc(10px * var(--scale));  /* a clear break below the handle */
  min-width: 0;                     /* allow shrinking */
}
.lower-third-footrow > .lower-third-mask {
  display: flex;                    /* each value hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The human name (f1) — quieter than the handle, because that is the billing order here. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* clearly below the handle */
  font-weight: 400;                 /* regular — hierarchy comes from the handle's weight */
  line-height: 1.25;                /* room if the name wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
}

/* The role chip (f2) — the house label voice inside an outlined pill. */
.lower-third-chipwrap {
  flex: none;                       /* the chip keeps its size whatever the name does */
}
.lower-third-extra {
  display: block;                   /* the chip's box is this element */
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(14px * var(--scale) * var(--type-scale));  /* chip type is small by definition */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1;                   /* the chip's height comes from its padding */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* PLAY-BY-PLAY, whatever the operator types */
  padding: calc(5px * var(--scale)) calc(10px * var(--scale)) calc(6px * var(--scale));
  border-radius: calc(4px * var(--scale));  /* a squared chip — the house doesn't use pills */
  color: var(--label-color);        /* the family's label color */
  box-shadow: inset 0 0 0 1px currentColor;  /* outlined in its OWN colour, so a repalette
                                                takes the outline with the text — a hard-coded
                                                tint here would survive the Style panel */
  opacity: 0.85;                    /* the outline reads as a hairline rather than a border */
  white-space: nowrap;              /* a job title chip never breaks mid-word */
}`,
      hasAccent: true,
    };
  },
);
