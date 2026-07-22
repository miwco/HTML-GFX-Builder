// SPX export: the canonical package. The exported files mirror exactly what you see in the
// editor (index.html + css/ + js/ + assets), wrapped in one project folder that drops straight
// into an SPX/CasparCG templates directory. Plug-and-play: relative paths, bundled GSAP.

import JSZip from 'jszip';
import { addControlPanel, addSharedAssets, ensureExternalRefs, injectControlReceiver, slug, spxReadme } from '../common';
import type { ExportTarget } from '../registry';
import type { ControlEntry } from '../../model/library';

/**
 * template.css ships one level down (css/template.css) while assets unpack at the project
 * root (images/, fonts/, lottie/) — a stylesheet-relative url("images/…") would resolve into
 * css/images/. The AUTHORED css stays root-relative (the editor preview and the single-file
 * exports resolve it there); only this packaged copy gets the ../ hop.
 */
function cssForSubfolder(css: string): string {
  // `(?:\.\/)?` matters: every other reader of these references accepts a "./" prefix
  // (assetUtils inlineAssetRefs, validateTemplate, bundledFonts FONT_REF_RE), so a stylesheet
  // written with one would be left un-hopped here while addReferencedFonts still wrote the file
  // at the package root — the reference and the file disagreeing inside one package build.
  return css.replace(/url\(\s*(['"]?)(?:\.\/)?(images|fonts|lottie|assets)\//g, 'url($1../$2/');
}

/** Write one SPX-format template into the given zip folder (reused by packet + show export).
 *  `entries` are the graphic's saved control-panel data rows, resolved out of the library by
 *  the caller — baked into the bundled operator page as a switcher (docs/SAVED_CONTENT_MODEL.md
 *  §4). Omitted where there is no library link (a bare template export). */
export async function buildStarterInto(
  root: JSZip,
  template: Parameters<ExportTarget['build']>[0],
  opts?: { entries?: ControlEntry[] },
): Promise<void> {
  root.file('index.html', injectControlReceiver(ensureExternalRefs(template.html), template));
  root.file('css/template.css', cssForSubfolder(template.css));
  root.file('js/template.js', template.js);
  root.file('README.md', spxReadme(template));
  addControlPanel(root, template, { entries: opts?.entries }); // operator page — open beside the graphic to drive it
  await addSharedAssets(root, template);
}

export const spxTarget: ExportTarget = {
  id: 'spx',
  label: 'SPX export',
  description: 'The plug-and-play SPX package — drops straight into your SPX templates folder.',
  successMessage: '✓ Exported. Drop the unzipped folder into your SPX templates.',
  async build(template, ctx) {
    const zip = new JSZip();
    // Everything lives inside one project folder, so extracting into the SPX/CasparCG
    // templates folder yields  [TemplatesFolder]/your_project/index.html + images/…
    const root = zip.folder(slug(template.name))!;
    await buildStarterInto(root, template, { entries: ctx?.entries });
    return zip;
  },
};
