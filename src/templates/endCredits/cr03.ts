// cr03 "Pager" - sport end credits as one-pager swaps, sibling of lt05 "Angle Slab".
// Each credit section renders as a full centered page; the credits-pages preset fades one
// page in, holds it long enough to read, then swaps to the next. The lt05 trick carries
// over: the -8deg sport lean is PAINTED on ::before layers (heading chip, logo badge), never
// on anything a preset tweens, so the lean survives every fade. Zero radius, condensed caps,
// one volt accent dose per element - pure sport shape language.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineCreditsVariant } from './shared';

export const cr03: TemplateVariant = defineCreditsVariant(
  {
    id: 'cr03',
    category: 'end-credits',
    name: 'Pager',
    styleTag: 'sport',
    description:
      'One-pager credit swaps: each section holds as a full centered card, then hands over ' +
      'to the next. Leaning slab headings and a volt logo badge - the Angle Slab of credits.',
    maxLines: 2,
    suggestedLines: [
      {
        title: 'Credits',
        sample: [
          'PRODUCTION',
          'Director | Alex Rivera',
          'Producer | Sam Chen',
          '',
          'CAMERA',
          'Director of Photography | Maria Santos',
          'Camera Operator | Jonas Berg',
          '',
          'Special thanks to everyone who made this show possible',
        ].join('\n'),
      },
      { title: 'Year / copyright', sample: '© 2026 Your Production' },
    ],
    hasLogoSlot: true,
    animationPresets: ['credits-pages'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Pager',
    description:
      'Sport end credits built as full-screen pages that swap section by section. Headings ' +
      'sit on forward-leaning dark slab chips with a volt edge (the lt05 lean, painted on a ' +
      'background layer so motion never flattens it); names are big condensed caps. The last ' +
      'page is a volt square badge holding your logo above the year line.',
    uicolor: '5',
  },
  () => ({
    // Structure: just the viewport and the track. rebuildCredits() (shared runtime) injects
    // one .credits-page per section plus the .credits-end block; the pages stack on top of
    // each other and the credits-pages preset fades between them.
    html: `    <!-- Pager: .credits-box is the viewport; pages are injected into #credits-track. -->
    <div class="credits-box">
      <div id="credits-track"></div>
    </div>`,
    css: `/* The viewport: a fixed stage the pages swap inside. Presets fade THIS on out. */
.credits-box {
  position: relative;              /* anchors the absolutely-stacked pages inside */
  width: calc(1200px * var(--scale));   /* generous stage width - pages center within it */
  height: calc(760px * var(--scale));   /* fixed stage - overlong sections paginate (see rowBuilderJs) */
  overflow: hidden;                /* pages never spill outside the stage */
}

/* The track: fills the viewport; the shared runtime injects pages into it. */
#credits-track {
  position: absolute;              /* fills the viewport ... */
  inset: 0;                        /* ... edge to edge */
  will-change: transform;          /* hint: presets tween transforms on the track */
}

/* One page per credit section. Pages STACK (all absolute) - the preset fades between them. */
.credits-page {
  position: absolute;              /* every page occupies the same spot ... */
  inset: 0;                        /* ... covering the whole viewport */
  display: flex;                   /* flex column to stack heading + rows */
  flex-direction: column;          /* rows read top to bottom */
  align-items: center;             /* centered horizontally - a poster, not a list */
  justify-content: center;         /* centered vertically inside the stage */
  gap: calc(18px * var(--scale));  /* even air between heading and every row */
  text-align: center;              /* centered type matches the poster layout */
  will-change: transform, opacity; /* hint: the preset fades + nudges each page */
}

/* Section heading: a dark slab chip. The chip itself stays straight (the preset nudges the
   page it sits on) - the sport lean is painted on ::before, exactly like lt05's slab. */
.credits-heading {
  position: relative;              /* anchors the painted slab (::before) behind the text */
  padding: calc(10px * var(--scale)) calc(30px * var(--scale));  /* tight chip, wide sides */
  font-size: calc(30px * var(--scale));  /* just under the 32px names - the slab chip, not size, marks it as a heading */
  font-weight: 700;                /* headings are shouted */
  line-height: 1.1;                /* tight - chip hugs the caps */
  letter-spacing: 0.08em;          /* condensed caps breathe a little */
  text-transform: uppercase;       /* sport labels are always caps */
  color: var(--text-color);        /* primary text on the dark slab */
  margin-bottom: calc(8px * var(--scale));  /* extra air: chip separates from the rows below */
}

/* The painted slab behind the heading: lean + volt edge live HERE, on a layer no preset
   ever tweens, so the -8deg sport lean can never be flattened by an inline transform. */
.credits-heading::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the chip exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* paints behind the heading text */
  background: var(--panel-bg);     /* near-black slab - same family as lt05 */
  border-left: calc(10px * var(--scale)) solid var(--accent);  /* volt edge fused to the slab - the family's 10px, same as lt05 */
  border-radius: 0;                /* hard corners - sport shape language */
  transform: skewX(-8deg);         /* SKEW: the whole chip leans forward (family token) */
}

/* One credit: role above name, read as a single unit. */
.credits-row {
  max-width: calc(1000px * var(--scale));  /* long names wrap instead of hitting the edges */
}

/* The role: small dim caps - the name is the star. */
.credits-role {
  font-size: calc(16px * var(--scale));  /* half the 32px name - the loud/quiet pair reads decisive */
  font-weight: 500;                /* medium - legible without competing */
  line-height: 1.3;                /* normal leading for the small line */
  letter-spacing: 0.08em;          /* top of the sport family's 0.02-0.1em label tracking */
  text-transform: uppercase;       /* labels are caps */
  color: var(--text-dim);          /* dimmed - one accent dose per element */
}

/* The name: big condensed caps, the loud line of every row. */
.credits-name {
  font-size: calc(32px * var(--scale));  /* headline of the row - 2:1 over the 16px role */
  font-weight: 700;                /* maximum punch */
  line-height: 1.15;               /* tight - big text needs little leading */
  letter-spacing: 0.02em;          /* a touch of air between the caps */
  text-transform: uppercase;       /* names are shouted, not spoken */
  color: var(--text-color);        /* primary text */
  overflow-wrap: break-word;       /* break very long unbroken words */
  text-wrap: balance;              /* wrapped lines get even lengths */
}

/* The final page: logo badge + year. Stacks exactly like a page - the preset treats it
   as the last swap and holds it until stop(). */
.credits-end {
  position: absolute;              /* same stacking spot as every page ... */
  inset: 0;                        /* ... covering the whole viewport */
  display: flex;                   /* badge above year */
  flex-direction: column;          /* stacked vertically */
  align-items: center;             /* centered horizontally */
  justify-content: center;         /* centered vertically */
  gap: calc(18px * var(--scale));  /* air between the badge and the year line */
  will-change: transform, opacity; /* hint: the preset fades + nudges it like a page */
}

/* The logo badge: a volt square. The lean is painted on ::before (never animated), so the
   logo inside stays dead straight while the badge reads mid-sprint. */
.credits-logo {
  position: relative;              /* anchors the painted badge (::before) behind the logo */
  width: calc(90px * var(--scale));   /* chunky square badge ... */
  height: calc(90px * var(--scale));  /* ... same on both axes */
  display: flex;                   /* centers whatever sits inside ... */
  align-items: center;             /* ... vertically */
  justify-content: center;         /* ... and horizontally */
}

/* The painted badge: the volt slab + sport lean, on a layer no preset ever touches. */
.credits-logo::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the badge exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* paints behind the logo */
  background: var(--accent);       /* the one loud color moment of the end page */
  border-radius: 0;                /* hard corners - sport shape language */
  transform: skewX(-8deg);         /* SKEW: the badge leans like every slab in the family */
}

/* The dropped-in logo: fits inside the badge with breathing room. */
.credits-logo img {
  max-width: 72%;                  /* the logo never touches the badge edges ... */
  max-height: 72%;                 /* ... on either axis */
  object-fit: contain;             /* keep the logo's own proportions */
}

/* The empty slot: an intentional drop-zone frame shown until a logo is imported. */
.credits-logo-slot {
  width: 62%;                      /* inset frame inside the badge ... */
  height: 62%;                     /* ... square like its parent */
  border: calc(2px * var(--scale)) dashed var(--panel-bg);  /* near-black dashes read as "drop here" on any accent tint */
  border-radius: 0;                /* hard corners - sport shape language */
}

/* The year / copyright line under the badge. */
.credits-year {
  font-size: calc(22px * var(--scale));  /* small closing line */
  font-weight: 600;                /* solid but below the names' 700 */
  line-height: 1.3;                /* normal leading */
  letter-spacing: 0.1em;           /* small caps breathe */
  text-transform: uppercase;       /* matches the label language */
  color: var(--text-color);        /* primary text - it is the final word */
}`,
    // Row markup for the shared runtime: renderCreditRow() shapes every parsed entry,
    // renderEndBlock() shapes the final logo + year page. Plain ES5 strings.
    rowBuilderJs: `// Pagination guard: the stage is a fixed height, so a section with too many rows would
// silently clip at BOTH edges (centered flex overflows symmetrically). renderCreditRow
// counts rows and splits an overlong section into sibling .credits-page blocks that the
// pages preset swaps through like any other page - nothing ever clips.
var ROWS_PER_PAGE = 8;  // heading + 7 credits fill the 760px stage comfortably at scale 1
var rowsOnPage = 0;     // rows emitted onto the current page so far

// renderCreditRow(entry): one section heading chip, or one role-above-name credit.
function renderCreditRow(entry) {
  if (entry.type === 'heading') {
    // A line without "|" becomes a leaning slab chip that titles the page. A heading tops
    // a fresh page (rebuildCredits opens one per section), so it counts as row one.
    rowsOnPage = 1;
    return '<div class="credits-heading">' + entry.text + '</div>';
  }
  var seam = '';
  if (rowsOnPage >= ROWS_PER_PAGE) {
    // Page full: close it and open a continuation page for the rest of the section.
    seam = '</div><div class="credits-page">';
    rowsOnPage = 0;
  }
  rowsOnPage++;
  // "Role | Name" becomes a stacked pair: dim role on top, big condensed name below.
  return seam + '<div class="credits-row">' +
    '<div class="credits-role">' + entry.role + '</div>' +
    '<div class="credits-name">' + entry.name + '</div>' +
  '</div>';
}

// renderEndBlock(yearHtml, logoSrc): the final page - volt badge (logo or an intentional
// placeholder frame) above the year line.
function renderEndBlock(yearHtml, logoSrc) {
  rowsOnPage = 0;        // rebuildCredits calls this last - reset the counter for the next rebuild
  var badgeContent;
  if (logoSrc) {
    badgeContent = '<img src="' + logoSrc + '" alt="Logo">';
  } else {
    // No logo yet: show the dashed drop-zone frame so the badge still looks designed.
    badgeContent = '<div class="credits-logo-slot"></div>';
  }
  return '<div class="credits-end">' +
    '<div class="credits-logo">' + badgeContent + '</div>' +
    '<div class="credits-year">' + yearHtml + '</div>' +
  '</div>';
}`,
  }),
);
