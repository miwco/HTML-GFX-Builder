// bug09 "House Live" — the NoaCG LIVE bug: a void chip with a breathing amber dot and the
// status word in the house mono label voice. The status is REAL state, not decoration: the
// graphic type's machine gives the operator Live / Replay / Standby, each swapping the word
// (from its own editable field) and re-tagging the bug so the CSS recolours the dot.
// Sibling of lt11 House Strap and bug02 House Clock. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineBugVariant, bugLineMasks } from './shared';
import { liveStatusJs } from './bugRuntimes';
import { statusSourcesHtml, statusSourceFields, statusStateCss, STATUS_SOURCE_CSS } from './statusParts';

export const bug09: TemplateVariant = defineBugVariant(
  {
    id: 'bug09',
    category: 'corner-bug',
    name: 'House Live',
    styleTag: 'noacg',
    description: 'The house live bug: a void chip, a breathing amber dot, and a switchable status word.',
    maxLines: 1,
    suggestedLines: [{ title: 'Status', sample: 'LIVE' }],
    logo: 'none',
    animationPresets: ['pop-spring', 'fade', 'blur-in', 'slide-down', 'slide-left'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'top-right',
  },
  {
    name: 'House Live',
    description:
      'The house on-air status mark: a small void chip with a breathing amber dot and the ' +
      'status word in mono caps. Live, Replay and Standby are real machine states — the ' +
      'operator switches them from the control panel and each carries its own wording.',
    uicolor: '4',
  },
  (o) => {
    // The three status words are ordinary operator fields held in hidden sources: the machine
    // copies the one for the mode it enters into the visible status element (#f0).
    const base = o.lines.length + o.extraFields.length;
    const ids = { status: 'f0', live: `f${base}`, replay: `f${base + 1}`, standby: `f${base + 2}` };

    return {
      html: `    <!-- House Live: the breathing dot, then the status word. -->
    <div class="corner-bug-box">
      <div class="corner-bug-dot"></div>
${bugLineMasks(o)}
    </div>
${statusSourcesHtml(ids)}`,

      extraFields: statusSourceFields(ids),

      runtimeExtraJs: liveStatusJs(ids),

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The chip — the house void tint holding the dot and the word as one small lockup. */
.corner-bug-box {
  display: flex;                   /* the dot and the word sit side by side */
  align-items: center;             /* both centered on the chip's axis */
  gap: calc(10px * var(--scale));  /* air between the dot and the word */
  padding: calc(9px * var(--scale)) calc(16px * var(--scale));  /* even air inside the chip */
  background: var(--panel-bg);     /* the void panel */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the house chip is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's lift */
}

/* The dot — the accent moment, breathing while the show is live. */
.corner-bug-dot {
  width: calc(11px * var(--scale));   /* a small dot… */
  height: calc(11px * var(--scale));  /* …round */
  border-radius: 50%;              /* the on-air lamp */
  background: var(--accent);       /* the one accent colour */
  box-shadow: var(--accent-glow);  /* the house glow, on the accent only */
  flex: none;                      /* never squeezed by the word beside it */
  animation: corner-bug-breathe 2s ease-in-out infinite;  /* the quiet on-air pulse */
}

/* One restrained pulse — a live lamp reads as alive without pulling focus. */
@keyframes corner-bug-breathe {
  0%, 100% { opacity: 1; }         /* full at both ends… */
  50% { opacity: 0.35; }           /* …dipping in the middle */
}

/* The status word (f0) — the house mono label voice at chip scale. */
.corner-bug-name {
  font-family: var(--font-label);  /* the house mono label face */
  font-size: calc(15px * var(--scale) * var(--type-scale));   /* small label size */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the house label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--text-color);        /* primary text — the word is the readable line */
}

${STATUS_SOURCE_CSS}

${statusStateCss()}`,

      hasAccent: false, // the accent moment is the status dot, not a separate bar element
      tokens: { labelColor: 'var(--text-color)' },
    };
  },
);
