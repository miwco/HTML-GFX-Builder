// ls25 "Now Playing" — the music strap where the TRACK leads and the artwork is real.
//
// The now-playing graphic is the one place in this pack where the picture on screen is often
// not the subject — a DJ set, a radio-with-video show, a festival wide shot. What the viewer
// wants is what they are hearing, so the track title is the headline, the artist follows, and
// the release artwork sits beside them at a real size rather than as a decorative mark.
//
// The artwork is a square image field, deliberately: cover art is square, and a slot that
// isn't will letterbox every file an operator ever picks. With no file the slot holds a quiet
// accent square, so the strap is complete before the artwork arrives.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { slot } from './shared';

export const ls25: TemplateVariant = defineVariant(
  {
    id: 'ls25',
    category: 'lower-third',
    name: 'Now Playing',
    styleTag: 'glass',
    roleTag: 'music',
    keywords: ['music', 'track', 'song', 'artist', 'dj', 'radio', 'now playing', 'album', 'label', 'cover'],
    description: 'Square cover artwork beside the track title, with the artist and release beneath.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Track', sample: 'Ultraviolet Hours' },
      { title: 'Artist', sample: 'MIRA KANO' },
      { title: 'Release', sample: 'Nightfall EP · Sable Records' },
    ],
    logo: 'optional',
    // Slide-left: a now-playing strap belongs to a running set, so it glides in from the
    // side the way a station ident does rather than announcing itself from below.
    animationPresets: ['slide-left', 'blur-in', 'fade', 'pop-spring', 'slide-up', 'mask-wipe'],
    defaultPalette: paletteById('orchid'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Now Playing',
    description:
      'The now-playing strap: square cover artwork as a real SPX image field beside the track ' +
      'title, with the artist and the release beneath. The track leads because on a DJ set or ' +
      'a radio show the picture is not the subject — what the viewer is hearing is. Without a ' +
      'file the slot holds a clean accent square.',
    uicolor: '5',
  },
  (o) => {
    // A real SPX image field; its id comes after every wizard field so nothing collides.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    const art = o.logoEnabled
      ? `      <!-- Cover artwork (image field ${logoField}) — square, because cover art is. -->
      <div class="lower-third-accent${logoPath ? ' has-image' : ''}">
        <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>
`
      : `      <!-- No artwork slot — turn it on in the wizard's Fields step. -->
      <div class="lower-third-accent"></div>
`;

    return {
      html: `    <!-- The strap: [square artwork] | [track · artist · release]. -->
    <div class="lower-third-box">
${art}      <div class="lower-third-text">
${slot(o, 0, 'lower-third-name', '        ')}
${slot(o, 1, 'lower-third-title', '        ')}
${slot(o, 2, 'lower-third-extra', '        ')}
      </div>
    </div>`,

      extraFields: o.logoEnabled
        ? [
            {
              field: logoField,
              ftype: 'filelist',
              title: 'Cover artwork',
              value: logoPath,
              assetfolder: './images/',
              extension: 'png',
            },
          ]
        : [],

      css: `/* The card — the glass family's surface. */
.lower-third-box {
  display: flex;                    /* artwork and text side by side */
  align-items: stretch;             /* the artwork runs the text's full height */
  background: var(--panel-bg);      /* the family's translucent white */
  backdrop-filter: var(--panel-blur);  /* the frost itself */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
  overflow: hidden;                 /* the artwork's corner follows the card's */
  max-width: calc(760px * var(--scale));  /* a release line runs long */
}

/* The artwork slot — SQUARE. aspect-ratio holds the shape whatever the text does, so a
   cover is never letterboxed and an empty slot is never a thin coloured sliver. */
.lower-third-accent {
  flex: 0 0 auto;                   /* never squeezed by a long track title */
  align-self: stretch;              /* matches the text block's height… */
  aspect-ratio: 1 / 1;              /* …and stays square against it */
  min-width: calc(104px * var(--scale));  /* a floor, for a one-line strap */
  background: var(--accent);        /* the placeholder square is the accent surface */
  position: relative;               /* the artwork covers this box */
}

/* The artwork itself (the ${logoField} image field — hidden while empty). Cover art is
   meant to be seen full-bleed, so this one crops to fill rather than fitting inside. */
.lower-third-logo {
  position: absolute;               /* covers the square */
  inset: 0;                         /* all four edges */
  width: 100%;                      /* fill the slot… */
  height: 100%;                     /* …both ways */
  object-fit: cover;                /* crop to fill — the right choice for a square cover */
}

.lower-third-text {
  display: flex;                    /* stack the three lines */
  flex-direction: column;           /* top to bottom */
  justify-content: center;          /* vertically centred against the artwork */
  min-width: 0;                     /* let it shrink so long titles wrap instead of overflowing */
  padding: calc(16px * var(--scale)) calc(32px * var(--scale)) calc(18px * var(--scale)) calc(24px * var(--scale));
}

/* The track (f0) — the headline: it is what the viewer is hearing. */
.lower-third-name {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.12;                /* a title wraps — give the rows air */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The artist (f1) — set in caps and in the accent: on a music strap the artist is a mark
   as much as a name, which is how sleeve typography treats it too. */
.lower-third-title {
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* clearly below the track */
  font-weight: 700;                 /* bold — tracked caps at this size need the weight */
  line-height: 1.25;                /* room if a long artist name wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the sleeve voice */
  color: var(--accent);             /* the strap's one coloured line */
  margin-top: calc(7px * var(--scale));  /* tied to the track above it */
}

/* The release (f2) — album and label, the quietest line. */
.lower-third-extra {
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* the smallest voice on the strap */
  font-weight: 400;                 /* regular — reference, not billing */
  line-height: 1.3;                 /* room if the pairing wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(4px * var(--scale));  /* tied to the artist above it */
}`,
      hasAccent: true,
    };
  },
);
