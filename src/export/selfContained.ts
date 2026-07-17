// Shared builder for SINGLE-FILE exports (CasparCG, HTML overlay): everything the graphic needs
// — CSS, GSAP, template JS, images, fonts — inlined into one .html so the file is plug-and-play
// with no sibling files at playout.

import gsapSource from '../assets/gsap.min.js?raw';
import lottieSource from '../assets/lottie.min.js?raw';
import { inlineAssetRefs } from '../assets/assetUtils';
import { templateUsesLottie } from '../assets/lottieSupport';
import type { SpxTemplate } from '../model/types';

/**
 * Build the single-file HTML: strip external refs, inline everything. `extraBodyScripts` are
 * appended AFTER the template's own JS (each becomes part of the same <script> block), so a
 * target can wrap the globals — e.g. CasparCG's XML data shim or the overlay's autoplay block.
 */
export function composeSelfContainedHtml(template: SpxTemplate, extraBodyScripts: string[] = []): string {
  // Inline uploaded assets (images/foo.png -> data URL) in markup and styles.
  let html = inlineAssetRefs(template.html, template.assets)
    // Drop the external stylesheet/script references — their contents go inline below.
    .replace(/<link\b[^>]*href=["'](?:\.\/)?(?:css\/|js\/)[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<script\b[^>]*src=["'](?:\.\/)?(?:js\/|css\/)[^"']*["'][^>]*>\s*<\/script>\s*/gi, '');
  const css = inlineAssetRefs(template.css, template.assets);

  const headInjection =
    `<script>/* GSAP (bundled) — no internet needed at playout. */\n${gsapSource}</script>\n` +
    // The Lottie player inlines only when the graphic uses it; its animation JSON is
    // already a data: URL here (inlineAssetRefs above), so file:// playout works.
    (templateUsesLottie(template)
      ? `<script>/* Lottie player (bundled, MIT) — this graphic uses a Lottie animation. */\n${lottieSource}</script>\n`
      : '') +
    `<style>\n${css}\n</style>\n`;
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${headInjection}</head>`) : headInjection + html;

  const scripts = [template.js, ...extraBodyScripts].join('\n\n');
  const bodyInjection = `<script>\n${scripts}\n</script>\n`;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${bodyInjection}</body>`) : html + bodyInjection;
  return html;
}
