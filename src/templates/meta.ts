// DECLARED template metadata — the small hand-authored sliver of the discovery facets
// (docs/TEMPLATE_TAXONOMY_PROPOSAL.md §11). Everything derivable is computed in
// templateMeta.ts; this file holds only what no canonical source can answer: which graphic
// category a template is, its subtype, its information structure, and what each field MEANS.
//
// Resolution order (templateMeta.ts): VARIANT_META[variant.id] → TYPE_META[variant.typeId]
// → CATEGORY_DEFAULT_META[variant.category]. The fallback is always single-valued
// (proposal §4), so a variant nobody has described yet still browses sanely.

import type { TemplateCategory } from '../model/wizard';
import type {
  CapabilityId,
  CoverageClass,
  FieldSemantic,
  GraphicCategoryId,
  StructureId,
} from '../model/taxonomy';

export interface DeclaredTemplateMeta {
  /** The ONE primary graphic category (predictable browsing). */
  category: GraphicCategoryId;
  /** From the category's controlled subtype list. */
  subtype?: string;
  structures: StructureId[];
  /** Overrides the category's default coverage class (proposal §8). */
  coverage?: CoverageClass;
  /** Field meanings. For typed variants keyed by the type's LOGICAL field key; the
   *  positional array form serves unclaimed variants (index = line index). */
  semantics?: Record<string, FieldSemantic>;
  positionalSemantics?: FieldSemantic[];
  /** Capabilities no derivation can see (proposal §7) — most derive in templateMeta.ts. */
  extraCapabilities?: CapabilityId[];
}

// ── Per-type declarations (cover the 48 type-compiled designs) ──────────────

export const TYPE_META: Record<string, DeclaredTemplateMeta> = {
  'lower-third': {
    category: 'lower-third', subtype: 'speaker', structures: ['name-role'],
    semantics: { name: 'name', title: 'role' },
  },
  'sponsor-bug': {
    category: 'bug', subtype: 'sponsor', structures: ['corner-chip', 'logo-text'],
    semantics: { caption: 'headline', logo: 'logo' },
  },
  'social-bug': {
    category: 'bug', subtype: 'social-handle', structures: ['corner-chip', 'single-line'],
    semantics: { handle: 'social-handle', platform: 'source' },
  },
  'countdown': {
    category: 'timer', subtype: 'countdown', structures: ['single-line'],
    semantics: { label: 'headline', minutes: 'duration' },
    extraCapabilities: ['countdown', 'pause-resume'],
  },
  'topic-card': {
    category: 'topic', subtype: 'topic', structures: ['multi-line'],
    semantics: { heading: 'headline', line1: 'description', line2: 'description' },
  },
  'title-card': {
    category: 'title', subtype: 'session-title', structures: ['multi-line'],
    semantics: { title: 'headline', kicker: 'topic', subtitle: 'description' },
  },
  'agenda': {
    category: 'list', subtype: 'agenda', structures: ['rows'],
    semantics: { rows: 'items', heading: 'headline' },
    extraCapabilities: ['repeating'],
  },
  'poll': {
    category: 'poll-quiz', subtype: 'poll-result', structures: ['bars'],
    semantics: { options: 'items', question: 'question' },
    extraCapabilities: ['poll-states', 'repeating'],
  },
  'holding-screen': {
    category: 'holding', subtype: 'starting', structures: ['full-panel'], coverage: 'full',
    semantics: { title: 'headline', show: 'topic', minutes: 'duration' },
    extraCapabilities: ['countdown', 'loop'],
  },
  'ticker': {
    category: 'ticker', subtype: 'rotator', structures: ['strip'], coverage: 'strip',
    semantics: { items: 'items', label: 'headline' },
    extraCapabilities: ['ticker', 'repeating', 'loop', 'pause-resume', 'operator-states'],
  },
  'scoreboard': {
    category: 'scoreboard', subtype: 'match-score', structures: ['strip', 'logo-text'],
    semantics: { teamA: 'team', scoreA: 'score', teamB: 'team', scoreB: 'score' },
    extraCapabilities: ['score-controls', 'clock', 'pause-resume', 'operator-states'],
  },
  'quiz-board': {
    category: 'poll-quiz', subtype: 'quiz-question', structures: ['rows', 'full-panel'],
    coverage: 'panel',
    semantics: {
      question: 'question', answerA: 'answer', answerB: 'answer', answerC: 'answer',
      answerD: 'answer', correctAnswer: 'answer', selectedAnswer: 'answer',
    },
    extraCapabilities: ['quiz-states', 'operator-states', 'multi-step'],
  },
};

