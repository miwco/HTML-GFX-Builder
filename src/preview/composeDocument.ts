// Build a single runnable HTML document from a template, for the live preview iframe.
//
// In the editor the HTML references external files (css/template.css, js/template.js,
// js/gsap.min.js). Those don't exist inside an iframe srcdoc, so here we strip those local
// references and inline the CSS, the bundled GSAP, and the template JS instead. The exported
// package keeps the external references (the files are written to disk by the exporter).

import gsapSource from '../assets/gsap.min.js?raw';
import { inlineAssetRefs, isDataUrl } from '../assets/assetUtils';
import type { SpxTemplate } from '../model/types';

/** Remove <link>/<script> tags that point at local template files we will inline instead.
 *  (Exported: render/composeRenderDocument composes its own self-contained document.) */
export function stripLocalAssetTags(html: string): string {
  return html
    // <link rel="stylesheet" href="css/..."> and similar relative stylesheets
    .replace(/<link\b[^>]*href=["'](?:\.\/)?(?:css\/|js\/)[^"']*["'][^>]*>/gi, '')
    // <script src="js/..."></script> (gsap, template.js, any local js)
    .replace(/<script\b[^>]*src=["'](?:\.\/)?(?:js\/|css\/)[^"']*["'][^>]*>\s*<\/script>/gi, '');
}

/** Options for the live preview composition. */
export interface ComposeOptions {
  /**
   * Authoring/pasteboard mode — the EDITOR PREVIEW ONLY. Render the canvas inset by this pad
   * (canvas px) inside a larger viewport so content positioned OUTSIDE the canvas (an
   * entrance that starts off the left edge) is still painted and reachable. Pad is a pure
   * editor-view concept: it never enters the template code, keyframes, or any persisted
   * state, and it is NEVER used by exports/renders/thumbnails (those use their own composers).
   */
  authoring?: { padX: number; padY: number };
}

/** Inject inline <style>, GSAP, and the template JS into the document <head>/<body>. */
export function composeDocument(template: SpxTemplate, options: ComposeOptions = {}): string {
  // Inline uploaded assets (assets/foo.png -> data URL) so the preview renders media
  // without a server. The exported package keeps the relative paths + real files.
  let html = stripLocalAssetTags(inlineAssetRefs(template.html, template.assets));
  const css = inlineAssetRefs(template.css, template.assets);

  const { width, height } = template.resolution;

  // Base style: ensure the canvas is always exactly the right resolution even if the
  // template CSS doesn't set it (e.g. the blank template). Template CSS can override.
  const baseStyle = `html, body { width: ${width}px; height: ${height}px; overflow: hidden; }`;

  const styleTag = `<style id="spx-base-style">\n${baseStyle}\n</style>\n<style id="spx-inline-css">\n${css}\n</style>`;

  // Authoring/pasteboard mode (editor preview only, never exported): the iframe VIEWPORT is
  // grown to canvas + pad on every side (by PreviewFrame), so painting off-canvas content
  // requires a viewport larger than the canvas. This style — injected AFTER the template CSS
  // so it wins the cascade — insets the canvas by `pad` and stops the body from clipping.
  // `position: relative` is the least-invasive containing block: it keeps the root and every
  // absolutely-positioned descendant resolving against the canvas-sized body, so a 1920x1080
  // template lays out exactly as it does on air (verified by the pasteboard spike). No
  // transform/contain (would add a compositing layer) and no innerWidth shim — the residual
  // divergences (position:fixed, vw/vh, window.innerWidth reflecting the padded viewport) are
  // unused by the house px-based templates and stay honest rather than half-shimmed.
  const authoringStyleTag = options.authoring
    ? `<style id="spx-authoring-style">
html { overflow: hidden; }
body { position: relative; overflow: visible !important; margin: ${options.authoring.padY}px ${options.authoring.padX}px !important; }
</style>`
    : '';
  const gsapTag = `<script id="spx-gsap">\n${gsapSource}\n</script>`;
  const jsTag = `<script id="spx-template-js">\n${template.js}\n</script>`;

  // Preview-only: uploaded assets exist as in-memory data URLs, so an image path the
  // template sets at RUNTIME (update() writing an <img> src, a rebuild injecting
  // <img src="images/...">) can't resolve inside the srcdoc iframe. This observer swaps
  // any known relative path for its data URL the moment it appears. The exported package
  // has the real files on disk and needs none of this.
  const runtimeAssets = Object.fromEntries(
    template.assets.filter((a) => isDataUrl(a.data)).map((a) => [a.path, a.data as string]),
  );
  const assetShimTag = Object.keys(runtimeAssets).length
    ? `<script id="spx-preview-assets">
(function () {
  var MAP = ${JSON.stringify(runtimeAssets)};
  function fix(img) {
    var src = img.getAttribute('src');
    if (!src) return;
    var clean = src.replace(/^\\.\\//, '');
    if (MAP[clean]) img.src = MAP[clean];
  }
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      if (m.type === 'attributes' && m.target.tagName === 'IMG') fix(m.target);
      if (m.addedNodes) m.addedNodes.forEach(function (n) {
        if (n.tagName === 'IMG') fix(n);
        else if (n.querySelectorAll) n.querySelectorAll('img').forEach(fix);
      });
    });
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
})();
</script>\n`
    : '';

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

  // Preview-only: match the editor's color-scheme (styles.css :root). Chromium disables
  // iframe TRANSPARENCY when the embedder's and the iframe's color-schemes disagree — a
  // dark app around an undeclared (light) srcdoc would paint the stage opaque white.
  // Exported packages don't get this tag; playout servers control their own background.
  const colorSchemeTag = `<meta name="color-scheme" content="dark">`;

  // GSAP must load before the template JS. Put both at the end of <head> if possible. The
  // authoring style comes LAST so it overrides the template's own resetCanvasCss.
  const headInjection = `${colorSchemeTag}\n${assetShimTag}${gsapTag}\n${styleTag}\n${authoringStyleTag ? `${authoringStyleTag}\n` : ''}`;
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
