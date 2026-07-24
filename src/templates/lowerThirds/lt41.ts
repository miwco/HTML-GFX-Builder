// lt41 "Team Bar" — the extended sport strap with a CREST: a squared logo well, a heavy accent
// bar, and three lines — player, club or role, and a stat or fixture line. It is the roster
// graphic: everything a viewer needs about one competitor, at matchday volume.
//
// Unlike lt07 Number Badge, whose badge IS the accent, here the crest sits in its own dark well
// and the accent stays a bar between crest and words — so a club's own colours never have to
// fight the graphic's accent colour.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVariant, lineMasks } from './shared';

export const lt41: TemplateVariant = defineVariant(
  {
    id: 'lt41',
    category: 'lower-third',
    name: 'Team Bar',
    styleTag: 'sport',
    description: 'Crest well, accent bar, then player, club and a stat line — the roster strap.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Player', sample: 'JAKE MORRISON' },
      { title: 'Club', sample: 'NORTHGATE TITANS' },
      { title: 'Stat line', sample: '24 PTS · 11 AST · 3 STL' },
    ],
    logo: 'optional',
    animationPresets: ['snap-stinger', 'mask-wipe', 'slide-right', 'pop-spring', 'fade'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Team Bar',
    description:
      'The roster strap: a crest in its own well, a heavy accent bar, then the player name, the ' +
      'club, and a stat or fixture line. The crest well is neutral on purpose, so a club badge in ' +
      'any colours sits cleanly beside the graphic\'s accent. Sibling of lt07 Number Badge.',
    uicolor: '7',
  },
  (o) => {
    // A real SPX image field ("filelist"): SPX writes the picked file's path into the <img>,
    // and an empty value hides it (setFieldValue), leaving a clean dark well.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    // The well is FURNITURE FOR THE SLOT: with the logo turned off there is no crest to hold,
    // so the whole well is left out rather than shipped as an empty tinted square.
    const crest = o.logoEnabled
      ? `
      <div class="lower-third-crest">
        <!-- Logo (image field ${logoField}) — the crest; hidden while empty, the well stays. -->
        <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>`
      : `
      <!-- No crest on this graphic — turn the logo slot on in the wizard to add one. -->`;

    return {
      html: `    <!-- Team Bar: [crest well] [accent bar] [player / club / stat line]. -->
    <div class="lower-third-box">${crest}
      <div class="lower-third-accent"></div>
      <div class="lower-third-text">
${lineMasks(o, '        ')}
      </div>
    </div>`,

      extraFields: o.logoEnabled
        ? [
            {
              field: logoField,
              ftype: 'filelist',
              title: 'Crest',
              value: logoPath,
              assetfolder: './images/',
              extension: 'png',
            },
          ]
        : [],

      css: `/* The slab — crest, bar and words fused into one hard-edged unit. */
.lower-third-box {
  display: flex;                   /* the three pieces sit side by side */
  align-items: stretch;            /* every piece runs the slab's full height */
  background: var(--panel-bg);     /* dark panel behind the text stack */
  box-shadow: var(--panel-shadow);  /* the family's hard offset lift */
}

${
        o.logoEnabled
          ? `/* The crest well — a slightly lighter square so a dark badge still separates from the
   slab. Deliberately NOT accent-filled: club colours own this space, not the graphic's. */
.lower-third-crest {
  position: relative;              /* the badge positions against this well — see below */
  flex: none;                      /* fixed width; long names never squeeze the crest */
  width: calc(96px * var(--scale));  /* square well at the slab's height */
  background: color-mix(in srgb, var(--text-color) 8%, transparent);  /* a lift off the slab */
}

/* The badge itself (the ${logoField} image field). It is positioned OUT of the flow, inside
   the well's padding box, because the well takes its height from the text beside it: an
   in-flow image would feed its own height back into that measurement, and a tall portrait
   crest would stretch the well — and with it the whole strap. Out of flow, a crest of any
   shape letterboxes inside a well the text alone decides the size of. */
.lower-third-logo {
  position: absolute;              /* out of the flow — see above */
  inset: 0;                        /* covers the well… */
  width: 100%;                     /* …at its full width… */
  height: 100%;                    /* …and its full height */
  padding: calc(12px * var(--scale));  /* breathing room: object-fit letterboxes INSIDE the padding */
  object-fit: contain;             /* show the whole crest, never distort or crop it */
}

`
          : ''
      }/* The accent bar — the family's heavy bar, between crest and words. */
.lower-third-accent {
  flex: none;                      /* never squeezed by long text */
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the accent used boldly, sport-style */
  will-change: transform;          /* hint the browser: presets animate this bar */
}

/* The text stack. */
.lower-third-text {
  display: flex;                   /* stack the lines vertically */
  flex-direction: column;          /* top to bottom */
  justify-content: center;         /* centred against the crest */
  min-width: 0;                    /* lets a long unbroken name wrap instead of overflowing */
  padding: calc(16px * var(--scale)) calc(38px * var(--scale)) calc(18px * var(--scale)) calc(26px * var(--scale));
}

/* Player (f0) — the heaviest line on the slab. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.04;               /* big display text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the matchday voice */
  color: var(--text-color);        /* primary text */
}

/* Club (f1) — the second voice: tracked caps at full strength. Deliberately NOT the accent
   colour: this design's accent is whatever suits the competition, and a mid-blue or a deep
   red on small tracked caps falls under the 4.5:1 a caption needs. The bar carries the
   colour; the type carries the contrast. */
.lower-third-title {
  font-size: calc(22px * var(--scale) * var(--type-scale));  /* ≈2:1 below the name — clear hierarchy */
  font-weight: 600;                /* tracked caps need weight to stay crisp */
  line-height: 1.2;                /* a touch more air than the headline */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* matches the headline's voice */
  color: var(--label-color);       /* the family's label colour (full-strength text) */
  margin-top: calc(6px * var(--scale));  /* player + club read as one unit */
}

/* Stat line (f2) — the smallest voice, dimmed so the numbers never outrank the name. */
.lower-third-extra {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* the smallest voice on the slab */
  font-weight: 500;                /* medium keeps tracked caps crisp */
  line-height: 1.25;               /* same rhythm as the club line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* keeps the stack uniform */
  color: var(--text-dim);          /* dimmed — the stat supports, it does not shout */
  margin-top: calc(8px * var(--scale));  /* separated — the stat line is its own beat */
}`,
      hasAccent: true,
    };
  },
);
