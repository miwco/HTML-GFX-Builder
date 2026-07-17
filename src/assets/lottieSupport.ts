// Lottie support detection. The bundled player (lottie.min.js, ~165 KB) is injected into
// the preview and the exports ONLY when the template actually uses a Lottie animation —
// unlike GSAP (universal, every template animates with it), Lottie is opt-in weight.

import type { SpxTemplate } from '../model/types';

/** True when the template uses Lottie: a data-lottie element, the bundled player's
 *  script tag, or a hand-written lottie.loadAnimation call. */
export function templateUsesLottie(template: Pick<SpxTemplate, 'html' | 'js'>): boolean {
  return (
    /\bdata-lottie=/.test(template.html) ||
    /js\/lottie\.min\.js/.test(template.html) ||
    /\blottie\.loadAnimation\s*\(/.test(template.js)
  );
}
