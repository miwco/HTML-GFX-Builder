// The HOSTED-CONTROL receiver (Phase 5): a marked, commented, DELETABLE block appended to a
// graphic's own JS when its show has a hosted control page. The cloud sibling of the
// BroadcastChannel receiver, but DURABLE: commands are rows in the control_events log, so
// this receiver (a) rebuilds the graphic at boot from its own last applied-state report,
// (b) follows new commands live over Realtime Postgres Changes, and (c) tail-fills any gap
// after a reconnect from the log. Like realtimeControl.ts it is hand-rolled (Phoenix
// vsn=1.0.0, no bundled library) and 100% inert until REF and KEY are filled in.

import { loadBackendConfig } from '../backend/config';
import { refFromSupabaseUrl } from './realtimeControl';

const OPEN = '/* == HOSTED CONTROL (Supabase log) — edit or delete this whole block == */';
const CLOSE = '/* == END HOSTED CONTROL == */';

export interface HostedReceiverConfig {
  /** Supabase project ref (the <ref> in <ref>.supabase.co). */
  ref: string;
  /** Publishable/anon key — public-safe to embed. */
  key: string;
  /** The hosted page's capability slug (keep private — it authorizes operating). */
  slug: string;
  /** This graphic's name in the show — its card + its rows in the log. */
  graphic: string;
}

export function hasHostedReceiver(js: string): boolean {
  return js.includes(OPEN);
}

