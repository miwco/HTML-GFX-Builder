// bug10 "Frost Live" — the GLASS live bug: a small frosted pill with a breathing accent dot
// and the status word beside it. Live / Replay / Standby are real machine states (the graphic
// type's), each with its own editable wording. Sibling of lt08 Frosted Card and bug01 Glass
// Mark. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { liveStatusJs } from './bugRuntimes';
import { statusSourcesHtml, statusSourceFields, statusStateCss, STATUS_SOURCE_CSS } from './statusParts';

export const bug10: TemplateVariant = defineBugVariant(
  {
    id: 'bug10',
    category: 'corner-bug',
    name: 'Frost Live',
    styleTag: 'glass',
    description: 'A frosted live pill: a breathing accent dot beside a switchable status word.',
    maxLines: 1,
    suggestedLines: [{ title: 'Status', sample: 'LIVE' }],
    logo: 'none',
    animationPresets: ['blur-in', 'pop-spring', 'fade', 'slide-down', 'slide-left'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'top-right',
  },
  {
    name: 'Frost Live',
    description:
      'A compact frosted pill carrying the on-air status: a breathing accent dot and the ' +
      'status word in soft caps. Live, Replay and Standby are real machine states the operator ' +
      'switches from the control panel, each with its own wording.',
    uicolor: '3',
  },
  (o) => {
    // The three status words are ordinary operator fields held in hidden sources; the machine
    // copies the entered mode's word into the visible status element (#f0).
    const base = o.lines.length + o.extraFields.length;
    const ids = { status: 'f0', live: `f${base}`, replay: `f${base + 1}`, standby: `f${base + 2}` };

    return {
      html: `    <!-- Frost Live: the breathing dot, then the status word, in one frosted pill. -->
    <div class="corner-bug-box">
      <div class="corner-bug-dot"></div>
${bugLineMasks(o)}
    </div>
${statusSourcesHtml(ids)}`,

      extraFields: statusSourceFields(ids),

      runtimeExtraJs: liveStatusJs(ids),

      css: `/* The pill — translucent glass, heavy blur, hairline keyline, one soft lift. */
.corner-bug-box {
  display: flex;                   /* the dot and the word sit side by side */
  align-items: center;             /* both centered on the pill's axis */
  gap: calc(10px * var(--scale));  /* air between the dot and the word */
  padding: calc(9px * var(--scale)) calc(18px * var(--scale));  /* even air inside the pill */
  background: var(--panel-bg);     /* translucent white — the glass tint */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: 999px;            /* fully rounded — the glass family's pill */
  box-shadow: var(--panel-keyline), var(--panel-shadow);  /* the family's keyline and lift */
}

/* The dot — the accent moment, breathing while the show is live. */
.corner-bug-dot {
  width: calc(10px * var(--scale));   /* a small dot… */
  height: calc(10px * var(--scale));  /* …round */
  border-radius: 50%;              /* the on-air lamp */
  background: var(--accent);       /* the one accent colour */
  flex: none;                      /* never squeezed by the word beside it */
  animation: corner-bug-breathe 2s ease-in-out infinite;  /* the quiet on-air pulse */
}

/* One restrained pulse — a live lamp reads as alive without pulling focus. */
@keyframes corner-bug-breathe {
  0%, 100% { opacity: 1; }         /* full at both ends… */
  50% { opacity: 0.35; }           /* …dipping in the middle */
}

/* The status word (f0) — soft caps, sized to sit in the corner all show long. */
.corner-bug-name {
  font-size: calc(15px * var(--scale) * var(--type-scale));   /* small label size */
  font-weight: 600;                /* semibold keeps small caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--text-color);        /* primary text — the word is the readable line */
}

${STATUS_SOURCE_CSS}

${statusStateCss()}`,

      hasAccent: false, // the accent moment is the status dot, not a separate bar element
    };
  },
);
