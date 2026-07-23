// The AI category registry: the ~20 broadcast graphics users most often create, measured
// from the 60-format reference workbook (live_format_graphics_needs.xlsx — lower thirds in
// 52 of 60 formats, title/topic cards in 44, sponsor bugs in 37, …). Each entry links the
// systems that already model the graphic — the wizard's TemplateCategory (catalog digest +
// nearest worked example) and, where one exists, the GraphicType (real field roles, state
// machine, control events) — plus suggested fields, and the workflow rules the model reads.
//
// ADDING A CATEGORY = adding one entry here. The wizard picker, the prompt assembly, and
// the harness pinning all read this registry; none of them enumerate categories themselves.

import type { AnimPresetId, TemplateCategory } from '../../model/wizard';
import type { AiCategoryId, SpecFieldDef } from '../../model/generationSpec';
import { variantsFor } from '../../templates/catalog';
import { typeById } from '../../templates/types/registry';
import type { GraphicType } from '../../templates/types/graphicType';

export type { AiCategoryId } from '../../model/generationSpec';

export interface AiCategory {
  id: AiCategoryId;
  name: string;
  /** One-line picker description — what the graphic is FOR, not how it looks. */
  blurb: string;
  /** The wizard category whose assemblers/variants carry this graphic (catalog digest,
   *  nearest worked example, recommended presets). */
  templateCategory: TemplateCategory;
  /** The GraphicType that models this graphic, when one exists — its fields, state machine
   *  and control events come along for free (templates/types/registry.ts). */
  typeId?: string;
  /** Starting fields for graphics no GraphicType models yet (type-backed categories derive
   *  theirs from the type's own field declarations — see suggestedFieldsFor). */
  fields?: SpecFieldDef[];
  /** Broadcast workflow rules the model reads: structure, operator flow, on-air behaviour.
   *  Kept short — rules, not prose. */
  workflowNotes: string;
  /** For categories without a GraphicType: the state-machine pattern in words, so a small
   *  model never has to invent the architecture (type-backed categories serialize the real
   *  machine instead — specPrompt.machinePatternDoc). */
  machineHint?: string;
}

const f = (id: string, label: string, kind: SpecFieldDef['kind'], example?: string, description?: string): SpecFieldDef =>
  ({ id, label, kind, ...(example ? { example } : {}), ...(description ? { description } : {}) });

