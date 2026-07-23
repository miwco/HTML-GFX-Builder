// ls05 "Studio Pair" — host and guest stacked, not side by side.
//
// The other way studio shows name a pair, and the one that survives a tight shot: the guest
// gets a full-width row of their own, and the host is folded into a thin sub-bar beneath it,
// set inline with a connecting word. It is the composition a magazine show uses when the
// guest is in a single, because a side-by-side strap under a single-camera shot implies a
// two-shot that isn't there.
//
// The sub-bar is where the design earns its keep: name and role sit INLINE there, separated
// by a middot the CSS draws (never a character an operator has to type), so the host reads as
// one credit rather than as a second stacked block competing with the guest's.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { fontById, labelFontFaceCss } from '../../../model/fonts';
import { defineVariant } from '../shared';
import { hasLine, slot } from './shared';

export const ls05: TemplateVariant = defineVariant(
  {
    id: 'ls05',
    category: 'lower-third',
    name: 'Studio Pair',
    styleTag: 'noacg',
    roleTag: 'talk',
    keywords: ['talk show', 'magazine', 'podcast', 'presenter', 'guest', 'with', 'two people'],
    description: 'The guest on a full row with the host folded into a thin sub-bar beneath.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Guest name', sample: 'Amara Osei' },
      { title: 'Guest role', sample: 'Author · The Long Season' },
      { title: 'Host name', sample: 'Daniel Reyes' },
      { title: 'Host role', sample: 'Presenter' },
    ],
    logo: 'none',
    // The house entrance: the bar grows, the guest's row rises, the sub-bar follows last —
    // the reveal order and the hierarchy are the same order, which is the point.
    animationPresets: ['line-reveal', 'slide-up', 'mask-wipe', 'fade', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Studio Pair',
    description:
      'The vertical pairing: the guest on their own full row over the house void panel, the ' +
      'host folded into a thin sub-bar below, name and role set inline behind a drawn middot. ' +
      'Built for a single-camera shot, where a side-by-side strap would imply a two-shot ' +
      'that is not on screen. All four values are independent SPX fields.',
    uicolor: '4',
  },
  (o) => {
    // The sub-bar only exists if there is a host to put in it — with two lines or fewer this
    // design is simply the house strap, and it must not draw an empty rail under itself.
    const subBar = hasLine(o, 2)
      ? `
      <!-- The host sub-bar: name and role inline, the middot drawn by the CSS. -->
      <div class="lower-third-subbar">
${slot(o, 2, 'lower-third-extra', '        ')}
${slot(o, 3, 'lower-third-hostrole', '        ')}
      </div>`
      : '';

    return {
      html: `    <!-- House structure: [8px accent bar] | [void panel: guest row, then the host sub-bar]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
${slot(o, 0, 'lower-third-name')}
${slot(o, 1, 'lower-third-title')}${subBar}
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
  padding: calc(24px * var(--scale)) calc(64px * var(--scale)) 0 calc(34px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* the family's panel lift */
  padding-bottom: calc(24px * var(--scale));  /* closes the panel when there is no host rail;
                                                 the rail cancels it with a negative margin */
}

/* The guest's name (f0) — the strap's one heavy element. */
.lower-third-name {
  font-size: calc(48px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;                /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The guest's role (f1) — the quiet middle voice. */
.lower-third-title {
  font-size: calc(26px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.25;                /* room if the role wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(10px * var(--scale));  /* a clear but connected break below the name */
}

/* ── The host sub-bar ──
   A rail rather than a block: full panel width (the negative margins pull it back out to
   the panel's own padding), a hairline above it, and the two values set INLINE. */
.lower-third-subbar {
  display: flex;                    /* name and role on one line… */
  flex-wrap: wrap;                  /* …wrapping only if the pair really is too long */
  align-items: baseline;            /* both credits share a baseline */
  gap: calc(10px * var(--scale));   /* the middot below sits in this gap */
  /* The negative margins pull the rail back out to the panel's own padding on three sides —
     including the BOTTOM, so the rail closes the panel instead of floating above a strip of
     it. The box keeps its bottom padding for the case where there is no host to put here. */
  margin: calc(18px * var(--scale)) calc(-64px * var(--scale)) calc(-24px * var(--scale)) calc(-34px * var(--scale));
  padding: calc(12px * var(--scale)) calc(64px * var(--scale)) calc(14px * var(--scale)) calc(34px * var(--scale));
  border-top: 1px solid rgba(255, 255, 255, 0.10);  /* the rail's own edge */
  background: rgba(0, 0, 0, 0.28);  /* a shade darker than the panel — a rail, not a stripe */
}

/* The host's name (f2) — a credit, not a headline: the guest is the story. */
.lower-third-extra {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* well under the guest's role line */
  font-weight: 600;                 /* semibold — it is still a name */
  line-height: 1.2;                 /* single tight credit line */
  color: var(--text-dim);           /* dimmed — the rail is the quiet register */
}

/* The host's role (f3) — the house label voice, behind a middot the CSS draws so no
   operator ever has to type punctuation into a name field. */
.lower-third-hostrole {
  font-family: var(--font-label);   /* the family's label face */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the smallest voice on the strap */
  font-weight: 500;                 /* medium keeps tracked caps crisp */
  line-height: 1.3;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* label voice */
  color: var(--label-color);        /* the family's label color */
}
.lower-third-hostrole::before {
  content: "·";                     /* the separator is DRAWN, never typed into a field */
  margin-right: calc(10px * var(--scale));  /* balances the flex gap on the other side */
  color: var(--text-dim);           /* quieter than the label it introduces */
}

/* A mask is display:block by default here; the sub-bar's children must sit inline. */
.lower-third-subbar > .lower-third-mask {
  display: flex;                    /* keeps each credit's mask hugging its own text */
  min-width: 0;                     /* …and lets it shrink rather than push the rail wide */
}`,
      hasAccent: true,
    };
  },
);
