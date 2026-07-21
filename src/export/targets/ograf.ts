// OGraf export: packages the template as an EBU OGraf v1 Graphic — a manifest
// (<slug>.ograf.json) plus a JS entry point (graphic.mjs) exporting a Web Component that
// wraps the template's own play()/stop()/update() runtime. Spec:
// https://ograf.ebu.io/v1/specification/docs/Specification.html
// The generated .mjs stays readable, mirroring the 1:1 philosophy of the SPX exporters.

import JSZip from 'jszip';
import gsapSource from '../../assets/gsap.min.js?raw';
import lottieSource from '../../assets/lottie.min.js?raw';
import { inlineAssetRefs, isLottieAsset, parseDataUrl } from '../../assets/assetUtils';
import { templateUsesLottie } from '../../assets/lottieSupport';
import { parseAnimData } from '../../blocks/animData';
import { eventButtons, type ControlButton } from '../../control/controlModel';
import type { Ftype, SpxField, SpxTemplate } from '../../model/types';
import { addReferencedFonts, slug } from '../common';
import type { ExportTarget } from '../registry';

export const OGRAF_SCHEMA_URL = 'https://ograf.ebu.io/v1/specification/json-schemas/graphics/schema.json';

// ── Manifest ─────────────────────────────────────────────────────────────────

/** Map an SPX ftype to the JSON-schema type of the OGraf data property. */
function schemaType(ftype: Ftype): 'string' | 'number' | 'boolean' {
  if (ftype === 'number') return 'number';
  if (ftype === 'checkbox') return 'boolean';
  return 'string';
}

/** Build the OGraf data schema from the template's DataFields (one property per fN). */
function dataSchema(fields: SpxField[]) {
  const properties: Record<string, unknown> = {};
  for (const f of fields) {
    if (!['textfield', 'textarea', 'number', 'dropdown', 'filelist', 'checkbox', 'color', 'hidden'].includes(f.ftype)) continue;
    properties[f.field] = {
      type: schemaType(f.ftype),
      title: f.title || f.field,
      default: f.ftype === 'number' ? Number(f.value) || 0 : f.value,
      ...(f.ftype === 'dropdown' && f.items?.length ? { enum: f.items.map((i) => i.value) } : {}),
      ...(f.ftype === 'hidden' ? { hidden: true } : {}),
    };
  }
  return { type: 'object', properties };
}

/**
 * The state machine's operator events as OGraf custom actions (spec §2 Action). The list is
 * the SAME merge every control surface renders (controlModel eventButtons — declared labels
 * from `machine.controls`, plain buttons for undeclared events), so an OGraf host offers
 * exactly what the Control tab does. An event's payload fields become the action's payload
 * schema, titled from the template's own fields.
 */
function customActions(template: SpxTemplate): Array<Record<string, unknown>> {
  const titles = new Map(template.fields.map((f) => [f.field, f.title || f.field]));
  return eventButtons(template.js).map((button: ControlButton) => ({
    id: button.event,
    name: button.label,
    ...(button.section ? { description: `${button.section} — fires the "${button.event}" event.` } : {}),
    ...(button.payload?.length
      ? {
          schema: {
            type: 'object',
            properties: Object.fromEntries(
              button.payload.map((key) => [key, { type: 'string', title: titles.get(key) ?? key }]),
            ),
          },
        }
      : {}),
  }));
}

/** The .ograf.json manifest (required fields per spec §2 + the field-driven data schema). */
export function buildOgrafManifest(template: SpxTemplate): Record<string, unknown> {
  const stepCount = Math.max(1, Number(template.settings.steps) || 1);
  const actions = customActions(template);
  return {
    $schema: OGRAF_SCHEMA_URL,
    id: slug(template.name), // slugs never contain "/" (spec forbids it in ids)
    version: '1.0.0',
    name: template.name,
    description: template.settings.description || template.name,
    main: 'graphic.mjs',
    supportsRealTime: true,
    supportsNonRealTime: false,
    schema: dataSchema(template.fields),
    stepCount,
    ...(actions.length ? { customActions: actions } : {}),
  };
}