export const AI_CATEGORIES: AiCategory[] = [
  {
    id: 'lower-third',
    name: 'Lower third',
    blurb: 'Name and title over the action — the workhorse of every live show.',
    templateCategory: 'lower-third',
    typeId: 'lower-third',
    workflowNotes:
      'Sits in the lower safe area, never covering the action. Line one is read first (the name); ' +
      'the second line qualifies it. Operators play it for a few seconds and take it out — the ' +
      'exit must be faster than the entrance. Long names must shrink or wrap inside the panel.',
  },
  {
    id: 'title',
    name: 'Full-screen title',
    blurb: 'A full-frame title card — openers, section titles, big announcements.',
    templateCategory: 'info-card',
    typeId: 'title-card',
    workflowNotes:
      'Owns the whole frame: large display type, generous spacing, one clear hierarchy. Usually a ' +
      'kicker line over the main title. It holds on air while the presenter talks, so nothing may ' +
      'loop distractingly; a calm ambient life is fine.',
  },
  {
    id: 'topic-card',
    name: 'Topic / segment card',
    blurb: 'What is being discussed right now — talk shows, podcasts, panels.',
    templateCategory: 'info-card',
    typeId: 'topic-card',
    workflowNotes:
      'A half-frame or strap card naming the current topic. Operators update the text while it is ' +
      'ON AIR — update() must swap text cleanly without replaying the entrance. Design for topics ' +
      'of very different lengths.',
  },
  {
    id: 'breaking',
    name: 'Breaking news / alert banner',
    blurb: 'An urgent full-width strap — breaking news, weather warnings, live alerts.',
    templateCategory: 'lower-third',
    fields: [
      f('kicker', 'Alert label', 'text', 'BREAKING NEWS', 'The urgency word — short, caps'),
      f('headline', 'Headline', 'text', 'Parliament dissolves ahead of snap election'),
      f('source', 'Source / location', 'text', 'Reuters'),
    ],
    workflowNotes:
      'Full-width, high urgency, but broadcast-readable: the alert label is a small intense block ' +
      '(traditionally red — follow brand colours when given), the headline carries the size. Enters ' +
      'hard and fast (cut or a fast wipe), holds with a restrained attention pulse on the label ' +
      'only, and the headline must survive being twice as long. Never animate the headline while ' +
      'it is being read.',
    machineHint:
      'One main state. update() swaps the headline with a quick masked change while on air — no ' +
      'state change, no entrance replay. An optional "flash" operator event may re-pulse the label.',
  },
  {
    id: 'ticker',
    name: 'Ticker',
    blurb: 'A continuous strip of short items — news, results, prices, social.',
    templateCategory: 'ticker',
    typeId: 'ticker',
    workflowNotes:
      'The operator feeds ONE multiline field; each line is an item. Motion is continuous and ' +
      'strictly linear (ease none) — never easing per item. The strip must loop seamlessly and ' +
      'rebuild cleanly when the items change on air.',
  },
  {
    id: 'scoreboard',
    name: 'Scoreboard',
    blurb: 'Two teams, scores, and match status — sports of every size.',
    templateCategory: 'scoreboard',
    typeId: 'scoreboard',
    workflowNotes:
      'Compact, parked on air for the whole match: top corner placement, minimal footprint. ' +
      'Scores change while live — a score change pops ONLY the changed value, never the panel. ' +
      'Team names must fit abbreviated (3-4 letters) and full.',
  },
  {
    id: 'stats-panel',
    name: 'Stats / results panel',
    blurb: 'Numbers that tell the story — match stats, election results, market data.',
    templateCategory: 'infographic',
    fields: [
      f('title', 'Panel title', 'text', 'Possession'),
      f('valueA', 'Value A', 'number', '62'),
      f('valueB', 'Value B', 'number', '38'),
      f('labelA', 'Label A', 'text', 'Home'),
      f('labelB', 'Label B', 'text', 'Away'),
    ],
    workflowNotes:
      'The numbers are the heroes: large tabular figures, labels quiet. Values count up or bars ' +
      'grow to the operator\'s data ON ENTRANCE — measured from the actual value, never hardcoded. ' +
      'Percentages and bars must stay correct when the data changes on air.',
    machineHint:
      'One main state. The entrance measures the operator\'s values and animates to them ' +
      '(count-up / bar growth). update() re-runs the measured motion for changed values only.',
  },
  {
    id: 'player-card',
    name: 'Player / team card',
    blurb: 'One person or team in focus — portrait, name, numbers.',
    templateCategory: 'info-card',
    fields: [
      f('name', 'Player name', 'text', 'A. Virtanen'),
      f('number', 'Number', 'number', '10'),
      f('team', 'Team', 'text', 'HJK Helsinki'),
      f('portrait', 'Portrait', 'image', '', 'The player photo — design a visible placeholder for the empty state'),
      f('stats', 'Statistics', 'lines', 'Goals: 12\nAssists: 7\nMatches: 24', 'One stat per line'),
    ],
    workflowNotes:
      'A portrait-led card: the image anchors one side, the identity block the other, stats as a ' +
      'quiet list. The portrait field must show a designed placeholder when empty. Stats arrive as ' +
      'lines — render however many the operator writes.',
    machineHint:
      'A main state, plus optionally a "stats" operator event revealing the statistics block as a ' +
      'second step on the default path.',
  },
  {
    id: 'versus',
    name: 'Versus / comparison',
    blurb: 'Two sides meet — match-ups, head-to-heads, before/after.',
    templateCategory: 'versus',
    workflowNotes:
      'Full-frame, symmetric tension: the two sides enter from opposite edges and meet. Both sides ' +
      'get identical visual weight; the centre carries the "VS" or the comparison axis. Logos get ' +
      'visible placeholders when empty.',
  },
  {
    id: 'quiz',
    name: 'Quiz',
    blurb: 'Question and answers with a reveal — game shows, education, engagement.',
    templateCategory: 'quiz',
    typeId: 'quiz-board',
    workflowNotes:
      'The operator flow is sacred: question + options enter, the audience answers, THEN the ' +
      'correct answer is revealed on the operator\'s press (Continue). The reveal dims the wrong ' +
      'options and celebrates the right one. The correct answer is a constrained choice ' +
      '(dropdown), never free text.',
  },
  {
    id: 'poll',
    name: 'Poll / voting',
    blurb: 'Audience opinion as bars — live votes, surveys, predictions.',
    templateCategory: 'infographic',
    typeId: 'poll',
    workflowNotes:
      'Options with percentage bars that grow to the operator\'s numbers on entrance. Results ' +
      'change while on air as votes come in — update() re-flows the bars smoothly. The winning ' +
      'option may read stronger, but every option stays legible.',
  },
  {
    id: 'qa-card',
    name: 'Q&A / question card',
    blurb: 'One question in focus — viewer questions, AMAs, interviews.',
    templateCategory: 'info-card',
    fields: [
      f('question', 'Question', 'lines', 'What made you start the channel?'),
      f('asker', 'From', 'text', '@viewer_handle', 'Who asked — a handle or a name'),
    ],
    workflowNotes:
      'The question is the hero — comfortable reading size, room to wrap over several lines. The ' +
      'asker credit is small and secondary. Operators step through many questions: update() swaps ' +
      'the text cleanly without replaying the entrance.',
    machineHint:
      'One main state; each next question is a data update, never a state change. An optional ' +
      '"highlight" operator event may emphasize the card while it is being answered.',
  },
  {
    id: 'countdown',
    name: 'Countdown / timer',
    blurb: 'Time on screen — countdowns, game clocks, round timers.',
    templateCategory: 'game-timer',
    typeId: 'countdown',
    workflowNotes:
      'The time is the hero: large tabular numerals that never jitter as digits change. The ' +
      'duration is an input-only hidden field; the clock runtime owns the ticking. Reaching zero ' +
      'is a designed moment (a "done" state), not just a frozen 0:00.',
  },
  {
    id: 'schedule',
    name: 'Schedule / agenda',
    blurb: 'What happens when — rundowns, agendas, coming up next.',
    templateCategory: 'info-card',
    typeId: 'agenda',
    workflowNotes:
      'Rows of time + item, read top to bottom; rows cascade in on entrance. The operator feeds ' +
      'rows as lines — render however many they write. The current item may be emphasized.',
  },
  {
    id: 'leaderboard',
    name: 'Leaderboard',
    blurb: 'Ranked standings — competitions, charts, fundraisers.',
    templateCategory: 'infographic',
    fields: [
      f('title', 'Title', 'text', 'STANDINGS'),
      f('rows', 'Rows', 'lines', '1. Kestrels | 42\n2. Harriers | 39\n3. Falcons | 35', 'One row per line: rank. name | score'),
    ],
    workflowNotes:
      'Ranked rows, cascading in from first place. Rank, name and score are distinct columns — ' +
      'scores right-aligned and tabular. The top position may read stronger. Render however many ' +
      'rows the operator writes.',
    machineHint:
      'One main state; rows parse from the multiline field at entrance and on every update(). ' +
      'Optionally reveal rows in steps on the operator\'s Continue.',
  },
  {
    id: 'quote',
    name: 'Quote card',
    blurb: 'Someone\'s words, attributed — interviews, reactions, pull quotes.',
    templateCategory: 'info-card',
    fields: [
      f('quote', 'Quote', 'lines', 'This is the biggest night of my career.'),
      f('attribution', 'Attribution', 'text', 'Maria Silva'),
      f('role', 'Role / context', 'text', 'Head Coach'),
    ],
    workflowNotes:
      'The quotation reads like typography, not a form: generous size, real quotation marks as a ' +
      'design element, the attribution clearly separated. Quotes vary wildly in length — the type ' +
      'must scale or wrap gracefully.',
    machineHint: 'One main state; a new quote is a data update.',
  },
  {
    id: 'sponsor-bug',
    name: 'Sponsor / logo bug',
    blurb: 'A persistent corner presence — sponsors, channel bugs, partnerships.',
    templateCategory: 'corner-bug',
    typeId: 'sponsor-bug',
    workflowNotes:
      'Small, corner-parked, on air for very long stretches: restrained enough to live under the ' +
      'whole show. The logo is the content — a visible placeholder when empty. An optional label ' +
      'line ("PRESENTED BY") stays tiny.',
  },
  {
    id: 'social-bug',
    name: 'Social / handles bug',
    blurb: 'Where to find you — handles, hashtags, join links.',
    templateCategory: 'corner-bug',
    typeId: 'social-bug',
    workflowNotes:
      'A compact handle strip: the @ or # reads instantly, the platform mark or icon area stays ' +
      'small. Often cycles between handles — each swap is a clean masked change.',
  },
  {
    id: 'progress-goal',
    name: 'Goal / progress bar',
    blurb: 'Progress toward a target — donations, subscribers, challenges.',
    templateCategory: 'infographic',
    fields: [
      f('title', 'Goal title', 'text', 'SUBATHON GOAL'),
      f('current', 'Current value', 'number', '7350'),
      f('target', 'Target value', 'number', '10000'),
      f('unit', 'Unit / suffix', 'text', '€', 'Shown with the numbers'),
    ],
    workflowNotes:
      'The bar IS the story: its fill measures current/target exactly, growing to position on ' +
      'entrance and gliding on every update as the numbers climb. The current value counts up; ' +
      'reaching the target is a designed celebration moment.',
    machineHint:
      'One main state; update() re-measures the fill and glides the bar. Optionally a "celebrate" ' +
      'state entered by a timer or operator event when current >= target.',
  },
  {
    id: 'starting-soon',
    name: 'Starting soon / holding screen',
    blurb: 'The pre-show hold — starting soon, BRB, technical difficulties.',
    templateCategory: 'starting-soon',
    typeId: 'holding-screen',
    workflowNotes:
      'Full-frame and parked for minutes: a calm ambient loop (a slow breath, never a hard loop ' +
      'point), the show title large, an optional countdown to air. It must look alive at minute ' +
      'five, not just second five.',
  },
  {
    id: 'end-credits',
    name: 'End credits',
    blurb: 'The closing crawl — roles and names, thanks, the production logo.',
    templateCategory: 'end-credits',
    fields: [
      f(
        'credits',
        'Credits',
        'lines',
        'Directed by | Anna Laine\nProduced by | Tom Blake\n\nCamera Operator | Jonas Berg',
        'One credit per line as "Role | Name"; a bare line is a section heading, a blank line a gap',
      ),
      f('year', 'Year / copyright', 'text', '© 2026 Your Production'),
    ],
    workflowNotes:
      'DATA-DRIVEN, not a fixed layout: the operator writes the whole credit list into ONE ' +
      'multiline field and the template parses it — role and name are two columns meeting at a ' +
      'centre gutter, section headings span both, blank lines breathe. Render however many ' +
      'credits they write, and re-parse on every update(). The travel is continuous and ' +
      'strictly linear (ease none) — a roll eased per line reads as broken. Length comes from ' +
      'the content, so it is MEASURED at play time, never a fixed keyframe distance. The list ' +
      'ends on a production logo and the copyright line.',
    machineHint:
      'One main state; the roll runs for as long as the content needs. The measured travel is a ' +
      'named builder called from the timeline (the platform\'s dynamics model), never inline ' +
      'DOM math inside the animation region.',
  },
];

