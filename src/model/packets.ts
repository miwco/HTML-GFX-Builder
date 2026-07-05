// The packet manager's data layer.
//
// Two kinds of saved things, both in localStorage:
//   - Packets: named collections of ACTUAL GRAPHICS (a show's lower third + ticker +
//     credits + bug together). Save the current graphic in, reopen any of them, export
//     the whole packet as one zip.
//   - Looks: named brand looks (palette + font + style family) that can be applied to
//     the current graphic, set as the project brand for new graphics, and shared as a
//     .json file.

import { getCssVariable, setCssVariable } from '../blocks/cssVars';
import {
  FONTS,
  customFontFaceCss,
  customFontStack,
  fontById,
  fontFaceCss,
  fontFormatForExt,
  fontStack,
  type CustomFont,
} from './fonts';
import { loadBrand, type ProjectBrand } from './brand';
import type { SpxTemplate, TemplateType } from './types';
import { extOf, isFontAsset } from '../assets/assetUtils';

// ── Packets (graphics collections) ───────────────────────────────────────────

export interface SavedGraphic {
  id: string;
  name: string;
  type: TemplateType;
  savedAt: string; // ISO date
  template: SpxTemplate;
}

export interface Packet {
  id: string;
  name: string;
  graphics: SavedGraphic[];
  /** When the packet last changed (ISO). Bumped on every mutation; drives Era-5 cloud sync (LWW). */
  updatedAt: string;
}

const PACKETS_KEY = 'spx-gfx-packets';
const LOOKS_KEY = 'spx-gfx-looks';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function loadList<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

/** Persist; returns an error message when the browser storage quota is hit. */
function saveList(key: string, list: unknown): string | null {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return null;
  } catch {
    return 'Browser storage is full — remove a graphic (large fonts/images count) or export and delete a packet.';
  }
}

export function loadPackets(): Packet[] {
  // Back-fill updatedAt for packets saved before Era 5 so every record has a sync timestamp.
  return loadList<Packet>(PACKETS_KEY).map((p) => (p.updatedAt ? p : { ...p, updatedAt: nowIso() }));
}

export function createPacket(name: string): Packet[] {
  const packets = loadPackets();
  packets.push({ id: newId(), name: name.trim() || 'Untitled packet', graphics: [], updatedAt: nowIso() });
  saveList(PACKETS_KEY, packets);
  return packets;
}

/**
 * Insert or replace a whole packet by id (used by the Era-5 storage seam's put('packet')).
 * Unlike createPacket this preserves the given id and its graphics.
 */
export function upsertPacket(packet: Packet): void {
  const packets = loadPackets();
  const i = packets.findIndex((p) => p.id === packet.id);
  if (i >= 0) packets[i] = packet;
  else packets.push(packet);
  saveList(PACKETS_KEY, packets);
}

/**
 * Save the current graphic into a packet. A graphic with the same NAME in the same
 * packet is replaced (saving twice = updating), so iterating on a show is natural.
 */
export function saveGraphicToPacket(packetId: string, template: SpxTemplate): { packets: Packet[]; error: string | null } {
  const packets = loadPackets();
  const packet = packets.find((p) => p.id === packetId);
  if (!packet) return { packets, error: 'That packet no longer exists.' };
  const graphic: SavedGraphic = {
    id: newId(),
    name: template.name,
    type: template.type,
    savedAt: new Date().toISOString(),
    template,
  };
  const existing = packet.graphics.findIndex((g) => g.name === template.name);
  if (existing >= 0) packet.graphics[existing] = graphic;
  else packet.graphics.push(graphic);
  packet.updatedAt = nowIso();
  return { packets, error: saveList(PACKETS_KEY, packets) };
}

export function removeGraphic(packetId: string, graphicId: string): Packet[] {
  const packets = loadPackets();
  const packet = packets.find((p) => p.id === packetId);
  if (packet) {
    packet.graphics = packet.graphics.filter((g) => g.id !== graphicId);
    packet.updatedAt = nowIso();
  }
  saveList(PACKETS_KEY, packets);
  return packets;
}

export function deletePacket(packetId: string): Packet[] {
  const packets = loadPackets().filter((p) => p.id !== packetId);
  saveList(PACKETS_KEY, packets);
  return packets;
}

// ── Looks (named brand looks) ────────────────────────────────────────────────

export interface SavedLook {
  id: string;
  name: string;
  brand: ProjectBrand;
  /** When the look last changed (ISO). Set on save; drives Era-5 cloud sync (LWW). */
  updatedAt: string;
}

export function loadLooks(): SavedLook[] {
  // Back-fill updatedAt for looks saved before Era 5 so every record has a sync timestamp.
  return loadList<SavedLook>(LOOKS_KEY).map((l) => (l.updatedAt ? l : { ...l, updatedAt: nowIso() }));
}

