// Shared helpers for SPX exporters. Exporters transform the editor template into a packaged
// folder structure WITHOUT changing how the graphic behaves.

import type JSZip from 'jszip';
import gsapSource from '../assets/gsap.min.js?raw';
import lottieSource from '../assets/lottie.min.js?raw';
import { isFontAsset, parseDataUrl } from '../assets/assetUtils';
import { templateUsesLottie } from '../assets/lottieSupport';
import { fetchBundledFont, referencedFontFiles } from './bundledFonts';
import { FONT_LICENSE_NOTE } from '../model/fonts';
import type { SpxTemplate } from '../model/types';
import { controlChannelName } from '../control/controlModel';
import { controlReceiverScript } from '../control/receiverScript';
import { renderControlPanelHtml } from '../control/controlPanelHtml';
import { hasRealtimeControl, remoteControlConfig } from '../control/realtimeControl';

export { slug } from './slug';
import { slug } from './slug';

/**
 * Bundle any fonts the template references (url("fonts/<file>.woff2") in its CSS) into the zip.
 * The files live in public/fonts/ (served at /fonts/<file> in dev and production builds), so we
 * fetch them at export time and write them under fonts/ with the same relative path the CSS uses.
 */
export async function addReferencedFonts(zip: JSZip, template: SpxTemplate): Promise<void> {
  const unique = referencedFontFiles(template.css);
  // The licence has to follow the BYTES, not the stylesheet. Keying the whole function off the
  // CSS match alone meant a package could carry a font the regex had not seen — an imported
  // face written by the assets loop — and ship no FONT_LICENSES.md with it.
  const importedFonts = template.assets.filter((a) => isFontAsset(a.path));
  if (unique.length === 0 && importedFonts.length === 0) return;
  // Imported fonts already live in template.assets (written by the assets loop);
  // only the builder-bundled files need fetching from /fonts.
  const assetPaths = new Set(template.assets.map((a) => a.path));
  for (const file of unique) {
    if (assetPaths.has(`fonts/${file}`)) continue;
    const buffer = await fetchBundledFont(file);
    // A missing file leaves the reference dangling, but a FOLDER package can still be repaired
    // by dropping the font in by hand; the single-file inliner throws instead, because nothing
    // can be dropped in beside a one-file export.
    if (buffer) zip.file(`fonts/${file}`, buffer);
  }
  zip.file('FONT_LICENSES.md', FONT_LICENSE_NOTE);
}

/** Write the bundled GSAP, fonts, and any template assets into the zip (relative paths). */
export async function addSharedAssets(zip: JSZip, template: SpxTemplate): Promise<void> {
  zip.file('js/gsap.min.js', gsapSource);
  // The Lottie player ships only when the template uses it (its <head> tag references
  // js/lottie.min.js, mirroring the GSAP tag).
  if (templateUsesLottie(template)) zip.file('js/lottie.min.js', lottieSource);
  await addReferencedFonts(zip, template);
  for (const asset of template.assets) {
    if (typeof asset.data === 'string') {
      const parsed = parseDataUrl(asset.data);
      if (parsed) {
        // Decode the base64 data URL back into a real binary file.
        zip.file(asset.path, parsed.base64, { base64: true });
      } else {
        // Plain text asset (e.g. a stylesheet or SVG source).
        zip.file(asset.path, asset.data);
      }
    } else {
      // A Blob.
      zip.file(asset.path, asset.data);
    }
  }
}

/** Ensure the HTML references the external css/js/gsap files (Starter packaging). */
export function ensureExternalRefs(html: string): string {
  let out = html;
  const head = /<\/head>/i;
  if (!/href=["'](?:\.\/)?css\/template\.css["']/i.test(out) && head.test(out)) {
    out = out.replace(head, `  <link rel="stylesheet" href="css/template.css" />\n</head>`);
  }
  if (!/src=["'](?:\.\/)?js\/gsap\.min\.js["']/i.test(out) && head.test(out)) {
    out = out.replace(head, `  <script src="js/gsap.min.js"></script>\n</head>`);
  }
  if (!/src=["'](?:\.\/)?js\/template\.js["']/i.test(out) && head.test(out)) {
    out = out.replace(head, `  <script src="js/template.js"></script>\n</head>`);
  }
  return out;
}

/**
 * Inject the control receiver before </body> so a standalone control panel on the same
 * machine can drive the graphic live (BroadcastChannel). SPX/CasparCG still call the
 * globals directly; this only adds a listener. No-op when there is no </body>.
 */
export function injectControlReceiver(html: string, template: SpxTemplate): string {
  const block = controlReceiverScript(template.name, controlChannelName(template.name));
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${block}\n</body>`) : html + block;
}

/** Bundle the generated controlpanel.html next to the graphic. When the graphic has the remote-
 *  control block, the panel also gets the Supabase Realtime send path (same project + topic). */
export function addControlPanel(root: JSZip, template: SpxTemplate): void {
  const remote = hasRealtimeControl(template.js) ? remoteControlConfig(template.name) : null;
  root.file('controlpanel.html', renderControlPanelHtml(template, remote));
}

/** A short README explaining how to deploy the package in SPX. */
export function spxReadme(template: SpxTemplate): string {
  return `# ${template.name} — SPX template

Generated by NoaCG Studio.

## Install
Extract the zip into your SPX / CasparCG templates folder — it already contains the
project folder, so you get:

    [TemplatesFolder]/${slug(template.name)}/index.html
    [TemplatesFolder]/${slug(template.name)}/images/...

(For SPX that is typically ASSETS/templates/<company>/${slug(template.name)}/.)
Then select the template in an SPX rundown.

## Files
- index.html      The template (loads css/js below).
- css/template.css  Styles.
- js/template.js    Runtime: play(), stop(), update(data).
- js/gsap.min.js    Bundled GSAP animation library (no internet required).
${templateUsesLottie(template) ? '- js/lottie.min.js  Bundled Lottie player (MIT) — included because this graphic uses a Lottie animation.\n' : ''}${template.assets.length ? '- images/...        Images used by the template (image fields list this folder).\n' : ''}- controlpanel.html An operator page auto-built from the fields (see below).

## Data fields
${template.fields.map((f) => `- ${f.field} (${f.ftype}): ${f.title}`).join('\n') || '- (none)'}

## Operating it live (controlpanel.html)
Run index.html as a browser source (OBS, vMix, a browser tab), then open controlpanel.html
in another tab of the SAME browser. Edits and the Play/Stop/Update/Next buttons drive the
graphic live over a BroadcastChannel — no server needed. (In an SPX rundown you drive the
template the usual way; the control panel is an alternative for browser-source workflows.)
${hasRealtimeControl(template.js) ? `
## Remote control (enabled)
This graphic also listens on a Supabase Realtime channel, so controlpanel.html can drive it from
ANOTHER device — not just the same browser. The channel topic is a shared secret baked into both
files; anyone who has it plus the publishable key can control the graphic, so keep it private. The
render host must be allowed to reach wss://*.supabase.co. Delete the marked "REMOTE CONTROL" block
in js/template.js for a pure-offline graphic.
` : ''}
All paths are relative, so the package is plug-and-play.
`;
}
