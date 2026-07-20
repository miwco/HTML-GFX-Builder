// vs02 "Collision Card" - the over-footage versus card, sibling of lt06 (Split Bar) in
// attitude: red-hot single accent, italic display punch, everything built to sit OVER the
// action. Ported from the benchmark's harness winner ("Arena Collision Match-up"): a
// translucent dark vignette (the footage stays visible beneath), a jagged seam of light at
// the collision point (two offset clip-path wedges, cracked rather than clean), circular
// logo slots with accent-tinted borders and letter placeholder marks, and a huge italic
// accent VS with a hot glow. The event line closes it in small spaced caps.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVersusVariant, versusLines } from './shared';
import { VS_GLIDE_ID, VS_SLAM_ID } from './vsPresets';

export const vs02: TemplateVariant = defineVersusVariant(
  {
    id: 'vs02',
    category: 'versus',
    name: 'Collision Card',
    styleTag: 'sport',
    description: 'A translucent vignette over the action - a cracked seam of light and an italic VS.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Team A', sample: 'IRON WOLVES' },
      { title: 'Team B', sample: 'CRIMSON HAWKS' },
      { title: 'Event / date', sample: 'SEMI FINAL · SATURDAY 20:00' },
    ],
    logo: 'built-in',
    animationPresets: [VS_SLAM_ID, VS_GLIDE_ID],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'mid-center',
  },
  {
    name: 'Collision Card',
    description:
      'A fullscreen match-up card that keeps the footage visible: a deep translucent ' +
      'vignette, a jagged seam of light where the two sides collide, circular logo slots ' +
      'with letter placeholders, and a huge italic accent VS. The event/date line closes ' +
      'it in small spaced caps.',
    uicolor: '4',
  },
  (o) => {
    const lines = versusLines(o);
    const logoPath = o.logoAssetPath ?? '';

    return {
      html: `    <!-- The full-frame stage: a translucent vignette — the action stays visible beneath. -->
    <div class="versus-box">
      <!-- The jagged seam of light where the two sides collide — flashes in on the impact. -->
      <div class="versus-accent"></div>

      <!-- Team A — slides in from the left edge. -->
      <div class="versus-side versus-side-a">
        <div class="versus-logo${logoPath ? ' has-image' : ''}">
          <div class="versus-logo-mark">A</div>
          <img id="f3" class="versus-logo-img"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="Team A logo" />
        </div>
        <div class="versus-mask"><span id="f0" class="versus-name">${lines.teamA.sample}</span></div>
      </div>

      <!-- The VS mark — punches in at the collision point. -->
      <div class="versus-center">
        <div class="versus-vs">VS</div>
      </div>

      <!-- Team B — mirrors in from the right edge. -->
      <div class="versus-side versus-side-b">
        <div class="versus-logo">
          <div class="versus-logo-mark">B</div>
          <img id="f4" class="versus-logo-img" style="display: none" alt="Team B logo" />
        </div>
        <div class="versus-mask"><span id="f1" class="versus-name">${lines.teamB.sample}</span></div>
      </div>

      <!-- The event/date line — the closing beat beneath the collision. -->
      <div class="versus-bottom">
        <div class="versus-mask"><span id="f2" class="versus-event">${lines.event.sample}</span></div>
      </div>
    </div>`,

      css: `/* The stage paint: a deep translucent vignette so type reads over ANY footage beneath —
   this card is an overlay, not a picture of its own (its sibling vs01 is the opaque take). */
.versus-box {
  background: radial-gradient(120% 90% at 50% 40%, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.72) 60%, rgba(0, 0, 0, 0.9) 100%);
}

/* ── Signature: the jagged seam of light where the two sides collide. ──
   Built from two offset clipped wedges so the split reads as a CRACK, not a clean line.
   Presets only ever fade this element — the crack itself is pure paint. */
.versus-accent {
  position: absolute;              /* covers the stage — the wedges position inside it */
  inset: 0;                        /* edge to edge */
  z-index: 1;                      /* behind the sides and the VS, above the vignette */
  pointer-events: none;            /* pure paint — never blocks anything */
  will-change: opacity;            /* presets flash it in on the impact */
}
.versus-accent::before,
.versus-accent::after {
  content: '';                     /* pseudo-elements need content to render */
  position: absolute;              /* a tall strip down the middle… */
  top: -10%;                       /* …overshooting the frame so the crack never ends visibly… */
  bottom: -10%;                    /* …top and bottom */
  left: 50%;                       /* centered on the collision point */
  width: calc(180px * var(--scale));  /* the strip the wedges are cut from */
  margin-left: calc(-90px * var(--scale));  /* margin centering — no transform to fight GSAP */
  background: linear-gradient(90deg,
              transparent 0%,
              color-mix(in srgb, var(--accent) 55%, transparent) 45%,  /* hot accent shoulders… */
              rgba(255, 255, 255, 0.9) 50%,                            /* …around a white-hot core */
              color-mix(in srgb, var(--accent) 55%, transparent) 55%,
              transparent 100%);
  filter: blur(1px);               /* takes the digital edge off the light */
}
/* The jagged edge — a clip-path with irregular notches, offset per layer for a cracked look. */
.versus-accent::before {
  clip-path: polygon(
    40% 0%, 60% 4%, 48% 12%, 62% 20%, 44% 30%, 58% 40%,
    46% 50%, 60% 58%, 42% 68%, 56% 78%, 44% 88%, 60% 100%,
    40% 100%, 44% 88%, 28% 78%, 46% 68%, 30% 58%, 48% 50%,
    26% 40%, 44% 30%, 24% 20%, 42% 12%, 22% 4%
  );
  opacity: 0.9;                    /* the sharp front crack */
}
.versus-accent::after {
  clip-path: polygon(
    52% 0%, 68% 6%, 54% 14%, 70% 24%, 50% 34%, 66% 44%,
    52% 54%, 68% 64%, 48% 74%, 64% 84%, 50% 94%, 66% 100%,
    46% 100%, 50% 94%, 34% 84%, 50% 74%, 32% 64%, 50% 54%,
    30% 44%, 48% 34%, 28% 24%, 46% 14%, 30% 6%
  );
  opacity: 0.5;                    /* a softer echo behind it… */
  filter: blur(3px);               /* …melted a little further */
}

/* The sides and the VS sit above the seam. */
.versus-side { z-index: 2; }       /* team columns over the crack */
.versus-center { z-index: 3; }     /* the VS on top of everything */
.versus-bottom { z-index: 2; }     /* the event line over the vignette */

/* The logo slot: a dark circle with an accent-tinted border — a visible placeholder
   letter until the operator picks an image. */
.versus-logo {
  position: relative;              /* the mark and the image stack inside this circle */
  width: calc(220px * var(--scale));   /* slot diameter */
  height: calc(220px * var(--scale));  /* round, so width = height */
  border-radius: 50%;              /* the circle itself */
  background: var(--panel-bg);     /* a solid dark dish so any badge reads on it */
  border: calc(3px * var(--scale)) solid color-mix(in srgb, var(--accent) 60%, transparent);  /* hot rim */
  display: flex;                   /* centers the badge (or the letter)… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  overflow: hidden;                /* the badge stays inside the circle */
  box-shadow: var(--panel-shadow);  /* the logo dish's authored panel lift */
  flex-shrink: 0;                  /* the slot never squeezes — names wrap instead */
}

/* The placeholder letter: clearly a stand-in, not real content. */
.versus-logo-mark {
  font-size: calc(72px * var(--scale));  /* big enough to read as a crest */
  font-weight: 700;                /* solid display weight */
  color: var(--text-dim);          /* dimmed — it defers to the picked logo */
  opacity: 0.4;                    /* …and dims further: unmistakably a placeholder */
}
.versus-logo.has-image .versus-logo-mark {
  display: none;                   /* a picked logo replaces the letter */
}

/* The team badge: fills most of the slot, never cropped (wide wordmarks stay whole). */
.versus-logo-img {
  width: 78%;                      /* breathing room inside the circle… */
  height: 78%;                     /* …both ways */
  object-fit: contain;             /* show the whole badge, never crop it */
}

/* The team names: tight display caps with a dark drop — they must read over footage. */
.versus-name {
  font-size: calc(58px * var(--scale));  /* headline scale, a step under the VS */
  font-weight: var(--display-weight);  /* the family's display weight */
  line-height: 1.05;               /* tight — big caps need little leading */
  letter-spacing: var(--display-tracking);  /* the names' authored display tracking */
  text-transform: uppercase;       /* team names are shouted, not spoken */
  color: var(--text-color);        /* primary text over the vignette */
  text-shadow: 0 calc(4px * var(--scale)) calc(20px * var(--scale)) rgba(0, 0, 0, 0.6);  /* legibility drop */
}

/* The VS mark: a huge italic accent hit with a hot glow — the collision's exclamation. */
.versus-vs {
  font-size: calc(120px * var(--scale));  /* huge, but the seam shares the spotlight */
  font-weight: 700;                /* display weight */
  font-style: italic;              /* the forward lean — motion even at rest */
  letter-spacing: -0.02em;         /* the two caps stay one mark */
  color: var(--accent);            /* the accent's loudest moment */
  text-shadow:
    0 0 calc(30px * var(--scale)) color-mix(in srgb, var(--accent) 70%, transparent),  /* hot glow */
    0 calc(6px * var(--scale)) calc(20px * var(--scale)) rgba(0, 0, 0, 0.7);           /* dark drop */
}

/* The bottom block: the event line floats near the frame's bottom edge. */
.versus-bottom {
  padding-bottom: calc(90px * var(--scale));  /* lifted off the frame edge */
}
/* The event line gets a wider wrap cap than the team names — it spans the frame. */
.versus-bottom .versus-mask {
  max-width: min(calc(1200px * var(--scale)), 90%);  /* wide, but never touching the frame edges */
}

/* The event/date line: small spaced caps — the quiet closing voice. */
.versus-event {
  font-size: calc(32px * var(--scale));  /* clearly beneath the names in the hierarchy */
  font-weight: 500;                /* light against the heavy names */
  line-height: 1.35;               /* room for a wrapped second row */
  letter-spacing: var(--label-tracking);  /* the event label's authored tracking */
  text-transform: uppercase;       /* the label voice */
  color: var(--label-color);       /* the event label's authored colour */
  text-shadow: 0 calc(2px * var(--scale)) calc(12px * var(--scale)) rgba(0, 0, 0, 0.6);  /* legibility drop */
}`,

      hasAccent: true,
      tokens: {
        panelShadow: '0 calc(10px * var(--scale)) calc(30px * var(--scale)) rgba(0, 0, 0, 0.5)',
        labelTracking: '0.14em',
        labelColor: 'var(--text-dim)',
        displayTracking: '-0.01em',
      },
    };
  },
);
