// The GRAPHIC TYPE contract (docs/GRAPHIC_TYPES.md).
//
// A type says WHAT a graphic is — its structure, its fields, its state groups and default
// path, and the events an operator can send it — independently of what it looks like. A
// design says what it looks like. Phase 3's catalog is types × themes, Phase 4's node editor
// edits any type's graph, and Phase 5 generates a control page from the machine; all three
// need the type to be the thing that knows.
//
// A type is a DECLARATION, not a second way to build a template. `variantsFromType` compiles
// one into ordinary TemplateVariants that go through the category's existing assembler, so
// `variant.create(options) -> SpxTemplate` remains the single contract the wizard, the AI, the
// sweeps and every spec already speak.
//
// THE RULE THAT KEEPS THIS SMALL: persist a machine only when the derived one is wrong.
// deriveMachine already gives every template a correct one-group linear machine, so a type
// with no branches, no parallel groups and no event overrides compiles to NO machine key and
// emits exactly what it emitted before. Most types are in that class, and that is the design
// working rather than a shortcut.

import type { AnimData, AnimGroup, AnimState, AnimStep, AnimTransition, AnimLayerTracks } from '../../blocks/animData';
import { isAnimData, parseAnimData } from '../../blocks/animData';
import { deriveMachine, MAIN_GROUP_ID, spxSteps } from '../../blocks/animMachine';
import { replaceDefinitionInHtml } from '../../model/spxDefinition';
import { writeAnimData } from '../shared/animRuntime';
import type { FieldKind, FieldOption } from '../../model/fieldModel';
import type { SpxField, SpxTemplate } from '../../model/types';
import type { TemplatePart } from '../../model/structure';
import type { StyleTag } from '../../model/fonts';
import type {
  AnimPresetId,
  LineSpec,
  LogoSupport,
  Palette,
  ResolvedOptions,
  TemplateCategory,
  TemplateVariant,
  Zone9,
} from '../../model/wizard';

// ── Structure ────────────────────────────────────────────────────────────────

/** One element a type PROMISES its designs will carry. The machine, the control events and
 *  (later) a theme name parts logically, so none of them has to know a design's CSS. */
export interface TypePart {
  /** The logical name everything else references: 'accent', 'rows', 'optionA'. */
  id: string;
  /** A single-token selector, the model/structure.ts registry rule. */
  selector: string;
  kind: TemplatePart['kind'];
  /** A required part missing from a design is a compile error, not a silent no-op. */
  required: boolean;
}

export interface TypeStructure {
  /** The class prefix contract ('lower-third'); what detectPrefix keys off. */
  prefix: string;
  /** The category whose assembler and design builders this type reuses. */
  category: TemplateCategory;
  parts: TypePart[];
}

// ── Fields ───────────────────────────────────────────────────────────────────

/**
 * A field, named LOGICALLY. `fN` ids are positional and get assigned at compile time, so a
 * type never writes one down and inserting a field renumbers nothing it references.
 *
 * `role` routes the field into the plumbing that already exists for its shape:
 *  - `line`   a visible text line (fieldsFromOptions numbers these f0..n-1, so they compile first);
 *  - `data`   an operator value with its own element (a score, a rows source);
 *  - `hidden` input-only, in a display:none holder (a countdown's minutes);
 *  - `logo`   the image slot (shared/logoSlot.ts owns the markup, and computes its id from the
 *             count of everything else — so these compile LAST).
 */
export interface TypeField {
  key: string;
  label: string;
  kind: FieldKind;
  value: string;
  role: 'line' | 'data' | 'hidden' | 'logo';
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
}

/** SPX ftype for a field kind. The broadcast field policy (src/templates/CLAUDE.md) keeps
 *  dropdown/checkbox/color for genuinely constrained choices — a type opting into one is
 *  making that claim deliberately. */
function ftypeFor(field: TypeField): SpxField['ftype'] {
  if (field.role === 'hidden') return 'hidden';
  switch (field.kind) {
    case 'lines': return 'textarea';
    case 'number': return 'number';
    case 'image': return 'filelist';
    case 'select': return 'dropdown';
    case 'toggle': return 'checkbox';
    case 'color': return 'color';
    default: return 'textfield';
  }
}

/**
 * Compile a type's fields to SPX DataFields, assigning f0..fN in declaration order. Throws
 * when the declaration order would desync those ids from the assembler that will emit them —
 * a type is our own code, so a wrong order is a bug to fail on, not a runtime surprise.
 */