export function addLook(name: string, brand: ProjectBrand): SavedLook[] {
  const looks = loadLooks();
  looks.push({ id: newId(), name: name.trim() || 'Untitled look', brand, updatedAt: nowIso() });
  saveList(LOOKS_KEY, looks);
  return looks;
}

/**
 * Insert or replace a whole look by id (used by the Era-5 storage seam's put('look')).
 * Unlike addLook this preserves the given id.
 */
export function upsertLook(look: SavedLook): void {
  const looks = loadLooks();
  const i = looks.findIndex((l) => l.id === look.id);
  if (i >= 0) looks[i] = look;
  else looks.push(look);
  saveList(LOOKS_KEY, looks);
}

export function deleteLook(lookId: string): SavedLook[] {
  const looks = loadLooks().filter((l) => l.id !== lookId);
  saveList(LOOKS_KEY, looks);
  return looks;
}

/** Import a shared .json look file (shape-checked). Returns the new list or an error. */
export function importLook(json: string): { looks: SavedLook[] | null; error: string | null } {
  try {
    const parsed = JSON.parse(json) as Partial<SavedLook>;
    const brand = parsed.brand as ProjectBrand | undefined;
    if (!parsed.name || !brand?.palette?.accent || !brand.styleTag) {
      return { looks: null, error: 'Not a valid look file (missing name / palette / style).' };
    }
    return { looks: addLook(parsed.name, brand), error: null };
  } catch {
    return { looks: null, error: 'Could not read that file as JSON.' };
  }
}

// ── Capturing + applying a look ──────────────────────────────────────────────

/** The generated @font-face block both bundled and imported fonts carry. */
const FONT_BLOCK_RE = /\/\* (?:Bundled open-source|Imported) font[\s\S]*?\}/;

/**
 * Read the CURRENT template's look (colors straight from its :root vars — including any
 * Style-panel tweaks — plus its font). Falls back to the saved project brand.
 */
export function captureLookFromTemplate(template: SpxTemplate): ProjectBrand {
  const brand = loadBrand();
  const css = template.css;
  const val = (name: string, fallback: string) => getCssVariable(css, name) ?? fallback;

  // The font: match the css font-family against the bundled registry, else treat it as
  // an imported font whose file lives in the template's assets.
  const family = (css.match(/font-family:\s*"([^"]+)"/) || [])[1];
  const bundled = FONTS.find((f) => f.family === family);
  let customFont: CustomFont | null = null;
  if (!bundled && family) {
    const asset = template.assets.find((a) => isFontAsset(a.path));
    if (asset && typeof asset.data === 'string') {
      customFont = { family, format: fontFormatForExt(extOf(asset.path)), asset };
    }
  }

  return {
    styleTag: brand?.styleTag ?? 'minimal',
    palette: {
      id: 'captured',
      name: 'Captured',
      styleTags: [brand?.styleTag ?? 'minimal'],
      accent: val('accent', brand?.palette.accent ?? '#3aa0ff'),
      text: val('text-color', brand?.palette.text ?? '#ffffff'),
      textDim: val('text-dim', brand?.palette.textDim ?? 'rgba(255,255,255,0.7)'),
      panel: val('panel-bg', brand?.palette.panel ?? 'rgba(12,14,18,0.92)'),
    },
    fontId: bundled?.id ?? null,
    customFont,
  };
}

/**
 * Retint an EXISTING template with a look: rewrite the :root color vars and swap the
 * marked @font-face block (bundled or imported). Only the style contract is touched —
 * the user's own code stays intact.
 */
export function applyLookToTemplate(template: SpxTemplate, brand: ProjectBrand): SpxTemplate {
  let css = template.css;
  const setIf = (name: string, value: string) => {
    if (getCssVariable(css, name) !== null) css = setCssVariable(css, name, value);
  };
  setIf('accent', brand.palette.accent);
  setIf('text-color', brand.palette.text);
  setIf('text-dim', brand.palette.textDim);
  setIf('panel-bg', brand.palette.panel);

  let assets = template.assets;
  if (FONT_BLOCK_RE.test(css)) {
    if (brand.customFont) {
      css = css.replace(FONT_BLOCK_RE, customFontFaceCss(brand.customFont));
      setIf('font-heading', customFontStack(brand.customFont));
      // The look carries its font file — bundle it into this template too.
      assets = [...assets.filter((a) => a.path !== brand.customFont!.asset.path), brand.customFont.asset];
    } else if (brand.fontId) {
      const font = fontById(brand.fontId);
      css = css.replace(FONT_BLOCK_RE, fontFaceCss(font));
      setIf('font-heading', fontStack(font));
    }
  }

  return { ...template, css, assets };
}