/** Deterministic self-check on the manifest we just built (spec §6 requirements). */
export function validateOgrafManifest(manifest: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (manifest.$schema !== OGRAF_SCHEMA_URL) errors.push('$schema must be the exact OGraf v1 schema URL.');
  for (const key of ['id', 'name', 'main']) {
    if (typeof manifest[key] !== 'string' || !(manifest[key] as string).length) errors.push(`Missing required field "${key}".`);
  }
  if (typeof manifest.id === 'string' && manifest.id.includes('/')) errors.push('The id must not contain "/".');
  if (typeof manifest.supportsRealTime !== 'boolean') errors.push('supportsRealTime must be a boolean.');
  if (typeof manifest.supportsNonRealTime !== 'boolean') errors.push('supportsNonRealTime must be a boolean.');
  return errors;
}

// ── The Web Component entry point ────────────────────────────────────────────

/** The template's visible markup: everything inside <body> (scripts stripped). */
function bodyContent(html: string): string {
  const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const body = m ? m[1] : html;
  return body.replace(/<script\b[\s\S]*?<\/script>/gi, '').trim();
}

/** The markup embedded in graphic.mjs is injected into the HOST page, whose base URL is
 *  the renderer's — not the package folder — so a relative data-lottie path would resolve
 *  against the wrong place. Inline the Lottie JSON assets as data: URLs at export time;
 *  the template's bootstrap decodes them without any network call. (Image/font refs
 *  resolve relative to the host page too, but OGraf hosts conventionally serve the
 *  package's folder as the page context; the Lottie inline removes the one hard failure.) */
function templateHtmlForModule(template: SpxTemplate): string {
  const lottieAssets = template.assets.filter((a) => isLottieAsset(a.path));
  return lottieAssets.length ? inlineAssetRefs(template.html, lottieAssets) : template.html;
}