export function typeFieldsToSpx(fields: TypeField[]): SpxField[] {
  const lastLine = fields.map((f) => f.role).lastIndexOf('line');
  const firstNonLine = fields.findIndex((f) => f.role !== 'line');
  if (lastLine >= 0 && firstNonLine >= 0 && firstNonLine < lastLine) {
    throw new Error('GraphicType: every `line` field must come before the others (fieldsFromOptions numbers lines f0..n-1).');
  }
  const logoAt = fields.findIndex((f) => f.role === 'logo');
  if (logoAt >= 0 && logoAt !== fields.length - 1) {
    throw new Error('GraphicType: the `logo` field must be declared last (applyLogoSlot derives its id from the field count).');
  }
  return fields.map((field, i) => {
    const spx: SpxField = { field: `f${i}`, ftype: ftypeFor(field), title: field.label, value: field.value };
    if (field.kind === 'image') {
      spx.assetfolder = './images/';
      spx.extension = 'png';
    }
    if (field.options) spx.items = field.options.map((o) => ({ text: o.label, value: String(o.value) }));
    return spx;
  });
}

/** The `fN` id a logical key compiled to — what a control event's payload resolves through. */
export function fieldIdFor(fields: TypeField[], key: string): string | null {
  const at = fields.findIndex((f) => f.key === key);
  return at < 0 ? null : `f${at}`;
}

/** The type's line fields as wizard LineSpecs (the suggested-lines starting point).
 *  `samples` is the promoted design's own starting text, by logical key — see TypeDesign. */
export function typeLines(fields: TypeField[], samples?: Record<string, string>): LineSpec[] {
  return fields
    .filter((f) => f.role === 'line')
    .map((f) => ({ title: f.label, sample: samples?.[f.key] ?? f.value }));
}

// ── The machine ──────────────────────────────────────────────────────────────

/** A state's timeline, named in LOGICAL parts and with the ease declared by ROLE. `reveals`
 *  and `hides` are absent by construction: they are the ordered walk's mechanics and are
 *  invalid on an inline timeline, so a type simply cannot write one. */
export type TypeTimeline = Omit<AnimStep, 'layers' | 'reveals' | 'hides' | 'ease'> & {
  ease: 'in' | 'out';
  layers: Record<string, AnimLayerTracks>;
};

/** A waypoint on the derived default path, addressed by position (-1 = the exit) because a
 *  type cannot know the state ids deriveMachine will fold out of the step names. */
export interface WaypointRef {
  waypoint: number;
}

export type TypeEndpoint = string | WaypointRef;

export interface TypeEdge {
  from: TypeEndpoint;
  to: TypeEndpoint;
  trigger: 'operator' | 'timer';
  /** operator only. Never a reserved built-in ('play'/'stop'). */
  event?: string;
  /** timer only: speed-relative seconds after the from-state's entry timeline settles. */
  after?: number;
}

/** An off-path state. `timeline: null` is POSE-ONLY — entering it plays nothing. */
export interface TypeBranch {
  id: string;
  name?: string;
  timeline: TypeTimeline | null;
  edges: TypeEdge[];
}

/** A parallel group: a small independent graph with its own pointer. These are declared
 *  literally — nothing derives them, and the shape gate forbids them a default path. */
export interface TypeGroup {
  id: string;
  initial: string;
  states: TypeBranch[];
}

export interface TypeMachine {
  main?: {
    id?: string;
    /** The event on the arrow from waypoint i to i+1. Missing entries default to 'next'. */
    pathEvents?: string[];
    /** Author the arrow INTO the exit, so `next` alone takes the graphic off air. Default
     *  false = exact parity with a graphic that has no machine at all. */
    exitOnNext?: boolean;
    branches?: TypeBranch[];
  };
  parallel?: TypeGroup[];
}

// ── Control events ───────────────────────────────────────────────────────────

/** What Phase 5 turns into a button. It lives on the TYPE rather than on each transition
 *  because one event is often authored on several arrows (a quiz's `select` on three), and
 *  the label belongs to the event, not to any one arrow. */
export interface TypeControlEvent {
  event: string;
  label: string;
  order?: number;
  /** Groups buttons on a control surface ('Clock', 'Answer'). */
  section?: string;
  /** Logical field keys whose values RIDE this event, applied only if it is accepted. */
  payload?: string[];
  destructive?: boolean;
}

// ── The type ─────────────────────────────────────────────────────────────────

/** The wizard-facing capabilities a compiled variant carries. */
export interface TypeCapabilities {
  maxLines: number;
  logo: LogoSupport;
  animationPresets: AnimPresetId[];
  defaultZone: Zone9;
}

/** One look. Phase 2 ships one per type (the house theme); Phase 3 makes this array the
 *  types × themes matrix without the type shape changing. */
