// ig03 "Timing Tower" — sport style, the infographic sibling of lt05 "Angle Slab" /
// lt06 "Split Bar". A race-control standings stack: a caps title with an accent dash on
// top, then one compact dark slab row per driver — position number on a skewed accent
// chip, three-letter code in condensed bold caps, gap figure right-aligned and dimmed
// (the leader's gap flips to the accent). The lt05 lesson carries over: every lean is
// PAINTED on a ::before/::after layer, so the text reads dead straight and the
// 'rows-cascade' preset can tween the rows without ever flattening the slabs.
// Data-driven like the tickers: the operator types one "CODE gap" line per driver and
// rebuildInfographic() renders the tower.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';

const TOWER_SAMPLE = 'VER LEADER\nNOR +1.892\nLEC +4.331\nSAI +6.104\nHAM +9.887';

export const ig03: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig03',
    category: 'infographic',
    name: 'Timing Tower',
    styleTag: 'sport',
    description: 'A live-timing standings stack - leaning slab rows with position chips and gaps.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Standings', sample: TOWER_SAMPLE },
      { title: 'Title', sample: 'LIVE TIMING' },
    ],
    logo: 'none',
    animationPresets: ['rows-cascade'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'oswald',
    defaultZone: 'top-left',
  },
  {
    name: 'Timing Tower',
    description:
      'A race-control standings tower - the sibling of the Angle Slab and Split Bar lower ' +
      'thirds. Each row is a leaning dark slab: a skewed accent chip carries the position ' +
      'number, the driver code sits in condensed bold caps, and the gap hangs right-aligned ' +
      'and dimmed (the leader\'s gap takes the accent). Type one "CODE gap" line per driver.',
    uicolor: '5',
  },
  (o) => {
    const towerText = o.lines[0]?.sample || TOWER_SAMPLE;
    const titleText = o.lines[1]?.sample || 'LIVE TIMING';

    return {
      // Structure: .infographic-box holds the caps title and the tower; #infographic-rows is rebuilt from
      // the hidden #f0 source by rebuildInfographic() — exactly like a ticker's track.
      html: `    <!-- Timing Tower: caps title with an accent dash, then one leaning slab row per driver. -->
    <div class="infographic-box">
      <!-- Title — the tower's caps kicker; its accent dash is painted by CSS (SPX writes field f1 here). -->
      <div class="infographic-title" id="f1">${titleText}</div>
      <!-- Timing rows — rendered by rebuildInfographic() from the hidden source below. -->
      <div id="infographic-rows"></div>
    </div>
    <!-- Hidden standings source — SPX writes field f0 here; JS renders it. One "CODE gap" per line. -->
    <div id="f0" class="noacg-data-source">${towerText}</div>`,

      css: `/* The title — a small caps kicker over the tower, led by a chunky accent dash. */
.infographic-title {
  display: flex;                   /* dash and text share one line */
  align-items: center;             /* the dash sits on the caps' optical middle */
  gap: calc(12px * var(--scale));  /* air between the dash and the text */
  margin-bottom: calc(14px * var(--scale));  /* air before the first row */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* small label size */
  font-weight: 700;                /* bold keeps small caps legible */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the title label's authored tracking */
  text-transform: uppercase;       /* label voice, whatever the operator types */
  color: var(--label-color);       /* the title label's authored colour */
  white-space: nowrap;             /* a short caps label never wraps mid-word */
}

/* The dash — a small accent slab leaning the family -8deg (skew lives on ::before only). */
.infographic-title::before {
  content: '';                     /* pseudo-elements render only with content set */
  flex-shrink: 0;                  /* a long title never squeezes the dash */
  width: calc(30px * var(--scale));  /* short on purpose — a mark, not a rule */
  height: var(--accent-weight);    /* the title dash's authored accent weight */
  background: var(--accent);       /* the accent announces the tower */
  transform: skewX(-8deg);         /* SKEW: leans with the rows below */
}

/* The tower — rows stack tight; every row stretches to the widest one, so all the
   right-aligned gap figures share one clean right edge (no ragged column). */
#infographic-rows {
  display: flex;                   /* a simple vertical stack */
  flex-direction: column;          /* one timing row under another */
  gap: calc(4px * var(--scale));   /* hairline air — the tower reads as one unit */
  min-width: calc(320px * var(--scale));  /* short codes still get a confident tower width */
}

/* One timing row: [position chip][code ....... gap]. The row itself carries no lean —
   the 'rows-cascade' preset tweens it, so the slab is painted on ::after (the lt05 move). */
.infographic-row {
  position: relative;              /* anchors the painted slab (::after) and the chip layer */
  z-index: 0;                      /* own stacking context — the negative slab layers stay inside this row */
  display: flex;                   /* chip, code and gap share one line */
  align-items: stretch;            /* the chip runs the full row height */
  padding-right: calc(18px * var(--scale));  /* air between the gap figure and the slab edge */
  will-change: transform, opacity; /* hint the browser: the cascade animates this row */
}

/* The painted slab: the sport lean lives HERE, on a layer no preset ever tweens. */
.infographic-row::after {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the row exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -2;                     /* paints behind the text AND behind the accent chip */
  background: var(--panel-bg);     /* near-black slab behind the row */
  border-radius: var(--panel-radius);  /* the family's panel corner radius */
  transform: skewX(-8deg);         /* SKEW: the whole row leans forward */
}

/* The position chip — its accent is painted on ::before so it leans with the slab
   while the number inside stays straight. Full row height, fused to the left edge. */
.infographic-pos {
  position: relative;              /* anchors the accent layer (::before) */
  display: flex;                   /* centers the number ... */
  align-items: center;             /* ... vertically ... */
  justify-content: center;         /* ... and horizontally on the chip */
  width: calc(40px * var(--scale));  /* a chip, wide enough for two digits */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* small and heavy — a rank, not a headline */
  font-weight: 800;                /* maximum punch at chip size */
  font-variant-numeric: tabular-nums;  /* ranks share one width down the tower */
  color: var(--accent-ink);        /* the family's ink on an accent-filled chip */
}

/* The chip's accent: same -8deg as the slab, so its left edge fuses with the row's. */
.infographic-pos::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the chip exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* behind the number, in front of the row slab (-2) */
  background: var(--accent);       /* the one loud color moment per row */
  transform: skewX(-8deg);         /* SKEW: leans with the painted slab */
}

/* The driver code — condensed bold caps, the row's primary reading line. Its vertical
   padding sets the row height (the chip stretches to match). */
.infographic-code {
  align-self: center;              /* sit on the row's center line, not stretched */
  margin-left: calc(16px * var(--scale));  /* air between the chip and the code */
  margin-right: auto;              /* push the gap figure to the right edge */
  padding: calc(7px * var(--scale)) calc(28px * var(--scale)) calc(7px * var(--scale)) 0;
                                   /* vertical = row height; right = code and gap NEVER touch */
  font-size: calc(27px * var(--scale) * var(--type-scale));  /* clearly the loudest text in the row */
  font-weight: 700;                /* heavy caps carry the code */
  line-height: 1.15;               /* tight — condensed caps need little leading */
  letter-spacing: 0.04em;          /* a touch of air between the caps */
  text-transform: uppercase;       /* codes are shouted, not spoken */
  color: var(--text-color);        /* primary text color */
  white-space: nowrap;             /* a short caps code never wraps mid-word */
}

/* The gap figure — right-aligned and dimmed, so the chips stay the color moment. */
.infographic-gap {
  align-self: center;              /* sit on the row's center line, not stretched */
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* clearly subordinate to the code */
  font-weight: 600;                /* semibold — legible without competing */
  font-variant-numeric: tabular-nums;  /* digits share one width — gaps align as they tick */
  color: var(--text-dim);          /* secondary figures dim - one accent dose per row */
  white-space: nowrap;             /* "+1 LAP" style gaps never wrap mid-word */
}

/* The leader's gap — the tower's single text-accent: the top row's figure lights up. */
.infographic-row:first-child .infographic-gap {
  color: var(--accent);            /* "LEADER" reads in the accent color */
  font-weight: 700;                /* one step heavier to match its color voice */
}`,

      tokens: {
        accentWeight: 'calc(8px * var(--scale))',
      },

      fields: [
        { field: 'f0', ftype: 'textarea', title: o.lines[0]?.title || 'Standings', value: towerText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Title', value: titleText },
      ],

      // rebuildInfographic(): re-render the timing rows from the hidden #f0 source.
      // Each source line is "CODE gap" — the rank is the line's position in the list.
      runtimeExtraJs: `// escapeHtml(): the rows below are built with innerHTML — operator text is escaped
// first so input like "GAP <1s" reads as text and never runs as markup.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// rebuildInfographic(): parse the hidden #f0 source (one "CODE gap" driver per line)
// and rebuild the #infographic-rows tower. The first token of a line is the driver code and
// everything after it is the gap column ("+1.892", "LEADER", "1 LAP" — spaces allowed).
// The position number is not typed: it is the line's rank in the list.
function rebuildInfographic() {
  var rows = document.getElementById('infographic-rows');
  var lines = document.getElementById('f0').textContent.split('\\n');
  var html = '';
  var pos = 0;                                   // rank counter — blank lines don't count
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (line === '') return;                     // skip blank lines
    var parts = line.split(/\\s+/);               // first token = code, the rest = gap
    var code = parts.shift();
    var gap = parts.join(' ');                   // re-join: gaps may contain spaces
    pos += 1;                                    // this line earns the next rank
    html += '<div class="infographic-row">'
          +   '<span class="infographic-pos">' + pos + '</span>'
          +   '<span class="infographic-code">' + escapeHtml(code) + '</span>'
          +   '<span class="infographic-gap">' + escapeHtml(gap) + '</span>'
          + '</div>';
  });
  rows.innerHTML = html;
}

// Render once on load so the preview shows the tower before the first update().
// This file loads in <head>, before the tower elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`,
    };
  },
);
