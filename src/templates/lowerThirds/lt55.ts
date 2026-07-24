// lt55 "House Call" — the NoaCG call-to-action strap, sibling of lt11 "House Strap" and
// lt14 "House Handle". The house grammar (an amber bar fused to a void blur panel) shaped for
// the one job a social bug cannot do: ASKING. A solid accent chip holds the imperative
// ("Follow", "Donate", "Register", "Buy"), the target sits beside it in the panel, and a
// dimmed reason line runs under both.
//
// Why the action is its own field rather than baked into the design: the four CTAs a live
// programme actually uses are the same graphic with a different verb, and the reference data
// asks for all four across different formats. Making the verb a field is what stops this
// being four near-identical designs — the same reason the state schema says to parameterize
// with data rather than to add states.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { maskLine, maskLines } from '../shared/standard';
import { defineVariant } from './shared';

export const lt55: TemplateVariant = defineVariant(
  {
    id: 'lt55',
    category: 'lower-third',
    name: 'House Call',
    styleTag: 'noacg',
    description: 'A call-to-action strap: an amber action chip, the target beside it, and the reason under it.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Action', sample: 'FOLLOW' },
      { title: 'Target', sample: '@noacgstudio' },
      { title: 'Detail', sample: 'New broadcast graphics every Friday' },
    ],
    logo: 'none',
    animationPresets: ['slide-up', 'line-reveal', 'pop-spring', 'fade', 'slide-left', 'blur-in'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-left',
  },
  {
    name: 'House Call',
    description:
      'The NoaCG call-to-action strap: an 8px amber bar fused to a void blur panel, a solid ' +
      'accent chip carrying the imperative ("Follow", "Donate", "Register", "Buy"), the target ' +
      'handle or address beside it, and one dimmed reason line beneath. Clearing the Detail ' +
      'field leaves a compact two-part strap.',
    uicolor: '4',
  },
  (o) => ({
    html: `    <!-- House Call: [amber bar] | [void panel: action chip + target, reason under them]. -->
    <div class="lower-third-accent"></div>
    <div class="lower-third-box">
      <!-- The ask row: the solid action chip sits beside the target it points at. -->
      <div class="lower-third-ask">
${maskLines([
  maskLine('lower-third', o, 0, 'lower-third-action', '        '),
  maskLine('lower-third', o, 1, 'lower-third-target', '        '),
])}
      </div>
${maskLines([maskLine('lower-third', o, 2, 'lower-third-reason', '      ')])}
    </div>`,
    css: `/* The accent bar — the house 8px amber edge with its one restrained glow. */
.lower-third-accent {
  position: absolute;               /* pinned inside the positioned .lower-third root */
  left: 0;                          /* at the very left edge */
  top: 0;                           /* full panel height… */
  bottom: 0;                        /* …top to bottom */
  width: var(--accent-weight);      /* the family's bar weight */
  background: var(--accent);        /* the one accent surface */
  box-shadow: var(--accent-glow);   /* the family's glow — follows the accent color */
  will-change: transform;           /* hint the browser: presets grow this bar in */
}

/* The panel — the house void behind the ask. */
.lower-third-box {
  margin-left: var(--accent-weight);  /* starts where the accent bar ends */
  padding: calc(20px * var(--scale)) calc(38px * var(--scale)) calc(22px * var(--scale)) calc(24px * var(--scale));
  background: var(--panel-bg);      /* void rgba(10,12,16,.86) by default */
  backdrop-filter: var(--panel-blur);  /* the family's backdrop treatment */
  -webkit-backdrop-filter: var(--panel-blur);  /* Safari spelling of the same effect */
  box-shadow: var(--panel-shadow);  /* one deep lifting shadow */
}

/* The ask row — the chip and the target share one baseline and wrap as a unit. */
.lower-third-ask {
  display: flex;                    /* the chip then what it points at */
  flex-wrap: wrap;                  /* a very long handle wraps under the chip, never over it */
  align-items: baseline;            /* both sit on the same text baseline */
  gap: calc(16px * var(--scale));   /* clear air between the ask and its target */
}

/* The action — a solid accent chip. The strap's imperative, and the only filled surface. */
.lower-third-action {
  padding: calc(6px * var(--scale)) calc(15px * var(--scale));  /* a compact, confident badge */
  border-radius: var(--panel-radius);  /* the family's corner treatment */
  background: var(--accent);        /* solid accent — the loudest small surface */
  font-family: var(--font-label);   /* the house label face */
  font-size: calc(24px * var(--scale) * var(--type-scale));  /* bigger than a label: it is the ask */
  font-weight: 700;                 /* heavy — an instruction is read at a glance */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* reads as an instruction, whatever the operator types */
  white-space: nowrap;              /* "REGISTER" never breaks mid-word */
  color: var(--accent-ink);         /* readable ink ON the accent surface */
}

/* The target — the handle, address, or product the ask points at. */
.lower-third-target {
  font-size: calc(38px * var(--scale) * var(--type-scale));  /* strap heading size (1080p reference) */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.1;                 /* big text sits tight */
  letter-spacing: var(--display-tracking);  /* large display type tightens slightly */
  overflow-wrap: anywhere;          /* a very long address breaks rather than overflowing */
  color: var(--text-color);         /* primary text color */
}

/* The reason — why anyone should do it. Quiet on purpose. */
.lower-third-reason {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* body scale under the ask */
  font-weight: 400;                 /* regular weight */
  line-height: 1.35;                /* body text gets room to breathe */
  margin-top: calc(10px * var(--scale));  /* ask → reason: one clear break */
  color: var(--text-dim);           /* dimmed — never full white twice */
}`,
    hasAccent: true,
  }),
);
