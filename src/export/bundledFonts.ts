// The bundled fonts' export plumbing — ONE place that knows how a builder font gets out of
// the app and into a package.
//
// Generated CSS always references a font the same teachable way: `url("fonts/<file>")`
// (model/fonts.ts fontFaceCss). How that reference is HONORED depends on the package shape,
// and there are exactly two shapes:
//
//   folder packages (SPX, OGraf, LiveOS)  — the file ships beside the HTML at fonts/<file>,
//                                           written by common.ts addReferencedFonts.
//   single-file packages (CasparCG, H2R,  — there IS no sibling to ship to, so the bytes must
//   HTML overlay)                           be inlined into the CSS as a data: URL.
//
// The single-file half was missing, so those three targets emitted a reference to a file that
// was never written. Nothing failed loudly: `font-display: swap` renders the fallback stack
// and keeps going, so the graphic just quietly came up in the wrong typeface at playout.
// Measured before the fix: the @font-face entries report status "error" and the heading's ink
// width moves by ~5 px on lt11. That is why this module exists and why a fetch failure here
// THROWS rather than degrading — a silently mis-typed graphic is the exact harm.

/** The generated `url("fonts/<file>")` reference. Kept in one place so the folder writer and
 *  the inliner can never disagree about what counts as a bundled-font reference. */
export const FONT_REF_RE = /url\(["']?(?:\.\/)?fonts\/([\w.-]+\.(?:woff2|woff|ttf|otf))["']?\)/gi;

/** The @font-face `format()` keyword for a file extension. */
const FORMATS: Record<string, string> = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };

/** Every distinct bundled font file a stylesheet references. */
export function referencedFontFiles(css: string): string[] {
  return [...new Set([...css.matchAll(FONT_REF_RE)].map((m) => m[1]))];
}

/**
 * Fetch one bundled font's bytes from the app's own /fonts/ (public/fonts in dev, copied into
 * the build). Returns null when the file is not there — the folder writers treat that as
 * "skip", the inliner treats it as fatal.
 */
export async function fetchBundledFont(file: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`/fonts/${file}`);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/** Base64 for a binary buffer. Chunked: a 30 KB woff2 is ~30k arguments, and spreading a whole
 *  font into String.fromCharCode blows the argument limit on larger faces. */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Replace every `url("fonts/<file>")` in a stylesheet with the font's bytes as a data: URL, so
 * a single-file export carries its own typography.
 *
 * Call this AFTER inlineAssetRefs: a font the user imported is already an asset at
 * `fonts/<file>` and has been substituted by then, so whatever still matches here is a
 * builder-bundled face that only /fonts/ can supply.
 *
 * Throws when a referenced face cannot be fetched. The caller (ExportPanel) shows the message,
 * which is the right outcome: refusing to build beats handing someone a graphic that looks
 * correct in the editor and wrong on air.
 */
export async function inlineBundledFonts(css: string): Promise<string> {
  const files = referencedFontFiles(css);
  if (files.length === 0) return css;

  const dataUrls = new Map<string, string>();
  for (const file of files) {
    const buffer = await fetchBundledFont(file);
    if (!buffer) {
      throw new Error(
        `the bundled font "${file}" could not be read, so this single-file export would ` +
          `reference a font it does not carry and play out in the wrong typeface`,
      );
    }
    const ext = file.slice(file.lastIndexOf('.') + 1).toLowerCase();
    dataUrls.set(file, `data:${FORMATS[ext] ?? 'application/octet-stream'};base64,${toBase64(buffer)}`);
  }

  return css.replace(FONT_REF_RE, (whole, file: string) => {
    const url = dataUrls.get(file);
    return url ? `url("${url}")` : whole;
  });
}