export function aiCategoryById(id: string | null | undefined): AiCategory | undefined {
  return AI_CATEGORIES.find((c) => c.id === id);
}

/** The GraphicType behind a category, when one models it. */
export function graphicTypeFor(cat: AiCategory): GraphicType | undefined {
  return cat.typeId ? typeById(cat.typeId) : undefined;
}

/**
 * The category's suggested starting fields. Type-backed categories derive them from the
 * type's OWN field declarations (single source of truth — a type change updates the wizard
 * suggestions automatically); rules-only categories declare their own. The logo slot is not
 * offered as a field: uploaded logos ride the asset flow and the design's logo capability.
 */
export function suggestedFieldsFor(cat: AiCategory): SpecFieldDef[] {
  const type = graphicTypeFor(cat);
  if (type) {
    return type.fields
      .filter((tf) => tf.role !== 'logo')
      .map((tf) => ({
        id: tf.key,
        label: tf.label,
        kind: tf.kind,
        example: tf.value,
        ...(tf.role === 'hidden' ? { description: 'Input-only value (not shown as text)' } : {}),
      }));
  }
  return cat.fields ?? [];
}

/** Presets that suit this category — derived from its catalog variants' own declarations. */
export function recommendedPresetsFor(cat: AiCategory): AnimPresetId[] {
  const seen = new Set<AnimPresetId>();
  for (const v of variantsFor(cat.templateCategory)) {
    for (const p of v.animationPresets) seen.add(p);
  }
  return [...seen];
}

/** The AI category that best matches an inferred wizard category (for showing an 'auto'
 *  run's inferred category as editable metadata). First registry entry wins — the registry
 *  is ordered by how common the graphic is. */
export function aiCategoryForTemplateCategory(tc: TemplateCategory): AiCategory | undefined {
  return AI_CATEGORIES.find((c) => c.templateCategory === tc);
}
