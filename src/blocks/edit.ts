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

/** How many block-inserted elements already exist (tagged data-gfx), used to stagger new ones. */
export function gfxCount(html: string): number {
  return (html.match(/data-gfx/g) || []).length;
}

/**
 * A sensible lower-left, action-safe position for a newly inserted element. Staggers upward
 * (raising `bottom`) when other inserted elements exist so they don't pile up or overlap.
 * Returns template px for the current resolution.
 */
export function positionForNewElement(template: SpxTemplate): { left: number; bottom: number } {
  const { width, height } = template.resolution;
  const left = Math.round(width * 0.062); // ~action-safe inset from the left
  const baseBottom = Math.round(height * 0.13); // lower-third band
  const step = Math.round(height * 0.11);
  const bottom = baseBottom + gfxCount(template.html) * step;
  return { left, bottom: Math.min(bottom, height - 120) };
}

/**
 * Rich, commented CSS for a broadcast text element. Includes the genuinely useful properties
 * (position, color, font, line-height, letter-spacing, white-space, text-shadow) each briefly
 * commented so the generated code teaches. `extra` adds block-specific lines.
 */
export function textCssRule(
  selector: string,
  opts: { left: number; bottom?: number; top?: number; fontSize: number; fontWeight?: number; color?: string; extra?: string },
): string {
  const { left, bottom, top, fontSize, fontWeight = 700, color = '#ffffff', extra } = opts;
  const vertical =
    bottom != null
      ? `  bottom: ${bottom}px;             /* distance from the bottom edge of frame */`
      : `  top: ${top ?? 80}px;             /* distance from the top edge of frame */`;
  return `${selector} {
  position: absolute;          /* place freely on the canvas */
  left: ${left}px;             /* distance from the left edge */
${vertical}
  color: ${color};             /* text colour */
  font-family: "Open Sans", Arial, sans-serif;  /* swap in a brand font via the Brand tab */
  font-size: ${fontSize}px;    /* large enough to read on screen */
  font-weight: ${fontWeight};  /* 400 normal · 700 bold · up to 900 */
  line-height: 1.15;           /* spacing between wrapped lines */
  letter-spacing: 0.01em;      /* subtle tracking */
  white-space: nowrap;         /* keep a lower third on one line */
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);  /* legibility over video */${extra ? '\n' + extra : ''}
}`;
}
