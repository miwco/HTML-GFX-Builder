// Deterministic explainer. Given the token under the editor cursor (plus its line for context),
// return matching beginner-friendly explanations from the knowledge base. Pure and offline.

import { PATTERN_KNOWLEDGE, TOKEN_KNOWLEDGE, type Explanation } from './knowledge';

export interface EditorContext {
  /** The "rich token" under the cursor (may include - . # @, e.g. "font-size", "gsap.to", "#graphic"). */
  token: string;
  /** The full line text, used for pattern fallbacks. */
  line: string;
}

/** Normalize a token for keyword lookup: lowercase, strip surrounding punctuation/quotes. */
function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^a-z0-9@:.#_-]+/, '')
    .replace(/[^a-z0-9@:.#_-]+$/, '')
    .replace(/\(\)$/, '');
}

/**
 * Explain the code at the cursor. Returns up to two distinct explanations, most specific first:
 * an exact token match, then a line/selection pattern match. Empty if nothing is recognized.
 */
export function explain(ctx: EditorContext): Explanation[] {
  const out: Explanation[] = [];
  const seen = new Set<string>();
  const push = (e: Explanation | undefined) => {
    if (e && !seen.has(e.title)) {
      seen.add(e.title);
      out.push(e);
    }
  };

  const token = normalize(ctx.token);
  if (token) {
    // Try the token as-is, then without a leading . / # (class/id selectors), then bare word.
    push(TOKEN_KNOWLEDGE[token]);
    push(TOKEN_KNOWLEDGE[token.replace(/^[.#]/, '')]);
    const bare = token.replace(/^[.#@]/, '').replace(/\..*$/, ''); // gsap.to -> gsap
    push(TOKEN_KNOWLEDGE[bare]);
  }

  // Pattern rules: match against the token first (tighter), then the whole line.
  for (const rule of PATTERN_KNOWLEDGE) {
    if (rule.test.test(ctx.token) || rule.test.test(ctx.line)) push(rule.explain);
    if (out.length >= 2) break;
  }

  return out.slice(0, 2);
}

/**
 * Extract the rich token around a 0-based column in a line. Includes the characters that make up
 * CSS properties, selectors, and member access: letters, digits, _ - . # @.
 */
export function tokenAt(line: string, col: number): string {
  const isWord = (c: string) => /[A-Za-z0-9_\-.#@]/.test(c);
  let s = Math.min(col, line.length);
  let e = s;
  while (s > 0 && isWord(line[s - 1])) s--;
  while (e < line.length && isWord(line[e])) e++;
  return line.slice(s, e);
}