export interface TypeDesign {
  /** The catalog variant id this design ships as. Promoting an existing variant KEEPS its id. */
  id: string;
  name: string;
  description: string;
  styleTag: StyleTag;
  palette: Palette;
  fontId: string;
  /**
   * This design's own starting text, by the type's LOGICAL field key. A type declares one set
   * of field values, but a design is written around its own: the shot-clock countdown says
   * "SHOT CLOCK", not the type's "ROUND 1", and the stat card says "87%", not a poll question.
   * Without this a promoted design arrives in the wizard showing text it was never designed
   * around — which is what "promotion changes a design's identity, not what a user sees"
   * forbids.
   *
   * Unlike the theme-token override map, entries here are NOT conformance debt to be driven to
   * zero: a sample is supposed to suit its design. Only keys the design actually differs on
   * need listing; anything absent falls through to the type's value.
   */
  samples?: Record<string, string>;
  /** Build the template. A type reuses its category's existing assembler here — it never
   *  grows an assembly path of its own. */
  create(type: GraphicType, options?: Parameters<TemplateVariant['create']>[0]): SpxTemplate;
}

export interface GraphicType {
  id: string;
  name: string;
  description: string;
  /** How many of the 60 reference formats need this graphic — Phase 3's pack input. */
  frequency?: number;
  structure: TypeStructure;
  fields: TypeField[];
  machine: TypeMachine;
  controls: TypeControlEvent[];
  capabilities: TypeCapabilities;
  designs: TypeDesign[];
}

// ── Compiling the machine ────────────────────────────────────────────────────

const selectorFor = (type: GraphicType, part: string): string =>
  type.structure.parts.find((p) => p.id === part)?.selector ?? part;

/** Resolve a timeline's logical layer names to selectors. */
function resolveTimeline(type: GraphicType, tl: TypeTimeline, easeIn: string, easeOut: string): AnimStep {
  const layers: Record<string, AnimLayerTracks> = {};
  for (const [part, tracks] of Object.entries(tl.layers)) layers[selectorFor(type, part)] = tracks;
  const { ease, ...rest } = tl;
  return { ...rest, ease: ease === 'out' ? easeOut : easeIn, layers };
}

function resolveEndpoint(endpoint: TypeEndpoint, path: string[]): string {
  if (typeof endpoint === 'string') return endpoint;
  const at = endpoint.waypoint < 0 ? path.length + endpoint.waypoint : endpoint.waypoint;
  return path[at] ?? path[path.length - 1];
}

function toTransition(edge: TypeEdge, path: string[]): AnimTransition {
  const t: AnimTransition = {
    from: resolveEndpoint(edge.from, path),
    to: resolveEndpoint(edge.to, path),
    trigger: edge.trigger,
  };
  if (edge.event !== undefined) t.event = edge.event;
  if (edge.after !== undefined) t.after = edge.after;
  return t;
}

/**
 * Compile a type's machine declaration against the animation data the assembler produced.
 *
 * The main group's default path is DERIVED, never declared: its length must equal the step
 * count, and the step count depends on the preset, the line count and the steps flag, so any
 * literal path a type wrote down would be wrong for some options. We take deriveMachine's
 * answer — which is also what the runtime derives, so editor and playout agree by
 * construction — and then layer the type's declarations onto it.
 *
 * Returns null when the type added nothing, meaning the derived machine is already correct
 * and the template should carry no machine key at all.
 */
export function compileMachine(
  type: GraphicType,
  data: AnimData,
  ease: { easeIn: string; easeOut: string },
): AnimData['machine'] | null {
  const spec = type.machine;
  const branches = spec.main?.branches ?? [];
  const parallel = spec.parallel ?? [];
  const wantsMain = !!spec.main?.pathEvents?.length || !!spec.main?.exitOnNext || branches.length > 0;
  if (!wantsMain && parallel.length === 0) return null;

  const derived = deriveMachine(data);
  const main: AnimGroup = JSON.parse(JSON.stringify(derived.groups[0]));
  const path = main.defaultPath ?? [];
  if (spec.main?.id) main.id = spec.main.id;

  // Rename the walk's arrows to the type's own event vocabulary.
  const pathEvents = spec.main?.pathEvents ?? [];
  for (let i = 0; i < pathEvents.length; i++) {
    const [from, to] = [path[i], path[i + 1]];
    const edge = main.transitions.find((t) => t.from === from && t.to === to);
    if (edge && pathEvents[i]) edge.event = pathEvents[i];
  }

  // The arrow into the exit — deriveMachine deliberately omits it (stop() plays the exit), so
  // a type that wants `next` to take the graphic off air opts in here.
  if (spec.main?.exitOnNext && path.length >= 2) {
    const [from, to] = [path[path.length - 2], path[path.length - 1]];
    if (!main.transitions.some((t) => t.from === from && t.to === to)) {
      main.transitions.push({ from, to, trigger: 'operator', event: 'next' });
    }
  }

  for (const branch of branches) {
    const state: AnimState = { id: branch.id };
    if (branch.name) state.name = branch.name;
    if (branch.timeline) state.timeline = resolveTimeline(type, branch.timeline, ease.easeIn, ease.easeOut);
    main.states.push(state);
    for (const edge of branch.edges) main.transitions.push(toTransition(edge, path));
  }

  const groups: AnimGroup[] = [main];
  for (const group of parallel) {
    groups.push({
      id: group.id,
      initial: group.initial,
      states: group.states.map((s) => {
        const state: AnimState = { id: s.id };
        if (s.name) state.name = s.name;
        if (s.timeline) state.timeline = resolveTimeline(type, s.timeline, ease.easeIn, ease.easeOut);
        return state;
      }),
      transitions: group.states.flatMap((s) => s.edges.map((e) => toTransition(e, path))),
    });
  }
  return { groups };
}

