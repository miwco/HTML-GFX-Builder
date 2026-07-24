// bug11 "Volt Live" — the SPORT live bug: a solid accent chip with the status word in the
// family's dark chip ink, square-cornered on a hard offset shadow. Live / Replay / Standby are
// real machine states; the off-air modes drop the chip back to the neutral slab so the accent
// only ever means "on air". Sibling of lt05/lt06 and bug03 Slab Bug. See DESIGN_LANGUAGE §8.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineBugVariant, bugLineMasks } from './shared';
import { liveStatusJs } from './bugRuntimes';
import { statusSourcesHtml, statusSourceFields, STATUS_SOURCE_CSS } from './statusParts';

export const bug11: TemplateVariant = defineBugVariant(
  {
    id: 'bug11',
    category: 'corner-bug',
    name: 'Volt Live',
    styleTag: 'sport',
    description: 'A solid accent live chip: the status word in chip ink, neutral when off air.',
    maxLines: 1,
    suggestedLines: [{ title: 'Status', sample: 'LIVE' }],
    logo: 'none',
    animationPresets: ['snap-stinger', 'pop-spring', 'slide-left', 'fade', 'blur-in'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'oswald',
    defaultZone: 'top-right',
  },
  {
    name: 'Volt Live',
    description:
      'The sport on-air chip: a solid accent block with a breathing lamp and the status word ' +
      'in heavy condensed caps, set in the family dark chip ink. Replay and Standby drop the ' +
      'chip to the neutral slab, so the accent colour only ever means live.',
    uicolor: '5',
  },
  (o) => {
    // The three status words are ordinary operator fields held in hidden sources; the machine
    // copies the entered mode's word into the visible status element (#f0).
    const base = o.lines.length + o.extraFields.length;
    const ids = { status: 'f0', live: `f${base}`, replay: `f${base + 1}`, standby: `f${base + 2}` };

    return {
      html: `    <!-- Volt Live: a solid accent chip — the lamp, then the status word. -->
    <div class="corner-bug-box">
      <div class="corner-bug-dot"></div>
${bugLineMasks(o)}
    </div>
${statusSourcesHtml(ids)}`,

      extraFields: statusSourceFields(ids),

      runtimeExtraJs: liveStatusJs(ids),

      css: `/* The chip — filled with the accent while live, square-cornered, hard offset shadow. */
.corner-bug-box {
  display: flex;                   /* the lamp and the word sit side by side */
  align-items: center;             /* both centered on the chip's axis */
  gap: calc(9px * var(--scale));   /* air between the lamp and the word */
  padding: calc(8px * var(--scale)) calc(16px * var(--scale));  /* even air inside the chip */
  background: var(--accent);       /* the accent IS the chip while the show is live */
  border-radius: var(--panel-radius);  /* sport is square-cornered */
  box-shadow: var(--panel-shadow); /* the family's hard offset shadow */
}

/* The lamp — dark on the accent chip, breathing while the show is live. */
.corner-bug-dot {
  width: calc(10px * var(--scale));   /* a small dot… */
  height: calc(10px * var(--scale));  /* …round */
  border-radius: 50%;              /* the on-air lamp */
  background: var(--accent-ink);   /* dark-on-accent, the family's chip ink */
  flex: none;                      /* never squeezed by the word beside it */
  animation: corner-bug-breathe 2s ease-in-out infinite;  /* the quiet on-air pulse */
}

/* One restrained pulse — a live lamp reads as alive without pulling focus. */
@keyframes corner-bug-breathe {
  0%, 100% { opacity: 1; }         /* full at both ends… */
  50% { opacity: 0.35; }           /* …dipping in the middle */
}

/* The status word (f0) — heavy condensed caps in the chip's dark ink. */
.corner-bug-name {
  font-size: calc(17px * var(--scale) * var(--type-scale));   /* small, but it shouts */
  font-weight: var(--display-weight);  /* the family's heavy display weight */
  line-height: 1.1;                /* condensed caps need almost no leading */
  letter-spacing: var(--label-tracking);  /* sport opens its labels up */
  text-transform: uppercase;       /* sport shouts in caps */
  color: var(--accent-ink);        /* dark-on-accent, the family's chip ink */
}

/* ── The status states ─────────────────────────────────────────────────────
   The machine tags the root with is-live / is-replay / is-standby. The accent fill
   is reserved for live: the other two modes fall back to the neutral slab, so the
   colour on screen always answers "are we live?" honestly. Untagged = live. */
.corner-bug.is-replay .corner-bug-box,
.corner-bug.is-standby .corner-bug-box {
  background: var(--panel-bg);     /* the neutral slab — no accent off air */
}
.corner-bug.is-replay .corner-bug-name,
.corner-bug.is-standby .corner-bug-name {
  color: var(--text-color);        /* paper on the dark slab */
}
.corner-bug.is-replay .corner-bug-dot {
  background: var(--accent);       /* replay keeps a lamp, but it stops breathing */
  animation: none;                 /* nothing breathes when nothing is live */
}
.corner-bug.is-standby .corner-bug-dot {
  background: var(--text-dim);     /* standby is the quietest of the three */
  animation: none;                 /* nothing breathes when nothing is live */
}

${STATUS_SOURCE_CSS}`,

      hasAccent: false, // the accent moment is the chip fill itself, not a separate element
    };
  },
);
