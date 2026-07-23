// ls18 "Faculty Card" — the speaker strap led by the institution's mark.
//
// Conference and webinar streams are usually run by, or on behalf of, the institution whose
// logo has to be on screen — that is frequently a condition of the recording. This is the
// strap for that: the mark sits at the head of the card as a real image field, with the
// speaker named beside it and the department underneath.
//
// It is the academic sibling of ls10 "Club Crest": same idea — the organisation is the unit
// and the person is the instance — done in the register of a lecture theatre rather than a
// stadium, which is why the mark sits on the card's own surface instead of in a filled block.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { slot } from './shared';

export const ls18: TemplateVariant = defineVariant(
  {
    id: 'ls18',
    category: 'lower-third',
    name: 'Faculty Card',
    styleTag: 'glass',
    roleTag: 'academic',
    keywords: ['university', 'institution', 'logo', 'department', 'conference', 'webinar', 'faculty', 'keynote', 'speaker'],
    description: 'The institution mark at the head of the card, with the speaker named beside it.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Name', sample: 'Dr. Yuki Tanaka' },
      { title: 'Position', sample: 'Senior Lecturer' },
      { title: 'Department', sample: 'School of Computer Science' },
    ],
    logo: 'optional',
    animationPresets: ['slide-up', 'blur-in', 'fade', 'mask-wipe', 'pop-spring', 'line-reveal'],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Faculty Card',
    description:
      'The institutional speaker card: the organisation mark at the head as a real SPX image ' +
      'field — so the logo is swapped at playout, not baked in — with the speaker, their ' +
      'position and their department beside it. Without a file the slot holds a quiet ' +
      'placeholder rule, so the card never waits on artwork to be usable.',
    uicolor: '3',
  },
  (o) => {
    // A real SPX image field; its id comes after every wizard field so nothing collides.
    // setFieldValue hides an <img> with no value and marks its parent .has-image when
    // there is one — which is how the placeholder below knows to stand down.
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    const mark = o.logoEnabled
      ? `      <!-- The institution mark (image field ${logoField}). Empty shows the placeholder rule. -->
      <div class="lower-third-markbox${logoPath ? ' has-image' : ''}">
        <div class="lower-third-markrule"></div>
        <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>
`
      : '';

    return {
      html: `    <!-- The card: [institution mark] | [accent edge] | [name · position · department]. -->
    <div class="lower-third-box">
${mark}      <div class="lower-third-accent"></div>
      <div class="lower-third-text">
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
              title: 'Institution logo',
              value: logoPath,
              assetfolder: './images/',
              extension: 'png',
            },
          ]
        : [],

      css: `/* The card — the glass family's surface: blurred, softly cornered, lightly lifted. */
.lower-third-box {
  display: flex;                    /* mark, edge and text in a row */
  align-items: stretch;             /* everything runs the card's full height */
  background: var(--panel-bg);      /* the family's translucent white */
  backdrop-filter: var(--panel-blur);  /* the frost itself */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* lift + the 1px inner edge */
  overflow: hidden;                 /* the accent edge follows the rounded corner */
}

/* The mark area — on the card's own surface, not in a filled block: a university mark is
   usually multi-colour artwork, and a coloured block behind it fights the logo. */
.lower-third-markbox {
  position: relative;               /* the placeholder and the logo stack inside this box */
  flex: 0 0 calc(112px * var(--scale));   /* fixed width; long names never squeeze the mark */
  display: flex;                    /* centre whatever is inside it */
  align-items: center;              /* …vertically */
  justify-content: center;          /* …horizontally */
  padding: calc(16px * var(--scale));  /* breathing room around the artwork */
}

/* The placeholder — a quiet rule where the mark will be, so an unset slot reads as
   "nothing here yet" rather than as a broken image. */
.lower-third-markrule {
  width: calc(52px * var(--scale));  /* about the width a wordmark would take */
  height: calc(2px * var(--scale));  /* a hairline */
  background: var(--text-dim);      /* neutral — the accent belongs to the edge beside it */
  opacity: 0.5;                     /* a placeholder should read as absent, not as content */
}
.lower-third-markbox.has-image .lower-third-markrule {
  display: none;                    /* a picked logo replaces the placeholder */
}

/* The mark itself (the ${logoField} image field — hidden while empty). */
.lower-third-logo {
  position: absolute;               /* covers the mark area */
  inset: calc(16px * var(--scale)); /* inside the padding */
  width: auto;                      /* sized by the box, not by the file */
  height: auto;                     /* …both ways */
  max-width: 100%;                  /* never wider than the area */
  max-height: 100%;                 /* never taller than it */
  margin: auto;                     /* centred whatever the artwork's aspect */
  object-fit: contain;              /* show the whole mark, never crop */
}

/* The accent edge between the mark and the text — the graphic's accent node, and the
   thing that stops the pairing reading as one wide block. */
.lower-third-accent {
  flex: none;                       /* never squeezed */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  transform-origin: center;         /* line-reveal scales it from the middle */
}

.lower-third-text {
  display: flex;                    /* stack the lines vertically */
  flex-direction: column;           /* top to bottom */
  justify-content: center;          /* vertically centred against the mark */
  min-width: 0;                     /* let it shrink so long values wrap instead of overflowing */
  max-width: calc(560px * var(--scale));  /* the wrap point for a long department name */
  padding: calc(18px * var(--scale)) calc(32px * var(--scale)) calc(20px * var(--scale)) calc(26px * var(--scale));
}

/* The name — the card's headline. */
.lower-third-name {
  font-size: calc(34px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.12;                /* room for an honorific and a wrapped surname */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The position — the middle voice. */
.lower-third-title {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* clearly below the name */
  font-weight: 400;                 /* regular — hierarchy comes from the name's weight */
  line-height: 1.3;                 /* room if the position wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(5px * var(--scale));  /* tied to the name above it */
}

/* The department — small caps in the accent: the institutional voice, as in ls17. */
.lower-third-extra {
  font-size: calc(15px * var(--scale) * var(--type-scale));  /* the smallest voice on the card */
  font-weight: 600;                 /* semibold — small tracked caps need the weight */
  line-height: 1.3;                 /* room if a long department wraps */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* the institutional voice */
  color: var(--accent);             /* the card's one coloured line */
  margin-top: calc(7px * var(--scale));  /* its own beat below the position */
}`,
      hasAccent: true,
    };
  },
);
