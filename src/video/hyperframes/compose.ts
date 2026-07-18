// Compose a HyperFrames composition source into a runnable, fully self-contained
// document - the counterpart of preview/composeDocument.ts (SPX) for the video world's
// 'hyperframes' engine, shared by the live preview and the render manifest so what you
// see is exactly what renders.
//
// What composition does (browser-only module - uses ?raw and DOMParser):
//   1. Inline the BUNDLED GSAP and the bundled broadcast @font-face CSS at the start of
//      <head> (offline rule: generated documents never reference a CDN; the composition
//      source itself carries no script or font tags). The fonts are the SAME faces the
//      Remotion side injects (video/videoFonts.ts), so both engines honour the same
//      typography contract and preview matches render; the caller passes the resolved CSS
//      (hyperframes/fontCss.ts loads it once) because composition itself stays sync.
//   2. Substitute `asset:<logicalName>` references (src attributes, CSS url()) with the
//      project asset's data URL - the HyperFrames counterpart of the Remotion `assets`
//      prop; the names come from describeAssets, the one logical-name source.
//   3. Apply IMAGE variable values (data-var-src bindings): an image variable's value is
//      an asset's logical name; the element's src becomes that asset's data URL. Applied
//      at compose time because it substitutes a URL - scalar variables stay live via the
//      driver's set-vars channel.
//   4. Inject the config + driver script at the END of <body>, after the composition's
//      own scripts (the registered timeline must exist before the driver boots).
//   5. Pin color-scheme to the embedder: 'dark' for the in-app preview, 'light' for the
//      render document (the Remotion host page is light) - a scheme mismatch makes
//      Chromium paint the iframe opaque and silently kills alpha (see src/render/CLAUDE.md).

import gsapSource from '../../assets/gsap.min.js?raw';
// The runtime readability checks, shared verbatim with the Remotion player host (which
// inlines the same file at build time) - neither runtime can import a module from the app,
// so the one implementation travels as source into both.
import textChecksSource from '../textChecks.js?raw';
import type { AssetFile } from '../../model/types';
import { describeAssets, type VideoCompSettings } from '../types';
import { parseHyperframesComposition } from './parse';
import { HF_DRIVER_JS } from './driver';

export interface HfComposeOptions {
  settings: VideoCompSettings;
  assets: AssetFile[];
  /** Variable values by id (the Content panel's edits; defaults fill the gaps in-page). */
  values: Record<string, string | number>;
  mode: 'preview' | 'render';
  /** The bundled-font @font-face CSS (data URLs) - see hyperframes/fontCss.ts. Omitted
   *  only where fonts genuinely don't matter (a unit-style call); '' degrades to the
   *  composition's own fallback stacks. */
  fontCss?: string;
  /** preview only: the bridge's session nonce (authenticates the postMessage channel). */
  nonce?: string;
  /** preview only: start playing once booted. */
  autoplay?: boolean;
}

/** Logical asset name -> data URL for every asset that has one. */
export function hyperframesAssetMap(assets: AssetFile[]): Map<string, string> {
  const map = new Map<string, string>();
  const infos = describeAssets(assets);
  for (const info of infos) {
    const asset = assets.find((a) => a.path === info.path);
    if (asset && typeof asset.data === 'string') map.set(info.name, asset.data);
  }
  return map;
}

/** Substitute known `asset:<name>` references; unknown names stay (validation warns). */
function substituteAssetRefs(html: string, assetMap: Map<string, string>): string {
  return html.replace(/asset:([a-z0-9][a-z0-9-]*)/g, (whole, name: string) =>
    assetMap.get(name) ?? whole,
  );
}

/**
 * Resolve every `asset:<name>` reference to its data URL, for callers that need a portable
 * document but not the driver - the source EXPORT. `asset:` is a NoaCG convention: nothing
 * outside this app resolves it, so a downloaded composition that kept the reference would
 * show a broken image, which is exactly what "the export is plug-and-play" forbids.
 */
export function inlineHyperframesAssets(html: string, assets: AssetFile[]): string {
  return substituteAssetRefs(html, hyperframesAssetMap(assets));
}

/** A JSON payload safe to inline inside a <script> element. */
function inlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function composeHyperframesDocument(source: string, opts: HfComposeOptions): string {
  const assetMap = hyperframesAssetMap(opts.assets);
  let html = substituteAssetRefs(source, assetMap);

  // Image variables: resolve each bound element's src to the picked asset's data URL.
  const { variables } = parseHyperframesComposition(html);
  const imageVars = variables.filter((v) => v.type === 'image');
  if (imageVars.length > 0) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let touched = false;
    for (const v of imageVars) {
      const raw = opts.values[v.id] ?? v.default ?? '';
      const url = assetMap.get(String(raw));
      if (!url) continue;
      for (const el of doc.querySelectorAll(`[data-var-src="${CSS.escape(v.id)}"]`)) {
        el.setAttribute('src', url);
        touched = true;
      }
    }
    if (touched) html = '<!doctype html>\n' + doc.documentElement.outerHTML;
  }

  const config = {
    mode: opts.mode,
    nonce: opts.nonce ?? '',
    fps: opts.settings.fps,
    durationInFrames: opts.settings.durationInFrames,
    values: opts.values,
    autoplay: opts.autoplay ?? false,
  };
  const scheme = opts.mode === 'preview' ? 'dark' : 'light';
  const headInject =
    `<meta name="color-scheme" content="${scheme}">` +
    (opts.fontCss ? `<style>/* Bundled broadcast fonts */\n${opts.fontCss}\n</style>` : '') +
    `<script>/* GSAP (bundled - offline) */\n${gsapSource}\n</script>`;
  const bodyInject =
    `<script>window.__NOACG_HF_CONFIG = ${inlineJson(config)};</script>` +
    `<script>/* NoaCG readability checks (src/video/textChecks.js) */\n${textChecksSource}\n</script>` +
    `<script>/* NoaCG HyperFrames driver */\n${HF_DRIVER_JS}\n</script>`;

  // Inject without re-serializing the whole document (keeps the author's HTML verbatim).
  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => `${m}\n${headInject}`)
    : headInject + html;
  html = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${bodyInject}\n</body>`)
    : html + bodyInject;
  return html;
}
