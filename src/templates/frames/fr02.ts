// fr02 "Frost Interview" — the GLASS two-up interview frame, sibling of lt08 "Frosted Card".
// Two equal camera windows side by side, each with a soft keyline edge and its own frosted
// nameplate pill sitting inside the window's bottom-left corner. The remote-interview layout:
// host and guest, named, with nothing painted between them but air.
//
// WINDOW GEOMETRY, in 1920 × 1080 design pixels — put the two camera sources here:
//   LEFT  x 96  · y 168 · width 852 · height 744
//   RIGHT x 972 · y 168 · width 852 · height 744
// The 24 px seam between them is transparent; the interiors are transparent too.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineFrameVariant } from './shared';

export const fr02: TemplateVariant = defineFrameVariant(
  {
    id: 'fr02',
    category: 'frame',
    name: 'Frost Interview',
    styleTag: 'glass',
    description: 'A two-up interview surround: two camera windows, each with its own frosted nameplate.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Left name', sample: 'Marta Oliveira' },
      { title: 'Left role', sample: 'Host' },
      { title: 'Right name', sample: 'Dr Idris Bello' },
      { title: 'Right role', sample: 'Climate Physicist' },
    ],
    logo: 'none',
    animationPresets: ['frame-draw', 'frame-fade', 'frame-slide'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'mid-center',
  },
  {
    name: 'Frost Interview',
    description:
      'A two-up remote-interview surround in the glass family: two equal camera windows with ' +
      'soft keyline edges, each carrying a frosted nameplate pill inside its bottom-left ' +
      'corner. Put the sources at x 96 / x 972, y 168, 852 × 744 each in a 1920 × 1080 frame; ' +
      'the interiors and the seam between them are transparent.',
    uicolor: '5',
  },
  (o) => {
    const leftName = o.lines[0]?.sample || 'Marta Oliveira';
    const leftRole = o.lines[1]?.sample || 'Host';
    const rightName = o.lines[2]?.sample || 'Dr Idris Bello';
    const rightRole = o.lines[3]?.sample || 'Climate Physicist';
    return {
      html: `    <div class="frame-box">
      <!-- LEFT camera window — a keyline edge and the host's plate inside its corner. -->
      <div class="frame-window frame-window-left">
        <div class="frame-plate frame-plate-left">
          <!-- Left name (f0) — SPX writes this field's value straight into the element. -->
          <div class="frame-mask"><span id="f0" class="frame-name">${leftName}</span></div>
          <!-- Left role (f1). -->
          <div class="frame-mask"><span id="f1" class="frame-role">${leftRole}</span></div>
        </div>
      </div>
      <!-- RIGHT camera window — the mirror of the left, with the guest's plate. -->
      <div class="frame-window frame-window-right">
        <div class="frame-plate frame-plate-right">
          <!-- Right name (f2). -->
          <div class="frame-mask"><span id="f2" class="frame-name">${rightName}</span></div>
          <!-- Right role (f3). -->
          <div class="frame-mask"><span id="f3" class="frame-role">${rightRole}</span></div>
        </div>
      </div>
    </div>`,

      css: `/* The two camera windows — equal rectangles with a transparent seam between them.
   The edge is a keyline and a soft lift; the interior is never filled. */
.frame-window {
  top: calc(168px * var(--scale));     /* both windows share one baseline */
  width: calc(852px * var(--scale));   /* window width — see this design's header */
  height: calc(744px * var(--scale));  /* window height */
  border: 1px solid rgba(255, 255, 255, 0.28);  /* the glass family's keyline edge */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  box-shadow: var(--panel-shadow);     /* one soft lift, so the edge reads over any picture */
}
.frame-window-left {
  left: calc(96px * var(--scale));     /* left window x */
}
.frame-window-right {
  left: calc(972px * var(--scale));    /* right window x — 24px seam after the left one */
}

/* The nameplate — a frosted pill sitting INSIDE its window's bottom-left corner, which is
   what keeps each name unmistakably attached to its own picture. */
.frame-plate {
  position: absolute;              /* placed against its own window */
  left: calc(24px * var(--scale));    /* inset from the window's left edge */
  bottom: calc(24px * var(--scale));  /* …and up from its bottom edge */
  max-width: calc(640px * var(--scale));  /* never reaches the window's other edge */
  padding: calc(12px * var(--scale)) calc(22px * var(--scale)) calc(13px * var(--scale));
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: var(--panel-bg);     /* the translucent white wash */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop blur — this IS the glass */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* one soft lift + the 1px inner edge */
  will-change: transform, opacity; /* the plates settle in after the edges */
}

/* The name — the plate's display line. */
.frame-name {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* nameplate size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* headline leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The role — quiet tracked caps under the name, led by an accent dot. */
.frame-role {
  display: inline-flex;            /* the dot and the words share one row */
  align-items: center;             /* dot centred against the text */
  gap: calc(8px * var(--scale));   /* a thin seam between the dot and the words */
  font-size: calc(16px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 700;                /* bold keeps small caps legible over video */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a role, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}
.frame-role::before {
  content: '';                     /* the dot — decoration, so it never becomes text */
  flex: none;                      /* never squeezed by a long role */
  width: calc(7px * var(--scale));  /* a small round marker… */
  height: calc(7px * var(--scale));  /* …a true circle */
  border-radius: 50%;              /* round it */
  background: var(--accent);       /* the accent's one moment on the plate */
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
