// TEMPLATE TAXONOMY — the facet id registries behind Start-from-template discovery
// (docs/TEMPLATE_TAXONOMY_PROPOSAL.md). Pure data: stable kebab-case ids + display labels.
//
// The rule that shapes this file (proposal §2): a facet value is DERIVED from an existing
// canonical source wherever one exists, and declared only where none does. This file holds the
// id vocabularies and the small declared tables (per-preset motion, style aliases); the
// per-template derivation lives in src/templates/templateMeta.ts, the declared per-template
// sliver in src/templates/meta.ts. Display labels live here so renames and localization never
// touch stored ids.

import type { AnimPresetId, TemplateCategory } from './wizard';
import type { StyleTag } from './fonts';

// ── Facet A: programme families and formats ─────────────────────────────────

export type ProgrammeFamilyId =
  | 'sports' | 'gaming' | 'creator' | 'news' | 'talk' | 'business'
  | 'education' | 'entertainment' | 'commerce' | 'ceremony' | 'civic' | 'wellness';

export interface ProgrammeFamily {
  id: ProgrammeFamilyId;
  name: string;
}

export const FAMILIES: ProgrammeFamily[] = [
  { id: 'sports',        name: 'Sports' },
  { id: 'gaming',        name: 'Esports & gaming' },
  { id: 'creator',       name: 'Streaming & creator' },
  { id: 'news',          name: 'News & current affairs' },
  { id: 'talk',          name: 'Talk & podcasts' },
  { id: 'business',      name: 'Business & corporate' },
  { id: 'education',     name: 'Education & training' },
  { id: 'entertainment', name: 'Music, stage & entertainment' },
  { id: 'commerce',      name: 'Commerce & fundraising' },
  { id: 'ceremony',      name: 'Faith & ceremony' },
  { id: 'civic',         name: 'Public info & professional' },
  { id: 'wellness',      name: 'Health & wellness' },
];

export type ProgrammeFormatId =
  | 'sports-broadcast' | 'amateur-sports'
  | 'esports-tournament' | 'gaming-stream' | 'tabletop'
  | 'just-chatting' | 'irl-travel' | 'watch-party' | 'coding-stream' | 'art-stream'
  | 'craft-stream' | 'beauty-stream' | 'cooking-stream' | 'bts-production'
  | 'news-live' | 'election-night' | 'weather' | 'debate' | 'press-conference'
  | 'talk-show' | 'podcast' | 'live-qa' | 'remote-interview' | 'morning-show'
  | 'radio-style' | 'book-launch'
  | 'webinar' | 'conference' | 'town-hall' | 'product-launch' | 'virtual-event' | 'finance-live'
  | 'lecture' | 'school-tv' | 'academic-conference' | 'workshop'
  | 'concert' | 'award-show' | 'theatre' | 'dj-set' | 'quiz-show' | 'reality'
  | 'red-carpet' | 'fashion-show'
  | 'live-shopping' | 'auction' | 'real-estate' | 'fundraiser'
  | 'church-service' | 'graduation' | 'wedding' | 'memorial'
  | 'council-meeting' | 'emergency-info' | 'public-cam' | 'medical-info' | 'legal-info'
  | 'fitness' | 'meditation' | 'nature-cam';

export interface ProgrammeFormat {
  id: ProgrammeFormatId;
  family: ProgrammeFamilyId;
  name: string;
  /** The VERBATIM row value in live_format_graphics_needs.xlsx — the same string
   *  `packs.ts` formats use. The factory asserts a 1:1 mapping between this list and the
   *  union of pack formats, so the two 60-item lists cannot drift. */
  sheetName: string;
}

