// bug02 "House Clock" — the NoaCG corner bug, rebuilt from the brand kit's bug-clock
// overlay: the logo (or the three-bar house placeholder mark) above a tiny caption and a
// live mono clock whose seconds tick in the accent color. No tile — it sits bare over the
// video with text shadows, the way the brand overlay does. Sibling of lt11 House Strap.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { fontById, labelFontFaceCss } from '../../model/fonts';
import { defineBugVariant, bugLineMasks } from './shared';

// The live clock painter — design-owned runtime OUTSIDE the marked ANIMATION region, so
// Motion-panel preset swaps never touch it. DOM-ready guarded: template.js loads in <head>.
const CLOCK_JS = `// ── Live clock ──────────────────────────────────────────────────────────────
// Paints the local time as HH:MM:SS into the bug's clock element every second;
// the seconds live in their own span so the CSS can give them the accent color.
function paintBugClock() {
  var el = document.getElementById('corner-bug-clock');
  if (!el) return;
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  el.innerHTML = pad(d.getHours()) + ':' + pad(d.getMinutes()) +
    '<span class="corner-bug-clock-secs">:' + pad(d.getSeconds()) + '</span>';
}

// Start ticking once the DOM exists (this file loads in <head> in exported packages).
function startBugClock() {
  paintBugClock();
  setInterval(paintBugClock, 1000);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBugClock);
} else {
  startBugClock();                 // DOM already parsed (e.g. an inline preview build)
}`;

export const bug02: TemplateVariant = defineBugVariant(
  {
    id: 'bug02',
    category: 'corner-bug',
    name: 'House Clock',
    styleTag: 'noacg',
    description: 'The house bug: logo (or the three-bar mark), a tiny caption, and a live ticking clock.',
    maxLines: 1,
    suggestedLines: [{ title: 'Caption', sample: 'On Air' }],
    hasLogoSlot: true,
    animationPresets: ['slide-fade', 'blur-in', 'pop-spring', 'fade', 'drop-in', 'flip-3d'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'top-left',
  },
  {
    name: 'House Clock',
    description:
      'The NoaCG on-air mark: the imported logo — or the house three-bar placeholder — over ' +
      'a tiny mono caption and a live HH:MM:SS clock whose seconds tick in the accent color. ' +
      'No panel: it sits bare over the video with a soft text shadow, all show long. ' +
      'Sibling of lt11 House Strap.',
    uicolor: '4',
  },
  (o) => {
    // The logo is a real SPX image field ("filelist"); its id comes after every wizard
    // field so nothing collides. Empty value = the three-bar house mark shows instead.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';

    return {
      html: `    <!-- The mark area: your logo (image field ${logoField}) on top of the three-bar
         house placeholder. When a logo path is set, .has-image hides the bars. -->
    <div class="corner-bug-box">
      <div class="corner-bug-media${logoPath ? ' has-image' : ''}">
        <div class="corner-bug-mark">
          <i></i><i></i><i></i>
        </div>
        <img id="${logoField}" class="corner-bug-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>
${bugLineMasks(o)}
      <!-- The live clock — paintBugClock() (in the JS) repaints this every second. -->
      <div class="corner-bug-clock" id="corner-bug-clock">20:14<span class="corner-bug-clock-secs">:38</span></div>
    </div>`,

      extraFields: [
        {
          field: logoField,
          ftype: 'filelist',
          title: 'Logo',
          value: logoPath,
          assetfolder: './images/',
          extension: 'png',
        },
      ],

      runtimeExtraJs: CLOCK_JS,

      css: `${labelFontFaceCss(fontById('jetbrains-mono'))}

/* The stack — no tile: mark, caption and clock sit bare over the video, left-aligned
   like the brand overlay. Text shadows keep everything readable on bright footage. */
.corner-bug-box {
  display: flex;                   /* mark, caption and clock stack as one column */
  flex-direction: column;          /* top to bottom */
  align-items: flex-start;         /* everything hugs the same left edge */
  gap: calc(10px * var(--scale));  /* even air between the three pieces */
}

/* The mark area: one box holding both the three-bar placeholder and the logo. */
.corner-bug-media {
  position: relative;              /* the bars and the logo stack inside this box */
  width: calc(88px * var(--scale));   /* mark area width */
  height: calc(56px * var(--scale));  /* mark area height */
}

/* The placeholder — the house three-bar mark: accent / paper / dim, shortening. */
.corner-bug-mark {
  position: absolute;              /* fills the mark area */
  inset: 0;                        /* all four edges */
  display: flex;                   /* the bars stack… */
  flex-direction: column;          /* …top to bottom */
  justify-content: center;         /* centered vertically in the mark box */
  gap: calc(6px * var(--scale));   /* air between the bars */
}
.corner-bug-mark i {
  display: block;                  /* each <i> is one bar */
  height: calc(10px * var(--scale));  /* bar thickness */
  border-radius: calc(3px * var(--scale));  /* softly rounded bar ends */
}
.corner-bug-mark i:nth-child(1) {
  width: 100%;                     /* the full-length accent bar on top */
  background: var(--accent);       /* the one accent moment */
  box-shadow: 0 0 calc(12px * var(--scale)) color-mix(in srgb, var(--accent) 60%, transparent);
}
.corner-bug-mark i:nth-child(2) {
  width: 66%;                      /* the middle bar steps in */
  background: var(--text-color);   /* paper */
}
.corner-bug-mark i:nth-child(3) {
  width: 40%;                      /* the shortest bar closes the mark */
  background: var(--text-dim);     /* dimmed — the quietest bar */
}
.corner-bug-media.has-image .corner-bug-mark {
  display: none;                   /* a picked logo replaces the placeholder */
}

/* The logo: fills the mark area without cropping (wordmarks stay whole). */
.corner-bug-logo {
  position: absolute;              /* covers the mark area */
  inset: 0;                        /* all four edges */
  width: 100%;                     /* fill the box… */
  height: 100%;                    /* …both ways */
  object-fit: contain;             /* show the whole logo, never crop */
  object-position: left center;    /* hug the stack's left edge like the bars do */
}

/* The caption (f0) — the house label voice at bug scale. */
.corner-bug-name {
  font-family: "JetBrains Mono", Consolas, "Courier New", monospace;  /* the house label face */
  font-size: calc(15px * var(--scale));   /* tiny label size */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: 0.2em;           /* small caps need room to breathe */
  text-transform: uppercase;       /* label voice */
  color: var(--text-dim);          /* quiet — the clock is the bright element */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

/* The clock — mono figures with tabular digits so nothing jitters on the tick. */
.corner-bug-clock {
  font-family: "JetBrains Mono", Consolas, "Courier New", monospace;  /* the house label face */
  font-size: calc(34px * var(--scale));  /* the mark's focal point */
  font-weight: 400;                /* regular figures — size carries the moment */
  line-height: 1;                  /* one tight row of digits */
  letter-spacing: 0.06em;          /* a touch of air between figures */
  font-variant-numeric: tabular-nums;  /* every digit same width — no tick wobble */
  color: var(--text-color);        /* primary text color */
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);  /* readable over bright footage */
}

/* The seconds — the clock's accent moment, repainted every tick. */
.corner-bug-clock-secs {
  color: var(--accent);            /* :SS in the accent color, like the brand overlay */
}`,

      hasAccent: false, // the accent moments are the top bar and the seconds, not a bar element
    };
  },
);
