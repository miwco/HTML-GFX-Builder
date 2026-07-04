// cr04 "Crawl" - end-credits sibling of lt02 "Underline" (minimal family). The lt02 motif -
// one short accent hairline against plain type - is flipped into a full-width bottom strip
// with a 2px accent TOP border. Credits run as a single ticker-style line: headings in the
// accent color, role + name pairs side by side, a middle-dot divider between items, and the
// logo + year block closing the crawl. Motion is the linear 'credits-crawl' preset.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

// The multi-line credits sample - same authoring format the runtime parses:
// "Role | Name" per line, a line without a pipe is a heading, a blank line starts a section.
const CRAWL_SAMPLE = [
  'PRODUCTION',
  'Director | Alex Rivera',
  'Producer | Sam Chen',
  '',
  'CAMERA',
  'Director of Photography | Maria Santos',
  'Camera Operator | Jonas Berg',
  '',
  'Special thanks to everyone who made this show possible',
].join('\n');

export const cr04: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr04',
    category: 'end-credits',
    name: 'Crawl',
    styleTag: 'minimal',
    description:
      'Ticker-style single-line credits crawling through a slim bottom strip with an ' +
      'accent top border - the lt02 underline motif at full frame width.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Credits', sample: CRAWL_SAMPLE },
      { title: 'Year / copyright', sample: '© 2026 Your Production' },
    ],
    hasLogoSlot: true,
    animationPresets: ['credits-crawl'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Crawl',
    description:
      'A full-width bottom strip on a quiet panel, separated from the picture by a 2px ' +
      'accent top border (the lt02 underline, flipped). Everything renders inline on one ' +
      'line: accent headings with a thin rule, dim uppercase roles beside semibold names, ' +
      'middle-dot dividers, and the logo + year riding out at the tail.',
    uicolor: '2',
  },
  (_o) => ({
    // Structure: the strip is the viewport; the track carries every row on ONE line and is
    // the element the crawl preset translates. Rows are injected by rebuildCredits().
    html: `    <!-- Crawl: a slim full-width strip; the track ticks through it left of frame. -->
    <div class="credits-box"><div id="credits-track"></div></div>`,

    css: `/* The strip - the crawl's viewport. The accent top border is the design's one color
   moment on the chrome itself: lt02's short underline stretched across the frame. */
.credits-box {
  width: calc(1680px * var(--scale));            /* full-width strip, safe inside 1920 */
  height: calc(84px * var(--scale));             /* slim ticker height */
  overflow: hidden;                              /* the viewport - track slides through it */
  background: var(--panel-bg);                   /* subtle near-black panel, never pure #000 */
  border-top: calc(2px * var(--scale)) solid var(--accent);  /* the underline motif, flipped up */
}

/* The moving line - every row sits inline; the crawl preset translates this on x. */
#credits-track {
  display: inline-flex;                          /* lay rows out on a single line */
  align-items: center;                           /* center every item on the strip's axis */
  height: 100%;                                  /* fill the strip so centering works */
  white-space: nowrap;                           /* one line forever - never wrap the crawl */
  gap: calc(36px * var(--scale));                /* air between crawl items */
  will-change: transform;                        /* hint the browser: the preset moves this */
}

/* Section wrapper (the shared runtime emits one per section) - kept inline so the
   pages never stack; they just continue the line with the same rhythm. */
.credits-page {
  display: inline-flex;                          /* stay on the crawl line */
  align-items: center;                           /* match the track's vertical centering */
  gap: calc(36px * var(--scale));                /* same rhythm inside a section */
}

/* Section heading - small caps in the accent color, the crawl's wayfinding marks. */
.credits-heading {
  font-size: calc(18px * var(--scale));          /* label size */
  font-weight: 600;                              /* firm without shouting */
  letter-spacing: 0.14em;                        /* small caps breathe */
  text-transform: uppercase;                     /* reads as a section label */
  color: var(--accent);                          /* the one accent color, in a small dose */
}

/* Thin rule after each heading - a vertical echo of the lt02 underline stroke. */
.credits-rule {
  width: calc(2px * var(--scale));               /* hairline weight */
  height: calc(18px * var(--scale));             /* matches the heading's cap height */
  background: var(--accent);                     /* same accent as the strip's top border */
}

/* One credit - role and name side by side, reading as a single unit. */
.credits-row {
  display: inline-flex;                          /* keep the pair on the line */
  align-items: baseline;                         /* role and name share a baseline */
  gap: calc(8px * var(--scale));                 /* tight pair spacing */
}

/* Role - quiet uppercase label before the name. */
.credits-role {
  font-size: calc(16px * var(--scale));          /* clearly subordinate to the name */
  font-weight: 400;                              /* light against the semibold name */
  letter-spacing: 0.08em;                        /* uppercase letters need room */
  text-transform: uppercase;                     /* label voice, not a sentence */
  color: var(--text-dim);                        /* dimmed - the name carries the weight */
}

/* Name - the strong element of each pair. */
.credits-name {
  font-size: calc(22px * var(--scale));          /* the crawl's headline size */
  font-weight: 600;                              /* strong without shouting */
  color: var(--text-color);                      /* primary text color */
}

/* Middle-dot divider emitted after each credit - punctuation between crawl items. */
.credits-sep {
  font-size: calc(22px * var(--scale));          /* sized with the names it separates */
  color: var(--text-dim);                        /* quiet - a beat, not a feature */
}

/* End block - logo + year riding out at the tail of the crawl. */
.credits-end {
  display: inline-flex;                          /* stay on the crawl line */
  align-items: center;                           /* logo and year share the strip's axis */
  gap: calc(14px * var(--scale));                /* space between logo and year */
}

/* Imported logo - height-locked to the strip; width follows the image's aspect. */
.credits-logo {
  height: calc(40px * var(--scale));             /* fits the slim strip with air above/below */
  width: auto;                                   /* keep the logo's aspect ratio */
  display: block;                                /* no inline baseline gap under the image */
}

/* Logo placeholder - an intentional outlined square marking where the logo will sit
   once one is imported (the import flow swaps it for a real image). */
.credits-logo-slot {
  width: calc(40px * var(--scale));              /* square slot, same footprint as the logo */
  height: calc(40px * var(--scale));             /* matches .credits-logo height */
  border: calc(1px * var(--scale)) solid var(--accent);  /* accent keyline - looks designed */
  border-radius: calc(2px * var(--scale));       /* minimal family: 0–2px corners */
  opacity: 0.6;                                  /* clearly a placeholder, not content */
}

/* Year / copyright - the quiet sign-off. */
.credits-year {
  font-size: calc(18px * var(--scale));          /* small closing line */
  font-weight: 400;                              /* no emphasis needed */
  color: var(--text-dim);                        /* dimmed - the show is over */
}`,

    rowBuilderJs: `// ── Row builders - the Crawl variant's markup vocabulary ─────────────────────

// renderCreditRow(entry): one inline item on the crawl line.
//   heading → accent small-caps label followed by a thin accent rule
//   credit  → dim uppercase role beside a semibold name, then a '·' divider
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    return '<span class="credits-heading">' + entry.text + '</span>' +
           '<span class="credits-rule"></span>';        // thin separator after the heading
  }
  return '<span class="credits-row">' +
           '<span class="credits-role">' + entry.role + '</span>' +
           '<span class="credits-name">' + entry.name + '</span>' +
         '</span>' +
         '<span class="credits-sep">·</span>';     // divider between crawl items
}

// renderEndBlock(yearHtml, logoSrc): the tail of the crawl - logo + year, inline.
function renderEndBlock(yearHtml, logoSrc) {
  var logo;
  if (logoSrc) {
    logo = '<img class="credits-logo" src="' + logoSrc + '" alt="logo">';
  } else {
    // No logo imported yet - a small outlined square marks where it will sit.
    logo = '<span class="credits-logo-slot"></span>';
  }
  return '<span class="credits-end">' + logo +
         '<span class="credits-year">' + yearHtml + '</span></span>';
}`,
  }),
);
