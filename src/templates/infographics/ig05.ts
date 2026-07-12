// ig05 "Rising Total" — minimal style. A fundraising / donation counter: a quiet keyline
// panel (the infographic sibling of lt03 "Side Tag", same family as lt01/lt02) topped by a
// 3px accent hairline. Inside: a tracking-wide caps kicker, one huge tabular total behind a
// static currency mark, a slim progress track, and a dim right-aligned goal line under it.
// The 'count-up' preset tweens the total from zero AND grows the bar to its data-value.
// Stat-with-a-bar shape: rebuildInfographic() formats the figures and sets the bar percent.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineInfographicVariant } from './shared';

export const ig05: TemplateVariant = defineInfographicVariant(
  {
    id: 'ig05',
    category: 'infographic',
    name: 'Rising Total',
    styleTag: 'minimal',
    description: 'A donation counter: huge counting total over a progress bar toward a goal.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Total', sample: '124213' },
      { title: 'Goal', sample: '250000' },
    ],
    hasLogoSlot: false,
    animationPresets: ['count-up'],
    defaultPalette: paletteById('mint'),
    defaultFontId: 'inter',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Rising Total',
    description:
      'A quiet keyline panel with a 3px accent hairline on top - the sibling of the Side Tag ' +
      'lower third. A tracking-wide caps kicker sits over one enormous thousand-separated ' +
      'total (static currency mark beside it), a slim progress track, and a dimmed ' +
      '"Goal: ..." line. The count-up preset counts the total and fills the bar to ' +
      'total/goal percent. Type plain numbers into Total and Goal.',
    uicolor: '2',
  },
  (o) => {
    // The design owns its SPX fields — the total is f0 (what count-up tweens).
    const totalText = o.lines[0]?.sample || '124213';
    const goalText = o.lines[1]?.sample || '250000';
    return {
      html: `    <!-- Rising Total: [caps kicker] / [currency mark + huge total] / [track] / [footer]. -->
    <div class="infographic-box">
      <!-- The kicker — small tracking-wide caps in the accent color (field f2). -->
      <div class="infographic-kicker" id="f2">TOTAL RAISED</div>
      <!-- The figure row — a static currency mark beside the counting total (field f0). -->
      <div class="infographic-figure">
        <span class="infographic-currency">&euro;</span>
        <span class="infographic-value" id="f0">${totalText}</span>
      </div>
      <!-- The progress track — the count-up preset grows the fill to its data-value percent. -->
      <div class="infographic-track">
        <div class="infographic-bar-fill" data-value="0"></div>
      </div>
      <!-- The footer — raised total (left) and goal line (right); rebuildInfographic() writes both. -->
      <div class="infographic-footer">
        <span class="infographic-sub" id="infographic-sub"></span>
        <span class="infographic-goal" id="infographic-goal"></span>
      </div>
    </div>
    <!-- Hidden goal source — SPX writes field f1 here; JS reads it and formats the goal line. -->
    <div id="f1" style="display: none">${goalText}</div>`,

      css: `/* The panel — lt03's quiet keyline card, capped by the design's one accent hairline. */
.infographic-box {
  min-width: calc(620px * var(--scale));  /* the track keeps a stable run behind short totals */
  padding: calc(26px * var(--scale)) calc(40px * var(--scale)) calc(24px * var(--scale));  /* generous inner air */
  background: var(--panel-bg);     /* the panel color (retints via the :root contract) */
  border: 1px solid rgba(255, 255, 255, 0.14);  /* hairline keyline lifts the panel off video */
  border-top: calc(3px * var(--scale)) solid var(--accent);  /* the accent hairline (family token: 2-4px) */
  border-radius: calc(2px * var(--scale));  /* barely-there rounding (minimal style) */
}

/* The kicker — quiet tracking-wide caps, the accent's second, tiny appearance. */
.infographic-kicker {
  font-size: calc(19px * var(--scale));  /* label scale — a caption, not a headline */
  font-weight: 700;                /* bold keeps small caps legible */
  line-height: 1.2;                /* compact label leading */
  letter-spacing: 0.18em;          /* wide tracking — small caps breathe */
  text-indent: 0.18em;             /* re-center: tracking adds space after the last cap too */
  text-transform: uppercase;       /* reads as a label, whatever the operator types */
  white-space: nowrap;             /* a short caps label never wraps mid-word */
  text-align: center;              /* the whole stack is center-axis */
  color: var(--accent);            /* accent kicker — same move as its lt03 sibling */
}

/* The figure row — currency mark and total share one centered baseline. */
.infographic-figure {
  display: flex;                   /* mark and figure sit side by side */
  justify-content: center;         /* centered on the panel's axis */
  align-items: baseline;           /* the small mark rests on the figure's baseline */
  gap: calc(10px * var(--scale));  /* a thin seam between mark and figure */
  margin-top: calc(8px * var(--scale));  /* kicker and figure read as one unit */
}

/* The currency mark — static and dimmed: a unit, not part of the counting number. */
.infographic-currency {
  font-size: calc(44px * var(--scale));  /* clearly subordinate to the figure */
  font-weight: 600;                /* semibold so the thin glyph stays visible */
  color: var(--text-dim);          /* dimmed — the total carries the weight */
}

/* The total — enormous tabular digits; the count-up preset tweens this text from 0. */
.infographic-value {
  min-width: 0;                    /* allow the figure to shrink and wrap inside flex */
  font-size: calc(110px * var(--scale));  /* the whole design IS this number (1080p reference) */
  font-weight: 700;                /* bold — the panel's single heavy element */
  line-height: 1;                  /* no dead leading — the track sets the gap below */
  letter-spacing: -0.02em;         /* very large glyphs tighten */
  font-variant-numeric: tabular-nums;  /* digits keep one width — no jitter while counting */
  color: var(--text-color);        /* primary text color */
  overflow-wrap: break-word;       /* an absurdly long figure breaks instead of overflowing */
}

/* The track — a slim keyline-grey lane the accent fill grows inside. */
.infographic-track {
  height: calc(8px * var(--scale));  /* hairline-slim lane — the chart stays quiet */
  margin-top: calc(22px * var(--scale));  /* air between the figure and the bar */
  border-radius: calc(2px * var(--scale));  /* minimal family: 0-2px, never a pill */
  background: rgba(255, 255, 255, 0.14);  /* keyline-grey lane over the panel */
  overflow: hidden;                /* the growing fill is clipped to the lane */
}

/* The fill — the preset grows its width from 0% to its data-value percent.
   Deliberate deviation from the "transform/opacity only" motion rule: the fill tweens
   WIDTH because scaleX would squash its end cap; the lane is a clipped 8px strip,
   so relayout stays cheap. */
.infographic-bar-fill {
  width: 0;                        /* fallback — the rebuild renders an inline width at the value */
  height: 100%;                    /* fill the whole lane height */
  border-radius: inherit;          /* the growing end matches the lane's rounding */
  background: var(--accent);       /* the bar is the accent's main moment */
  will-change: width;              /* hint for the width tween (the deviation noted above) */
}

/* The footer — raised-so-far hugs left, the goal hugs right; they can never touch. */
.infographic-footer {
  display: flex;                   /* both figures share one line */
  justify-content: space-between;  /* raised hugs left, goal hugs right */
  align-items: baseline;           /* both sit on the same text baseline */
  gap: calc(32px * var(--scale));  /* distinct info keeps distinct space between */
  margin-top: calc(12px * var(--scale));  /* small gap up to the track */
}

/* The raised figure — a small bold echo of the total at the bar's start. */
.infographic-sub {
  font-size: calc(19px * var(--scale));  /* footer scale — clearly under the big figure */
  font-weight: 700;                /* bold — it restates the headline number */
  font-variant-numeric: tabular-nums;  /* equal-width digits across updates */
  white-space: nowrap;             /* a currency figure never wraps mid-number */
  color: var(--text-color);        /* primary text color */
}

/* The goal line — dimmed and right-aligned: the target, not the news. */
.infographic-goal {
  font-size: calc(19px * var(--scale));  /* same size as the raised figure… */
  font-weight: 400;                /* …contrast through weight, not more fonts */
  font-variant-numeric: tabular-nums;  /* equal-width digits across updates */
  white-space: nowrap;             /* "Goal: €250,000" never wraps mid-number */
  color: var(--text-dim);          /* dimmed — never full white twice */
}`,

      fields: [
        { field: 'f0', ftype: 'textfield', title: o.lines[0]?.title || 'Total', value: totalText },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Goal', value: goalText },
        { field: 'f2', ftype: 'textfield', title: 'Kicker', value: 'TOTAL RAISED' },
      ],

      // rebuildInfographic(): thousand-separate the figures, write the footer lines,
      // and set the bar's percent — the count-up preset animates from there.
      runtimeExtraJs: `// parseIgNumber(): read the number out of operator text — tolerant of the currency
// marks and thousand separators people paste in ("€124,213" -> 124213).
function parseIgNumber(text) {
  var n = parseFloat(String(text).replace(/[^0-9.+-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// formatThousands(): 124213 -> "124,213" — broadcast figures always group digits.
function formatThousands(n) {
  return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
}

// rebuildInfographic(): read total (f0) + goal (hidden f1), rewrite the displayed
// figures thousand-separated, and clamp the bar to total/goal percent. The fill is
// rendered already at its value so an on-air update() shows fresh data at once; on
// play() the 'count-up' preset grows it back from empty to its data-value percent.
function rebuildInfographic() {
  var totalEl = document.getElementById('f0');
  var goalEl = document.getElementById('f1');
  // Read the untouched values: update() keeps data-target current, while the count-up
  // preset rewrites the live textContent mid-count ("0", "43,207"…).
  var total = parseIgNumber(totalEl.getAttribute('data-target') || totalEl.textContent);
  var goal = parseIgNumber(goalEl.getAttribute('data-target') || goalEl.textContent);

  // The displayed total is always thousand-separated; data-target holds the same text
  // so the count-up preset counts to it and restores exactly this formatting.
  var totalText = formatThousands(total);
  totalEl.textContent = totalText;
  totalEl.setAttribute('data-target', totalText);

  // Footer: the raised figure on the left, the dim goal line on the right.
  document.getElementById('infographic-sub').textContent = '€' + totalText;
  document.getElementById('infographic-goal').textContent = 'Goal: €' + formatThousands(goal);

  // Progress: clamp to the 0-100 track (a bar can never under- or overfill).
  var percent = goal > 0 ? Math.max(0, Math.min(100, (total / goal) * 100)) : 0;
  var fill = document.querySelector('.infographic-bar-fill');
  fill.setAttribute('data-value', percent);
  fill.style.width = percent + '%';
}

// Render once on load so the preview shows real figures before the first update().
// This file loads in <head>, before the panel elements exist — wait for the DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', rebuildInfographic);
} else {
  rebuildInfographic();            // DOM already parsed (e.g. an inline preview build)
}`,
    };
  },
);
