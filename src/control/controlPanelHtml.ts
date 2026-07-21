// Generate the standalone controlpanel.html bundled with an export: a self-contained
// operator page (inline CSS + JS, no dependencies) built from the template's fields. It
// drives the graphic over a BroadcastChannel — open the graphic (index.html) and this page
// in the same browser and operate it live.
//
// Same engine as the in-app Control tab: the SAME field descriptors (model/fieldModel.ts),
// the same kinds, the same semantics. It only renders them in vanilla JS instead of React,
// because the exported page ships with no dependencies — keep this renderer in step with
// components/fields/FieldControl.tsx.

import type { SpxField } from '../model/types';
import type { FieldDescriptor } from '../model/fieldModel';
import { parseAnimData } from '../blocks/animData';
import { controlChannelName, eventButtons, fieldDescriptors } from './controlModel';
import type { RemoteControlConfig } from './realtimeControl';
import { isImageAsset } from '../assets/assetUtils';

interface EmittedControl extends FieldDescriptor {
  value: string;
}

/** Which states each event fires from, per group — the panel greys a button the machine
 *  would drop (same structural guard, precomputed so the page needs no graph code). */
function emitLegality(js: string): Record<string, Record<string, string[]>> {
  const machine = parseAnimData(js)?.machine;
  const legal: Record<string, Record<string, string[]>> = {};
  if (!machine) return legal;
  for (const group of machine.groups) {
    for (const t of group.transitions) {
      if (t.trigger !== 'operator' || !t.event) continue;
      const perGroup = (legal[t.event] ??= {});
      (perGroup[group.id] ??= []).push(t.from);
    }
  }
  return legal;
}

