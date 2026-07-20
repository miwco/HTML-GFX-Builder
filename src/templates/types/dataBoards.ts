// The DATA BOARD types — graphics whose content is a LIST the operator types, rendered by a
// design-owned runtime. Neither needs a state machine: their motion is measured from the
// content (an infographic builder), which coexists with the derived linear machine untouched.
//
// Worth stating, because it is the point of the whole model: a category of content-shaped
// animation needed no machine at all, and the validator still vouches for its builder.

import { paletteById } from '../../model/wizard';
import { ig02 } from '../infographics/ig02';
import { ig06 } from '../infographics/ig06';
import type { GraphicType } from './graphicType';

// The promoted variants' own sample content, unchanged. A type describes the SHAPE of a
// graphic's content ("rows of time and title"), not new copy for it — rewriting a shipped
// variant's samples would change what its existing users see for no gain.
const SCHEDULE_SAMPLE = '20:00 | News at Eight\n21:00 | The Debate\n22:15 | Late Edition';
const POLL_SAMPLE = 'Streaming | 78\nBroadcast | 54\nOn demand | 36';

/** AGENDA / SCHEDULE — 22 of the 60 formats want a running order (agenda, schedule, setlist,
 *  lineup, next-up). Promoted out of the infographic category, where it was a variant. */
export const agendaType: GraphicType = {
  id: 'agenda',
  name: 'Agenda',
  description: 'What is coming up, as a list of times and titles.',
  frequency: 22,
  structure: {
    prefix: 'infographic',
    category: 'infographic',
    parts: [
      { id: 'box', selector: '.infographic-box', kind: 'panel', required: true },
    ],
  },
  fields: [
    // The rows are the CONTENT, held in a hidden source the runtime renders from — one
    // "time | show" per line. `lines` maps to an SPX textarea and to the control page's
    // multi-line editor.
    { key: 'rows', label: 'Schedule', kind: 'lines', value: SCHEDULE_SAMPLE, role: 'line' },
    { key: 'heading', label: 'Heading', kind: 'text', value: 'COMING UP TONIGHT', role: 'line' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 2,
    logo: 'none',
    animationPresets: ['rows-cascade', 'fade', 'slide-up'],
    defaultZone: 'mid-center',
  },
  designs: [
    {
      id: 'ig06',
      name: 'Schedule Board',
      description: 'A clean running order: tabular times against titles, cascading in.',
      styleTag: 'minimal',
      palette: paletteById('ivory'),
      fontId: 'inter',
      create: (_type, options) => ig06.create(options),
    },
    // ig03 is held back pending a design call rather than rejected outright. Structurally it
    // fits — a standings stack is rows plus a title, exactly this type's shape — but its rows
    // are live-timing standings and this type's are a schedule, and its own row sample is a
    // shared constant rather than literal text, so pairing it up needs a person to confirm the
    // two really are the same graphic. Left out rather than guessed at.
    // ig04 is NOT promotable here: this type declares two fields and ig04 emits three. A type's
    // field count is part of its contract (the control page and the compiled fN ids are built
    // from it), so a design with an extra field is a different graphic rather than the same one
    // restyled. It is also a poll ring by design, which is the other type's subject.
  ],
};

/** POLL / VOTE RESULT — 13 of the 60 formats show one (poll results, voting, results tables,
 *  percentage bars, seat counts). Also promoted out of the infographic category. */
export const pollType: GraphicType = {
  id: 'poll',
  name: 'Poll result',
  description: 'A question and its answers as bars — the vote, the survey, the count.',
  frequency: 13,
  structure: {
    prefix: 'infographic',
    category: 'infographic',
    parts: [
      { id: 'box', selector: '.infographic-box', kind: 'panel', required: true },
    ],
  },
  fields: [
    { key: 'options', label: 'Options', kind: 'lines', value: POLL_SAMPLE, role: 'line' },
    { key: 'question', label: 'Question', kind: 'text', value: 'How do you watch live news?', role: 'line' },
  ],
  machine: {},
  controls: [],
  capabilities: {
    maxLines: 2,
    logo: 'none',
    animationPresets: ['bars-grow', 'fade', 'rows-cascade'],
    defaultZone: 'mid-left',
  },
  designs: [
    {
      id: 'ig02',
      name: 'Glass Bars',
      description: 'Labelled bars that grow to their share, with the figure riding each tip.',
      styleTag: 'glass',
      palette: paletteById('orchid'),
      fontId: 'manrope',
      create: (_type, options) => ig02.create(options),
    },
    // ig01 is NOT promotable here, and per-design samples cannot rescue it: this type is an
    // options LIST plus a question, and ig01 is a single figure plus a label. Its two lines are
    // "87%" and "Audience share", which line up positionally with "options" and "question" and
    // mean something else entirely. A big stat is a different graphic from a poll result, not
    // the same one in another skin — the minimal poll cell needs its own design.
  ],
};
