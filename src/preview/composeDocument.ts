// Build a single runnable HTML document from a template, for the live preview iframe.
//
// In the editor the HTML references external files (css/template.css, js/template.js,
// js/gsap.min.js). Those don't exist inside an iframe srcdoc, so here we strip those local
// references and inline the CSS, the bundled GSAP, and the template JS instead. The exported
// package keeps the external references (the files are written to disk by the exporter).

import gsapSource from '../assets/gsap.min.js?raw';
import { inlineAssetRefs } from '../assets/assetUtils';
import type { SpxTemplate } from '../model/types';

/** Remove <link>/<script> tags that point at local template files we will inline instead. */
function stripLocalAssetTags(html: string): string {
  return html
    // <link rel="stylesheet" href="css/..."> and similar relative stylesheets
    .replace(/<link\b[^>]*href=["'](?:\.\/)?(?:css\/|js\/)[^"']*["'][^>]*>/gi, '')
    // <script src="js/..."></script> (gsap, template.js, any local js)
    .replace(/<script\b[^>]*src=["'](?:\.\/)?(?:js\/|css\/)[^"']*["'][^>]*>\s*<\/script>/gi, '');
}

/** Inject inline <style>, GSAP, and the template JS into the document <head>/<body>. */
export function composeDocument(template: SpxTemplate): string {
  // Inline uploaded assets (assets/foo.png -> data URL) so the preview renders media
  // without a server. The exported package keeps the relative paths + real files.
  let html = stripLocalAssetTags(inlineAssetRefs(template.html, template.assets));
  const css = inlineAssetRefs(template.css, template.assets);

  const { width, height } = template.resolution;

  // Base style: ensure the canvas is always exactly the right resolution even if the
  // template CSS doesn't set it (e.g. the blank template). Template CSS can override.
  const baseStyle = `html, body { width: ${width}px; height: ${height}px; overflow: hidden; }`;

  const styleTag = `<style id="spx-base-style">\n${baseStyle}\n</style>\n<style id="spx-inline-css">\n${css}\n</style>`;
  const gsapTag = `<script id="spx-gsap">\n${gsapSource}\n</script>`;
  const jsTag = `<script id="spx-template-js">\n${template.js}\n</script>`;

  // Capture runtime errors and report them to the builder (for the validator / inline feedback).
  // Defined before the template JS so it also catches errors thrown there.
  const captureTag = `<script id="spx-error-capture">
window.onerror = function (message, source, lineno) {
  try { parent.postMessage({ type: 'spx-preview-error', message: String(message), line: lineno }, '*'); } catch (e) {}
  return false;
};
window.addEventListener('unhandledrejection', function (ev) {
  try { parent.postMessage({ type: 'spx-preview-error', message: String(ev.reason) }, '*'); } catch (e) {}
});
</script>`;

  // GSAP must load before the template JS. Put both at the end of <head> if possible.
  const headInjection = `${gsapTag}\n${styleTag}\n`;
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${headInjection}</head>`);
  } else {
    html = headInjection + html;
  }

  // Error capture + template JS go right before </body> so the DOM exists when functions run.
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${captureTag}\n${jsTag}\n</body>`);
  } else {
    html = html + captureTag + jsTag;
  }

  return html;
}
