// card46 "Frost Location" — the GLASS location card, sibling of lt08 "Frosted Card" / card03
// "Frosted Panel" / card39 "Frost Product". A travel/IRL "where we are" card: a wide picture
// across the top of a frosted panel, a drawn map pin beside the place name, the region under
// it, and one live detail line (local time, weather, distance — whatever the stream is about).
//
// THE PIN IS A DRAWING, NOT A MAP. NoaCG has no map surface: there are no tiles, no
// geocoding, no coordinates-to-pixels projection, and generated templates take no runtime
// dependency, so anything that LOOKED like a live map here would be a picture pretending to
// be one. What this card does instead is honest and is what broadcast actually uses: the pin
// is a CSS marker that says "a place", the place is text the operator typed, and the picture
// is an image field they chose — a still map export, a photograph, a drone frame. The gap
// list in docs/PACK_TAXONOMY.md keeps real map/data surfaces where they belong: out of scope
// until external data feeds exist.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { designFieldId, maskLine, maskLines } from '../shared/standard';
import { defineCardVariant } from './shared';

export const card46: TemplateVariant = defineCardVariant(
  {
    id: 'card46',
    category: 'info-card',
    name: 'Frost Location',
    styleTag: 'glass',
    description: 'A location card: your picture over a pinned place name, its region, and a live detail.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Place', sample: 'Reykjavík' },
      { title: 'Region', sample: 'Höfuðborgarsvæðið, Iceland' },
      { title: 'Detail', sample: '14:20 local · −3 °C · clear' },
    ],
    logo: 'none',
    animationPresets: ['blur-in', 'pop-spring', 'slide-up', 'fade', 'slide-down', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-right',
  },
  {
    name: 'Frost Location',
    description:
      'A frosted location card for travel and IRL streams: a wide picture across the top (your ' +
      'own still — a map export, a photo, a drone frame), then a drawn map pin beside the place ' +
      'name, the region beneath it, and one live detail line. The pin is a drawn marker, not a ' +
      'live map: NoaCG has no map surface, so nothing here pretends to plot a coordinate.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Frost Location: [picture] over [pin + place / region / detail], in one frosted panel. -->
    <div class="info-card-box">
      <!-- The picture — the operator's own still. Empty = hidden, and the slot shows its mark. -->
      <div class="info-card-shot">
        <img id="${designFieldId(o)}" class="info-card-photo" style="display: none" alt="" />
      </div>
      <!-- The place row: the drawn pin sits beside the name, never inside its mask. -->
      <div class="info-card-place-row">
        <span class="info-card-pin" aria-hidden="true"></span>
${maskLines([maskLine('info-card', o, 0, 'info-card-place', '        ')])}
      </div>
${maskLines([
  maskLine('info-card', o, 1, 'info-card-region', '      '),
  maskLine('info-card', o, 2, 'info-card-detail', '      '),
])}
    </div>`,
    css: `/* The panel — the glass family's translucent recipe at card scale. */
.info-card-box {
  width: calc(400px * var(--scale));  /* a stable column width: the picture never resizes the card */
  padding: calc(18px * var(--scale));  /* the picture sits inside the panel, not bled to its edge */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: var(--panel-bg);      /* the translucent white wash */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop blur — this IS the glass */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* one soft lift + the 1px inner edge */
}

/* The picture — a wide crop across the top of the panel. */
.info-card-shot {
  position: relative;               /* the empty-slot mark is placed against this box */
  height: calc(170px * var(--scale));  /* a fixed height keeps the card's shape between places */
  border-radius: calc(12px * var(--scale));  /* softer than the panel, nested inside it */
  overflow: hidden;                 /* the picture is clipped to the rounded rectangle */
}
.info-card-shot::after {
  content: '';                      /* the empty-slot mark — a pure decoration, no text */
  position: absolute;               /* over the whole slot */
  inset: 0;                         /* edge to edge */
  border: 1px dashed rgba(255, 255, 255, 0.35);  /* "an image goes here" */
  border-radius: inherit;           /* follow the slot's rounding */
}
.info-card-shot.has-image::after {
  content: none;                    /* a real picture needs no mark */
}
.info-card-photo {
  width: 100%;                      /* fill the slot's width… */
  height: 100%;                     /* …and its height */
  object-fit: cover;                /* crop to fill; never stretch a photograph */
  display: block;                   /* no inline baseline gap under the image */
}

/* The place row — the pin and the name share one baseline. */
.info-card-place-row {
  display: flex;                    /* pin then name, in a row */
  align-items: center;              /* the marker centres against the name's cap height */
  gap: calc(12px * var(--scale));   /* a thin seam between the marker and the words */
  margin-top: calc(18px * var(--scale));  /* air between the picture and the place */
}

/* THE PIN — a drawn map marker: a ring with a tail, made of two CSS shapes. It is a symbol
   for "a place", not a plotted point; see this file's header. */
.info-card-pin {
  position: relative;               /* the tail is positioned against the head */
  flex: none;                       /* never squeezed by a long place name */
  width: calc(26px * var(--scale));  /* the marker head's width… */
  height: calc(26px * var(--scale));  /* …and height: a circle */
  border: calc(4px * var(--scale)) solid var(--accent);  /* the ring — the accent's moment here */
  border-radius: 50% 50% 50% 0;     /* three round corners and one point: the classic pin */
  transform: rotate(-45deg);        /* turn the square corner downward into the tail */
}
.info-card-pin::after {
  content: '';                      /* the marker's centre dot */
  position: absolute;               /* inside the head… */
  inset: calc(5px * var(--scale));  /* …with an even margin all round */
  border-radius: 50%;               /* a true circle */
  background: var(--accent);        /* the same accent, filled */
}

/* The place name — the card's display line. */
.info-card-place {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* card heading size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                 /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}

/* The region — where the place is, dimmed. */
.info-card-region {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* body scale under the place */
  font-weight: 400;                 /* regular weight */
  line-height: 1.35;                /* body text gets room to breathe */
  margin-top: calc(6px * var(--scale));  /* place → region: they read as one unit */
  color: var(--text-dim);           /* dimmed — never full white twice */
}

/* The detail line — the live fact (time, weather, distance), behind a thin rule so it
   reads as a separate kind of information from the address above it. */
.info-card-detail {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* the smallest voice on the card */
  font-weight: 400;                 /* regular weight */
  line-height: 1.4;                 /* body text gets room to breathe */
  padding-top: calc(12px * var(--scale));  /* air under the rule */
  margin-top: calc(14px * var(--scale));  /* region → detail: the card's largest break */
  border-top: 1px solid rgba(255, 255, 255, 0.16);  /* a hairline divider — the family's one rule */
  color: var(--text-dim);           /* dimmed — the third voice on the card */
}`,
    hasAccent: false,
    extraFields: [
      {
        field: designFieldId(o),
        ftype: 'filelist',
        title: 'Picture',
        value: o.logoAssetPath ?? '',
        assetfolder: './images/',
        extension: 'png',
      },
    ],
  }),
);
