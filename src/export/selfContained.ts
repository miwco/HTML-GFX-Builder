// Shared builder for SINGLE-FILE exports (CasparCG, H2R, HTML overlay): everything the graphic
// needs — CSS, GSAP, template JS, images, fonts — inlined into one .html so the file is
// plug-and-play with no sibling files at playout.
//
// "No sibling files" is the whole contract, so the bundled fonts have to be inlined here too:
// there is no fonts/ folder next to a CasparCG template to resolve url("fonts/…") against.
// See export/bundledFonts.ts.

import gsapSource from '../assets/gsap.min.js?raw';
import lottieSource from '../assets/lottie.min.js?raw';
import { inlineAssetRefs, isFontAsset } from '../assets/assetUtils';
import { templateUsesLottie } from '../assets/lottieSupport';
import { inlineBundledFonts } from './bundledFonts';
import { fontLicenseComment } from '../model/fonts';
import type { SpxTemplate } from '../model/types';

/**
 * Build the single-file HTML: strip external refs, inline everything. `extraBodyScripts` are
 * appended AFTER the template's own JS (each becomes part of the same <script> block), so a
 * target can wrap the globals — e.g. CasparCG's XML data shim or the overlay's autoplay block.
 *
 * Async because the bundled font files are fetched from the app's own /fonts/ to be embedded;
 * a font that cannot be read fails the export rather than shipping a dangling reference.
 */
export async function composeSelfContainedHtml(
  template: SpxTemplate,
  extraBodyScripts: string[] = [],
): Promise<string> {
  // Inline uploaded assets (images/foo.png -> data URL) in markup and styles.
  let html = inlineAssetRefs(template.html, template.assets)
    // Drop the external stylesheet/script references — their contents go inline below.
    .replace(/<link\b[^>]*href=["'](?:\.\/)?(?:css\/|js\/)[^"']*["'][^>]*>\s*/gi, '')
    .replace(/<script\b[^>]*src=["'](?:\.\/)?(?:js\/|css\/)[^"']*["'][^>]*>\s*<\/script>\s*/gi, '');
  // Uploaded fonts are assets and are already substituted by the line below; whatever still
  // reads url("fonts/…") afterwards is a builder-bundled face, embedded here.
  const { css, embedded } = await inlineBundledFonts(inlineAssetRefs(template.css, template.assets));
  // A single-file export has nowhere to put a FONT_LICENSES.md, so when it carries font bytes
  // the licence rides along as a human-readable header — OFL §2's second permitted form.
  const licence = embedded.length > 0 || template.assets.some((a) => isFontAsset(a.path))
    ? `${fontLicenseComment('html')}\n`
    : '';

  const headInjection =
    licence +
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
