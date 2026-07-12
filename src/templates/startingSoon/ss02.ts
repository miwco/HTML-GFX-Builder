// ss02 "Volt Hold" — the sport holding screen, sibling of lt05 (Angle Slab) and
// lt06 (Split Bar). A bold centered stack: a small accent chip (lt06's solid accent
// bar), a huge condensed show name on a dark slab, and the countdown mounted in a
// heavy slab with a chunky accent edge (lt05's fused 10px slab). Every lean is
// PAINTED on a ::before layer at the family's -8deg, so no preset can flatten it —
// the hold-loop preset scales the accent edge (.starting-soon-pulse), and because that element
// carries no transform of its own, the lean survives every breath.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineStartingSoonVariant } from './shared';

export const ss02: TemplateVariant = defineStartingSoonVariant(
  {
    id: 'ss02',
    category: 'starting-soon',
    name: 'Volt Hold',
    styleTag: 'sport',
    description: 'Centered sport stack — accent chip, huge condensed show name, slab-mounted countdown.',
    maxLines: 2,
    suggestedLines: [
      { title: 'Title', sample: 'STARTING SOON' },
      { title: 'Show name', sample: 'FRIDAY FIGHT NIGHT' },
    ],
    hasLogoSlot: false,
    animationPresets: ['hold-loop'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-center',
  },
  {
    name: 'Volt Hold',
    description:
      'The sport pre-show screen, built from the lower-third family DNA: a skewed accent ' +
      'chip for the title (lt06’s solid accent bar), a huge condensed show name on a ' +
      'leaning dark slab, and the countdown in a heavy slab with a fused 10px accent edge ' +
      '(lt05). The accent edge breathes while the clock ticks — arena screen energy.',
    uicolor: '5',
  },
  (o) => ({
    // Stack order: chip (f0) → show name (f1) → clock slab. The masks wrap the field
    // spans (structure contract); the accent edge is the one .starting-soon-pulse element.
    html: `    <!-- Volt Hold: a centered sport stack. Every lean is painted on a ::before layer. -->
    <div class="starting-soon-box">
      <!-- The title chip — the loud accent moment up top (its slab lives on ::before). -->
      <div class="starting-soon-mask starting-soon-chip-mask"><span id="f0" class="starting-soon-chip">${o.lines[0]?.sample || 'STARTING SOON'}</span></div>
      <!-- The show name — the biggest thing on screen, on its own dark leaning slab. -->
      <div class="starting-soon-mask starting-soon-show-mask"><span id="f1" class="starting-soon-show">${o.lines[1]?.sample || 'FRIDAY FIGHT NIGHT'}</span></div>
      <!-- The clock slab — a heavy dark block with a chunky accent edge that breathes. -->
      <div class="starting-soon-slab">
        <div class="starting-soon-edge starting-soon-pulse"></div>
        <div class="starting-soon-clock">5:00</div>
      </div>
    </div>`,
    css: `/* The stack: three rows centered on one axis, each hugging its own width. */
.starting-soon-box {
  display: flex;                   /* stack the rows ... */
  flex-direction: column;          /* ... top to bottom */
  align-items: center;             /* chip, name and clock share one center axis */
}

/* The masks clip at their edges, so they get side padding: room for the painted
   -8deg lean to overhang without being cut off by overflow: hidden. */
.starting-soon-chip-mask,
.starting-soon-show-mask {
  padding: 0 calc(20px * var(--scale));  /* breathing room for the skew overhang */
}
.starting-soon-show-mask {
  margin-top: calc(10px * var(--scale)); /* small gap: chip and name read as one unit */
}

/* The title chip — condensed caps punched out of a solid accent slab (lt06's motif). */
.starting-soon-chip {
  position: relative;              /* anchors the painted slab (::before) */
  padding: calc(10px * var(--scale)) calc(30px * var(--scale));  /* tight chip padding */
  font-size: calc(24px * var(--scale));  /* label scale — a kicker, not a headline */
  font-weight: 700;                /* bold so the spaced caps carry */
  line-height: 1.2;                /* a single tight label row */
  letter-spacing: 0.16em;          /* spaced-out caps read as a tag */
  text-transform: uppercase;       /* sport graphics shout */
  color: var(--panel-bg);          /* the dark slab hue doubles as ink on the accent */
  text-align: center;              /* centered stack — centered chip text */
}

/* The chip's slab: the family lean lives HERE, on a layer no preset ever tweens. */
.starting-soon-chip::before {
  content: '';                     /* pseudo-elements render only with content set */
  position: absolute;              /* fills the chip exactly ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* paints behind the chip text */
  background: var(--accent);       /* the solid accent surface — sport hits hard */
  border-radius: 0;                /* hard corners — sport shape language */
  transform: skewX(-8deg);         /* SKEW: the chip leans forward, mid-sprint */
}

/* The show name — huge condensed caps, the loudest thing on screen. */
.starting-soon-show {
  position: relative;              /* anchors its painted slab (::before) */
  padding: calc(14px * var(--scale)) calc(44px * var(--scale));  /* generous slab padding */
  font-size: calc(92px * var(--scale));  /* headline scale for a full-screen hold */
  font-weight: 900;                /* maximum impact weight */
  line-height: 1.05;               /* tight — big text needs little leading */
  letter-spacing: -0.01em;         /* big text tightens slightly */
  text-transform: uppercase;       /* names are shouted, not spoken */
  color: var(--text-color);        /* primary text on the dark slab */
  text-align: center;              /* wrapped rows center on the stack axis */
}

/* The name's slab: same painted lean, dark this time — lt05's technique exactly. */
.starting-soon-show::before {
  content: '';                     /* render the pseudo-layer */
  position: absolute;              /* fills the name's padding box ... */
  inset: 0;                        /* ... edge to edge */
  z-index: -1;                     /* behind the text */
  background: var(--panel-bg);     /* near-black slab — never pure #000 */
  border-radius: 0;                /* hard corners */
  transform: skewX(-8deg);         /* the same family lean as the chip */
}

/* The clock slab — a heavy dark block; extra left padding makes room for the edge. */
.starting-soon-slab {
  position: relative;              /* anchors the painted slab and the accent edge */
  margin-top: calc(20px * var(--scale));  /* the clock stands slightly apart */
  padding: calc(12px * var(--scale)) calc(48px * var(--scale))
           calc(12px * var(--scale)) calc(58px * var(--scale));  /* wider left: edge room */
}

/* The slab paint — the lean on ::before again, out of every preset's reach. */
.starting-soon-slab::before {
  content: '';                     /* render the pseudo-layer */
  position: absolute;              /* edge to edge ... */
  inset: 0;                        /* ... of the slab */
  z-index: -1;                     /* behind the digits and the edge */
  background: var(--panel-bg);     /* the heavy dark block */
  border-radius: 0;                /* hard corners */
  transform: skewX(-8deg);         /* fused with the accent edge's lean */
}

/* The accent edge — the .starting-soon-pulse target. The element itself carries NO transform
   (the hold-loop preset scales it to breathe); its lean is painted on ::before,
   so the breath can never flatten it. Chunky 10px — a slab, not a hairline. */
.starting-soon-edge {
  position: absolute;              /* pinned over the slab's left edge ... */
  left: 0;                         /* ... flush with the slab box */
  top: 0;                          /* full height, top ... */
  bottom: 0;                       /* ... to bottom */
  width: calc(10px * var(--scale));  /* the family's chunky slab width */
  will-change: transform;          /* hint the browser: this element breathes */
}
.starting-soon-edge::before {
  content: '';                     /* render the accent paint */
  position: absolute;              /* fills the edge exactly ... */
  inset: 0;                        /* ... top to bottom */
  background: var(--accent);       /* the accent moment beside the digits */
  transform: skewX(-8deg);         /* leans with the slab so the two edges fuse */
}

/* The digits — big, heavy, and steady (tabular digits never wobble as they tick). */
.starting-soon-clock {
  font-size: calc(56px * var(--scale));  /* clearly subordinate to the name (~1.6:1) */
  font-weight: 800;                /* heavy — the clock is a headline of its own */
  line-height: 1.1;                /* tight digit row */
  letter-spacing: 0.04em;          /* a touch of air between the digits */
  color: var(--text-color);        /* primary text */
  font-variant-numeric: tabular-nums;  /* every digit one width — no jitter per second */
}

/* Time's up: the clock runtime adds .starting-soon-done to the root — flip the digits to volt. */
.starting-soon-done .starting-soon-clock {
  color: var(--accent);            /* zero reached: the digits go loud */
}`,
  }),
);
