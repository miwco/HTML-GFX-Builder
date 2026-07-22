// Generate the standalone controlpanel.html bundled with an export: a self-contained
// operator page (inline CSS + JS, no dependencies) built from a graphic's fields and its
// state machine's control buttons. It drives the graphic over a BroadcastChannel — open the
// graphic (index.html) and this page in the same browser and operate it live.
//
// Same engine as the in-app Control tab: the SAME field descriptors (model/fieldModel.ts)
// and the SAME event-button merge (blocks/animMachine.ts machineControls). It only renders
// them in vanilla JS instead of React, because the exported page ships with no dependencies
// — keep this renderer in step with components/fields/FieldControl.tsx and ControlPanel.tsx.
//
// The page is show-shaped (Phase 5): it renders ONE CARD PER GRAPHIC, each on its own
// channel with its own state chip, event buttons, fields and lifecycle row. A single
// graphic is just a show of one — renderControlPanelHtml wraps the same page builder.

import type { SpxField } from '../model/types';
import type { FieldDescriptor } from '../model/fieldModel';
import { controlChannelName, eventButtons, eventLegality, fieldDescriptors, type ControlButton } from './controlModel';
import type { RemoteControlConfig } from './realtimeControl';
import { isImageAsset } from '../assets/assetUtils';

interface EmittedControl extends FieldDescriptor {
  value: string;
}

interface EmittedImage {
  value: string;
  label: string;
  src: string;
}

/** A saved data entry baked into the panel (model/library.ts ControlEntry, values only). */
interface EmittedEntry {
  id: string;
  label: string;
  values: Record<string, string>;
}

/** Everything the page needs to render and drive ONE graphic. */
interface EmittedGraphic {
  name: string;
  channel: string;
  controls: EmittedControl[];
  events: ControlButton[];
  /** event -> group -> the states it fires from (the structural guard, precomputed). */
  legal: Record<string, Record<string, string[]>>;
  images: EmittedImage[];
  /** Saved entries the operator switches between (docs/SAVED_CONTENT_MODEL.md §4). */
  entries: EmittedEntry[];
  /** {ref,key,topic} when this graphic has remote control enabled, else null. */
  remote: RemoteControlConfig | null;
}

/** The template shape the panel needs (SpxTemplate satisfies it). */
export interface PanelTemplate {
  name: string;
  fields: SpxField[];
  js: string;
  assets: { path: string; data?: unknown }[];
}

/** The descriptors + their current values, serialized into the page's generic renderer. */
function emitControls(fields: SpxField[]): EmittedControl[] {
  const byId = new Map(fields.map((f) => [f.field, f]));
  return fieldDescriptors(fields).map((d) => ({ ...d, value: byId.get(d.key)?.value ?? '' }));
}

function emitGraphic(
  template: PanelTemplate,
  remote: RemoteControlConfig | null,
  opts?: { inlineAssets?: boolean; entries?: EmittedEntry[] },
): EmittedGraphic {
  const images = template.assets
    .filter((a) => isImageAsset(a.path))
    .map((a) => {
      const dataUrl = typeof a.data === 'string' && a.data.startsWith('data:') ? a.data : null;
      return {
        value: opts?.inlineAssets && dataUrl ? dataUrl : a.path,
        label: a.path,
        // The thumbnail prefers the embedded bytes wherever we have them: it then renders in
        // the panel even when the panel is opened on its own, away from the package.
        src: dataUrl ?? a.path,
      };
    });
  return {
    name: template.name,
    channel: controlChannelName(template.name),
    controls: emitControls(template.fields),
    events: eventButtons(template.js),
    legal: eventLegality(template.js),
    images,
    entries: (opts?.entries ?? []).map((e) => ({ id: e.id, label: e.label, values: e.values })),
    remote,
  };
}

