// tk07 "House Rotator" — the House Wire strip, advanced one story at a time by the graphic's
// own state machine instead of by endless travel. Same face as tk05, different motion: the
// operator can pause it, resume it, or jump to the next story on air, and it keeps cycling by
// itself when left alone.
//
// It is a separate variant rather than a mode of tk05 because the two are genuinely different
// graphics to an operator — one scrolls and cannot be held, the other holds each story long
// enough to read and answers to a control page. tk05 stays exactly the marquee it always was.

import { paletteById, type TemplateVariant } from '../../model/wizard';
import { defineTickerVariant } from './shared';
import { houseWire } from './tk05';

export const tk07: TemplateVariant = defineTickerVariant(
  {
    id: 'tk07',
    category: 'ticker',
    name: 'House Rotator',
    styleTag: 'noacg',
    description: 'The house strip, one story at a time — timed, and pausable on air.',
    maxLines: 2,
    suggestedLines: [
      {
        title: 'Ticker items',
        sample: [
          'Parliament passes 2026 budget after all-night session',
          'Central bank holds rate at 3.25%',
          'National team qualifies for the final',
          'Storm warning issued for the coast',
        ].join('\n'),
      },
      { title: 'Label', sample: 'News' },
    ],
    logo: 'none',
    // Only the rotate preset suits this graphic: the other two animate forever, and a state
    // machine's timer can never arm on a timeline that never ends.
    animationPresets: ['ticker-rotate'],
    defaultPalette: paletteById('noacg'),
    defaultFontId: 'space-grotesk',
    defaultZone: 'bottom-center',
  },
  {
    name: 'House Rotator',
    description:
      'The NoaCG strip in rotating form: the same void blur, accent label block and clock ' +
      'cap as House Wire, but each story holds long enough to read before the next one takes ' +
      'over. The cycle is the graphic’s own timer, so an operator can hold it mid-story.',
    uicolor: '4',
  },
  (o) => houseWire(o),
);
