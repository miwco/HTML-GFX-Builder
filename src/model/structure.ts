// The structure-contract root detector. Every generated category wraps its design in
// <div class="<prefix>-box"> inside <div class="<prefix>"> (templates/shared/standard.ts);
// the prefix names the category in the CSS ('lower-third', 'ticker', legacy 'l3', …).
// Prefixes are descriptive and may contain hyphens, so captures use [\w-]+, never \w+.
// This is THE one detection every live panel shares (Motion, Style, canvas, timeline).

const ROOT_PREFIX_RE = /class="([\w-]+)-box"/;

/** The template's class prefix, or null when the HTML has no standard-contract box. */
export function detectPrefix(html: string): string | null {
  return html.match(ROOT_PREFIX_RE)?.[1] ?? null;
}

/** Visible text lines: the id="fN" elements wrapped in the standard line masks. */
export function countLines(html: string): number {
  return (html.match(/id="f\d+"[^>]*class="[\w-]+-/g) || []).length;
}