/** Safe to drop inside a <script> as a JS string/JSON literal (guards `</script>`). */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * `inlineAssets` is the packaging shape, not a preference. Beside a FOLDER package the panel
 * and the graphic both sit next to a real images/ folder, so a relative path is the right
 * value to send — it is also what an SPX operator expects a filelist field to hold. Beside a
 * SINGLE-FILE export there is no folder: a relative path paints nothing in the panel and,
 * worse, blanks a correctly-inlined image on the graphic the moment it is sent. There the
 * data: URL is the only value that resolves at both ends.
 */
export function renderControlPanelHtml(
  template: PanelTemplate,
  remote?: RemoteControlConfig | null,
  opts?: { inlineAssets?: boolean; entries?: EmittedEntry[] },
): string {
  return renderPanelPage(template.name, [emitGraphic(template, remote ?? null, opts)]);
}

/** One graphic in a show's aggregated panel: its template plus the saved entries resolved for
 *  it (out of the library, at export time — export/showExport.ts). */
export interface ShowPanelGraphic {
  template: PanelTemplate;
  entries?: EmittedEntry[];
}

/**
 * A SHOW's aggregated control page: one card per graphic, rundown order, each driving its
 * own channel. In a show package every graphic sits in its own folder, so image fields send
 * folder-relative paths prefixed with the graphic's folder — handled by the caller passing
 * per-graphic asset paths as they are (the operator runs each graphic from its folder). Each
 * graphic carries its own saved entries, so the aggregated page has the same entry switcher
 * per card as the standalone panel does (docs/SAVED_CONTENT_MODEL.md §4).
 */
export function renderShowControlPanelHtml(
  showName: string,
  graphics: ShowPanelGraphic[],
  opts?: { inlineAssets?: boolean },
): string {
  return renderPanelPage(
    showName,
    graphics.map((g) => emitGraphic(g.template, null, { ...opts, entries: g.entries })),
  );
}

