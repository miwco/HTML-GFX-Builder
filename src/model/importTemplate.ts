// Import an EXISTING template to edit or convert: a single .html file, or an SPX-style
// zip (index.html + css/ + js/ + images/ + fonts/). The file is split into the editor's
// three panes; the SPX definition (if any) stays in the HTML, exactly like generated
// templates. Foreign templates rarely follow the house contracts — the Style/Motion
// panels degrade gracefully, validation shows what's missing, and the AI panel's
// "Make SPX-ready" is the guided fix path. Converting to SPX / CasparCG / OGraf after
// import is just the normal Export tab.

import JSZip from 'jszip';
import { ensureExternalRefs } from '../export/common';
import { parseDefinition } from './spxDefinition';
import { DEFAULT_SETTINGS, RESOLUTIONS, type AssetFile, type SpxTemplate } from './types';

const ASSET_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
};

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Imported template';
}

/** Split a single HTML document into the html/css/js panes. */
export function importHtmlTemplate(fileName: string, raw: string, extra?: { css?: string; js?: string; assets?: AssetFile[] }): SpxTemplate {
  const styles: string[] = [];
  const scripts: string[] = [];

  // Inline <style> blocks move to the CSS pane.
  let html = raw.replace(/[ \t]*<style\b[^>]*>([\s\S]*?)<\/style>\s*/gi, (_m, body: string) => {
    if (body.trim()) styles.push(body.trim());
    return '';
  });

  // Inline <script> blocks move to the JS pane — except the SPX definition (it belongs in
  // the HTML, like our own templates) and a bundled GSAP (ours is re-added at export/preview).
  html = html.replace(/[ \t]*<script\b([^>]*)>([\s\S]*?)<\/script>\s*/gi, (full: string, attrs: string, body: string) => {
    if (/\bsrc\s*=/i.test(attrs)) return full; // external reference — keep in place
    if (/SPXGCTemplateDefinition/.test(body)) return full;
    const trimmed = body.trim();
    if (!trimmed) return '';
    if (trimmed.length > 12000 && /gsap|GreenSock/i.test(trimmed.slice(0, 400))) return '';
    scripts.push(trimmed);
    return '';
  });

  // Standard external refs (css/template.css, js/gsap.min.js, js/template.js) so the
  // exported package works — no-ops when they already exist or there is no <head>.
  html = ensureExternalRefs(html);

  const name = (raw.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || baseName(fileName);
  const parsed = parseDefinition(html);

  return {
    name,
    type: 'blank',
    resolution: RESOLUTIONS[0],
    fps: 25,
    html,
    css: [extra?.css, ...styles].filter(Boolean).join('\n\n'),
    js: [extra?.js, ...scripts].filter(Boolean).join('\n\n'),
    fields: parsed?.fields ?? [],
    settings: parsed?.settings ?? { ...DEFAULT_SETTINGS, description: name },
    assets: extra?.assets ?? [],
    layers: [],
  };
}

function toDataUrl(mime: string, bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/** Import an SPX-style zip: locate the html, pull in css/js files and binary assets. */
export async function importZipTemplate(fileName: string, data: ArrayBuffer): Promise<SpxTemplate> {
  const zip = await JSZip.loadAsync(data);
  const files = Object.keys(zip.files).filter((n) => !zip.files[n].dir);

  // The entry point: prefer an index.html anywhere (shallowest first), else any .html.
  const htmls = files.filter((n) => n.toLowerCase().endsWith('.html')).sort((a, b) => a.split('/').length - b.split('/').length);
  const entry = htmls.find((n) => n.toLowerCase().endsWith('index.html')) ?? htmls[0];
  if (!entry) throw new Error('No .html file found in the zip.');
  const base = entry.includes('/') ? entry.slice(0, entry.lastIndexOf('/') + 1) : '';
  const inBase = (n: string) => n.startsWith(base) && n !== entry;
  const rel = (n: string) => n.slice(base.length);

  const read = (n: string) => zip.file(n)!.async('string');
  const html = await read(entry);

  // CSS/JS files referenced the standard way (any others are concatenated too).
  const cssFiles = files.filter((n) => inBase(n) && n.toLowerCase().endsWith('.css'));
  const jsFiles = files.filter(
    (n) => inBase(n) && n.toLowerCase().endsWith('.js') && !/gsap\.min\.js$|spx_interface\.js$/i.test(n),
  );
  const css = (await Promise.all(cssFiles.map(read))).join('\n\n');
  const js = (await Promise.all(jsFiles.map(read))).join('\n\n');

  // Binary assets keep their relative paths (images/…, fonts/…, assets/…).
  const assets: AssetFile[] = [];
  for (const n of files) {
    const ext = n.split('.').pop()?.toLowerCase() ?? '';
    if (inBase(n) && ASSET_MIME[ext]) {
      assets.push({ path: rel(n), data: toDataUrl(ASSET_MIME[ext], await zip.file(n)!.async('uint8array')) });
    }
  }

  return importHtmlTemplate(fileName.replace(/\.zip$/i, '') || rel(entry), html, { css, js, assets });
}

/** Dispatch a dropped/browsed file to the right importer. */
export async function importTemplateFile(file: File): Promise<SpxTemplate> {
  if (file.name.toLowerCase().endsWith('.zip')) {
    return importZipTemplate(file.name, await file.arrayBuffer());
  }
  return importHtmlTemplate(file.name, await file.text());
}

/** True when a file is a template import (vs an image for the graphics flow). */
export function isTemplateFile(file: File): boolean {
  return /\.(html?|zip)$/i.test(file.name);
}
