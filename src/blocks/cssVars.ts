// Deterministic helpers for managing brand CSS custom properties in a :root { } block.
// Brand colors and fonts live in the visible CSS as variables (e.g. --brand-primary), so
// the code stays the source of truth and templates can reference var(--brand-primary).

/** Read a CSS variable's value from the first :root rule. Null if absent. */
export function getCssVariable(css: string, name: string): string | null {
  const root = findRootBody(css);
  if (!root) return null;
  const re = new RegExp(`--${escapeRe(name)}\\s*:\\s*([^;}]*)`, 'i');
  const m = re.exec(root.body);
  return m ? m[1].trim() : null;
}

/**
 * Set `--<name>: <value>` inside a :root rule, creating the property or the whole
 * :root block if needed. Deterministic; preserves the rest of the stylesheet.
 */
export function setCssVariable(css: string, name: string, value: string): string {
  const root = findRootBody(css);
  const decl = `--${name}`;
  if (root) {
    const re = new RegExp(`(--${escapeRe(name)}\\s*:)\\s*[^;}]*`, 'i');
    let newBody: string;
    if (re.test(root.body)) {
      newBody = root.body.replace(re, `$1 ${value}`);
    } else {
      const trimmed = root.body.replace(/\s*$/, '');
      const sep = trimmed.endsWith(';') || trimmed === '' ? '' : ';';
      newBody = `${trimmed}${sep}\n  ${decl}: ${value};\n`;
    }
    return css.slice(0, root.bodyStart) + newBody + css.slice(root.bodyEnd);
  }
  // No :root block yet — prepend one.
  const block = `:root {\n  ${decl}: ${value};\n}\n\n`;
  return block + css;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Locate the body of the first `:root { ... }` rule. */
function findRootBody(css: string): { body: string; bodyStart: number; bodyEnd: number } | null {
  const re = /(^|[}\s])\s*:root\s*\{/i;
  const m = re.exec(css);
  if (!m) return null;
  const bodyStart = m.index + m[0].length;
  let depth = 1;
  let i = bodyStart;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    if (depth === 0) break;
    i++;
  }
  return { body: css.slice(bodyStart, i), bodyStart, bodyEnd: i };
}
