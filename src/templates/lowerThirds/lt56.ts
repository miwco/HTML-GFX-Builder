// lt56 "Frost Call" — the GLASS call-to-action strap, sibling of lt08 "Frosted Card" /
// lt16 "Frost Handle". One frosted pill holding an outlined action chip, the target it points
// at, and a small drawn arrow that says "go here". The reason line sits beneath the pill,
// outside the glass, so the ask itself stays a single clean object.
//
// Same three-field CTA contract as lt55 "House Call" — action · target · reason — because the
// shape belongs to the type and only the skin belongs to the family.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineVariant } from './shared';

export const lt56: TemplateVariant = defineVariant(
  {
    id: 'lt56',
    category: 'lower-third',
    name: 'Frost Call',
    styleTag: 'glass',
    description: 'A frosted call-to-action pill: an outlined action chip, the target, and a reason line.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Action', sample: 'Donate' },
      { title: 'Target', sample: 'give.cityhospice.org' },
      { title: 'Detail', sample: 'Every gift is matched until midnight' },
    ],
    logo: 'none',
    animationPresets: ['pop-spring', 'blur-in', 'slide-up', 'fade', 'slide-left', 'flip-3d'],
    defaultPalette: paletteById('frost'),
    defaultFontId: 'manrope',
    defaultZone: 'bottom-center',
  },
  {
    name: 'Frost Call',
    description:
      'A translucent blurred pill carrying the call to action: an outlined chip with the ' +
      'imperative ("Donate", "Follow", "Register"), the target address beside it, and a small ' +
      'drawn arrow closing the pill. The reason line sits under the glass so the ask stays one ' +
      'clean object; clear it for a compact pill alone.',
    uicolor: '5',
  },
  (o) => ({
    html: `    <!-- Frost Call: [frosted pill: action chip + target + arrow] over the reason line. -->
    <div class="lower-third-box">
      <div class="lower-third-ask">
${maskLines([
  maskLine('lower-third', o, 0, 'lower-third-action', '        '),
  maskLine('lower-third', o, 1, 'lower-third-target', '        '),
])}
        <!-- The arrow: a drawn chevron, decoration only — never text, never a field. -->
        <span class="lower-third-arrow" aria-hidden="true"></span>
      </div>
    </div>
${maskLines([maskLine('lower-third', o, 2, 'lower-third-reason', '    ')])}`,
    css: `/* The pill — the glass family's translucent recipe, fully rounded. */
.lower-third-box {
  padding: calc(12px * var(--scale)) calc(26px * var(--scale));  /* a pill hugs its contents */
  border-radius: calc(999px * var(--scale));  /* fully rounded — the glass family's pill shape */
  background: var(--panel-bg);      /* the translucent white wash */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop blur — this IS the glass */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow), var(--panel-keyline);  /* one soft lift + the 1px inner edge */
}

/* The ask row — chip, target and arrow on one baseline. */
.lower-third-ask {
  display: flex;                    /* the chip, what it points at, and the arrow */
  flex-wrap: wrap;                  /* a very long address wraps instead of overflowing the pill */
  align-items: center;              /* the chip and the arrow centre against the target */
  gap: calc(14px * var(--scale));   /* clear air between the three parts */
}

/* The action — an outlined chip. Glass never fills a surface it can simply draw. */
.lower-third-action {
  padding: calc(4px * var(--scale)) calc(14px * var(--scale));  /* a compact badge */
  border: 1px solid var(--accent);  /* outlined, not filled */
  border-radius: calc(999px * var(--scale));  /* a pill inside a pill */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* label scale, one step up */
  font-weight: 700;                 /* bold keeps small caps legible over video */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as an instruction, whatever the operator types */
  white-space: nowrap;              /* "REGISTER" never breaks mid-word */
  color: var(--accent);             /* the outline's own colour, not filled ink */
}

/* The target — the address or handle the ask points at. */
.lower-third-target {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* strap heading size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.15;                /* headline leading */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  overflow-wrap: anywhere;          /* a very long address breaks rather than overflowing */
  color: var(--text-color);         /* primary text color */
}

/* The arrow — a drawn chevron closing the pill: "this way". Two borders, rotated. */
.lower-third-arrow {
  flex: none;                       /* never squeezed by a long address */
  width: calc(13px * var(--scale));  /* the chevron's arm length… */
  height: calc(13px * var(--scale));  /* …in both directions */
  border-top: calc(3px * var(--scale)) solid var(--accent);   /* the top arm */
  border-right: calc(3px * var(--scale)) solid var(--accent);  /* the right arm */
  transform: rotate(45deg);         /* turn the corner into a right-pointing chevron */
}

/* The reason — under the glass, over the picture: why anyone should do it. It sits OUTSIDE
   .lower-third-box (so the pill stays one clean object), which also means the assembler's
   auto-fit cap does not reach it — hence its own max-width, or a long value would run off
   the frame instead of wrapping. */
.lower-third-reason {
  max-width: calc(620px * var(--scale));  /* the wrap cap the box would otherwise have given it */
  font-size: calc(19px * var(--scale) * var(--type-scale));  /* body scale under the pill */
  font-weight: 400;                 /* regular weight */
  line-height: 1.35;                /* body text gets room to breathe */
  margin-top: calc(12px * var(--scale));  /* pill → reason: one clear break */
  padding-left: calc(6px * var(--scale));  /* nudge in from the pill's rounded edge */
  color: var(--text-dim);           /* dimmed — never full white twice */
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);  /* it sits on video, not on the glass */
}`,
    hasAccent: false,
  }),
);
