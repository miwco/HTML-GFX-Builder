// cr01 "Classic Roll" — the archetypal end-credits roll, and lt01 "Hairline"'s credits
// sibling (DESIGN_LANGUAGE.md §8, minimal family). No panel, no ornament: centered stacks
// of role-above-name, section headings in quiet accent caps, and one short gold hairline
// (the lt01 motif) above the logo at the very end. Whitespace does all the work.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

// The multi-line credits sample: "Role | Name" per line, a line without a pipe is a
// section heading, a blank line starts a new section (see parseCredits in shared.ts).
const SAMPLE = [
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

export const cr01: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr01',
    category: 'end-credits',
    name: 'Classic Roll',
    styleTag: 'minimal',
    description: 'The classic down-scrolling roll - centered role-above-name stacks, nothing else.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Credits', sample: SAMPLE },
      { title: 'Year / copyright', sample: '© 2026 Your Production' },
    ],
    hasLogoSlot: true,
    animationPresets: ['credits-roll'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Classic Roll',
    description:
      'The end-credits everyone knows: a steady upward roll of centered role-above-name ' +
      'stacks, section headings in quiet accent caps, and a single short hairline above ' +
      'the closing logo. lt01 Hairline’s credits sibling - restraint everywhere.',
    uicolor: '1',
  },
  () => ({
    html: `    <!-- Classic Roll structure: one masked viewport; rebuildCredits() fills the track. -->
    <div class="credits-box"><div id="credits-track"></div></div>`,
    css: `/* The viewport — a tall centered column the track rolls through. Its height is what
   the roll preset measures, so all travel math keys off this box. */
.credits-box {
  width: calc(900px * var(--scale));   /* a comfortable reading column (~47% of 1920) */
  height: calc(860px * var(--scale));  /* tall window — most of the frame, inside safe area */
  overflow: hidden;                    /* the mask: rows appear at the bottom, exit at the top */
}

/* The track — every row lives here; the preset animates its transform. */
#credits-track {
  text-align: center;                  /* the classic roll is centered — every stack aligns */
  will-change: transform;              /* hint the browser: this element travels every frame */
}

/* One section per .credits-page (rebuildCredits() wraps each parsed section). */
.credits-page {
  margin-bottom: calc(56px * var(--scale));  /* clear air between sections — bigger than any row gap */
}

/* Section heading — a quiet accent label, never louder than the names it introduces. */
.credits-heading {
  font-size: calc(18px * var(--scale));  /* kicker-sized (values are 1080p reference) */
  font-weight: 600;                    /* semibold — presence without weight */
  text-transform: uppercase;           /* small caps read as structure, not content */
  letter-spacing: 0.2em;               /* wide tracking — small caps breathe */
  color: var(--accent);                /* the one small, sharp dose of accent color */
  margin-top: calc(40px * var(--scale));     /* extra space above — a heading opens a chapter */
  margin-bottom: calc(28px * var(--scale));  /* then settles before its first credit */
}

/* One credit — a centered stack: role above, name beneath. */
.credits-row {
  margin-bottom: calc(26px * var(--scale));  /* the beat between credits — steady reading rhythm */
}

/* Role line — small, spaced caps, dimmed: the label, never the star. */
.credits-role {
  font-size: calc(20px * var(--scale));  /* clearly subordinate to the name below */
  font-weight: 400;                    /* regular weight — contrast comes from the name */
  text-transform: uppercase;           /* caps mark it as a label */
  letter-spacing: 0.14em;              /* open tracking for small uppercase text */
  color: var(--text-dim);              /* dimmed — never pure white twice */
  margin-bottom: calc(6px * var(--scale));   /* tiny gap: role + name read as one unit */
}

/* Name line — the star of each stack; the only weighty element in the design. */
.credits-name {
  font-size: calc(34px * var(--scale));  /* ~1.7:1 over the role — clear hierarchy */
  font-weight: 600;                    /* semibold carries the design without a panel */
  line-height: 1.15;                   /* big text sits tight */
  letter-spacing: -0.01em;             /* large sizes tighten slightly */
  color: var(--text-color);            /* primary text color */
}

/* The end block — hairline, logo, year. The roll preset stops with this centered. */
.credits-end {
  padding-top: calc(48px * var(--scale));    /* a long breath before the sign-off */
  padding-bottom: calc(12px * var(--scale)); /* small tail so the measurement isn't flush */
}

/* The hairline — lt01's 3px accent motif, laid horizontal and kept short. */
.credits-rule {
  width: calc(72px * var(--scale));    /* short on purpose — a mark, not a divider */
  height: calc(3px * var(--scale));    /* the family hairline weight (minimal: 2-4px) */
  background: var(--accent);           /* same sharp accent dose as the headings */
  margin: 0 auto calc(32px * var(--scale));  /* centered, with air before the logo */
}

/* Delivered logo — kept modest; the credits end quietly, not with a billboard. */
.credits-logo {
  max-width: calc(300px * var(--scale));   /* wide logos shrink to fit the column's core */
  max-height: calc(110px * var(--scale));  /* tall logos cap here — proportions preserved */
  margin-bottom: calc(24px * var(--scale)); /* air between the logo and the year line */
}

/* Logo placeholder — an intentional, quietly framed box until a real logo is imported. */
.credits-logo-slot {
  display: inline-flex;                /* shrinks to its frame; centers its label */
  align-items: center;                 /* label sits in the vertical middle */
  justify-content: center;             /* …and the horizontal middle */
  width: calc(220px * var(--scale));   /* a believable logo footprint */
  height: calc(96px * var(--scale));   /* roughly 2.3:1 — generic mark proportions */
  border: 1px dashed var(--text-dim);  /* dashed keyline says "drop your logo here" */
  border-radius: calc(2px * var(--scale)); /* minimal family: 0-2px radius, nothing rounder */
  font-size: calc(14px * var(--scale)); /* small caps label inside the frame */
  letter-spacing: 0.18em;              /* the same airy tracking as the headings */
  text-transform: uppercase;           /* label, not content */
  color: var(--text-dim);              /* dimmed — the placeholder never competes */
  margin-bottom: calc(24px * var(--scale)); /* same air as the real logo would get */
}

/* Year / copyright — the very last line; quiet and dimmed. */
.credits-year {
  font-size: calc(20px * var(--scale));  /* matches the role lines — closes the loop */
  font-weight: 400;                    /* regular — nothing shouts on the way out */
  letter-spacing: 0.04em;              /* a touch of air for the short closing line */
  color: var(--text-dim);              /* dimmed sign-off */
}`,
    rowBuilderJs: `// ── Classic Roll row builders — rebuildCredits() calls these for every parsed entry ──

// renderCreditRow(entry): one heading line or one role-above-name stack.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // A line without "|" — a section heading in quiet accent caps.
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  // "Role | Name" — the centered stack: role on top, name beneath.
  return '<div class="credits-row">' +
           '<div class="credits-role">' + entry.role + '</div>' +
           '<div class="credits-name">' + entry.name + '</div>' +
         '</div>';
}

// renderEndBlock(yearHtml, logoSrc): the sign-off the roll stops on —
// a short accent hairline, then the logo, then the year line.
function renderEndBlock(yearHtml, logoSrc) {
  // With a delivered logo we show the image; without one, a styled placeholder
  // frame marks the slot (drop a file in via the import flow to fill it).
  var logo = logoSrc
    ? '<img class="credits-logo" src="' + logoSrc + '" alt="Logo">'
    : '<div class="credits-logo-slot">Your logo</div>';
  return '<div class="credits-end">' +
           '<div class="credits-rule"></div>' +   // the lt01 hairline motif, laid flat
           logo +
           '<div class="credits-year">' + yearHtml + '</div>' +
         '</div>';
}`,
  }),
);