/** graphic.mjs: a readable Web Component wrapping the template's own runtime. */
function graphicModule(template: SpxTemplate): string {
  const stepCount = Math.max(1, Number(template.settings.steps) || 1);
  const machine = parseAnimData(template.js)?.machine;
  // Each state group's off-air (initial) state, so the wrapper can tell when a press took the
  // graphic off air by itself. Empty for a template with no machine — such a graphic never
  // reports off air here and behaves exactly as before.
  const offStates = Object.fromEntries((machine?.groups ?? []).map((g) => [g.id, g.initial]));
  // The main group's walk + id and the manifest's custom-action ids: what customAction()
  // accepts, and how the wrapper re-derives its step pointer after an event moved the
  // machine (an event may land ON a waypoint — the pointer must follow the graphic).
  const mainGroup = machine?.groups[0] ?? null;
  const mainGroupId = mainGroup?.id ?? null;
  const mainPath = mainGroup?.defaultPath ?? [];
  const actionIds = customActions(template).map((a) => a.id as string);
  const usesLottie = templateUsesLottie(template);
  const ensureLottieFn = usesLottie
    ? `

// The bundled Lottie player, loaded the same way (this graphic uses a Lottie animation).
function ensureLottie() {
  if (window.lottie) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const prevDefine = window.define;
    window.define = undefined;
    const restore = () => { window.define = prevDefine; };
    const s = document.createElement('script');
    s.src = new URL('./lib/lottie.min.js', import.meta.url).href;
    s.onload = () => { restore(); resolve(undefined); };
    s.onerror = () => { restore(); reject(new Error('Could not load lib/lottie.min.js')); };
    document.head.appendChild(s);
  });
}`
    : '';
  return `// ${template.name} — OGraf v1 Graphic, generated by NoaCG Studio.
// The original template runtime (play/stop/update/next) is embedded unchanged inside
// initTemplate(); this Web Component maps the OGraf actions onto it.

// GSAP ships as a classic (UMD) script, so it is loaded via a <script> tag — importing
// it as an ES module would leave the global \`gsap\` undefined. If the HOST page has an
// AMD loader (window.define.amd — e.g. anything embedding Monaco), the UMD would register
// there instead of on window, so define is hidden while the script executes.
function ensureGsap() {
  if (window.gsap) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const prevDefine = window.define;
    window.define = undefined;
    const restore = () => { window.define = prevDefine; };
    const s = document.createElement('script');
    s.src = new URL('./lib/gsap.min.js', import.meta.url).href;
    s.onload = () => { restore(); resolve(undefined); };
    s.onerror = () => { restore(); reject(new Error('Could not load lib/gsap.min.js')); };
    document.head.appendChild(s);
  });
}${ensureLottieFn}

const TEMPLATE_HTML = ${JSON.stringify(bodyContent(templateHtmlForModule(template)))};

const TEMPLATE_CSS = ${JSON.stringify(template.css)};

// Each state group's off-air state. Empty when this graphic has no state machine.
const OFF_STATES = ${JSON.stringify(offStates)};

// The machine's custom-action vocabulary (the manifest's customActions[].id list), plus the
// main group's walk — how the wrapper re-derives its step pointer after an event moved the
// machine. All empty when this graphic has no state machine.
const CUSTOM_ACTION_IDS = ${JSON.stringify(actionIds)};
const MAIN_GROUP_ID = ${JSON.stringify(mainGroupId)};
const MAIN_PATH = ${JSON.stringify(mainPath)};

// initTemplate(): runs the template's own JS AFTER the markup is in the DOM and returns
// its runtime entry points. The code inside is exactly what the editor shows.
function initTemplate() {
${template.js.replace(/^/gm, '  ')}

  // The machine globals ride along when the template has a state machine, so the wrapper can
  // ASK where the graphic is instead of assuming its own step pointer stayed in step — and
  // DISPATCH the operator events the manifest declares as custom actions.
  return {
    play: play, stop: stop, update: update, next: next,
    machineState: (typeof noacgMachineState === 'function') ? noacgMachineState : null,
    dispatch: (typeof noacgDispatch === 'function') ? noacgDispatch : null
  };
}

class Graphic extends HTMLElement {
  async load(params) {
    await ensureGsap();${usesLottie ? '\n    await ensureLottie();' : ''}
    // Inject the template's style + markup into this element (light DOM: the template's
    // own getElementById lookups keep working exactly as in SPX).
    const style = document.createElement('style');
    style.textContent = TEMPLATE_CSS;
    this.appendChild(style);
    const holder = document.createElement('div');
    holder.innerHTML = TEMPLATE_HTML;
    this.appendChild(holder);

    this._runtime = initTemplate();
    this._step = -1; // not on air yet
    if (params && params.data) this._runtime.update(JSON.stringify(params.data));
    return { statusCode: 200 };
  }

  async dispose() {
    if (window.gsap) window.gsap.killTweensOf('*');
    this.innerHTML = '';
    this._runtime = null;
    return { statusCode: 200 };
  }

  async updateAction(params) {
    this._runtime.update(JSON.stringify(params.data || {}));
    return { statusCode: 200 };
  }

  async playAction(params) {
    const stepCount = ${stepCount};
    const target = params && params.goto != null && params.goto >= 0
      ? params.goto
      : this._step + ((params && params.delta) != null ? params.delta : 1);
    if (this._step < 0) {
      // First play: run the entrance (which shows step 0).
      this._runtime.play();
      this._step = 0;
    }
    // Advance through the remaining steps with the template's next(). next() RETURNS what it
    // started, or null when there was nothing to advance to — a state machine can decline the
    // move (off the default path, or nothing left but the exit). Our pointer must not run
    // ahead of the graphic, so a refusal ends the walk.
    while (this._step < target && this._step < stepCount - 1) {
      if (!this._runtime.next()) break;
      this._step += 1;
      // A machine may author the arrow INTO its exit, in which case that press took the
      // graphic off air and reset its own pointers. OGraf reports no current step off air.
      if (this._offAir()) {
        this._step = -1;
        return { statusCode: 200, currentStep: undefined };
      }
    }
    if (target >= stepCount) {
      // Past the last step = go to the end (animate out, per the OGraf step model).
      this._runtime.stop();
      this._step = -1;
      return { statusCode: 200, currentStep: undefined };
    }
    return { statusCode: 200, currentStep: this._step };
  }

  // True when the graphic's state machine says every group is back at its initial state.
  // Templates without a machine never report off air here — their behaviour is unchanged.
  _offAir() {
    if (!this._runtime || !this._runtime.machineState) return false;
    const state = this._runtime.machineState();
    return Object.keys(state.groups).every(function (id) { return state.groups[id] === OFF_STATES[id]; });
  }

  async stopAction() {
    this._runtime.stop();
    this._step = -1;
    return { statusCode: 200 };
  }

  async customAction(params) {
    const id = params && params.id;
    if (!this._runtime || !this._runtime.dispatch || CUSTOM_ACTION_IDS.indexOf(id) === -1) {
      return { statusCode: 400, statusMessage: 'This graphic defines no custom action "' + id + '".' };
    }
    // Fire the operator event through the template's own SERIAL queue. The payload is the
    // flat {field: value} map the action's schema declares — applied only if the machine
    // accepts the event (the structural guard), exactly like every other control surface.
    this._runtime.dispatch(id, (params && params.payload) || undefined);
    // The event may have moved the machine — follow it. On the walk, the pointer becomes
    // that waypoint's index; off air (an arrow into the exit) it clears; a branch state
    // keeps the last on-path pointer (the walk resumes from there).
    if (this._runtime.machineState) {
      if (this._offAir()) {
        this._step = -1;
      } else if (MAIN_GROUP_ID) {
        const at = MAIN_PATH.indexOf(this._runtime.machineState().groups[MAIN_GROUP_ID]);
        if (at !== -1) this._step = at;
      }
    }
    return { statusCode: 200, currentStep: this._step >= 0 ? this._step : undefined };
  }
}

export default Graphic;
`;
}

