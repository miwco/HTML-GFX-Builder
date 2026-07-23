// ls10 "Club Crest" — the player strap led by the club badge.
//
// Where ls08 leads with the squad number, this leads with the crest, and that changes who the
// graphic is about: a number identifies the player, a badge identifies the side. Team sports
// coverage uses this shape for a squad announcement or a substitution, where the club is the
// unit and the player is the instance — which is why the crest sits at full height against
// the panel rather than as a small mark beside the text.
//
// The crest is a real SPX image field ("filelist"), so the operator picks the file at playout
// and the same template serves both sides of a fixture without an edit.

import { paletteById, type TemplateVariant } from '../../../model/wizard';
import { defineVariant } from '../shared';
import { slot } from './shared';

export const ls10: TemplateVariant = defineVariant(
  {
    id: 'ls10',
    category: 'lower-third',
    name: 'Club Crest',
    styleTag: 'sport',
    roleTag: 'sport',
    keywords: ['player', 'crest', 'badge', 'club', 'team', 'substitution', 'squad', 'logo', 'athlete'],
    description: 'A full-height club crest against the panel, with the player named beside it.',
    maxLines: 3,
    suggestedLines: [
      { title: 'Player', sample: 'ANA SILVEIRA' },
      { title: 'Position', sample: 'Centre Back' },
      { title: 'Club', sample: 'Northgate United' },
    ],
    logo: 'optional',
    animationPresets: ['slide-left', 'snap-stinger', 'mask-wipe', 'pop-spring', 'fade', 'slide-up'],
    defaultPalette: paletteById('signal'),
    defaultFontId: 'oswald',
    defaultZone: 'bottom-left',
  },
  {
    name: 'Club Crest',
    description:
      'The squad strap: the club crest at full panel height on the left — a real SPX image ' +
      'field, so one template serves both sides of a fixture — with the player name, position ' +
      'and club set beside it. Without a crest file the slot holds a clean accent panel, so ' +
      'the composition never collapses waiting for artwork.',
    uicolor: '2',
  },
  (o) => {
    // The crest is a real SPX image field; its id comes after every wizard field so nothing
    // collides. An empty value keeps the slot a clean accent panel (setFieldValue hides an
    // <img> without a value and marks its parent .has-image when there is one).
    const logoField = `f${o.lines.length + o.extraFields.length}`;
    const logoPath = o.logoAssetPath ?? '';
    const crest = o.logoEnabled
      ? `      <!-- The crest (image field ${logoField}) — empty keeps the panel a clean accent block. -->
      <div class="lower-third-accent${logoPath ? ' has-image' : ''}">
        <img id="${logoField}" class="lower-third-logo"${logoPath ? ` src="${logoPath}"` : ' style="display: none"'} alt="" />
      </div>
`
      : `      <!-- No crest slot on this graphic — turn it on in the wizard's Fields step. -->
      <div class="lower-third-accent"></div>
`;

    return {
      html: `    <!-- The slab: [crest panel] | [player name over position and club]. -->
    <div class="lower-third-box">
${crest}      <div class="lower-third-text">
${slot(o, 0, 'lower-third-name', '        ')}
${slot(o, 1, 'lower-third-title', '        ')}
${slot(o, 2, 'lower-third-extra', '        ')}
      </div>
    </div>`,

      extraFields: o.logoEnabled
        ? [
            {
              field: logoField,
              ftype: 'filelist',
              title: 'Club crest',
              value: logoPath,
              assetfolder: './images/',
              extension: 'png',
            },
          ]
        : [],

      css: `/* The slab — crest panel and text fused into one hard-edged unit. */
.lower-third-box {
  display: flex;                    /* crest and text side by side */
  align-items: stretch;             /* the crest panel runs the text's full height */
  background: var(--panel-bg);      /* the flat dark slab */
  box-shadow: var(--panel-shadow);  /* the family's hard lift */
}

/* The crest panel — a solid accent block, square-ish whatever the text does. */
.lower-third-accent {
  flex: 0 0 calc(112px * var(--scale));   /* fixed width; long names never squeeze the badge */
  min-height: calc(112px * var(--scale)); /* stays roughly square even with one short line */
  display: flex;                    /* centre the crest inside the panel */
  align-items: center;              /* …vertically */
  justify-content: center;          /* …horizontally */
  background: var(--accent);        /* the accent used boldly, sport-style */
}

/* The crest itself (the ${logoField} image field — hidden while empty). */
.lower-third-logo {
  width: 100%;                      /* fill the panel width… */
  height: 100%;                     /* …and its height… */
  object-fit: contain;              /* …without distorting the artwork */
  padding: calc(16px * var(--scale));  /* breathing room, so a square crest isn't edge to edge */
}

/* The text stack, centred against the crest. */
.lower-third-text {
  display: flex;                    /* stack the lines vertically */
  flex-direction: column;           /* top to bottom */
  justify-content: center;          /* vertically centred against the crest panel */
  min-width: 0;                     /* let it shrink so long names wrap instead of overflowing */
  max-width: calc(600px * var(--scale));  /* the wrap point for a very long player name */
  gap: calc(4px * var(--scale));    /* the three lines read as one block */
  padding: calc(16px * var(--scale)) calc(32px * var(--scale)) calc(18px * var(--scale)) calc(28px * var(--scale));
}

/* The player name — the strap's headline. */
.lower-third-name {
  font-size: calc(46px * var(--scale) * var(--type-scale));  /* headline size (values are 1080p reference) */
  line-height: 1.02;                /* condensed caps sit tight */
  letter-spacing: var(--display-tracking);  /* the family's display tracking */
  text-transform: uppercase;        /* matchday voice */
  color: var(--text-color);         /* primary text color */
}

/* The position — the middle voice, and the one that carries the accent colour: on a strap
   led by a club badge, the accent belongs to the player's role, not to another surface. */
.lower-third-title {
  font-size: calc(20px * var(--scale) * var(--type-scale));  /* clearly below the name */
  line-height: 1.2;                 /* single tight row */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* keeps the stack uniform */
  color: var(--accent);             /* the one coloured word in the text stack */
}

/* The club — the quietest line: the crest has already said it, so this only confirms it. */
.lower-third-extra {
  font-size: calc(18px * var(--scale) * var(--type-scale));  /* the smallest voice in the stack */
  line-height: 1.2;                 /* same rhythm as the position */
  letter-spacing: var(--label-tracking);  /* the family's label tracking */
  text-transform: uppercase;        /* keeps the stack uniform */
  color: var(--label-color);        /* the family's label color */
}`,
      hasAccent: true,
      tokens: { labelColor: 'var(--text-dim)' },
    };
  },
);
