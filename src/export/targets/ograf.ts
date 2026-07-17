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

/** The .ograf.json manifest (required fields per spec §2 + the field-driven data schema). */
export function buildOgrafManifest(template: SpxTemplate): Record<string, unknown> {
  const stepCount = Math.max(1, Number(template.settings.steps) || 1);
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

// initTemplate(): runs the template's own JS AFTER the markup is in the DOM and returns
// its runtime entry points. The code inside is exactly what the editor shows.
function initTemplate() {
${template.js.replace(/^/gm, '  ')}

  return { play: play, stop: stop, update: update, next: next };
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
    // Advance through the remaining steps with the template's next().
    while (this._step < target && this._step < stepCount - 1) {
      this._runtime.next();
      this._step += 1;
    }
    if (target >= stepCount) {
      // Past the last step = go to the end (animate out, per the OGraf step model).
      this._runtime.stop();
      this._step = -1;
      return { statusCode: 200, currentStep: undefined };
    }
    return { statusCode: 200, currentStep: this._step };
  }

  async stopAction() {
    this._runtime.stop();
    this._step = -1;
    return { statusCode: 200 };
  }

  async customAction(params) {
    return { statusCode: 400, statusMessage: 'This graphic defines no custom action "' + (params && params.id) + '".' };
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
        `Actions map to the embedded template runtime: load/updateAction → update(), playAction → play()/next(), stopAction → stop().\n`,
    );
    return zip;
  },
};