export function stripHostedReceiver(js: string): string {
  const start = js.indexOf(OPEN);
  const end = js.indexOf(CLOSE);
  if (start === -1 || end === -1) return js;
  return (js.slice(0, start) + js.slice(end + CLOSE.length)).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** The app's backend as a receiver config for one graphic, or null offline. */
export function hostedReceiverConfig(slug: string, graphic: string): HostedReceiverConfig | null {
  const cfg = loadBackendConfig();
  const ref = refFromSupabaseUrl(cfg.url);
  if (!ref || !cfg.anonKey) return null;
  return { ref, key: cfg.anonKey, slug, graphic };
}

export function hostedReceiverBlock(cfg: HostedReceiverConfig): string {
  return `${OPEN}
// Drive this graphic from its HOSTED control page (?control=<slug> on the NoaCG site). The
// commands live in a durable log, which is what makes this recoverable: at boot the graphic
// rebuilds itself from its own last report (data + state), then follows new commands live
// and back-fills anything it missed while offline. The SLUG is a capability — anyone who
// has it (plus the public KEY) can operate the graphic, so keep it private. Delete this
// whole block for a pure-offline graphic.
(function () {
  var REF = ${JSON.stringify(cfg.ref)};        // <ref>.supabase.co  (blank => stays offline)
  var KEY = ${JSON.stringify(cfg.key)};        // publishable key (public-safe)
  var SLUG = ${JSON.stringify(cfg.slug)};      // the hosted page's capability slug
  var GRAPHIC = ${JSON.stringify(cfg.graphic)}; // this graphic's name in the show
  if (!REF || !KEY || !SLUG) return;

  var REST = 'https://' + REF + '.supabase.co/rest/v1/rpc/';
  var lastId = 0;      // the last log row applied — the tail cursor
  var showId = null;

  function rpc(name, args) {
    return fetch(REST + name, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  // Apply one command through the graphic's own globals — the same mapping as every receiver.
  function apply(m) {
    if (!m) return;
    if (m.t === 'play' && typeof play === 'function') play();
    else if (m.t === 'stop' && typeof stop === 'function') stop();
    else if (m.t === 'next' && typeof next === 'function') next();
    else if (m.t === 'update' && typeof update === 'function') update(JSON.stringify(m.data || {}));
    else if (m.t === 'event' && typeof noacgDispatch === 'function') noacgDispatch(m.event, m.payload);
    else if (m.t === 'snap' && typeof noacgSnap === 'function') noacgSnap(m.snap || null);
    else return; // 'staged' / 'live' meta rows are for control pages, not for us
    scheduleReport();
  }

  // Report what is actually on air (the definition's fields, read back from the DOM, plus the
  // machine state) — the PUBLISHED truth the boot recovery and the pages' chips read.
  var reportTimer = null;
  function harvest() {
    var data = {};
    try {
      var defs = (window.SPXGCTemplateDefinition && window.SPXGCTemplateDefinition.DataFields) || [];
      for (var i = 0; i < defs.length; i++) {
        var f = defs[i] && defs[i].field;
        if (!f) continue;
        var el = document.getElementById(f);
        if (!el) continue;
        data[f] = el.tagName === 'IMG' ? (el.getAttribute('src') || '') : (el.textContent || '');
      }
    } catch (e) { /* report what we could */ }
    return data;
  }
  function scheduleReport() {
    clearTimeout(reportTimer);
    reportTimer = setTimeout(function () {
      var state = (typeof noacgMachineState === 'function') ? noacgMachineState() : null;
      rpc('control_report', { p_slug: SLUG, p_graphic: GRAPHIC, p_data: harvest(), p_state: state });
    }, 800);
  }

  // Back-fill the gap after (re)connecting, in log order, then continue live.
  function fillTail() {
    rpc('control_tail', { p_slug: SLUG, p_graphic: GRAPHIC, p_after: lastId }).then(function (rows) {
      if (!rows) return;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].id > lastId) { lastId = rows[i].id; apply(rows[i].msg); }
      }
    });
  }

  // ── Realtime: follow new log rows (Postgres Changes on control_events). ──
  var url = 'wss://' + REF + '.supabase.co/realtime/v1/websocket?apikey=' + encodeURIComponent(KEY) + '&vsn=1.0.0';
  var n = 0, ws = null, hb = null, backoff = 1000;
  function ref() { return String(++n); }
  function connect() {
    var full = 'realtime:control-' + showId;
    ws = new WebSocket(url);
    ws.onopen = function () {
      backoff = 1000;
      var joinRef = ref();
      ws.send(JSON.stringify({ topic: full, event: 'phx_join', ref: joinRef, join_ref: joinRef,
        payload: { access_token: KEY, config: { broadcast: { self: false }, presence: { key: '' },
          postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'control_events', filter: 'show_id=eq.' + showId }] } } }));
      hb = setInterval(function () {
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: ref() }));
      }, 25000);
      fillTail(); // anything sent while we were away, in order, before the live rows land
    };
    ws.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.event !== 'postgres_changes') return;
      var rec = m.payload && m.payload.data && m.payload.data.record;
      if (!rec || rec.graphic !== GRAPHIC) return;
      if (rec.id <= lastId) return;          // replayed or already tail-filled
      if (rec.id > lastId + 1) fillTail();   // a hole — recover order from the log
      lastId = Math.max(lastId, rec.id);
      apply(rec.msg);
    };
    var down = function () { clearInterval(hb); ws = null; setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 10000); };
    ws.onclose = down;
    ws.onerror = function () { try { ws.close(); } catch (err) { /* already down */ } };
  }

  // ── Boot: resolve the page, REBUILD from our own last report, then go live. ──
  rpc('control_show_by_slug', { p_slug: SLUG }).then(function (rows) {
    var row = rows && rows[0];
    if (!row) return;
    showId = row.id;
    lastId = row.last_event_id || 0;
    var mine = (row.live || {})[GRAPHIC];
    if (mine) {
      // Reset is two operations, and recovery is both: the data half, then the visual half
      // (snap arms timers — recovery semantics).
      if (mine.data && typeof update === 'function') update(JSON.stringify(mine.data));
      if (mine.state && mine.state.groups && typeof noacgSnap === 'function') noacgSnap(mine.state.groups);
    }
    connect();
  });
})();
${CLOSE}
`;
}