// ── The package builder (shared with the LiveOS target) ─────────────────────

/**
 * Write the complete OGraf Graphic package (manifest, graphic.mjs, bundled GSAP, fonts,
 * assets — everything except a README) into `root`. Validates the manifest first and
 * throws on errors, so every target built on this package inherits the gate. The LiveOS
 * target reuses this verbatim: LiveOS's HTML5 graphics engine is OGraf-compliant.
 */
export async function addOgrafPackage(root: JSZip, template: SpxTemplate): Promise<void> {
  const manifest = buildOgrafManifest(template);
  const errors = validateOgrafManifest(manifest);
  if (errors.length) throw new Error(`OGraf manifest invalid: ${errors.join(' ')}`);

  root.file(`${slug(template.name)}.ograf.json`, JSON.stringify(manifest, null, 2));
  root.file('graphic.mjs', graphicModule(template));
  root.file('lib/gsap.min.js', gsapSource);
  if (templateUsesLottie(template)) root.file('lib/lottie.min.js', lottieSource);
  await addReferencedFonts(root, template);
  for (const asset of template.assets) {
    if (typeof asset.data === 'string') {
      const parsed = parseDataUrl(asset.data);
      if (parsed) root.file(asset.path, parsed.base64, { base64: true });
      else root.file(asset.path, asset.data);
    } else {
      root.file(asset.path, asset.data);
    }
  }
}

// ── The target ────────────────────────────────────────────────────────────────

export const ografTarget: ExportTarget = {
  id: 'ograf',
  label: 'OGraf (EBU) export',
  description: 'An OGraf v1 Graphic: manifest + Web Component wrapping this template — for OGraf-compatible renderers.',
  successMessage: '✓ Exported. Load the unzipped folder in an OGraf-compatible renderer.',
  async build(template) {
    const zip = new JSZip();
    const root = zip.folder(slug(template.name))!;
    await addOgrafPackage(root, template);
    root.file(
      'README.md',
      `# ${template.name} — OGraf Graphic\n\nGenerated by NoaCG Studio.\n\n` +
        `Load the manifest (${slug(template.name)}.ograf.json) in any OGraf v1 compatible renderer.\n` +
        `Actions map to the embedded template runtime: load/updateAction → update(), playAction → play()/next(), stopAction → stop().\n` +
        `When the graphic carries a state machine, its operator events are declared as customActions in the manifest — customAction({id, payload}) fires them through the template's own serial event queue, payload applied only if the machine accepts the event.\n`,
    );
    return zip;
  },
};
