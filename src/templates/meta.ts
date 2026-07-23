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
  ig04: { category: 'poll-quiz', subtype: 'poll-result', structures: ['bars'], positionalSemantics: ['percentage', 'answer', 'question'], extraCapabilities: ['poll-states'] },
  ig05: { category: 'progress', subtype: 'donation-goal', structures: ['bars'], positionalSemantics: ['amount', 'amount', 'topic'], extraCapabilities: ['progress'] },
  ig07: { category: 'poll-quiz', subtype: 'vote', structures: ['bars', 'rows'], positionalSemantics: ['name', 'organization', 'percentage', 'name', 'organization', 'percentage', 'name', 'organization', 'percentage'], extraCapabilities: ['poll-states'] },
  // info-card split (§4): card04 turned out to be a QUOTE card (Quote + Name + Role) — the
  // quote category's first catalog content, found by the factory's schema-length assertion.
  card04: { category: 'quote', subtype: 'quote', structures: ['multi-line', 'name-role'], positionalSemantics: ['description', 'name', 'role'] },

  // ── The SPECIALIST lower thirds (templates/lowerThirds/specialist, ls01…ls32) ──
  //
  // These are declared per variant rather than left to the lower-third fallback, because the
  // fallback's single value is exactly what they are not: it calls every strap a two-field
  // 'speaker' with a 'name-role' structure, which would file a two-person interview strap, a
  // squad-number tag and a world clock as the same graphic. The subtype and structure here are
  // what let Browse tell them apart, and the positional semantics are what make the card's
  // field summary read truthfully ("Name · Role · Name · Role", not "Name · Role · Org").
  //
  // Interview — two people, equal billing.
  ls01: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  ls02: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  ls03: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  // Host & guest — the same two-person structure, deliberately unequal billing.
  ls04: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  ls05: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'role', 'name', 'role'] },
  // Commentary — the booth, named as a unit under its own header.
  ls06: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'multi-line'], positionalSemantics: ['headline', 'name', 'role', 'name', 'role'] },
  ls07: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'single-line'], positionalSemantics: ['headline', 'name', 'name'] },
  // Sport — the athlete.
  ls08: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['score', 'name', 'role', 'team'] },
  ls09: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'table'], positionalSemantics: ['name', 'team', 'score', 'score', 'score'] },
  ls10: { category: 'lower-third', subtype: 'name-tag', structures: ['logo-text', 'name-role'], positionalSemantics: ['name', 'role', 'team'] },
  // Esports — tags, handles and the desk.
  ls11: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['team', 'name', 'role', 'organization'] },
  ls12: { category: 'lower-third', subtype: 'speaker', structures: ['name-role'], positionalSemantics: ['social-handle', 'name', 'role'] },
  ls13: { category: 'lower-third', subtype: 'two-person', structures: ['two-person', 'name-role'], positionalSemantics: ['name', 'social-handle', 'name', 'social-handle'] },
  // Worship — the register that must not interrupt.
  ls14: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['role', 'name', 'organization'] },
  ls15: { category: 'lower-third', subtype: 'speaker', structures: ['multi-line', 'name-role'], positionalSemantics: ['topic', 'source', 'name', 'role'] },
  ls16: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['topic', 'name', 'role'] },
  // Academic — the person and the institution behind them.
  ls17: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['name', 'role', 'role', 'organization'] },
  ls18: { category: 'lower-third', subtype: 'speaker', structures: ['logo-text', 'name-role'], positionalSemantics: ['name', 'role', 'organization'] },
  ls19: { category: 'lower-third', subtype: 'speaker', structures: ['multi-line', 'name-role'], positionalSemantics: ['topic', 'name', 'organization', 'time'] },
  // Politics — the party colour is the identity.
  ls20: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['organization', 'name', 'location', 'percentage'] },
  ls21: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role'], positionalSemantics: ['name', 'organization', 'location'] },
  ls22: { category: 'lower-third', subtype: 'speaker', structures: ['name-role'], positionalSemantics: ['name', 'role', 'organization'] },
  // Analysis — marking interpretation, and marking expertise.
  ls23: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['headline', 'name', 'role', 'topic'] },
  ls24: { category: 'lower-third', subtype: 'speaker', structures: ['name-role', 'multi-line'], positionalSemantics: ['topic', 'name', 'role'] },
  // Music — the track, the billing, and the programme.
  ls25: { category: 'lower-third', subtype: 'name-tag', structures: ['image-text', 'multi-line'], positionalSemantics: ['topic', 'name', 'description'] },
  ls26: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['name', 'topic', 'location'] },
  ls27: { category: 'lower-third', subtype: 'name-tag', structures: ['multi-line', 'name-role'], positionalSemantics: ['score', 'topic', 'name', 'duration'] },
  // Live & location — where, and when.
  ls28: { category: 'lower-third', subtype: 'live-tag', structures: ['single-line', 'multi-line'], positionalSemantics: ['headline', 'location', 'location'] },
  ls29: { category: 'lower-third', subtype: 'locator', structures: ['name-role', 'multi-line'], positionalSemantics: ['location', 'name', 'role'] },
  // ls30's fourth field is the hidden UTC offset the clock runtime reads — an input-only
  // value, but a real DataField, so the positional array has to account for it.
  ls30: { category: 'lower-third', subtype: 'locator', structures: ['single-line', 'multi-line'], positionalSemantics: ['location', 'time', 'description', 'duration'] },
  // Creator — handles and stream identity.
  ls31: { category: 'lower-third', subtype: 'name-tag', structures: ['multi-line', 'single-line'], positionalSemantics: ['name', 'description', 'social-handle', 'social-handle', 'social-handle'] },
  ls32: { category: 'lower-third', subtype: 'name-tag', structures: ['name-role', 'multi-line'], positionalSemantics: ['social-handle', 'name', 'headline', 'amount'] },
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
