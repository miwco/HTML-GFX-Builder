// Small, deterministic helpers used by building blocks to edit the visible template code.
// Blocks return readable, well-commented code so users learn from the result.

import { replaceDefinitionInHtml } from '../model/spxDefinition';
import type { SpxField, SpxTemplate, TemplateLayer } from '../model/types';

/** Next free field id (f0, f1, f2...) given the current fields. */
export function nextFieldId(fields: SpxField[]): string {
  let max = -1;
  for (const f of fields) {
    const m = /^f(\d+)$/.exec(f.field);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `f${max + 1}`;
}

/** Insert an HTML snippet just before </body>. */
export function insertGraphicHtml(html: string, snippet: string): string {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${snippet}\n</body>`);
  }
  return html + snippet;
}

/** Append a CSS block (with a comment header) to the stylesheet. */
export function appendCss(css: string, header: string, body: string): string {
  return `${css}\n\n/* ${header} */\n${body}\n`;
}

/** Append a JS block (with a comment header) to the template script. */
export function appendJs(js: string, header: string, body: string): string {
  return `${js}\n\n// ${header}\n${body}\n`;
}

/** Add a field to the definition and re-serialize it back into the HTML. */
export function addFieldToDefinition(template: SpxTemplate, field: SpxField): SpxTemplate {
  const fields = [...template.fields, field];
  const html = replaceDefinitionInHtml(template.html, template.settings, fields);
  return { ...template, html, fields };
}

/**
 * Append a structured layer entry to the template's model. Layers are best-effort
 * metadata describing the visual elements — authoritative when produced by templates,
 * building blocks, or the AI. They prepare the architecture for future visual editing
 * without driving the live render (the code remains the source of truth).
 */
export function addLayer(template: SpxTemplate, layer: TemplateLayer): SpxTemplate {
  return { ...template, layers: [...template.layers, layer] };
}