export const FORMATS: ProgrammeFormat[] = [
  { id: 'sports-broadcast',    family: 'sports',        name: 'Sports broadcast',        sheetName: 'Sports broadcast / match coverage' },
  { id: 'amateur-sports',      family: 'sports',        name: 'Amateur & local sports',  sheetName: 'Local sports / amateur sports' },
  { id: 'esports-tournament',  family: 'gaming',        name: 'Esports tournament',      sheetName: 'Esports tournament' },
  { id: 'gaming-stream',       family: 'gaming',        name: 'Gaming livestream',       sheetName: 'Gaming livestream' },
  { id: 'tabletop',            family: 'gaming',        name: 'Tabletop & board games',  sheetName: 'Tabletop RPG / board game stream' },
  { id: 'just-chatting',       family: 'creator',       name: 'Just Chatting',           sheetName: 'Just Chatting / personality stream' },
  { id: 'irl-travel',          family: 'creator',       name: 'Travel & IRL',            sheetName: 'Travel / IRL stream' },
  { id: 'watch-party',         family: 'creator',       name: 'Watch party & reactions', sheetName: 'Watch party / reaction stream' },
  { id: 'coding-stream',       family: 'creator',       name: 'Tech & coding',           sheetName: 'Tech support / coding livestream' },
  { id: 'art-stream',          family: 'creator',       name: 'Art & design',            sheetName: 'Art / design livestream' },
  { id: 'craft-stream',        family: 'creator',       name: 'Craft & maker',           sheetName: 'Craft / maker livestream' },
  { id: 'beauty-stream',       family: 'creator',       name: 'Beauty & makeup',         sheetName: 'Beauty / makeup livestream' },
  { id: 'cooking-stream',      family: 'creator',       name: 'Cooking & food',          sheetName: 'Cooking show / food livestream' },
  { id: 'bts-production',      family: 'creator',       name: 'Behind the scenes',       sheetName: 'Behind-the-scenes production stream' },
  { id: 'news-live',           family: 'news',          name: 'News livestream',         sheetName: 'News / current affairs livestream' },
  { id: 'election-night',      family: 'news',          name: 'Election night',          sheetName: 'Election night / results program' },
  { id: 'weather',             family: 'news',          name: 'Weather',                 sheetName: 'Weather broadcast / climate update' },
  { id: 'debate',              family: 'news',          name: 'Debate',                  sheetName: 'Debate / political discussion' },
  { id: 'press-conference',    family: 'news',          name: 'Press conference',        sheetName: 'Press conference' },
  { id: 'talk-show',           family: 'talk',          name: 'Talk show & panel',       sheetName: 'Talk show / panel discussion' },
  { id: 'podcast',             family: 'talk',          name: 'Podcast & videocast',     sheetName: 'Podcast livestream / videocast' },
  { id: 'live-qa',             family: 'talk',          name: 'Live Q&A / AMA',          sheetName: 'Live Q&A / AMA' },
  { id: 'remote-interview',    family: 'talk',          name: 'Remote interview',        sheetName: 'Remote interview show' },
  { id: 'morning-show',        family: 'talk',          name: 'Magazine & morning show', sheetName: 'Magazine show / morning show' },
  { id: 'radio-style',         family: 'talk',          name: 'Radio-style stream',      sheetName: 'Radio-style livestream with video' },
  { id: 'book-launch',         family: 'talk',          name: 'Book launch & authors',   sheetName: 'Book launch / author event' },
  { id: 'webinar',             family: 'business',      name: 'Webinar',                 sheetName: 'Webinar / expert presentation' },
  { id: 'conference',          family: 'business',      name: 'Conference & seminar',    sheetName: 'Conference / seminar stream' },
  { id: 'town-hall',           family: 'business',      name: 'Town hall & internal',    sheetName: 'Corporate town hall / internal broadcast' },
  { id: 'product-launch',      family: 'business',      name: 'Product launch & keynote', sheetName: 'Product launch / keynote' },
  { id: 'virtual-event',       family: 'business',      name: 'Virtual event',           sheetName: 'Virtual event / metaverse event' },
  { id: 'finance-live',        family: 'business',      name: 'Finance & markets',       sheetName: 'Finance / market livestream' },
  { id: 'lecture',             family: 'education',     name: 'Lecture & class',         sheetName: 'Education / lecture livestream' },
  { id: 'school-tv',           family: 'education',     name: 'Student & school TV',     sheetName: 'Student production / school TV' },
  { id: 'academic-conference', family: 'education',     name: 'Academic conference',     sheetName: 'Academic conference livestream' },
  { id: 'workshop',            family: 'education',     name: 'Workshop & training',     sheetName: 'Hybrid workshop / training session' },
  { id: 'concert',             family: 'entertainment', name: 'Concert & live music',    sheetName: 'Music performance / concert livestream' },
  { id: 'award-show',          family: 'entertainment', name: 'Award show & gala',       sheetName: 'Award show / gala' },
  { id: 'theatre',             family: 'entertainment', name: 'Theatre & performance',   sheetName: 'Theatre / live performance stream' },
  { id: 'dj-set',              family: 'entertainment', name: 'DJ set & club',           sheetName: 'DJ set / club stream' },
  { id: 'quiz-show',           family: 'entertainment', name: 'Quiz & game show',        sheetName: 'Quiz / game show livestream' },
  { id: 'reality',             family: 'entertainment', name: 'Reality & house stream',  sheetName: 'Reality-style livestream / house stream' },
  { id: 'red-carpet',          family: 'entertainment', name: 'Red carpet & premiere',   sheetName: 'Red carpet / premiere stream' },
  { id: 'fashion-show',        family: 'entertainment', name: 'Fashion show',            sheetName: 'Fashion show livestream' },
  { id: 'live-shopping',       family: 'commerce',      name: 'Live shopping',           sheetName: 'Live commerce / shopping stream' },
  { id: 'auction',             family: 'commerce',      name: 'Auction',                 sheetName: 'Auction livestream' },
  { id: 'real-estate',         family: 'commerce',      name: 'Real estate',             sheetName: 'Real estate / property livestream' },
  { id: 'fundraiser',          family: 'commerce',      name: 'Fundraiser & telethon',   sheetName: 'Charity telethon / fundraising stream' },
  { id: 'church-service',      family: 'ceremony',      name: 'Church service',          sheetName: 'Religious service / church livestream' },
  { id: 'graduation',          family: 'ceremony',      name: 'Graduation & ceremony',   sheetName: 'Graduation / ceremony stream' },
  { id: 'wedding',             family: 'ceremony',      name: 'Wedding',                 sheetName: 'Wedding / private event livestream' },
  { id: 'memorial',            family: 'ceremony',      name: 'Funeral & memorial',      sheetName: 'Funeral / memorial livestream' },
  { id: 'council-meeting',     family: 'civic',         name: 'Council & public meeting', sheetName: 'Municipal council / public meeting' },
  { id: 'emergency-info',      family: 'civic',         name: 'Emergency information',   sheetName: 'Emergency information stream' },
  { id: 'public-cam',          family: 'civic',         name: 'Public & security cam',   sheetName: 'Security / surveillance-style public stream' },
  { id: 'medical-info',        family: 'civic',         name: 'Medical & health',        sheetName: 'Medical / health livestream' },
  { id: 'legal-info',          family: 'civic',         name: 'Legal & public information', sheetName: 'Legal / public information livestream' },
  { id: 'fitness',             family: 'wellness',      name: 'Fitness & workout',       sheetName: 'Fitness / workout class' },
  { id: 'meditation',          family: 'wellness',      name: 'Meditation & ambient',    sheetName: 'Meditation / ambient livestream' },
  { id: 'nature-cam',          family: 'wellness',      name: 'Animal & nature cam',     sheetName: 'Animal cam / nature cam' },
];

