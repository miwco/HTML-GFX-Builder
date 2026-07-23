// ls32 "Stream Identity" — the streamer's on-air card, with a goal on it.
//
// The graphic a gaming or charity stream keeps in the corner for hours. Two things separate
// it from every broadcast strap in this pack.
//
// It carries a GOAL — subs, donations, followers, a fundraising total. That is not decoration:
// on a charity or subathon stream the number is the reason the stream is happening, and it is
// the value an operator updates most often. It gets its own field and its own emphasised cell.
//
// And it carries a LIVE mark that pulses, because unlike a news LIVE flag (ls28) this one is
// up continuously — it is an identity, not a claim about a specific segment — so it is drawn
// as a small dot beside the handle rather than as a filled band.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { TABULAR_FIGURES, hasLine, slot } from './shared';

export const ls32: TemplateVariant = defineVariant(
  {
    id: 'ls32',
    category: 'lower-third',
    name: 'Stream Identity',
    styleTag: 'sport',
    roleTag: 'creator',
    keywords: ['streamer', 'creator', 'goal', 'subs', 'donations', 'charity', 'subathon', 'twitch', 'live', 'gaming'],
    description: 'A streamer handle with a pulsing live dot, over a goal figure in its own cell.',
    maxLines: 4,
    suggestedLines: [
      { title: 'Handle', sample: 'noacg' },
      { title: 'Name', sample: 'Noa Haline' },
      { title: 'Goal label', sample: 'Sub goal' },
      { title: 'Goal figure', sample: '240 / 500' },
    ],
    logo: 'none',
    animationPresets: ['pop-spring', 'slide-up', 'snap-stinger', 'fade', 'blur-in', 'mask-wipe'],
    defaultPalette: paletteById('volt'),
    defaultFontId: 'archivo',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Stream Identity',
    description:
      'The streamer card: the handle with a pulsing live dot and the creator name beneath, ' +
      'beside a goal cell carrying its own label and figure as separate SPX fields — so the ' +
      'number an operator updates every few minutes is one field, edited without touching ' +
      'anything else. Built to sit in the corner for hours.',
    uicolor: '6',
  },
  (o) => {
    const goal = hasLine(o, 2) || hasLine(o, 3)
      ? `      <div class="lower-third-goalcell">
${slot(o, 2, 'lower-third-goallabel', '        ')}
${slot(o, 3, 'lower-third-extra', '        ')}
      </div>
`
      : '';

    return {
      html: `    <!-- The card: [live dot · handle / name] | [goal label over goal figure]. -->
    <div class="lower-third-box">
      <div class="lower-third-text">
        <div class="lower-third-idrow">
          <div class="lower-third-accent"></div>
${slot(o, 0, 'lower-third-name', '          ')}
        </div>
${slot(o, 1, 'lower-third-title', '        ')}
      </div>
${goal}    </div>`,

      css: `/* The card — hard-edged and compact: it lives in a corner for a whole stream. */
.lower-third-box {
  display: flex;                    /* identity block and goal cell side by side */
  align-items: stretch;             /* both run the card's full height */
  background: var(--panel-bg);      /* the flat dark slab */
  border-radius: var(--panel-radius);  /* the family's corner radius */
  box-shadow: var(--panel-shadow);  /* the family's lift */
  overflow: hidden;                 /* the goal cell's fill follows the rounded corner */
}

.lower-third-text {
  display: flex;                    /* handle row over the name */
  flex-direction: column;           /* top to bottom */
  justify-content: center;          /* vertically centred against the goal cell */
  min-width: 0;                     /* let it shrink so long handles wrap */
  max-width: calc(420px * var(--scale));  /* the wrap point for a long handle */
  padding: calc(14px * var(--scale)) calc(24px * var(--scale)) calc(15px * var(--scale)) calc(22px * var(--scale));
}

/* The identity row: the live dot and the handle, on one row. */
.lower-third-idrow {
  display: flex;                    /* dot and handle */
  align-items: center;              /* the dot rides the handle's centre, not its baseline */
  gap: calc(10px * var(--scale));
  min-width: 0;                     /* allow shrinking */
}
.lower-third-idrow > .lower-third-mask {
  display: flex;                    /* the handle hugs its own text… */
  min-width: 0;                     /* …and may shrink */
}

/* The live dot — the graphic's accent node. Its pulse is DESIGN-owned CSS, deliberately
   outside the marked ANIMATION region: this card is up for hours and the pulse is what says
   the stream is running, so a motion-preset swap must never remove it. */
.lower-third-accent {
  flex: none;                       /* never squeezed by a long handle */
  width: calc(12px * var(--scale)); /* a small dot… */
  height: calc(12px * var(--scale));
  border-radius: 50%;               /* …round */
  background: var(--accent);        /* the one accent surface */
  animation: lower-third-stream-pulse 2.4s ease-in-out infinite;  /* the only continuous motion */
}
@keyframes lower-third-stream-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }        /* full */
  50%      { opacity: 0.45; transform: scale(0.82); }  /* …and back, slowly: a heartbeat */
}

/* The handle (f0) — the card's headline. The @ is DRAWN, so the field holds the handle
   alone and a value pasted with a sigil already on it doesn't end up with two. */
.lower-third-name {
  font-size: calc(32px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  font-weight: 700;                 /* bold — the handle carries the card */
  line-height: 1.1;                 /* room if a long handle wraps */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  color: var(--text-color);         /* primary text color */
}
.lower-third-name::before {
  content: "@";                     /* owned by the design, never by the field */
  margin-right: calc(2px * var(--scale));  /* sits tight against the handle */
  color: var(--accent);             /* the sigil is the accent's one appearance in the type */
}

/* The creator name (f1) — quieter than the handle: on a stream the handle is the name. */
.lower-third-title {
  font-size: calc(17px * var(--scale) * var(--type-scale));  /* half the handle */
  font-weight: 400;                 /* regular — hierarchy comes from the handle's weight */
  line-height: 1.3;                 /* room if it wraps */
  color: var(--text-dim);           /* dimmed — never pure white twice */
  margin-top: calc(4px * var(--scale));  /* tied to the handle above it */
}

/* The goal cell — its own surface, so the figure reads as a running total rather than as
   another line about the streamer. */
.lower-third-goalcell {
  flex: none;                       /* sized by its own content */
  display: flex;                    /* label over figure */
  flex-direction: column;           /* top to bottom */
  justify-content: center;          /* vertically centred against the identity block */
  align-items: flex-start;          /* both hug the cell's left edge */
  padding: calc(14px * var(--scale)) calc(24px * var(--scale)) calc(15px * var(--scale));
  background: rgba(255, 255, 255, 0.06);  /* a shade lighter than the card — its own cell */
  border-left: 1px solid rgba(255, 255, 255, 0.14);  /* the cell divider */
}

/* The goal label (f2). */
.lower-third-goallabel {
  font-size: calc(13px * var(--scale) * var(--type-scale));  /* the smallest voice on the card */
  font-weight: 700;                 /* bold — small tracked caps need the weight */
  line-height: 1.2;                 /* single tight label line */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* SUB GOAL, whatever the operator types */
  color: var(--label-color);        /* the family's label color */
}

/* The goal figure (f3) — the value an operator retypes most often, so it gets the weight
   and its own tabular rhythm: 240 / 500 must not jump width as it counts up. */
.lower-third-extra {
  font-size: calc(28px * var(--scale) * var(--type-scale));  /* the figure is the point */
  font-weight: 700;                 /* bold — a running total is stated */
  line-height: 1.05;                /* one tight figure row */
  ${TABULAR_FIGURES}
  color: var(--accent);             /* the card's one coloured figure */
  margin-top: calc(3px * var(--scale));  /* tied to its label above */
  white-space: nowrap;              /* a goal figure never wraps */
}`,
      hasAccent: true,
      tokens: { labelColor: 'var(--text-dim)' },
    };
  },
);
