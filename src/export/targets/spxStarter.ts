// SPX export: the canonical package. The exported files mirror exactly what you see in the
// editor (index.html + css/ + js/ + assets), wrapped in one project folder that drops straight
// into an SPX/CasparCG templates directory. Plug-and-play: relative paths, bundled GSAP.

import JSZip from 'jszip';
import { addControlPanel, addSharedAssets, ensureExternalRefs, injectControlReceiver, slug, spxReadme } from '../common';
import type { ExportTarget } from '../registry';

/** Write one SPX-format template into the given zip folder (reused by packet export). */
export async function buildStarterInto(root: JSZip, template: Parameters<ExportTarget['build']>[0]): Promise<void> {
  root.file('index.html', injectControlReceiver(ensureExternalRefs(template.html), template));
  root.file('css/template.css', template.css);
  root.file('js/template.js', template.js);
  root.file('README.md', spxReadme(template));
  addControlPanel(root, template); // operator page — open beside the graphic to drive it
  await addSharedAssets(root, template);
}

export const spxTarget: ExportTarget = {
  id: 'spx',
  label: 'SPX export',
  description: 'The plug-and-play SPX package — drops straight into your SPX templates folder.',
  successMessage: '✓ Exported. Drop the unzipped folder into your SPX templates.',
  async build(template) {
    const zip = new JSZip();
    // Everything lives inside one project folder, so extracting into the SPX/CasparCG
    // templates folder yields  [TemplatesFolder]/your_project/index.html + images/…
    const root = zip.folder(slug(template.name))!;
    await buildStarterInto(root, template);
    return zip;
  },
};
