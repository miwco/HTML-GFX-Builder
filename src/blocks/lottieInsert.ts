// Deterministic Lottie placement (the Assets panel's drag-to-canvas drop for .json
// animations). Pure (template) => template, like every block: inserts a positioned
// container div carrying a data-lottie attribute, a commented CSS rule, ONE shared
// bootstrap in the JS (idempotent), and the bundled player's <head> script tag.
//
// The generated pattern works in every context the template ships to:
//   - editor preview + single-file exports (CasparCG/overlay/H2R) + video renders:
//     inlineAssetRefs turns the data-lottie path into a data: URL, and the bootstrap
//     decodes it inline (atob) — no network call, so file:// playout works too.
//   - folder exports (SPX starter): the path stays a real file next to the template and
//     the bootstrap hands it to the player as `path` (SPX serves templates over http).

import type { SpxTemplate } from '../model/types';
import { splitAssetPath } from '../assets/assetUtils';
import { addLayer, appendCss, appendJs, insertGraphicHtml } from './edit';

/** The one bootstrap all data-lottie elements share (appended once per template). */
const LOTTIE_BOOTSTRAP = `// Plays every element carrying a data-lottie attribute with the bundled player
// (js/lottie.min.js — the editor preview and single-file exports inline it automatically).
// The attribute holds the animation's relative file path (folder exports keep the real
// file next to the template) or an inline data: URL (preview / single-file exports embed
// the JSON), decoded here directly — no network call, so file:// playout works too.
function initLottieBoxes() {
  if (!window.lottie) return; // the player script was not loaded
  var boxes = document.querySelectorAll('[data-lottie]');
  for (var i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    if (box.getAttribute('data-lottie-live')) continue; // already playing
    box.setAttribute('data-lottie-live', '1');
    var src = box.getAttribute('data-lottie') || '';
    var opts = { container: box, renderer: 'svg', loop: true, autoplay: true };
    if (src.indexOf('data:') === 0) {
      // Decode the inline base64 JSON (UTF-8 safe) without fetching anything.
      var b64 = src.slice(src.indexOf(',') + 1);
      opts.animationData = JSON.parse(decodeURIComponent(escape(atob(b64))));
    } else {
      opts.path = src; // a real file next to the template
    }
    lottie.loadAnimation(opts);
  }
}
// Template JS loads in <head> in exported packages — wait for the DOM when needed.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLottieBoxes);
} else {
  initLottieBoxes();
}`;

/** Ensure the <head> references the bundled player (mirrors the GSAP tag; exporters and
 *  the preview strip/inline/keep it exactly like they do GSAP's). */
function ensureLottieScriptTag(html: string): string {
  if (/src=["'](?:\.\/)?js\/lottie\.min\.js["']/i.test(html)) return html;
  const tag = `  <script src="js/lottie.min.js"></script>`;
  const gsapTag = /(<script\b[^>]*src=["'](?:\.\/)?js\/gsap\.min\.js["'][^>]*>\s*<\/script>)/i;
  if (gsapTag.test(html)) return html.replace(gsapTag, `$1\n${tag}`);
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${tag}\n</head>`);
  return tag + '\n' + html;
}

/** Unique element id from the animation's file name: lottie-<stem>, -2/-3… while taken. */
function uniqueLottieId(html: string, assetPath: string): string {
  const { file } = splitAssetPath(assetPath);
  const stem = file.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'anim';
  const base = `lottie-${stem}`;
  let id = base;
  let n = 2;
  while (new RegExp(`\\bid=["']${id}["']`).test(html)) id = `${base}-${n++}`;
  return id;
}

/**
 * Insert a Lottie animation as a positioned, auto-playing element centred on a canvas
 * point. The container is tagged data-gfx with a unique id, so it registers as a
 * selectable, animatable part (the timeline animates the box; the animation loops inside).
 * Returns the transformed template and the new element's selector.
 */
export function insertLottieElement(
  template: SpxTemplate,
  opts: { assetPath: string; x: number; y: number; naturalW: number; naturalH: number },
): { template: SpxTemplate; selector: string } {
  const { assetPath, x, y } = opts;
  const naturalW = Math.max(1, Math.round(opts.naturalW));
  const naturalH = Math.max(1, Math.round(opts.naturalH));
  const res = template.resolution;
  const { file } = splitAssetPath(assetPath);
  const id = uniqueLottieId(template.html, assetPath);

  // Display size: authored size capped at a quarter of the canvas width (floor 48px),
  // keeping the aspect. The box needs an explicit height — the SVG fills its container.
  const width = Math.max(48, Math.min(naturalW, Math.round(res.width / 4)));
  const height = Math.max(1, Math.round((width * naturalH) / naturalW));
  const left = Math.round(Math.min(Math.max(x - width / 2, 0), Math.max(res.width - width, 0)));
  const top = Math.round(Math.min(Math.max(y - height / 2, 0), Math.max(res.height - height, 0)));

  // The comment names only the FILE (never the full asset path — the preview's asset
  // inliner replaces path strings anywhere, including comments).
  const htmlSnippet = `  <!-- Lottie: ${file} (placed from the Assets panel — plays automatically; position/size in the CSS rule for #${id}) -->
  <div id="${id}" data-gfx data-lottie="${assetPath}"></div>`;

  const cssBody = `#${id} {
  position: absolute;   /* place freely on the canvas */
  left: ${left}px;         /* distance from the left edge */
  top: ${top}px;          /* distance from the top edge */
  width: ${width}px;        /* display size (authored ${naturalW}×${naturalH}) */
  height: ${height}px;       /* keeps the animation's aspect */
}`;

  let html = ensureLottieScriptTag(template.html);
  html = insertGraphicHtml(html, htmlSnippet);

  let js = template.js;
  if (!js.includes('function initLottieBoxes()')) {
    js = appendJs(js, 'LOTTIE PLAYER', LOTTIE_BOOTSTRAP);
  }

  let next: SpxTemplate = { ...template, html, css: appendCss(template.css, `Lottie: ${file}`, cssBody), js };
  next = addLayer(next, {
    id,
    type: 'container',
    label: file,
    styles: { position: 'absolute', left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` },
  });
  return { template: next, selector: `#${id}` };
}