// ── Per-variant declarations (the ~30 unclaimed hand-written designs where the
// ── category fallback would be wrong — proposal §4's split table) ───────────

export const VARIANT_META: Record<string, DeclaredTemplateMeta> = {
  // infographic split (§4): the fallback for the category is 'stats'.
  ig01: { category: 'stats', subtype: 'stat-panel', structures: ['single-line', 'bars'], positionalSemantics: ['headline', 'percentage'] },
  ig03: { category: 'results', subtype: 'leaderboard', structures: ['rows'], positionalSemantics: ['headline', 'items'], extraCapabilities: ['repeating'] },
  ig04: { category: 'poll-quiz', subtype: 'poll-result', structures: ['bars'], positionalSemantics: ['question', 'percentage'], extraCapabilities: ['poll-states'] },
  ig05: { category: 'progress', subtype: 'donation-goal', structures: ['bars'], positionalSemantics: ['headline', 'percentage'], extraCapabilities: ['progress'] },
  ig07: { category: 'poll-quiz', subtype: 'vote', structures: ['bars'], positionalSemantics: ['headline', 'items'], extraCapabilities: ['poll-states', 'repeating'] },
  // info-card split (§4): card04 is the remaining unclaimed card — a body-lines info card.
  card04: { category: 'info', subtype: 'explainer', structures: ['multi-line'], positionalSemantics: ['headline', 'description', 'description', 'description', 'description'] },
};

// ── Per-old-category fallback (single-valued, proposal §4) ──────────────────

export const CATEGORY_DEFAULT_META: Record<TemplateCategory, DeclaredTemplateMeta | null> = {
  'lower-third': {
    category: 'lower-third', subtype: 'speaker', structures: ['name-role'],
    positionalSemantics: ['name', 'role', 'organization', 'description', 'description'],
  },
  'ticker': {
    category: 'ticker', subtype: 'news-ticker', structures: ['strip'],
    positionalSemantics: ['items', 'headline'],
    extraCapabilities: ['ticker', 'repeating', 'loop'],
  },
  'scoreboard': {
    category: 'scoreboard', subtype: 'match-score', structures: ['strip', 'logo-text'],
    positionalSemantics: ['team', 'score', 'team', 'score'],
    extraCapabilities: ['score-controls'],
  },
  'info-card': {
    category: 'info', subtype: 'explainer', structures: ['multi-line'],
    positionalSemantics: ['headline', 'description', 'description', 'description', 'description'],
  },
  'starting-soon': {
    category: 'holding', subtype: 'starting', structures: ['full-panel'], coverage: 'full',
    positionalSemantics: ['headline', 'topic', 'duration'],
    extraCapabilities: ['countdown', 'loop'],
  },
  'end-credits': {
    category: 'credits', subtype: 'end-credits', structures: ['rows'], coverage: 'full',
    positionalSemantics: ['items', 'headline', 'logo'],
    extraCapabilities: ['repeating'],
  },
  'corner-bug': {
    category: 'bug', subtype: 'sponsor', structures: ['corner-chip', 'logo-text'],
    positionalSemantics: ['headline', 'logo'],
  },
  'infographic': {
    category: 'stats', subtype: 'stat-panel', structures: ['bars'],
    positionalSemantics: ['headline', 'percentage'],
  },
  'game-timer': {
    category: 'timer', subtype: 'countdown', structures: ['single-line'],
    positionalSemantics: ['headline', 'duration'],
    extraCapabilities: ['countdown'],
  },
  'versus': {
    category: 'reveal', subtype: 'versus', structures: ['two-person', 'full-panel'], coverage: 'full',
    positionalSemantics: ['team', 'team', 'headline', 'logo', 'logo'],
  },
  'quiz': {
    category: 'poll-quiz', subtype: 'quiz-question', structures: ['rows', 'full-panel'],
    positionalSemantics: ['question', 'answer', 'answer', 'answer', 'answer', 'answer'],
    extraCapabilities: ['quiz-states', 'multi-step'],
  },
  'imported-design': null, // user content — never browsable
};

/** Field ids that are hidden CONFIG inputs, excluded from the visible-field buckets
 *  (proposal §6.1). Keyed by wizard category because these are fixed per-category field
 *  contracts (self-assembled categories). */
export const HIDDEN_CONFIG_FIELDS: Partial<Record<TemplateCategory, string[]>> = {
  'game-timer': ['f1'],
  'starting-soon': ['f2'],
  'quiz': ['f5', 'f6'],
};
