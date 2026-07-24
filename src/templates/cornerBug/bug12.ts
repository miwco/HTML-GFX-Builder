// bug12 "Signal Live" — the MINIMAL live bug: no panel, just a breathing accent dot and the
// status word over the video, carried by a soft text shadow. Live / Replay / Standby are real
// machine states with their own editable wording. Sibling of lt01 Hairline and bug04 Hairline
// Bug. See docs/DESIGN_LANGUAGE.md §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { liveStatusJs } from './bugRuntimes';
import { statusSourcesHtml, statusSourceFields, statusStateCss, STATUS_SOURCE_CSS } from './statusParts';

export const bug12: TemplateVariant = defineBugVariant(
  {
    id: 'bug12',
    category: 'corner-bug',
    name: 'Signal Live',
    styleTag: 'minimal',
    description: 'A panel-free live mark: a breathing accent dot beside a switchable status word.',
    maxLines: 1,
    suggestedLines: [{ title: 'Status', sample: 'LIVE' }],
    logo: 'none',
    animationPresets: ['fade', 'blur-in', 'slide-left', 'slide-down', 'pop-spring'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'inter',
    defaultZone: 'top-right',
  },
  {
    name: 'Signal Live',
    description:
      'No panel: a breathing red lamp and the status word sit straight on the video, with a ' +
      'soft text shadow for bright footage. Live, Replay and Standby are real machine states ' +
      'the operator switches from the control panel, each with its own wording.',
    uicolor: '2',
  },
  (o) => {
    // The three status words are ordinary operator fields held in hidden sources; the machine
    // copies the entered mode's word into the visible status element (#f0).
    const base = o.lines.length + o.extraFields.length;
    const ids = { status: 'f0', live: `f${base}`, replay: `f${base + 1}`, standby: `f${base + 2}` };

    return {
      html: `    <!-- Signal Live: no panel — the breathing lamp, then the status word. -->
    <div class="corner-bug-box">
      <div class="corner-bug-dot"></div>
${bugLineMasks(o)}
    </div>
${statusSourcesHtml(ids)}`,

      extraFields: statusSourceFields(ids),

      runtimeExtraJs: liveStatusJs(ids),

      css: `/* No panel here: the lamp and the word sit bare over the video. */
.corner-bug-box {
  display: flex;                   /* the lamp and the word sit side by side */
  align-items: center;             /* both centered on the lockup's axis */
  gap: calc(9px * var(--scale));   /* air between the lamp and the word */
}

/* The lamp — the one accent moment, breathing while the show is live. */
.corner-bug-dot {
  width: calc(10px * var(--scale));   /* a small dot… */
  height: calc(10px * var(--scale));  /* …round */
  border-radius: 50%;              /* the on-air lamp */
  background: var(--accent);       /* the one accent colour */
  flex: none;                      /* never squeezed by the word beside it */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);  /* readable over bright footage */
  animation: corner-bug-breathe 2s ease-in-out infinite;  /* the quiet on-air pulse */
}

/* One restrained pulse — a live lamp reads as alive without pulling focus. */
@keyframes corner-bug-breathe {
  0%, 100% { opacity: 1; }         /* full at both ends… */
  50% { opacity: 0.35; }           /* …dipping in the middle */
}

/* The status word (f0) — a tiny tracked-caps label, quiet and legible over footage. */
.corner-bug-name {
  font-size: calc(14px * var(--scale) * var(--type-scale));   /* small label size */
  font-weight: 600;                /* semibold keeps tracked caps crisp at bug scale */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* label voice */
  color: var(--text-color);        /* primary text — the word is the readable line */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

${STATUS_SOURCE_CSS}

${statusStateCss()}`,

      hasAccent: false, // the accent moment is the status lamp, not a separate bar element
    };
  },
);
