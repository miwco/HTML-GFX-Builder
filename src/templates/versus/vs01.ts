// vs01 "Arena Duel" - the opaque-arena versus card, sibling of lt05 (Angle Slab) in weight
// and of the sb01 Match Strip in voice: heavy grotesque caps, one bold accent, dark stadium
// atmosphere. Ported from the benchmark's "raw" winner: a full dark arena stage (center
// glow, faint light rays, scanlines, vignette), two circular logo rings flanking a huge
// gradient VS inside a thin ring, names underscored by accent edge bars, and the event line
// riding a bottom gradient bar closed by a gradient hairline. The source's two-color
// identity (blue vs red) is deliberately folded into the ONE :root accent - palette
// discipline - so the Style panel can retint the whole card coherently.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineVersusVariant, versusLines } from './shared';
import { VS_GLIDE_ID, VS_SLAM_ID } from './vsPresets';

export const vs01: TemplateVariant = defineVersusVariant(
  {
    id: 'vs01',
    category: 'versus',
    name: 'Arena Duel',
    styleTag: 'sport',
    description: 'An opaque dark arena - logo rings, a huge gradient VS, edge-lit team names.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Team A', sample: 'TEAM ALPHA' },
      { title: 'Team B', sample: 'TEAM BRAVO' },
      { title: 'Event / date', sample: 'CHAMPIONSHIP FINAL · SATURDAY 20:00' },
    ],
    logo: 'built-in',
    animationPresets: [VS_GLIDE_ID, VS_SLAM_ID],
    defaultPalette: paletteById('royal'),
    defaultFontId: 'archivo',
    defaultZone: 'mid-center',
  },
  {
    name: 'Arena Duel',
    description:
      'A fullscreen match-up card on an opaque dark arena stage: center glow, faint light ' +
      'rays and a vignette behind two circular logo rings, heavy caps team names with accent ' +
      'edge bars, a huge gradient VS in a thin ring, and the event/date line on a bottom ' +
      'gradient bar closed by a gradient hairline.',
    uicolor: '5',
  },
  (o) => {
    const lines = versusLines(o);
    const logoPath = o.logoAssetPath ?? '';

    return {
      html: `    <!-- The full-frame arena stage: mood layers behind, the two teams and the VS above. -->
    <div class="versus-box">
      <!-- Mood layers — static paint; the whole stage fades up with the entrance. -->
      <div class="versus-glow"></div>
      <div class="versus-rays"></div>
      <div class="versus-vignette"></div>

      <!-- Team A — slides in from the left edge. -->
      <div class="versus-side versus-side-a">
        <div class="versus-logo${logoPath ? ' has-image' : ''}">
          <div class="versus-logo-mark"></div>
          <img id="f3" class="versus-logo-img"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="Team A logo" />
        </div>
        <div class="versus-mask"><span id="f0" class="versus-name versus-name-a">${lines.teamA.sample}</span></div>
      </div>

      <!-- The center stack: a thin ring around the huge gradient VS. -->
      <div class="versus-center">
        <div class="versus-ring"></div>
        <div class="versus-vs">VS</div>
      </div>

      <!-- Team B — mirrors in from the right edge. -->
      <div class="versus-side versus-side-b">
        <div class="versus-logo">
          <div class="versus-logo-mark"></div>
          <img id="f4" class="versus-logo-img" style="display: none" alt="Team B logo" />
        </div>
        <div class="versus-mask"><span id="f1" class="versus-name versus-name-b">${lines.teamB.sample}</span></div>
      </div>

      <!-- The event/date line on the bottom gradient bar, closed by the accent hairline. -->
      <div class="versus-bottom">
        <div class="versus-mask"><span id="f2" class="versus-event">${lines.event.sample}</span></div>
        <div class="versus-accent"></div>
      </div>
    </div>`,

      css: `/* The stage paint: an opaque dark arena — a cool radial pool over the near-black panel
   hue. Opaque on purpose: this card IS the picture, it doesn't sit over footage. */
.versus-box {
  background:
    radial-gradient(120% 80% at 50% 40%, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 55%),
    var(--panel-bg);               /* the near-black arena floor */
}

/* The center glow: a soft accent pool behind the collision point. */
.versus-glow {
  position: absolute;              /* centered on the frame… */
  left: 50%;                       /* …to the middle… */
  top: 50%;                        /* …both ways */
  width: calc(1400px * var(--scale));   /* a wide, soft pool */
  height: calc(1400px * var(--scale));  /* round — it reads as stadium light */
  margin-left: calc(-700px * var(--scale));  /* margin centering — no transform for GSAP to fight */
  margin-top: calc(-700px * var(--scale));   /* …both axes */
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 65%);
  filter: blur(10px);              /* melts the gradient edge into the floor */
}

/* The light rays: a faint conic sweep from the center — arena atmosphere. */
.versus-rays {
  position: absolute;              /* covers the stage… */
  inset: 0;                        /* …edge to edge */
  background: repeating-conic-gradient(from 0deg at 50% 50%,
    rgba(255, 255, 255, 0.025) 0deg 2deg,   /* a whisper of light… */
    transparent 2deg 10deg);                /* …every ten degrees */
  mix-blend-mode: screen;          /* rays only ever brighten */
  opacity: 0.5;                    /* kept faint — atmosphere, not content */
}

/* The vignette: darkened corners pull the eye to the collision (plus faint scanlines). */
.versus-vignette {
  position: absolute;              /* covers the stage… */
  inset: 0;                        /* …edge to edge */
  background:
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 1px, transparent 2px, transparent 4px),
    radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0, 0, 0, 0.65) 100%);
  pointer-events: none;            /* pure paint — never blocks anything */
}

/* The logo ring: a circular glass dish that holds the team badge (or its placeholder). */
.versus-logo {
  position: relative;              /* the mark and the image stack inside this circle */
  width: calc(300px * var(--scale));   /* ring diameter */
  height: calc(300px * var(--scale));  /* round, so width = height */
  border-radius: 50%;              /* the circle itself */
  background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.01));
  border: 2px solid rgba(255, 255, 255, 0.15);  /* a thin keyline catches the light */
  box-shadow: var(--panel-shadow);  /* the logo dish's authored panel depth */
  display: flex;                   /* centers the badge… */
  align-items: center;             /* …vertically… */
  justify-content: center;         /* …and horizontally */
  flex-shrink: 0;                  /* the ring never squeezes — names wrap instead */
}

/* The placeholder mark: an accent diamond, clearly a stand-in until a logo is picked.
   The rotation lives on the ::before layer only, so nothing animatable is pre-rotated. */
.versus-logo-mark {
  position: absolute;              /* fills the ring */
  inset: 0;                        /* all four edges */
}
.versus-logo-mark::before {
  content: '';                     /* pseudo-elements need content to render */
  position: absolute;              /* centered inside the ring… */
  left: 50%;                       /* …to the middle… */
  top: 50%;                        /* …both ways */
  width: calc(120px * var(--scale));   /* diamond edge length */
  height: calc(120px * var(--scale));  /* square before rotation */
  transform: translate(-50%, -50%) rotate(45deg);  /* center it, then turn it into a diamond */
  background: color-mix(in srgb, var(--accent) 60%, transparent);  /* accent, dimmed — a stand-in */
  border-radius: calc(18px * var(--scale));  /* softened points */
}
.versus-logo.has-image .versus-logo-mark {
  display: none;                   /* a picked logo replaces the placeholder */
}

/* The team badge: fills most of the ring, never cropped (wide wordmarks stay whole). */
.versus-logo-img {
  max-width: 74%;                  /* breathing room inside the ring… */
  max-height: 74%;                 /* …both ways */
  object-fit: contain;             /* show the whole badge, never crop it */
  filter: drop-shadow(0 calc(8px * var(--scale)) calc(20px * var(--scale)) rgba(0, 0, 0, 0.6));  /* lifts it off the dish */
}

/* The team names: heavy caps with a cool glow — the arena voice. */
.versus-name {
  font-size: calc(62px * var(--scale));  /* headline scale, a step under the VS */
  font-weight: var(--display-weight);  /* the team names' authored display weight */
  line-height: 1.08;               /* tight — big caps need little leading */
  letter-spacing: var(--display-tracking);  /* the team names' authored display tracking */
  text-transform: uppercase;       /* team names are shouted, not spoken */
  color: var(--text-color);        /* primary text on the dark floor */
  text-shadow: 0 0 calc(20px * var(--scale)) color-mix(in srgb, var(--accent) 50%, transparent),  /* accent glow */
               0 calc(4px * var(--scale)) calc(10px * var(--scale)) rgba(0, 0, 0, 0.8);           /* dark drop for legibility */
}
/* The edge bars: each name carries the accent on its OUTER edge — A left, B right. */
.versus-name-a {
  border-left: var(--accent-weight) solid var(--accent);  /* team A's authored accent edge */
  padding-left: calc(22px * var(--scale));                     /* air between bar and caps */
}
.versus-name-b {
  border-right: var(--accent-weight) solid var(--accent);  /* team B's authored accent edge */
  padding-right: calc(22px * var(--scale));                    /* …with mirrored air */
}

/* The center ring: a thin luminous circle framing the VS. */
.versus-ring {
  position: absolute;              /* centered in the full-frame center wrapper… */
  left: 50%;                       /* …to the middle… */
  top: 50%;                        /* …both ways */
  width: calc(300px * var(--scale));   /* ring diameter — clears the 20% corridor */
  height: calc(300px * var(--scale));  /* round */
  margin-left: calc(-150px * var(--scale));  /* margin centering — no transform to fight GSAP */
  margin-top: calc(-150px * var(--scale));   /* …both axes */
  border-radius: 50%;              /* the circle itself */
  border: 3px solid rgba(255, 255, 255, 0.25);  /* a thin keyline ring */
  box-shadow: 0 0 calc(80px * var(--scale)) color-mix(in srgb, var(--accent) 35%, transparent),        /* outer halo */
              inset 0 0 calc(80px * var(--scale)) color-mix(in srgb, var(--accent) 35%, transparent);  /* inner halo */
}

/* The VS mark: the loudest thing on the card — a white-to-accent gradient cut into type. */
.versus-vs {
  font-size: calc(190px * var(--scale));  /* huge — the VS is the whole point */
  font-weight: 800;                /* heaviest cut */
  letter-spacing: 0.02em;          /* the two caps stay one mark */
  background: linear-gradient(180deg, var(--text-color) 0%, color-mix(in srgb, var(--accent) 45%, var(--text-color)) 40%, var(--accent) 100%);
  -webkit-background-clip: text;   /* the gradient paints the letterforms… */
  background-clip: text;           /* …standard spelling of the same */
  color: transparent;              /* …so the text color must not cover it */
  filter: drop-shadow(0 0 calc(40px * var(--scale)) color-mix(in srgb, var(--accent) 60%, transparent))  /* accent glow */
          drop-shadow(0 calc(10px * var(--scale)) calc(20px * var(--scale)) rgba(0, 0, 0, 0.7));         /* dark drop */
}

/* The bottom bar: a gradient pool the event line sits on, fading up from the frame edge. */
.versus-bottom {
  padding: calc(46px * var(--scale)) 0 calc(56px * var(--scale));  /* air above and below the line */
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.55) 40%, rgba(0, 0, 0, 0.75) 100%);
}
/* The event line gets a wider wrap cap than the team names — it spans the whole bar. */
.versus-bottom .versus-mask {
  max-width: min(calc(1500px * var(--scale)), 92%);  /* wide, but never touching the frame edges */
}

/* The event/date line: spaced caps — the card's quiet closing voice. */
.versus-event {
  font-size: calc(38px * var(--scale));  /* clearly beneath the names in the hierarchy */
  font-weight: 600;                /* solid but not shouting */
  line-height: 1.3;                /* room for a wrapped second row */
  letter-spacing: var(--label-tracking);  /* the event label's authored tracking */
  text-transform: uppercase;       /* the label voice */
  color: var(--label-color);       /* the family's label colour */
}

/* The accent hairline: a gradient line closing the card under the event line. */
.versus-accent {
  width: min(calc(1200px * var(--scale)), 70%);  /* wide, centered by the bottom column */
  height: calc(3px * var(--scale));  /* a true hairline */
  margin-top: calc(24px * var(--scale));  /* air between the line and the type */
  background: linear-gradient(90deg, transparent, var(--accent), var(--text-color), var(--accent), transparent);
  will-change: opacity;            /* presets fade it in with the closing beat */
}`,

      hasAccent: true,
      tokens: {
        panelShadow:
          '0 0 calc(60px * var(--scale)) color-mix(in srgb, var(--accent) 25%, transparent), inset 0 0 calc(40px * var(--scale)) rgba(0, 0, 0, 0.5)',
        accentWeight: 'calc(6px * var(--scale))',
        labelTracking: '0.16em',
        displayWeight: '800',
        displayTracking: '0.03em',
      },
    };
  },
);