function renderPanelPage(title: string, graphics: EmittedGraphic[]): string {
  const anyRemote = graphics.some((g) => g.remote);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — control panel</title>
<style>
  :root { --bg:#10141b; --panel:#171d26; --line:#2a3444; --text:#e8ecf2; --dim:#8b95a5; --accent:#3aa0ff; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui, sans-serif; }
  header { padding:14px 18px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:12px; position:sticky; top:0; background:var(--bg); z-index:2; }
  header h1 { font-size:16px; margin:0; }
  header .live { margin-left:auto; }
  header .status { font-size:12px; color:var(--dim); }
  main { max-width:680px; margin:0 auto; padding:18px; display:flex; flex-direction:column; gap:16px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px 16px; }
  .card > h2 { font-size:14px; margin:0 0 4px; display:flex; align-items:center; gap:10px; }
  .state-chip { font-size:12px; font-weight:400; color:var(--accent); border:1px solid var(--line); border-radius:999px; padding:1px 10px; display:none; }
  .staged-chip { font-size:12px; font-weight:400; color:#e8b34a; display:none; }
  .row { display:flex; gap:8px; align-items:center; }
  .field { padding:10px 0; border-bottom:1px solid var(--line); }
  .field:last-child { border-bottom:none; }
  .field > label { display:block; font-size:12px; text-transform:uppercase; letter-spacing:.5px; color:var(--dim); margin-bottom:6px; }
  input, textarea, select, button { font:inherit; color:var(--text); background:var(--bg); border:1px solid var(--line); border-radius:6px; padding:8px 10px; }
  input, textarea, select { width:100%; }
  textarea { min-height:96px; resize:vertical; }
  button { cursor:pointer; background:#243044; }
  button:hover { border-color:var(--accent); }
  .step { width:44px; flex:0 0 auto; font-weight:700; }
  .num-input { text-align:center; }
  .events h3 { font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:var(--dim); margin:10px 0 6px; font-weight:600; }
  .events .btns { display:flex; flex-wrap:wrap; gap:8px; }
  .events button { min-width:96px; }
  .events button:disabled { opacity:.4; cursor:default; }
  .events button:disabled:hover { border-color:var(--line); }
  .events button.destructive { border-color:#8a4a2a; background:#2d1c12; }
  .events button.destructive:hover { border-color:#e0763a; }
  /* The cue row is pressed live, in a hurry, sometimes on a tablet beside the vision desk:
     every button is a comfortable target (44px, the standard touch minimum). */
  .actions { display:flex; gap:8px; padding-top:12px; }
  .actions button { min-height:44px; padding:10px 16px; }
  .actions .primary { background:var(--accent); color:#06131f; border-color:var(--accent); font-weight:700; flex:1; }
  .live { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--dim); }
  .thumb { width:40px; height:40px; object-fit:contain; background:var(--bg); border:1px solid var(--line); border-radius:6px; }
</style>
</head>
<body>
<header>
  <h1>${title}</h1>
  <span class="status" id="status">connecting…</span>
  <label class="live"><input type="checkbox" id="live" checked style="width:auto" /> live</label>
</header>
<main id="cards"></main>
<script>
var GRAPHICS = ${jsonForScript(graphics)};  // one card per graphic: fields, event buttons, legality, channel

function el(tag, attrs, kids) {
  var e = document.createElement(tag);
  for (var k in (attrs || {})) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
  (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}

function live() { return document.getElementById('live').checked; }

function clamp(c, n) {
  if (c.min != null) n = Math.max(c.min, n);
  if (c.max != null) n = Math.min(c.max, n);
  return n;
}

// One card per graphic, each with its OWN channel, state and controls — a show drives its
// graphics independently (the bug stays up while the lower third changes hands).
var connected = 0;
GRAPHICS.forEach(function (g) {
  // ── The EVENT LOG (Phase 5): every command this panel sends, timestamped, in
  // localStorage per channel. It is what makes refresh survivable in both directions:
  // a reloaded PANEL seeds its fields and state chip from the log instead of the
  // definition defaults, and a reloaded GRAPHIC announces itself ('graphic-online') and
  // is rebuilt from it — the latest data first, then a snap to the last known state
  // (reset is two operations, and recovery is both). The log keeps a capped history of
  // sent commands (transition history; later undo) plus the merged latest data and the
  // last state the graphic reported.
  var logKey = 'noacg-log-' + g.channel;
  var log = null;
  try { log = JSON.parse(localStorage.getItem(logKey) || 'null'); } catch (e) { /* fresh */ }
  if (!log || log.v !== 1) log = { v: 1, seq: 0, sent: [], data: null, state: null };
  function persistLog() { try { localStorage.setItem(logKey, JSON.stringify(log)); } catch (e) { /* full — the show goes on un-logged */ } }
  function record(msg) {
    log.seq++;
    log.sent.push({ seq: log.seq, at: new Date().toISOString(), msg: msg });
    if (log.sent.length > 200) log.sent.splice(0, log.sent.length - 200);
    if (msg.t === 'update') log.data = Object.assign({}, log.data || {}, msg.data);
    // An accepted event applies its payload through the same field path as an update, so
    // the log's "latest data" must carry it or recovery would rebuild pre-event values.
    // (If the guard dropped the event the merge is slightly ahead of the graphic — the
    // greyed buttons make that the rare case, and recovery stays self-consistent.)
    if (msg.t === 'event' && msg.payload) log.data = Object.assign({}, log.data || {}, msg.payload);
    persistLog();
  }

  // State: current value per field — the definition defaults, overlaid with the log's
  // latest sent data so a reloaded panel resumes where the operator left off.
  var state = {};
  g.controls.forEach(function (c) { state[c.key] = c.value; });
  if (log.data) { for (var k in log.data) { if (state[k] !== undefined) state[k] = log.data[k]; } }

  // Transport 1: BroadcastChannel to a graphic on the SAME machine.
  var ch = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel(g.channel) : null;
  if (ch) connected++;

  // Transport 2 (optional): Supabase Realtime — drive a graphic on ANY device. Send-only,
  // via the stateless REST broadcast endpoint (no socket/join needed for a sender). Public
  // channel + publishable key; the TOPIC is a shared secret.
  function sendRemote(msg) {
    if (!g.remote) return;
    fetch('https://' + g.remote.ref + '.supabase.co/realtime/v1/api/broadcast', {
      method: 'POST',
      headers: { apikey: g.remote.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ topic: g.remote.topic, event: 'control', payload: msg, private: false }] })
    }).catch(function () { /* offline / blocked — the local BroadcastChannel path still works */ });
  }

  function post(msg) { if (ch) ch.postMessage(msg); sendRemote(msg); if (msg.t !== 'hello') record(msg); }
  // PREPARED vs PUBLISHED: with Live off, edits stay in this panel (staged — the badge
  // says so) and go on air only on an explicit ⟳ Take / ▶ Play. Nothing airs merely
  // because it was typed.
  var lastSent = {};
  for (var sk in state) lastSent[sk] = state[sk];
  var stagedChip = null;
  function paintStaged() {
    if (!stagedChip) return;
    var dirty = false;
    for (var dk in state) { if (state[dk] !== lastSent[dk]) { dirty = true; break; } }
    stagedChip.style.display = dirty && !live() ? 'inline' : 'none';
  }
  function sendUpdate() {
    post({ t: 'update', data: state });
    for (var uk in state) lastSent[uk] = state[uk];
    paintStaged();
  }
  function onChange(field, value) { state[field] = value; if (live()) sendUpdate(); else paintStaged(); }

  function buildControl(c) {
    var wrap = el('div', { class: 'field' }, [el('label', {}, [c.label])]);
    var v = state[c.key];
    if (c.kind === 'number') {
      var input = el('input', { type: 'number', class: 'num-input' });
      input.value = v || '0';
      input.oninput = function () { onChange(c.key, input.value); };
      var minus = el('button', { class: 'step' }, ['−']);
      var plus = el('button', { class: 'step' }, ['+']);
      // A declared step fixes the increment; a field that declares none (every SPX number
      // field) lets the operator pick the bump size — the same rule the in-app control uses.
      var stepBox = el('input', { type: 'number', class: 'num-input', title: 'step size', style: 'width:56px;flex:0 0 auto' });
      stepBox.value = String(c.step != null ? c.step : 1);
      function bump(dir) {
        var s = c.step != null ? c.step : (parseFloat(stepBox.value) || 1);
        input.value = String(clamp(c, (parseFloat(input.value) || 0) + dir * s));
        onChange(c.key, input.value);
      }
      minus.onclick = function () { bump(-1); };
      plus.onclick = function () { bump(1); };
      var kids = [minus, input, plus];
      if (c.step == null) kids.push(stepBox);
      wrap.appendChild(el('div', { class: 'row' }, kids));
    } else if (c.kind === 'lines') {
      var ta = el('textarea', { placeholder: 'one entry per line' });
      ta.value = v || '';
      ta.oninput = function () { onChange(c.key, ta.value); };
      wrap.appendChild(ta);
    } else if (c.kind === 'select') {
      var sel = el('select');
      (c.options || []).forEach(function (o) { var opt = el('option', { value: o.value }, [o.label]); if (o.value === v) opt.selected = true; sel.appendChild(opt); });
      sel.onchange = function () { onChange(c.key, sel.value); };
      wrap.appendChild(sel);
    } else if (c.kind === 'toggle') {
      var cb = el('input', { type: 'checkbox', style: 'width:auto' });
      cb.checked = (v === '1' || v === 'true');
      cb.onchange = function () { onChange(c.key, cb.checked ? '1' : '0'); };
      wrap.appendChild(el('label', { class: 'row' }, [cb, 'enabled']));
    } else if (c.kind === 'color') {
      var col = el('input', { type: 'color', style: 'width:44px;flex:0 0 auto' });
      col.value = /^#/.test(v) ? v : '#000000';
      var txt = el('input', { type: 'text' }); txt.value = v || '';
      col.oninput = function () { txt.value = col.value; onChange(c.key, col.value); };
      txt.oninput = function () { onChange(c.key, txt.value); };
      wrap.appendChild(el('div', { class: 'row' }, [col, txt]));
    } else if (c.kind === 'image') {
      // Each entry is { value, label, src }: the LABEL is always the readable asset path, the
      // SRC is what this panel paints its thumbnail with, and the VALUE is what gets sent to
      // the graphic. They differ beside a single-file export, which has no images/ folder for
      // a relative path to resolve against — there the value and the src are the data: URL.
      var isel = el('select', { class: 'grow' });
      isel.appendChild(el('option', { value: '' }, ['None']));
      var byValue = {};
      g.images.forEach(function (a) {
        byValue[a.value] = a.src;
        var opt = el('option', { value: a.value }, [a.label]);
        if (a.value === v || a.label === v) opt.selected = true;
        isel.appendChild(opt);
      });
      var img = el('img', { class: 'thumb', alt: '' });
      function paint(val) { if (val) img.setAttribute('src', byValue[val] || val); else img.removeAttribute('src'); }
      paint(isel.value || v);
      isel.onchange = function () { paint(isel.value); onChange(c.key, isel.value); };
      wrap.appendChild(el('div', { class: 'row' }, [isel, img]));
    } else {
      var t = el('input', { type: 'text' }); t.value = v || '';
      t.oninput = function () { onChange(c.key, t.value); };
      wrap.appendChild(t);
    }
    return wrap;
  }

  // ── The card ──
  var chip = el('span', { class: 'state-chip', title: "The graphic's current machine state" });
  stagedChip = el('span', { class: 'staged-chip', title: 'Edits staged in this panel — not on air until you Take' }, ['● staged']);
  var card = el('div', { class: 'card' }, [el('h2', {}, [g.name, chip, stagedChip])]);

  // Machine event buttons, grouped by section. A button carries its payload fields' CURRENT
  // values, applied only if the machine accepts the event (the atomic multi-part change).
  // While we know the graphic's state (it answers on the channel), a button the machine
  // would drop is greyed; before the first answer everything is enabled and the structural
  // guard decides.
  var machineState = log.state; // last known — honest until the live graphic answers hello
  var eventBtns = [];
  function legalNow(ev) {
    if (!machineState) return true;
    var perGroup = g.legal[ev];
    if (!perGroup) return false;
    for (var gid in perGroup) {
      if (perGroup[gid].indexOf(machineState.groups[gid]) !== -1) return true;
    }
    return false;
  }
  function paintState() {
    if (machineState) {
      var parts = [];
      var many = Object.keys(machineState.groups).length > 1;
      for (var gid in machineState.groups) parts.push((many ? gid + ': ' : '') + machineState.groups[gid]);
      chip.textContent = parts.join(' · ');
      chip.style.display = 'inline-block';
    }
    eventBtns.forEach(function (entry) { entry.btn.disabled = !legalNow(entry.event); });
  }
  function sendEvent(e) {
    var payload = null;
    (e.payload || []).forEach(function (key) {
      if (state[key] !== undefined) { payload = payload || {}; payload[key] = state[key]; }
    });
    post(payload ? { t: 'event', event: e.event, payload: payload } : { t: 'event', event: e.event });
    // The payload just aired those fields — they are no longer merely staged.
    if (payload) { for (var pk in payload) lastSent[pk] = payload[pk]; paintStaged(); }
  }
  if (g.events.length > 0) {
    var evHost = el('div', { class: 'events' });
    var sections = {};
    g.events.forEach(function (e) {
      var name = e.section || 'Events';
      if (!sections[name]) {
        var wrap = el('div', {}, [el('h3', {}, [name])]);
        sections[name] = el('div', { class: 'btns' });
        wrap.appendChild(sections[name]);
        evHost.appendChild(wrap);
      }
      var btn = el('button', e.destructive ? { class: 'destructive' } : {}, ['⚡ ' + e.label]);
      btn.onclick = function () { sendEvent(e); };
      sections[name].appendChild(btn);
      eventBtns.push({ event: e.event, btn: btn });
    });
    card.appendChild(evHost);
  }

  // ── Saved ENTRIES: named data rows baked into the panel. Selecting one loads its values
  // into the fields (staged under the same Live rule as typing); ▶ plays the graphic with
  // it — the lower-third rundown flow: pick "Anna · Presenter", play, pick the next, play.
  var fieldHost = el('div', {});
  function rebuildFields() {
    while (fieldHost.firstChild) fieldHost.removeChild(fieldHost.firstChild);
    g.controls.forEach(function (c) { fieldHost.appendChild(buildControl(c)); });
    if (g.controls.length === 0) fieldHost.appendChild(el('p', {}, ['This graphic has no editable fields.']));
  }
  if (g.entries.length > 0) {
    var entrySel = el('select', {});
    g.entries.forEach(function (en, i) { entrySel.appendChild(el('option', { value: String(i) }, [en.label])); });
    function applyEntry(send) {
      var en = g.entries[parseInt(entrySel.value, 10)];
      if (!en) return;
      for (var ek in en.values) { if (state[ek] !== undefined) state[ek] = en.values[ek]; }
      rebuildFields();
      if (send || live()) sendUpdate(); else paintStaged();
    }
    var entryPlay = el('button', { class: 'primary', title: 'Play the graphic with this entry' }, ['▶ Play entry']);
    entryPlay.onclick = function () { applyEntry(true); post({ t: 'play' }); };
    var entryLoad = el('button', { title: 'Load this entry into the fields (airs on Take unless live)' }, ['Load']);
    entryLoad.onclick = function () { applyEntry(false); };
    entrySel.onchange = function () { applyEntry(false); };
    var entriesWrap = el('div', { class: 'events' }, [el('h3', {}, ['Entries'])]);
    entriesWrap.appendChild(el('div', { class: 'row' }, [entrySel, entryLoad, entryPlay]));
    card.appendChild(entriesWrap);
  }
  rebuildFields();
  card.appendChild(fieldHost);

  var play = el('button', { class: 'primary' }, ['▶ Play']);
  var stop = el('button', {}, ['■ Stop']);
  var upd = el('button', { title: 'Take the staged values on air' }, ['⟳ Take']);
  var next = el('button', {}, ['» Next']);
  play.onclick = function () { sendUpdate(); post({ t: 'play' }); };
  stop.onclick = function () { post({ t: 'stop' }); };
  upd.onclick = sendUpdate;
  next.onclick = function () { post({ t: 'next' }); };
  card.appendChild(el('div', { class: 'actions' }, [play, stop, upd, next]));

  document.getElementById('cards').appendChild(card);
  paintState();
  paintStaged();

  if (ch) ch.onmessage = function (ev) {
    var m = ev.data || {};
    // The graphic answers every message (and 'hello') with its machine state.
    if (m.t === 'state' && m.state) { machineState = m.state; log.state = m.state; persistLog(); paintState(); }
    // A rebooted graphic (browser-source refresh, crash) announces itself: rebuild it from
    // the log — the latest data first (the data half of reset), then snap to the last known
    // state (the visual half; timers arm, recovery semantics). First boot has nothing
    // logged and replays nothing.
    else if (m.t === 'graphic-online') {
      if (log.data) post({ t: 'update', data: log.data });
      if (log.state) post({ t: 'snap', snap: log.state.groups });
    }
  };
  if (ch) post({ t: 'hello' });
});

document.getElementById('status').textContent =
  ${jsonForScript(anyRemote)} ? 'remote + local' :
  (connected > 0 ? (GRAPHICS.length === 1 ? 'local channel: ' + GRAPHICS[0].channel : connected + ' local channels') : 'BroadcastChannel unsupported');
</script>
</body>
</html>`;
}