/** The descriptors + their current values, serialized into the page's generic renderer. */
function emitControls(fields: SpxField[]): EmittedControl[] {
  const byId = new Map(fields.map((f) => [f.field, f]));
  return fieldDescriptors(fields).map((d) => ({ ...d, value: byId.get(d.key)?.value ?? '' }));
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
  template: { name: string; fields: SpxField[]; js: string; assets: { path: string; data?: unknown }[] },
  remote?: RemoteControlConfig | null,
  opts?: { inlineAssets?: boolean },
): string {
  const channel = controlChannelName(template.name);
  const controls = emitControls(template.fields);
  const events = eventButtons(template.js);
  const legality = emitLegality(template.js);
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${template.name} — control panel</title>
<style>
  :root { --bg:#10141b; --panel:#171d26; --line:#2a3444; --text:#e8ecf2; --dim:#8b95a5; --accent:#3aa0ff; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui, sans-serif; }
  header { padding:14px 18px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:12px; }
  header h1 { font-size:16px; margin:0; }
  header .status { margin-left:auto; font-size:12px; color:var(--dim); }
  header .state-chip { font-size:12px; color:var(--accent); border:1px solid var(--line); border-radius:999px; padding:2px 10px; display:none; }
  main { max-width:640px; margin:0 auto; padding:18px; }
  .events { padding:12px 0; border-bottom:1px solid var(--line); }
  .events h2 { font-size:12px; text-transform:uppercase; letter-spacing:.5px; color:var(--dim); margin:10px 0 6px; font-weight:600; }
  .events .btns { display:flex; flex-wrap:wrap; gap:8px; }
  .events button { min-width:96px; }
  .events button:disabled { opacity:.4; cursor:default; }
  .events button:disabled:hover { border-color:var(--line); }
  .events button.destructive { border-color:#8a4a2a; background:#2d1c12; }
  .events button.destructive:hover { border-color:#e0763a; }
  .row { display:flex; gap:8px; align-items:center; }
  .field { padding:10px 0; border-bottom:1px solid var(--line); }
  .field > label { display:block; font-size:12px; text-transform:uppercase; letter-spacing:.5px; color:var(--dim); margin-bottom:6px; }
  input, textarea, select, button { font:inherit; color:var(--text); background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:8px 10px; }
  input, textarea, select { width:100%; }
  textarea { min-height:96px; resize:vertical; }
  button { cursor:pointer; background:#243044; }
  button:hover { border-color:var(--accent); }
  .step { width:44px; flex:0 0 auto; font-weight:700; }
  .num-input { text-align:center; }
  .actions { position:sticky; bottom:0; background:var(--bg); border-top:1px solid var(--line); padding:14px 18px; display:flex; gap:8px; }
  .actions .primary { background:var(--accent); color:#06131f; border-color:var(--accent); font-weight:700; flex:1; }
  .live { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--dim); }
  .thumb { width:40px; height:40px; object-fit:contain; background:var(--panel); border:1px solid var(--line); border-radius:6px; }
</style>
</head>
<body>
<header>
  <h1>${template.name}</h1>
  <span class="state-chip" id="state-chip" title="The graphic's current machine state"></span>
  <span class="status" id="status">connecting…</span>
</header>
<main>
  <div id="events"></div>
  <div id="fields"></div>
</main>
<div class="actions">
  <label class="live"><input type="checkbox" id="live" checked style="width:auto" /> live</label>
  <button class="primary" id="play">▶ Play</button>
  <button id="stop">■ Stop</button>
  <button id="update">⟳ Update</button>
  <button id="next">» Next</button>
</div>
<script>
var CONTROLS = ${jsonForScript(controls)};
var EVENTS = ${jsonForScript(events)};       // machine event buttons: {event,label,section?,payload?,destructive?}
var LEGAL = ${jsonForScript(legality)};      // event -> group -> the states it fires from (the structural guard)
var IMAGES = ${jsonForScript(images)};
var CHANNEL = ${jsonForScript(channel)};
var REMOTE = ${jsonForScript(remote ?? null)};   // {ref,key,topic} when remote control is enabled, else null

// State: current value per field, seeded from the definition defaults.
var state = {};
CONTROLS.forEach(function (c) { state[c.key] = c.value; });

// Transport 1: BroadcastChannel to a graphic on the SAME machine (Era 4).
var ch = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel(CHANNEL) : null;

// Transport 2 (optional): Supabase Realtime — drive a graphic on ANY device (Era 5). Send-only,
// via the stateless REST broadcast endpoint (no socket/join needed for a sender). Public channel +
// publishable key; the TOPIC is a shared secret.
function sendRemote(msg) {
  if (!REMOTE) return;
  fetch('https://' + REMOTE.ref + '.supabase.co/realtime/v1/api/broadcast', {
    method: 'POST',
    headers: { apikey: REMOTE.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ topic: REMOTE.topic, event: 'control', payload: msg, private: false }] })
  }).catch(function () { /* offline / blocked — the local BroadcastChannel path still works */ });
}

document.getElementById('status').textContent =
  REMOTE ? ('remote + local · ' + REMOTE.topic) : (ch ? ('local channel: ' + CHANNEL) : 'BroadcastChannel unsupported');

function post(msg) { if (ch) ch.postMessage(msg); sendRemote(msg); }
function sendUpdate() { post({ t: 'update', data: state }); }
function live() { return document.getElementById('live').checked; }
function onChange(field, value) { state[field] = value; if (live()) sendUpdate(); }

function el(tag, attrs, kids) {
  var e = document.createElement(tag);
  for (var k in (attrs || {})) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
  (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}

function clamp(c, n) {
  if (c.min != null) n = Math.max(c.min, n);
  if (c.max != null) n = Math.min(c.max, n);
  return n;
}

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
    IMAGES.forEach(function (a) {
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

var host = document.getElementById('fields');
CONTROLS.forEach(function (c) { host.appendChild(buildControl(c)); });
if (CONTROLS.length === 0) host.appendChild(el('p', {}, ['This template has no editable fields.']));

// ── Machine event buttons (generated from the graphic's state machine) ──
// Grouped by section; a button carries its payload fields' CURRENT values, applied only if
// the machine accepts the event (that is what makes a multi-part change atomic). While we
// know the graphic's state (it answers on the channel), a button the machine would drop is
// greyed; before the first answer everything is enabled and the structural guard decides.
var machineState = null;
var eventBtns = [];
function legalNow(ev) {
  if (!machineState) return true;
  var perGroup = LEGAL[ev];
  if (!perGroup) return false;
  for (var gid in perGroup) {
    if (perGroup[gid].indexOf(machineState.groups[gid]) !== -1) return true;
  }
  return false;
}
function paintState() {
  var chip = document.getElementById('state-chip');
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
}
if (EVENTS.length > 0) {
  var evHost = document.getElementById('events');
  var sections = {};
  EVENTS.forEach(function (e) {
    var name = e.section || 'Events';
    if (!sections[name]) {
      var wrap = el('div', {}, [el('h2', {}, [name])]);
      sections[name] = el('div', { class: 'btns' });
      wrap.appendChild(sections[name]);
      evHost.appendChild(wrap);
    }
    var btn = el('button', e.destructive ? { class: 'destructive' } : {}, ['⚡ ' + e.label]);
    btn.onclick = function () { sendEvent(e); };
    sections[name].appendChild(btn);
    eventBtns.push({ event: e.event, btn: btn });
  });
  evHost.className = 'events';
}

// The graphic answers every message (and 'hello') with its machine state.
if (ch) ch.onmessage = function (ev) {
  var m = ev.data || {};
  if (m.t === 'state' && m.state) { machineState = m.state; paintState(); }
};
if (ch && EVENTS.length > 0) post({ t: 'hello' });

document.getElementById('play').onclick = function () { sendUpdate(); post({ t: 'play' }); };
document.getElementById('stop').onclick = function () { post({ t: 'stop' }); };
document.getElementById('update').onclick = sendUpdate;
document.getElementById('next').onclick = function () { post({ t: 'next' }); };
</script>
</body>
</html>`;
}