/**
 * Attach a type's compiled machine to an assembled template.
 *
 * A promoted design's builder lives inside its category's closure, so the type creates the
 * template the ordinary way and the machine goes on afterwards. That is also why this is the
 * one mechanism for all types: it needs nothing exported from any category, and a type that
 * declares no machine gets its template back untouched, byte for byte.
 *
 * The easing comes from the data itself — the entrance step's curve and the exit step's — so a
 * branch state moves like the graphic it belongs to whatever the wizard picked.
 *
 * This THROWS on an off-shape result, deliberately unlike convertToDataRegion's quiet degrade.
 * That degrades because its input may be a hand-written region; here the input is our own
 * declaration compiled by our own code, and degrading would ship a graphic whose control page
 * has buttons that do nothing. Every catalog variant gets created by the bench spec, so a
 * broken type is a red build rather than a shipped surprise.
 */
export function attachMachine(type: GraphicType, template: SpxTemplate): SpxTemplate {
  const data = parseAnimData(template.js);
  if (!data) return template;
  const ease = {
    easeIn: data.steps[0]?.ease ?? 'power2.out',
    easeOut: data.steps[data.steps.length - 1]?.ease ?? 'power2.in',
  };
  const machine = compileMachine(type, data, ease);
  if (!machine) return template; // the derived machine is already right — persist nothing
  const next: AnimData = { ...data, machine };
  if (!isAnimData(next)) {
    throw new Error(`GraphicType "${type.id}": the compiled machine is off-shape — check its branches and parallel groups.`);
  }
  const js = writeAnimData(template.js, next);
  if (!js) throw new Error(`GraphicType "${type.id}": could not write the compiled machine into the template.`);
  const settings = { ...template.settings, steps: String(spxSteps(next)) };
  return {
    ...template,
    js,
    settings,
    html: replaceDefinitionInHtml(template.html, settings, template.fields),
  };
}

// ── Compiling to variants ────────────────────────────────────────────────────

/** Every part the type promised, checked against what the design actually emitted. */
export function missingParts(type: GraphicType, template: SpxTemplate): string[] {
  return type.structure.parts
    .filter((p) => p.required)
    .filter((p) => {
      const token = p.selector.slice(1);
      const re = p.selector.startsWith('#')
        ? new RegExp(`id="${token}"`)
        : new RegExp(`class="[^"]*\\b${token}\\b[^"]*"`);
      return !re.test(template.html) && !re.test(template.js);
    })
    .map((p) => `${p.id} (${p.selector})`);
}

/** Compile a type into the catalog variants its designs ship as. */
export function variantsFromType(type: GraphicType): TemplateVariant[] {
  return type.designs.map((design) => {
    const variant: TemplateVariant = {
      id: design.id,
      typeId: type.id,
      category: type.structure.category,
      name: design.name,
      styleTag: design.styleTag,
      description: design.description,
      maxLines: type.capabilities.maxLines,
      suggestedLines: typeLines(type.fields, design.samples),
      logo: type.capabilities.logo,
      animationPresets: type.capabilities.animationPresets,
      defaultPalette: design.palette,
      defaultFontId: design.fontId,
      defaultZone: type.capabilities.defaultZone,
      create(options) {
        const template = attachMachine(type, design.create(type, options));
        const missing = missingParts(type, template);
        if (missing.length > 0) {
          throw new Error(`GraphicType "${type.id}": design "${design.id}" is missing required parts: ${missing.join(', ')}.`);
        }
        return template;
      },
    };
    return variant;
  });
}

/** The main group's id for a type — what noacgMachineState() keys its pointer by. */
export function mainGroupId(type: GraphicType): string {
  return type.machine.main?.id ?? MAIN_GROUP_ID;
}

/** A type's field defaults as the sample values an assembler's options carry. */
export function typeOptionLines(type: GraphicType, o: ResolvedOptions): LineSpec[] {
  return o.lines.length > 0 ? o.lines : typeLines(type.fields);
}
