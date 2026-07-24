// ls31 "Creator Stack" — the multi-platform identity.
//
// The catalog already has four compact single-handle marks (lt14/16/17/18), and this is
// deliberately not a fifth. A creator's problem is the opposite of a broadcaster's: they are
// not one handle on one network, they are the same person across three or four, and the
// graphic that matters is the one they run at the end of a stream telling the audience where
// else to find them.
//
// So the composition is a name over a ROW OF HANDLE CHIPS — each its own SPX field, each
// carrying the platform as a prefix the operator types ("YouTube /noacg", "@noacg"). Chips
// rather than lines, because a list of three addresses set as three lines of type reads as a
// paragraph nobody finishes, while three chips read as three places at a glance.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls31: TemplateVariant = defineVariant(
  {
    id: 'ls31',
    category: 'lower-third',
    name: 'Creator Stack',
    styleTag: 'noacg',
    description: 'A creator name over a row of handle chips — one chip per platform, each its own field.',
    maxLines: 5,
    suggestedLines: [
      { title: 'Name', sample: 'Noa Haline' },
      { title: 'What they do', sample: 'Broadcast graphics, live every Tuesday' },
      { title: 'Handle 1', sample: '@noacg' },
      { title: 'Handle 2', sample: 'youtube.com/@noacg' },
      { title: 'Handle 3', sample: 'twitch.tv/noacg' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'pop-spring', 'line-reveal', 'fade', 'blur-in', 'mask-wipe'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Creator Stack',
    description:
      'The follow-me strap: the creator name and what they do, over a row of handle chips — ' +
      'one per platform, each an independent SPX field, so a channel is added or dropped ' +
      'without retyping the rest. Chips rather than lines, because three addresses stacked as ' +
      'type read as a paragraph and three chips read as three places.',
    uicolor: '4',
  },
  (o) => {
    const handles = [2, 3, 4].filter((i) => hasLine(o, i));
    // Steps mode is genuinely useful here: an outro can reveal one platform per Continue.
    const handleRow = handles.length
      ? `
      <!-- One chip per platform. Each is its own field, so a channel is added or dropped
           without touching the others. -->
      <div class="lower-third-handles">
${handles.map((i) => slot(o, i, 'lower-third-handle', '        ')).join('\n')}
      </div>`
      : '';

    return {
      html: `    <!-- House structure: [8px accent bar] | [void panel: name, line, handle chips]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${slot(o, 0, 'lower-third-name')}
${slot(o, 1, 'lower-third-title')}${handleRow}
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
  padding: calc(22px * var(--scale)) calc(48px * var(--scale)) calc(22px * var(--scale)) calc(32px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  max-width: calc(780px * var(--scale));  /* three chips and a sentence need the room */
}

/* The name (f0) — the strap's headline. */
.lower-third-name {
  font-size: calc(44px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.06;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* What they do (f1) — a sentence, not a job title, so it is set as running text. */
.lower-third-title {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.3;                 /* a sentence wraps — give the rows air */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(8px * var(--scale));  /* tied to the name above it */
}

/* The handle row — chips wrap onto a second line rather than shrinking, because a truncated
   address is worse than a taller strap. */
.lower-third-handles {
  display: flex;                    /* the chips sit in a row… */
  flex-wrap: wrap;                  /* …and wrap when they run out of width */
  align-items: center;              /* an evenly aligned row of chips */
  gap: calc(9px * var(--scale));    /* even air between chips, in both directions */
  margin-top: calc(15px * var(--scale));  /* the handles are their own beat */
  min-width: 0;                     /* allow shrinking */
}
.lower-third-handles > .lower-third-mask {
  display: flex;                    /* each chip hugs its own address */
  border-radius: calc(4px * var(--scale));  /* the mask clips to the chip's own corner */
}

/* One handle chip — the house label voice, outlined, in the accent. */
.lower-third-handle {
  display: block;                   /* the chip's box is this element */
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* an address has to stay readable */
  font-weight: 500;                 /* medium keeps mono type crisp */
  line-height: 1.1;                 /* the chip's height comes from its padding */
  letter-spacing: 0.01em;           /* addresses are read character by character */
  padding: calc(7px * var(--scale)) calc(12px * var(--scale)) calc(8px * var(--scale));
  border-radius: calc(4px * var(--scale));  /* a squared chip — the house doesn't use pills */
  color: var(--accent);             /* the chips carry the colour… */
  box-shadow: inset 0 0 0 1px currentColor;  /* …and outline themselves in it, so a repalette
                                                takes the outline with the text */
  opacity: 0.92;                    /* the outline reads as a hairline, not a border */
  white-space: nowrap;              /* an address never breaks mid-word */
}`,
      hasAccent: true,
    };
  },
);