export function formatsBySheetName(): Map<string, ProgrammeFormat> {
  return new Map(FORMATS.map((f) => [f.sheetName, f]));
}

// ── Facet B: graphic categories ─────────────────────────────────────────────

export type GraphicCategoryId =
  | 'lower-third' | 'bug' | 'title' | 'topic' | 'info' | 'question' | 'quote'
  | 'scoreboard' | 'results' | 'stats' | 'timer' | 'ticker' | 'alert' | 'list'
  | 'poll-quiz' | 'progress' | 'product' | 'cta' | 'sponsor' | 'frame' | 'holding'
  | 'credits' | 'caption' | 'reveal' | 'map' | 'transition';

/** Where a category's graphics sit on the canvas, as a DEFAULT — a design overrides it the
 *  same way it overrides defaultZone (proposal §8). */
export type CoverageClass = 'overlay' | 'strip' | 'panel' | 'full' | 'frame';

export interface GraphicCategory {
  id: GraphicCategoryId;
  name: string;
  /** Controlled subtype ids — a template declares at most one. Never free-form. */
  subtypes: string[];
  coverage: CoverageClass;
  /** 'all' = relevant to every programme format (ranked below genuine format matches).
   *  Absent = relevance derives from pack membership (templateMeta.ts). */
  relevance?: 'all';
}

