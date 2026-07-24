// fr01 "House Cam" — the NoaCG single-camera frame, sibling of lt11 "House Strap". One camera
// window with an amber corner bracket on each corner, and the house nameplate (amber bar +
// void panel) docked under its bottom-left corner.
//
// WINDOW GEOMETRY, in 1920 × 1080 design pixels — put the camera source here:
//   x 200 · y 96 · width 1520 · height 855  (a 16:9 window inside the safe area)
// Everything else the frame draws sits OUTSIDE that rectangle except the corner brackets
// (which overlap its edge by their own thickness) and the nameplate, which overlays the
// window's bottom-left corner the way a broadcast nameplate does. The interior is transparent.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineFrameVariant } from './shared';

export const fr01: TemplateVariant = defineFrameVariant(
  {
    id: 'fr01',
    category: 'frame',
    name: 'House Cam',
    styleTag: 'noacg',
    description: 'A single webcam surround: amber corner brackets and the house nameplate under it.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Name', sample: 'Ada Lovelace' },
      { title: 'Role', sample: 'Chief Analyst' },
    ],
    logo: 'none',
    animationPresets: ['frame-draw', 'frame-fade', 'frame-slide'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'House Cam',
    description:
      'The NoaCG single-camera surround: a 16:9 window inset into the safe area with an amber ' +
      'corner bracket on each corner, and the house nameplate — an 8px amber bar fused to a ' +
      'void blur panel — docked under its bottom-left corner. Put the camera source at ' +
      'x 200, y 96, 1520 × 855 in a 1920 × 1080 frame; the window interior is transparent.',
    uicolor: '4',
  },
  (o) => {
    const name = o.lines[0]?.sample || 'Ada Lovelace';
    const role = o.lines[1]?.sample || 'Chief Analyst';
    return {
      html: `    <div class="frame-box">
      <!-- The camera window: a transparent rectangle with four drawn corner brackets. -->
      <div class="frame-window">
        <span class="frame-corner frame-corner-tl"></span>
        <span class="frame-corner frame-corner-tr"></span>
        <span class="frame-corner frame-corner-bl"></span>
        <span class="frame-corner frame-corner-br"></span>
      </div>
      <!-- The nameplate, docked under the window's bottom-left corner. -->
      <div class="frame-plate">
        <div class="frame-plate-accent"></div>
        <div class="frame-plate-body">
          <!-- Name (f0) — SPX writes this field's value straight into the element. -->
          <div class="frame-mask"><span id="f0" class="frame-name">${name}</span></div>
          <!-- Role (f1) — SPX writes this field's value straight into the element. -->
          <div class="frame-mask"><span id="f1" class="frame-role">${role}</span></div>
        </div>
      </div>
    </div>`,

      css: `/* The camera window — the rectangle the switcher fills. Interior stays transparent. */
.frame-window {
  left: calc(200px * var(--scale));    /* window x — see this design's header */
  top: calc(96px * var(--scale));      /* window y */
  width: calc(1520px * var(--scale));  /* window width (16:9 with the height below) */
  height: calc(855px * var(--scale));  /* window height */
}

/* The corner brackets — two arms each, drawn with borders and overlapping the window edge
   by their own thickness so they read as a bracket ON the corner, not beside it. */
.frame-corner {
  position: absolute;              /* each bracket pins to its own corner */
  width: calc(64px * var(--scale));   /* the arm length… */
  height: calc(64px * var(--scale));  /* …in both directions */
  border: 0 solid var(--accent);   /* the arms are switched on per corner below */
  box-shadow: var(--accent-glow);  /* the house glow, at bracket scale */
}
.frame-corner-tl {
  left: calc(-4px * var(--scale));  /* overlap the window edge by the arm's own weight */
  top: calc(-4px * var(--scale));
  border-left-width: calc(4px * var(--scale));   /* the two arms that meet at top-left */
  border-top-width: calc(4px * var(--scale));
}
.frame-corner-tr {
  right: calc(-4px * var(--scale));
  top: calc(-4px * var(--scale));
  border-right-width: calc(4px * var(--scale));  /* top-right */
  border-top-width: calc(4px * var(--scale));
}
.frame-corner-bl {
  left: calc(-4px * var(--scale));
  bottom: calc(-4px * var(--scale));
  border-left-width: calc(4px * var(--scale));   /* bottom-left */
  border-bottom-width: calc(4px * var(--scale));
}
.frame-corner-br {
  right: calc(-4px * var(--scale));
  bottom: calc(-4px * var(--scale));
  border-right-width: calc(4px * var(--scale));  /* bottom-right */
  border-bottom-width: calc(4px * var(--scale));
}

/* The nameplate — docked INSIDE the window's bottom-left corner and anchored by its BOTTOM,
   so it reads as part of the shot (the standard nameplate position) and, crucially, a long
   wrapped name grows UPWARD over the corner instead of downward off the frame. Anchoring the
   top here was a real bug: the 129px band below the window is too short for two wrapped rows,
   and a 60-char name ran straight off the bottom edge. */
.frame-plate {
  position: absolute;              /* placed against the .frame root, in the same design px */
  left: calc(224px * var(--scale));   /* just inside the window's left edge */
  bottom: calc(153px * var(--scale));  /* just up from the window's bottom edge (frame h − that ≈ window bottom) */
  display: flex;                   /* the amber bar and the panel sit side by side */
  will-change: transform, opacity; /* the plate settles in after the edge */
}

/* The house accent bar, fused to the panel's left edge. */
.frame-plate-accent {
  width: var(--accent-weight);     /* the family's bar weight */
  background: var(--accent);       /* the one accent surface */
  box-shadow: var(--accent-glow);  /* the family's glow — follows the accent color */
}

/* The panel — the house void behind the two lines. */
.frame-plate-body {
  padding: calc(12px * var(--scale)) calc(30px * var(--scale)) calc(14px * var(--scale)) calc(18px * var(--scale));
  background: var(--panel-bg);     /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}

/* The name — the plate's display line. */
.frame-name {
  max-width: calc(560px * var(--scale));  /* a very long name wraps rather than running on */
  font-size: calc(30px * var(--scale) * var(--type-scale));  /* nameplate size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* headline leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
}

/* The role — the house mono label under the name. */
.frame-role {
  max-width: calc(560px * var(--scale));  /* the same wrap cap as the name */
  font-family: var(--font-label);  /* the house label face */
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 700;                /* bold keeps small caps legible over video */
  line-height: 1.25;               /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a role, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
}`,

      fields: [
        { field: 'f0', ftype: 'textfield', title: o.lines[0]?.title || 'Name', value: name },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Role', value: role },
      ],
    };
  },
);
