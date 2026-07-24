// fr04 "Clean Share" — the MINIMAL screen-share frame, sibling of lt01 "Hairline" / card42
// "Clean Listing". The presenter-plus-content layout every webinar, lecture and coding stream
// runs: a large content window with a hairline edge, a small presenter inset in the corner
// beside it, and one quiet label strip naming what is on the big window.
//
// WINDOW GEOMETRY, in 1920 × 1080 design pixels — put the two sources here:
//   CONTENT   x 96  · y 132 · width 1372 · height 772  (16:9 — the shared screen)
//   PRESENTER x 1500 · y 132 · width 324 · height 182  (16:9 — the camera inset)
// Both interiors are transparent; nothing is drawn inside either rectangle.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineFrameVariant } from './shared';

export const fr04: TemplateVariant = defineFrameVariant(
  {
    id: 'fr04',
    category: 'frame',
    name: 'Clean Share',
    styleTag: 'minimal',
    description: 'A screen-share surround: a large content window, a presenter inset, and a topic label.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Topic', sample: 'Designing for broadcast' },
      { title: 'Presenter', sample: 'Sofia Lindqvist' },
      { title: 'Detail', sample: 'Part 2 · Typography' },
    ],
    logo: 'none',
    animationPresets: ['frame-fade', 'frame-draw', 'frame-slide'],
    defaultPalette: paletteById('ivory'),
    defaultFontId: 'inter',
    defaultZone: 'mid-center',
  },
  {
    name: 'Clean Share',
    description:
      'A quiet screen-share surround: a large 16:9 content window with a hairline edge, a small ' +
      'presenter inset in the top-right beside it, and a label strip under the content naming ' +
      'the topic, the presenter and one detail. Put the shared screen at x 96, y 132, ' +
      '1372 × 772 and the camera at x 1500, y 132, 324 × 182 in a 1920 × 1080 frame.',
    uicolor: '2',
  },
  (o) => {
    const topic = o.lines[0]?.sample || 'Designing for broadcast';
    const presenter = o.lines[1]?.sample || 'Sofia Lindqvist';
    const detail = o.lines[2]?.sample || 'Part 2 · Typography';
    return {
      html: `    <div class="frame-box">
      <!-- The content window — the shared screen. Hairline edge, transparent interior. -->
      <div class="frame-window frame-window-content"></div>
      <!-- The presenter inset — the camera, parked beside the content. -->
      <div class="frame-window frame-window-inset"></div>
      <!-- The label strip under the content window. -->
      <div class="frame-plate">
        <div class="frame-plate-rule"></div>
        <div class="frame-plate-body">
          <!-- Topic (f0) — SPX writes this field's value straight into the element. -->
          <div class="frame-mask"><span id="f0" class="frame-name">${topic}</span></div>
          <div class="frame-plate-foot">
            <!-- Presenter (f1). -->
            <div class="frame-mask"><span id="f1" class="frame-role">${presenter}</span></div>
            <!-- Detail (f2) — cleared, it disappears (:empty). -->
            <div class="frame-mask"><span id="f2" class="frame-detail">${detail}</span></div>
          </div>
        </div>
      </div>
    </div>`,

      css: `/* Both windows share the minimal family's edge: one hairline, no radius to speak of,
   no shadow. The interiors are never filled. */
.frame-window {
  border: 1px solid rgba(255, 255, 255, 0.35);  /* the family's one keyline */
  border-radius: calc(3px * var(--scale));      /* minimal corners: 0-3px, never a pill */
}

/* The content window — the shared screen. */
.frame-window-content {
  left: calc(96px * var(--scale));      /* content x — see this design's header */
  top: calc(132px * var(--scale));      /* content y */
  width: calc(1372px * var(--scale));   /* content width (16:9 with the height below) */
  height: calc(772px * var(--scale));   /* content height */
}

/* The presenter inset — the camera, small and beside the content rather than over it, so
   nothing the presenter is showing is ever covered by the presenter. */
.frame-window-inset {
  left: calc(1500px * var(--scale));    /* inset x */
  top: calc(132px * var(--scale));      /* aligned with the content window's top edge */
  width: calc(324px * var(--scale));    /* inset width (16:9 with the height below) */
  height: calc(182px * var(--scale));   /* inset height */
  border-color: var(--accent);          /* the accent's one moment: it marks the live camera */
}

/* The label strip — under the content window, aligned to its left edge. */
.frame-plate {
  position: absolute;              /* placed against the stage, in design px */
  left: calc(96px * var(--scale));    /* aligned with the content window's left edge */
  top: calc(936px * var(--scale));    /* content y + content height + 32px of air */
  max-width: calc(1372px * var(--scale));  /* never wider than the window it labels */
  will-change: transform, opacity; /* the strip settles in after the edges */
}

/* The accent rule above the label — the minimal family's one drawn accent. */
.frame-plate-rule {
  width: calc(72px * var(--scale));  /* a short rule, not a full-width edge */
  height: var(--accent-weight);      /* the family's rule weight */
  margin-bottom: calc(12px * var(--scale));  /* air between the rule and the topic */
  background: var(--accent);         /* the one accent surface */
}

.frame-plate-body {
  /* the text column — deliberately unstyled; the lines below carry their own type */
}

/* The topic — what is on the big window. The strip's one display line. */
.frame-name {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* label-strip size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;               /* headline leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);        /* primary text color */
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.55);  /* the panel-free family's legibility over video */
}

/* The footer row — presenter and detail on one line, divided by a thin rule. */
.frame-plate-foot {
  display: flex;                   /* the two facts share one row */
  flex-wrap: wrap;                 /* a long pair wraps instead of running off the strip */
  align-items: baseline;           /* both sit on the same text baseline */
  gap: calc(16px * var(--scale));  /* clear air between two kinds of information */
  margin-top: calc(8px * var(--scale));  /* topic → footer: one clear break */
}

/* The presenter — tracked caps, the strip's label voice. */
.frame-role {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* label scale */
  font-weight: 700;                /* bold keeps small caps legible over video */
  line-height: 1.3;                /* compact label leading */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;       /* reads as a credit, whatever the operator types */
  color: var(--label-color);       /* the family's label colour */
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);  /* the same legibility insurance */
}

/* The detail — the quietest voice on the strip; gone entirely when cleared (:empty). */
.frame-detail {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* the same size as the credit… */
  font-weight: 400;                /* …with contrast through weight, not more fonts */
  line-height: 1.3;                /* compact leading */
  padding-left: calc(16px * var(--scale));  /* air after the divider */
  border-left: 1px solid rgba(255, 255, 255, 0.3);  /* a hairline divider between the two facts */
  color: var(--text-dim);          /* dimmed — never full white twice */
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);  /* legibility over an unknown picture */
}
.frame-detail:empty {
  display: none;                   /* nothing to add = no divider and no gap left behind */
}`,

      fields: [
        { field: 'f0', ftype: 'textfield', title: o.lines[0]?.title || 'Topic', value: topic },
        { field: 'f1', ftype: 'textfield', title: o.lines[1]?.title || 'Presenter', value: presenter },
        { field: 'f2', ftype: 'textfield', title: o.lines[2]?.title || 'Detail', value: detail },
      ],
    };
  },
);