export const GRAPHIC_CATEGORIES: GraphicCategory[] = [
  { id: 'lower-third', name: 'Lower thirds',            subtypes: ['speaker', 'two-person', 'name-tag', 'locator', 'live-tag'], coverage: 'overlay', relevance: 'all' },
  // 'logo-only', 'event' and 'location' joined the list with the identity-bug pack
  // (templates/types/identityBugs.ts): a mark with no caption at all, the conference /
  // festival / fixture ident, and the where-are-we chip are distinct graphics an operator
  // reaches for by name, and none of them is a sponsor, a station or an award.
  { id: 'bug',         name: 'Bugs & corner logos',     subtypes: ['sponsor', 'station', 'live', 'logo-only', 'event', 'award', 'location', 'social-handle'], coverage: 'overlay', relevance: 'all' },
  { id: 'title',       name: 'Titles & openers',        subtypes: ['show-open', 'session-title', 'segment-title', 'event-title'], coverage: 'panel' },
  { id: 'topic',       name: 'Topic & chapter cards',   subtypes: ['topic', 'chapter', 'now-playing', 'coming-up'], coverage: 'panel' },
  { id: 'info',        name: 'Information cards',       subtypes: ['explainer', 'spec', 'key-term', 'step', 'checklist', 'fact'], coverage: 'panel' },
  { id: 'question',    name: 'Questions & chat',        subtypes: ['viewer-question', 'qa-card', 'chat-highlight', 'queue'], coverage: 'panel' },
  { id: 'quote',       name: 'Quotes & statements',     subtypes: ['quote', 'scripture', 'excerpt', 'headline', 'fact-check'], coverage: 'panel' },
  { id: 'scoreboard',  name: 'Scoreboards',             subtypes: ['match-score', 'simple-score', 'round-indicator'], coverage: 'overlay' },
  { id: 'results',     name: 'Results & standings',     subtypes: ['results-table', 'leaderboard', 'bracket', 'seat-count', 'vote-result', 'final-score'], coverage: 'panel' },
  { id: 'stats',       name: 'Statistics & data',       subtypes: ['stat-panel', 'kpi', 'chart', 'heatmap', 'trend'], coverage: 'panel' },
  { id: 'timer',       name: 'Timers & clocks',         subtypes: ['countdown', 'count-up', 'clock', 'interval', 'speaking-timer', 'deal-timer'], coverage: 'overlay', relevance: 'all' },
  { id: 'ticker',      name: 'Tickers & crawls',        subtypes: ['news-ticker', 'market-ticker', 'crawl', 'rotator'], coverage: 'strip' },
  { id: 'alert',       name: 'Alerts & status',         subtypes: ['breaking', 'warning', 'emergency', 'status', 'notice'], coverage: 'strip' },
  { id: 'list',        name: 'Lists & schedules',       subtypes: ['agenda', 'schedule', 'lineup', 'setlist', 'ingredients', 'program', 'order'], coverage: 'panel' },
  { id: 'poll-quiz',   name: 'Polls, voting & quizzes', subtypes: ['poll-result', 'vote', 'quiz-question', 'answer-board'], coverage: 'panel' },
  { id: 'progress',    name: 'Goals & progress',        subtypes: ['donation-goal', 'progress-bar', 'milestone', 'stock-level'], coverage: 'overlay' },
  { id: 'product',     name: 'Products & commerce',     subtypes: ['product-card', 'price', 'lot-bid', 'property', 'comparison'], coverage: 'panel' },
  { id: 'cta',         name: 'Calls to action & QR',    subtypes: ['qr', 'link', 'follow', 'donate', 'buy'], coverage: 'overlay', relevance: 'all' },
  { id: 'sponsor',     name: 'Sponsor & partner panels', subtypes: ['panel', 'logo-strip', 'sponsor-read', 'rotation'], coverage: 'panel', relevance: 'all' },
  { id: 'frame',       name: 'Frames & layouts',        subtypes: ['webcam', 'split-screen', 'reaction', 'visualizer', 'background', 'screen-share'], coverage: 'frame', relevance: 'all' },
  { id: 'holding',     name: 'Holding & break screens', subtypes: ['starting', 'ending', 'brb', 'break', 'intermission'], coverage: 'full', relevance: 'all' },
  { id: 'credits',     name: 'Credits & thanks',        subtypes: ['end-credits', 'thank-you', 'donor-wall', 'role-credits'], coverage: 'full' },
  { id: 'caption',     name: 'Captions & lyrics',       subtypes: ['lyrics', 'surtitle', 'translation', 'caption'], coverage: 'strip' },
  { id: 'reveal',      name: 'Reveals & matchups',      subtypes: ['versus', 'winner', 'nominee', 'before-after', 'sold'], coverage: 'full' },
  { id: 'map',         name: 'Maps & location',         subtypes: ['map', 'map-pin', 'route', 'weather-map', 'zone-map'], coverage: 'panel' },
  { id: 'transition',  name: 'Stingers & wipes',        subtypes: ['stinger', 'replay-wipe'], coverage: 'full' },
];

