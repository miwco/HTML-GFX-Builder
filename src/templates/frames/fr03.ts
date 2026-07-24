// fr03 "Volt Split" — the SPORT split-screen frame, sibling of lt05 "Angle Slab" / vs01. Two
// camera windows meeting at a leaning accent divider down the middle of the frame, with a heavy
// condensed name slab pinned under each. The pundit / co-caster / head-to-head layout.
//
// WINDOW GEOMETRY, in 1920 × 1080 design pixels — put the two camera sources here:
//   LEFT  x 0   · y 0 · width 954 · height 1080
//   RIGHT x 966 · y 0 · width 954 · height 1080
// The two windows are full-bleed to the top, bottom and outer edges; the 12 px seam between
// them is where the accent divider is drawn. Interiors are transparent.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineFrameVariant } from './shared';

export const fr03: TemplateVariant = defineFrameVariant(
  {
    id: 'fr03',
    category: 'frame',
    name: 'Volt Split',
    styleTag: 'sport',
    description: 'A split-screen surround: two full-height windows meeting at a leaning accent divider.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Left name', sample: 'RIVERA' },
      { title: 'Left role', sample: 'HOME ANALYST' },
      { title: 'Right name', sample: 'OKONKWO' },
      { title: 'Right role', sample: 'AWAY ANALYST' },
    ],
    logo: 'none',
    animationPresets: ['frame-slide', 'frame-draw', 'frame-fade'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'oswald',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Split',
    description:
      'A sport split screen: two full-height camera windows meeting at a leaning accent divider ' +
      'down the centre, each with a heavy condensed name slab pinned across its bottom. Put the ' +
      'sources at x 0 and x 966, full height, 954 wide each in a 1920 × 1080 frame; the seam ' +
      'between them is where the divider is drawn.',
    uicolor: '1',
  },
  (o) => {
    const leftName = o.lines[0]?.sample || 'RIVERA';
    const leftRole = o.lines[1]?.sample || 'HOME ANALYST';
    const rightName = o.lines[2]?.sample || 'OKONKWO';
    const rightRole = o.lines[3]?.sample || 'AWAY ANALYST';
    return {
      html: `    <div class="frame-box">
      <!-- LEFT camera window, full height to the left edge. -->
      <div class="frame-window frame-window-left"></div>
      <!-- RIGHT camera window, its mirror. -->
      <div class="frame-window frame-window-right"></div>
      <!-- The divider — the leaning accent seam the two pictures meet at. -->
      <div class="frame-divider"></div>
      <!-- LEFT name slab, pinned across the bottom of the left window. -->
      <div class="frame-plate frame-plate-left">
        <!-- Left name (f0) — SPX writes this field's value straight into the element. -->
        <div class="frame-mask"><span id="f0" class="frame-name">${leftName}</span></div>
        <!-- Left role (f1). -->
        <div class="frame-mask"><span id="f1" class="frame-role">${leftRole}</span></div>
      </div>
      <!-- RIGHT name slab. -->
      <div class="frame-plate frame-plate-right">
        <!-- Right name (f2). -->
        <div class="frame-mask"><span id="f2" class="frame-name">${rightName}</span></div>
        <!-- Right role (f3). -->
        <div class="frame-mask"><span id="f3" class="frame-role">${rightRole}</span></div>
      </div>
    </div>`,

      css: `/* The two camera windows — full-height halves. The sport family cuts its edges, so
   these carry no radius and no keyline: the divider does all the separating. */
.frame-window {
  top: 0;                              /* full bleed, top… */
  height: calc(1080px * var(--scale));  /* …to bottom */
  width: calc(954px * var(--scale));    /* half the frame, less the seam */
}
.frame-window-left {
  left: 0;                             /* hard to the left edge */
}
.frame-window-right {
  left: calc(966px * var(--scale));    /* after the 12px seam */
}

/* The divider — a leaning accent seam, wider than the gap so it covers both edges. */
.frame-divider {
  position: absolute;              /* placed against the stage */
  left: calc(946px * var(--scale));  /* centred on the seam between the windows */
  top: calc(-40px * var(--scale));   /* over-length so the lean never shows a gap at the top… */
  width: calc(28px * var(--scale));  /* the seam's drawn width */
  height: calc(1160px * var(--scale));  /* …or the bottom */
  background: var(--accent);       /* the one accent surface */
  transform: skewX(-8deg);         /* the sport family's lean */
}

/* The name slabs — pinned across the bottom of their own window, leaning with the family. */
.frame-plate {
  position: absolute;              /* placed against the stage, in design px */
  bottom: calc(64px * var(--scale));  /* up from the frame's bottom edge, inside the safe area */
  width: calc(680px * var(--scale));  /* a stable slab width whatever the name is */
  padding: calc(14px * var(--scale)) calc(30px * var(--scale)) calc(16px * var(--scale));
  will-change: transform, opacity; /* the slabs arrive after the windows */
}
.frame-plate::before {
  content: '';                     /* the slab surface itself */
  position: absolute;              /* behind the text… */
  inset: 0;                        /* …across the whole slab */
  z-index: -1;                     /* …and under it */
  background: var(--panel-bg);     /* the near-black slab */
  border-left: var(--accent-weight) solid var(--accent);  /* the family's fused accent edge */
  transform: skewX(-8deg);         /* the family's lean */
  box-shadow: var(--panel-shadow);  /* the family's lift */
}
.frame-plate-left {
  left: calc(96px * var(--scale));    /* inside the left window's safe area */
}
.frame-plate-right {
  left: calc(1062px * var(--scale));  /* the mirror position inside the right window */
}

/* The name — heavy condensed caps: the split screen's one loud voice per side. */
.frame-name {
  font-size: calc(40px * var(--scale) * var(--type-scale));  /* nameplate size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight — heavy condensed */
  line-height: 1.02;               /* condensed caps sit tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;       /* the sport register is always caps */
  color: var(--text-color);        /* primary text color */
}

/* The role — tracked caps under the name, in the family's label colour. */
.frame-role {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 700;                /* bold keeps condensed caps legible over video */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* the sport register is always caps */
  color: var(--label-color);       /* the family's label colour */
}`,

      fields: [
        { field: 'f0', ftype: 'textfield', title: o.lines[0]?.title || 'Left name', value: leftName },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Left role', value: leftRole },
        { field: 'f2', ftype: 'textfield', title: o.lines[2]?.title || 'Right name', value: rightName },
        { field: 'f3', ftype: 'textfield', title: o.lines[3]?.title || 'Right role', value: rightRole },
      ],
    };
  },
);
