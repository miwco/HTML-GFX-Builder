// card45 "Clean Scan" — the MINIMAL QR card, sibling of lt01 "Hairline" / card07 "Clean Title".
// The code stacked over the words rather than beside them: a white quiet-zone tile, a short
// accent rule under it, then the headline, the written-out address, and one supporting line.
// That portrait shape is the one that fits a corner of a talk or webinar frame without
// reaching across the picture.
//
// Like card44 "House Scan", this design does NOT generate the code — see that file's header
// for the reasoning. The code is an SPX image field the operator points at their own PNG, and
// the address beside it is real text so the card still works for a viewer who cannot scan.
// The white tile and its padding are a SCANNABILITY requirement, not a style choice.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card45: TemplateVariant = defineCardVariant(
  {
    id: 'card45',
    category: 'info-card',
    name: 'Clean Scan',
    styleTag: 'minimal',
    description: 'A stacked QR card: your code image above a headline, the URL, and one detail line.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Headline', sample: 'Register for the workshop' },
      { title: 'Address', sample: 'city.edu/spring-lab' },
      { title: 'Detail', sample: 'Places are limited to 40' },
    ],
    logo: 'none',
    animationPresets: ['line-reveal', 'slide-up', 'fade', 'mask-wipe', 'slide-down', 'blur-in'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-right',
  },
  {
    name: 'Clean Scan',
    description:
      'A panel-free QR card in the minimal family: a white quiet-zone tile holding your code ' +
      'image, a short accent rule beneath it, then the headline, the written-out address, and ' +
      'one supporting line. The code is an image field — generate the PNG once with any QR ' +
      'tool, drop it in the project images folder, and pick it here.',
    uicolor: '2',
  },
  (o) => ({
    html: `    <!-- Clean Scan: [quiet-zone QR tile] / [accent rule] / headline / address / detail. -->
    <div class="info-card-box">
      <!-- The quiet zone: a white tile the operator's QR image sits inside, with a margin
           on every side. Empty = the img stays hidden and the tile shows its dashed mark. -->
      <div class="info-card-qr">
        <img id="${designFieldId(o)}" class="info-card-qr-image" style="display: none" alt="" />
      </div>
      <div class="info-card-accent"></div>
${maskLines([
  maskLine('info-card', o, 0, 'info-card-scan-head', '      '),
  maskLine('info-card', o, 1, 'info-card-url', '      '),
  maskLine('info-card', o, 2, 'info-card-detail', '      '),
])}
    </div>`,
    css: `/* No panel: the card is a tile and some type on the picture. The box exists for the
   presets to move, and caps how wide the copy under the tile may run. */
.info-card-box {
  max-width: calc(360px * var(--scale));  /* a portrait column — it never reaches across the frame */
}

/* THE QUIET ZONE. Deliberately NOT --panel-bg and deliberately not retintable: a QR code
   scans reliably as dark modules on a light field with a clear margin around them, so the
   tile stays white and padded whatever palette the graphic is given. Shrinking this padding
   or tinting this white is the one change in the design that can stop the code working. */
.info-card-qr {
  position: relative;               /* the empty-slot mark is placed against this tile */
  width: calc(190px * var(--scale));   /* tile width — the code plus its quiet zone */
  height: calc(190px * var(--scale));  /* …and height: a true square */
  padding: calc(14px * var(--scale));  /* THE QUIET ZONE — the clear margin scanners need */
  border-radius: calc(3px * var(--scale));  /* minimal corners: 0-3px, never a pill */
  background: #ffffff;              /* the light field a QR code needs; not a themed colour */
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);  /* one soft lift so the white tile reads over any picture */
}

/* The empty-slot mark: a dashed square shown until an image arrives. setFieldValue()
   puts .has-image on this wrapper the moment the operator picks a file. */
.info-card-qr::after {
  content: '';                      /* a pure decoration, no text */
  position: absolute;               /* inside the tile's quiet zone */
  inset: calc(14px * var(--scale));  /* sits exactly where the code will */
  border: 1px dashed rgba(15, 17, 21, 0.35);  /* dark on the white tile: "the code goes here" */
}
.info-card-qr.has-image::after {
  content: none;                    /* a real code needs no mark */
}

/* The code image — fills the quiet zone, never cropped and never stretched: a QR code
   read at the wrong aspect ratio is a QR code that does not scan. */
.info-card-qr-image {
  width: 100%;                      /* fill the padded box's width… */
  height: 100%;                     /* …and its height */
  object-fit: contain;              /* the WHOLE code, undistorted — never 'cover' here */
  display: block;                   /* no inline baseline gap under the image */
}

/* The accent rule — a short hairline between the tile and the words. */
.info-card-accent {
  width: calc(64px * var(--scale));  /* a short rule, not a full-width edge */
  height: var(--accent-weight);      /* the family's rule weight */
  margin: calc(20px * var(--scale)) 0 calc(14px * var(--scale));  /* air above and below */
  background: var(--accent);         /* the one accent surface */
  will-change: transform;            /* hint the browser: presets grow this rule in */
}

/* The headline — the instruction: what scanning this gets you. */
.info-card-scan-head {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* card heading size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;                /* headline leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.55);  /* the panel-free family's legibility over video */
}

/* The written-out address — the accessible half of the card, for anyone who cannot scan. */
.info-card-url {
  font-size: calc(21px * var(--scale) * var(--type-scale));  /* clearly readable at distance */
  font-weight: 700;                 /* bold — it is meant to be copied */
  line-height: 1.3;                 /* address leading */
  letter-spacing: 0.01em;           /* a URL is read character by character */
  overflow-wrap: anywhere;          /* a very long address breaks rather than overflowing */
  margin-top: calc(8px * var(--scale));  /* headline → address: one clear break */
  color: var(--accent);             /* the accent's second appearance, on the address */
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);  /* the same legibility insurance */
}

/* The supporting line — the quiet third voice. */
.info-card-detail {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* body scale under the address */
  font-weight: 400;                 /* regular weight */
  line-height: 1.4;                 /* body text gets room to breathe */
  margin-top: calc(8px * var(--scale));  /* address → detail: a small break */
  color: var(--text-dim);           /* dimmed — never full white twice */
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);  /* legibility over an unknown picture */
}`,
    hasAccent: true,
    extraFields: [
      {
        field: designFieldId(o),
        ftype: 'filelist',
        title: 'QR image',
        value: o.logoAssetPath ?? '',
        assetfolder: './images/',
        extension: 'png',
      },
    ],
  }),
);