export function graphicCategoryById(id: GraphicCategoryId): GraphicCategory {
  const found = GRAPHIC_CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown graphic category "${id}"`);
  return found;
}

/** The single-valued browse fallback for a variant with no declared meta (proposal §4):
 *  every old wizard category maps to exactly one graphic category, so the browser never
 *  crashes on a lazy variant — the factory just flags it. */
export const OLD_CATEGORY_FALLBACK: Record<TemplateCategory, GraphicCategoryId | null> = {
  'lower-third': 'lower-third',
  'ticker': 'ticker',
  'scoreboard': 'scoreboard',
  'info-card': 'info',
  'starting-soon': 'holding',
  'end-credits': 'credits',
  'corner-bug': 'bug',
  'infographic': 'stats',
  'game-timer': 'timer',
  'versus': 'reveal',
  'quiz': 'poll-quiz',
  'frame': 'frame',
  'transition': 'transition',
  'esports-score': 'scoreboard',
  'matchup': 'reveal',
  'results-board': 'results',
  'reveal': 'reveal',
  'poll': 'poll-quiz',
  'audience': 'question',
  'imported-design': null, // user content — never browsable
};

// ── Facet C: structures ─────────────────────────────────────────────────────

export type StructureId =
  | 'single-line' | 'multi-line' | 'name-role' | 'image-text' | 'logo-text'
  | 'two-person' | 'multi-person' | 'rows' | 'table' | 'grid' | 'bars'
  | 'full-panel' | 'strip' | 'corner-chip' | 'side-panel' | 'media-frame';

export const STRUCTURE_LABELS: Record<StructureId, string> = {
  'single-line': 'Single line',
  'multi-line': 'Multi-line text',
  'name-role': 'Name + role',
  'image-text': 'Image + text',
  'logo-text': 'Logo + text',
  'two-person': 'Two people',
  'multi-person': 'Several people',
  'rows': 'Repeating rows',
  'table': 'Table',
  'grid': 'Grid',
  'bars': 'Bars & meters',
  'full-panel': 'Full-screen panel',
  'strip': 'Horizontal strip',
  'corner-chip': 'Corner chip',
  'side-panel': 'Vertical panel',
  'media-frame': 'Video / webcam frame',
};

// ── Facet D: field semantics ────────────────────────────────────────────────

export type FieldSemantic =
  | 'name' | 'role' | 'organization' | 'headline' | 'description' | 'topic'
  | 'question' | 'answer' | 'score' | 'team' | 'price' | 'discount' | 'percentage'
  | 'location' | 'date' | 'time' | 'duration' | 'url' | 'social-handle'
  | 'qr-content' | 'image' | 'logo' | 'items' | 'source' | 'amount';

export const SEMANTIC_LABELS: Record<FieldSemantic, string> = {
  name: 'Name', role: 'Role', organization: 'Organization', headline: 'Headline',
  description: 'Description', topic: 'Topic', question: 'Question', answer: 'Answer',
  score: 'Score', team: 'Team', price: 'Price', discount: 'Discount',
  percentage: 'Percentage', location: 'Location', date: 'Date', time: 'Time',
  duration: 'Duration', url: 'URL', 'social-handle': 'Social handle',
  'qr-content': 'QR content', image: 'Image', logo: 'Logo', items: 'Items',
  source: 'Source / platform', amount: 'Amount / total',
};

// ── Facet E: capabilities ───────────────────────────────────────────────────

export type CapabilityId =
  | 'multi-step' | 'operator-states' | 'loop' | 'countdown' | 'count-up' | 'clock'
  | 'score-controls' | 'progress' | 'repeating' | 'ticker' | 'poll-states'
  | 'quiz-states' | 'winner-reveal' | 'alert-state' | 'image-upload' | 'logo-upload'
  | 'qr' | 'live-data' | 'sponsor-rotation' | 'pause-resume';

export interface CapabilityInfo {
  id: CapabilityId;
  name: string;
  /** Offered as a Browse filter checkbox. The rest stay searchable metadata until they
   *  have catalog mass (proposal §7). */
  filter: boolean;
}

export const CAPABILITIES: CapabilityInfo[] = [
  { id: 'multi-step',       name: 'Step-by-step reveal',        filter: true },
  { id: 'operator-states',  name: 'Operator-controlled states', filter: false },
  { id: 'loop',             name: 'Automatic loop',             filter: true },
  { id: 'countdown',        name: 'Countdown',                  filter: true },
  { id: 'count-up',         name: 'Count-up',                   filter: false },
  { id: 'clock',            name: 'Clock',                      filter: true },
  { id: 'score-controls',   name: 'Score controls',             filter: true },
  { id: 'progress',         name: 'Progress bar',               filter: true },
  { id: 'repeating',        name: 'Repeating list',             filter: true },
  { id: 'ticker',           name: 'Ticker / marquee',           filter: false },
  { id: 'poll-states',      name: 'Poll & voting states',       filter: false },
  { id: 'quiz-states',      name: 'Correct / incorrect states', filter: false },
  { id: 'winner-reveal',    name: 'Winner reveal',              filter: false },
  { id: 'alert-state',      name: 'Alert state',                filter: false },
  { id: 'image-upload',     name: 'Image upload',               filter: true },
  { id: 'logo-upload',      name: 'Logo upload',                filter: true },
  { id: 'qr',               name: 'QR code',                    filter: false },
  { id: 'live-data',        name: 'Live-updating data',         filter: false },
  { id: 'sponsor-rotation', name: 'Sponsor rotation',           filter: false },
  { id: 'pause-resume',     name: 'Pause / resume',             filter: false },
];

// ── Facet F: placement ──────────────────────────────────────────────────────

export type PlacementId =
  | 'full-screen' | 'lower' | 'upper' | 'left' | 'right' | 'center' | 'corner'
  | 'side-panel' | 'background' | 'frame';

export const PLACEMENT_LABELS: Record<PlacementId, string> = {
  'full-screen': 'Full screen', lower: 'Lower screen', upper: 'Upper screen',
  left: 'Left', right: 'Right', center: 'Center', corner: 'Corner',
  'side-panel': 'Side panel', background: 'Background', frame: 'Frame',
};

/** Zone-movable coverage classes match every placement they can reach; the fixed classes
 *  answer for themselves. Proposal §8. */
export const COVERAGE_PLACEMENTS: Record<CoverageClass, PlacementId[]> = {
  overlay: ['lower', 'upper', 'left', 'right', 'center', 'corner'],
  strip: ['lower', 'upper'],
  panel: ['center', 'left', 'right', 'lower', 'upper', 'side-panel'],
  full: ['full-screen'],
  frame: ['frame', 'background'],
};

// ── Facet G: visual style ───────────────────────────────────────────────────

/** User-facing labels for the style families — the filter IS the families
 *  (proposal §9); the brief's adjectives are search aliases below. Editorial and
 *  cinematic became real families (their own FAMILY_TOKENS row, palettes, and lower-third
 *  designs), so they leave minimal's and glass's labels and take chips of their own. */
export const STYLE_FAMILY_LABELS: Record<StyleTag, string> = {
  minimal: 'Minimal & clean',
  editorial: 'Editorial & print',
  cinematic: 'Cinematic & documentary',
  sport: 'Sport & energetic',
  glass: 'Elegant & glass',
  noacg: 'Bold & on-air',
};

// ── Facet H: motion ─────────────────────────────────────────────────────────

export type MotionIntensity = 'none' | 'subtle' | 'medium' | 'strong';

export const INTENSITY_LABELS: Record<MotionIntensity, string> = {
  none: 'None', subtle: 'Subtle', medium: 'Medium', strong: 'Strong',
};

export type MotionStyleId =
  | 'reveal' | 'wipe' | 'slide' | 'pop' | 'scale' | 'blur' | 'roll' | 'loop' | 'flip';

export const MOTION_STYLE_LABELS: Record<MotionStyleId, string> = {
  reveal: 'Reveal', wipe: 'Wipe', slide: 'Slide', pop: 'Pop', scale: 'Scale',
  blur: 'Blur', roll: 'Roll', loop: 'Loop', flip: 'Flip',
};

export interface PresetMotion {
  intensity: MotionIntensity;
  styles: MotionStyleId[];
}

/** The one declared motion table (proposal §10): every preset's intensity + style tags.
 *  A template's motion facet derives from its offered presets; its default intensity is
 *  its default preset's. Kept total over AnimPresetId so adding a preset without a row is
 *  a type error, not silent metadata rot. */
export const PRESET_MOTION: Record<AnimPresetId, PresetMotion> = {
  'slide-up':          { intensity: 'medium', styles: ['slide'] },
  'slide-down':        { intensity: 'medium', styles: ['slide'] },
  'slide-left':        { intensity: 'medium', styles: ['slide'] },
  'slide-right':       { intensity: 'medium', styles: ['slide'] },
  'line-reveal':       { intensity: 'subtle', styles: ['reveal'] },
  'mask-wipe':         { intensity: 'medium', styles: ['wipe', 'reveal'] },
  'pop-spring':        { intensity: 'medium', styles: ['pop', 'scale'] },
  'snap-stinger':      { intensity: 'strong', styles: ['slide'] },
  'blur-in':           { intensity: 'subtle', styles: ['blur'] },
  'fade':              { intensity: 'subtle', styles: ['reveal'] },
  'flip-3d':           { intensity: 'strong', styles: ['flip'] },
  'credits-roll':      { intensity: 'subtle', styles: ['roll'] },
  'credits-pages':     { intensity: 'subtle', styles: ['reveal'] },
  'credits-crawl':     { intensity: 'subtle', styles: ['roll', 'loop'] },
  'ticker-marquee':    { intensity: 'subtle', styles: ['loop', 'slide'] },
  'ticker-flip':       { intensity: 'medium', styles: ['flip', 'loop'] },
  'ticker-rotate':     { intensity: 'medium', styles: ['loop', 'reveal'] },
  'hold-loop':         { intensity: 'subtle', styles: ['loop', 'scale'] },
  'timer-run':         { intensity: 'medium', styles: ['pop'] },
  'timer-line-reveal': { intensity: 'subtle', styles: ['reveal'] },
  'vs-slam':           { intensity: 'strong', styles: ['slide', 'pop'] },
  'vs-glide':          { intensity: 'medium', styles: ['slide'] },
  'count-up':          { intensity: 'medium', styles: ['reveal'] },
  'bars-grow':         { intensity: 'medium', styles: ['scale', 'reveal'] },
  'ring-fill':         { intensity: 'medium', styles: ['reveal'] },
  'rows-cascade':      { intensity: 'medium', styles: ['reveal', 'slide'] },
  'quiz-reveal':       { intensity: 'medium', styles: ['reveal', 'pop'] },
  'design-fade':       { intensity: 'subtle', styles: ['reveal'] },
  'design-slide':      { intensity: 'medium', styles: ['slide'] },
  'design-pop':        { intensity: 'medium', styles: ['pop', 'scale'] },
  'design-blur':       { intensity: 'subtle', styles: ['blur'] },
  'goal-ring':         { intensity: 'medium', styles: ['reveal'] },
  'milestone-run':     { intensity: 'medium', styles: ['reveal', 'pop'] },
  'frame-draw':        { intensity: 'medium', styles: ['reveal'] },
  'frame-fade':        { intensity: 'subtle', styles: ['reveal'] },
  'frame-slide':       { intensity: 'medium', styles: ['slide'] },
  'transition-slam':   { intensity: 'strong', styles: ['slide', 'pop'] },
  'transition-wipe':   { intensity: 'strong', styles: ['wipe'] },
  'transition-sweep':  { intensity: 'strong', styles: ['slide', 'wipe'] },
  'comp-rise':         { intensity: 'medium', styles: ['slide'] },
  'comp-impact':       { intensity: 'strong', styles: ['pop', 'slide'] },
  'comp-bloom':        { intensity: 'medium', styles: ['scale', 'pop'] },
  'comp-cascade':      { intensity: 'medium', styles: ['reveal', 'slide'] },
  'poll-open':         { intensity: 'medium', styles: ['scale', 'reveal'] },
  'audience-rise':     { intensity: 'medium', styles: ['slide'] },
  'audience-slide':    { intensity: 'medium', styles: ['slide'] },
};

// ── Complexity ──────────────────────────────────────────────────────────────

export type Complexity = 'simple' | 'standard' | 'advanced';

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  simple: 'Simple', standard: 'Standard', advanced: 'Advanced',
};

// ── Search aliases ──────────────────────────────────────────────────────────

/** What an alias expands to. An alias may resolve to a SET of values across facets —
 *  when a producer's word legitimately spans categories, search fans out rather than
 *  forcing the taxonomy's internal boundary onto the user (proposal §14). */
export interface AliasTargets {
  categories?: GraphicCategoryId[];
  /** Controlled subtype ids within the categories above — lets a precise word ("sponsor",
   *  "station id") rank the right SUBTYPE rather than boosting a whole category equally. */
  subtypes?: string[];
  structures?: StructureId[];
  formats?: ProgrammeFormatId[];
  families?: ProgrammeFamilyId[];
  styles?: StyleTag[];
}

/** Controlled synonym table, English-first (per-locale sets slot in later). Keys are
 *  matched as whole phrases before tokenizing. Grown from observation, reviewed like
 *  config; every target must be an existing facet id — the table cannot invent taxonomy. */
export const ALIASES: Record<string, AliasTargets> = {
  // graphic-category vocabulary
  'name graphic': { categories: ['lower-third'] },
  'name tag': { categories: ['lower-third'] },
  'nameplate': { categories: ['lower-third'] },
  'strap': { categories: ['lower-third'] },
  'super': { categories: ['lower-third'] },
  'chyron': { categories: ['lower-third'] },
  'l3': { categories: ['lower-third'] },
  'corner logo': { categories: ['bug'] },
  'watermark': { categories: ['bug'], subtypes: ['logo-only', 'station'] },
  'dog': { categories: ['bug'], subtypes: ['logo-only', 'station'] },
  'station id': { categories: ['bug'], subtypes: ['station'] },
  'ident': { categories: ['bug'], subtypes: ['station', 'event'] },
  'handle': { categories: ['bug'], subtypes: ['social-handle'] },
  'viewer question': { categories: ['question'] },
  'chat question': { categories: ['question'] },
  'ama': { categories: ['question'], formats: ['live-qa'] },
  'verse': { categories: ['quote'] },
  'scripture': { categories: ['quote'] },
  'bible': { categories: ['quote'] },
  'score': { categories: ['scoreboard'] },
  'scorebug': { categories: ['scoreboard'] },
  'score box': { categories: ['scoreboard'] },
  'standings': { categories: ['results'] },
  'league table': { categories: ['results'] },
  'leaderboard': { categories: ['results'] },
  'bracket': { categories: ['results'] },
  'clock': { categories: ['timer'] },
  'stopwatch': { categories: ['timer'] },
  'timer': { categories: ['timer'] },
  'countdown': { categories: ['timer', 'holding'] },
  'crawl': { categories: ['ticker'] },
  'marquee': { categories: ['ticker'] },
  'headline bar': { categories: ['ticker'] },
  'breaking': { categories: ['alert', 'ticker'] },
  'breaking news': { categories: ['alert', 'ticker'] },
  'agenda': { categories: ['list'] },
  'schedule': { categories: ['list'] },
  'running order': { categories: ['list'] },
  'rundown': { categories: ['list'] },
  'lineup': { categories: ['list'] },
  'vote': { categories: ['poll-quiz'] },
  'voting': { categories: ['poll-quiz'] },
  'poll': { categories: ['poll-quiz'] },
  'survey': { categories: ['poll-quiz'] },
  'quiz': { categories: ['poll-quiz'] },
  'donation bar': { categories: ['progress'] },
  'goal bar': { categories: ['progress'] },
  'fundraising meter': { categories: ['progress'] },
  'sub goal': { categories: ['progress'] },
  'price card': { categories: ['product'] },
  'offer': { categories: ['product'] },
  'deal': { categories: ['product'] },
  'sale': { categories: ['product'] },
  'qr': { categories: ['cta'] },
  'link card': { categories: ['cta'] },
  'sponsor': { categories: ['bug', 'sponsor'], subtypes: ['sponsor'] },
  'starting soon': { categories: ['holding'] },
  'brb': { categories: ['holding'] },
  'be right back': { categories: ['holding'] },
  'intermission': { categories: ['holding'] },
  'stream ending': { categories: ['holding'] },
  'outro': { categories: ['credits', 'holding'] },
  'roll': { categories: ['credits'] },
  'credit roll': { categories: ['credits'] },
  'lyrics': { categories: ['caption'] },
  'surtitles': { categories: ['caption'] },
  'subtitles': { categories: ['caption'] },
  'versus': { categories: ['reveal'] },
  'vs': { categories: ['reveal'] },
  'head to head': { categories: ['reveal'] },
  'matchup': { categories: ['reveal'] },
  'face-off': { categories: ['reveal'] },
  'award': { categories: ['reveal', 'results', 'bug'], subtypes: ['award'] },
  'winner': { categories: ['reveal', 'results'], subtypes: ['winner'] },
  'trophy': { categories: ['reveal', 'bug'], subtypes: ['award'] },
  'stinger': { categories: ['transition'] },
  'wipe': { categories: ['transition'] },
  // structure vocabulary
  'two person': { structures: ['two-person'] },
  'double': { structures: ['two-person'] },
  'dual': { structures: ['two-person'] },
  'interview strap': { structures: ['two-person'], categories: ['lower-third'] },
  // programme vocabulary
  'church': { formats: ['church-service'] },
  'worship': { formats: ['church-service'] },
  'sermon': { formats: ['church-service'] },
  'football': { families: ['sports'] },
  'soccer': { families: ['sports'] },
  'basketball': { families: ['sports'] },
  'hockey': { families: ['sports'] },
  'handball': { families: ['sports'] },
  'twitch': { families: ['creator'] },
  'streamer': { families: ['creator'] },
  'obs': { families: ['creator'] },
  // style adjectives → the style families (proposal §9). Editorial and cinematic are now
  // real families, so their adjectives point at them; the neighbouring looks still fan out
  // to the family that best carries them.
  'corporate': { styles: ['minimal', 'editorial'] },
  'editorial': { styles: ['editorial'] },
  'magazine': { styles: ['editorial'] },
  'newsroom': { styles: ['editorial', 'minimal'] },
  'masthead': { styles: ['editorial'] },
  'broadcast news': { styles: ['editorial', 'minimal'] },
  'flat': { styles: ['minimal'] },
  'light': { styles: ['minimal'] },
  'esports look': { styles: ['sport'] },
  'energetic': { styles: ['sport'] },
  'bold': { styles: ['sport', 'noacg'] },
  'luxury': { styles: ['glass'] },
  'elegant': { styles: ['glass'] },
  'cinematic': { styles: ['cinematic'] },
  'documentary': { styles: ['cinematic'] },
  'film': { styles: ['cinematic'] },
  'title card': { styles: ['cinematic'] },
  'futuristic': { styles: ['glass'] },
  'tech': { styles: ['glass'] },
  'glass': { styles: ['glass'] },
  'playful': { styles: ['noacg'] },
  'youthful': { styles: ['noacg'] },
};
