// The Show Chat graphic block (Era 5.4) — an opt-in, marked, DELETABLE block appended to a
// graphic's template.js (liveData.ts house style). It polls the show's on-air messages from the
// Supabase REST endpoint (anon read, RLS-limited to status='on_air') and feeds them into the
// graphic via its own update(). Polling (not a WebSocket) keeps it simple and teachable; a few
// seconds of latency is fine for a chat graphic. The DEFAULT export stays 100% offline — this only
// runs when REF/KEY/SHOW are filled in.
//
// Two display modes, chosen by the owner per graphic:
//   feed     — every on-air message, newest last, joined into one line-list field (ticker/credits).
//   spotlight — only the latest on-air message, split into an author field + a message field
//               (lower-third). "Air" a new message and it replaces the previous.

import { loadBackendConfig } from '../backend/config';
import { refFromSupabaseUrl } from '../control/realtimeControl';

const OPEN = '/* == SHOW CHAT (on-air messages → update) — edit or delete this whole block == */';
const CLOSE = '/* == END SHOW CHAT == */';

export type ChatMode = 'feed' | 'spotlight';

export interface ChatBlockConfig {
  ref: string;
  key: string;
  showId: string;
  mode: ChatMode;
  pollSeconds: number;
  /** feed mode: the line-list field that receives "author: message" lines. */
  feedField: string;
  /** spotlight mode: the fields that receive the latest author + message. */
  authorField: string;
  messageField: string;
}

export function hasChatGraphic(js: string): boolean {
  return js.includes(OPEN);
}

export function stripChatGraphic(js: string): string {
  const start = js.indexOf(OPEN);
  const end = js.indexOf(CLOSE);
  if (start === -1 || end === -1) return js;
  return (js.slice(0, start) + js.slice(end + CLOSE.length)).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** The Supabase ref+key from the app's configured backend, or null when offline. */
export function chatBackendRefKey(): { ref: string; key: string } | null {
  const cfg = loadBackendConfig();
  const ref = refFromSupabaseUrl(cfg.url);
  if (!ref || !cfg.anonKey) return null;
  return { ref, key: cfg.anonKey };
}

export function chatGraphicBlock(cfg: ChatBlockConfig): string {
  return `${OPEN}
// Show its on-air chat messages. The DEFAULT export is offline — this runs only when REF/KEY/SHOW
// are set. Reads only messages the owner promoted to air (RLS: status='on_air'). Delete this whole
// block for a pure-offline graphic.
(function () {
  var REF = ${JSON.stringify(cfg.ref)};        // <ref>.supabase.co (blank => stays offline)
  var KEY = ${JSON.stringify(cfg.key)};        // publishable key (public-safe)
  var SHOW = ${JSON.stringify(cfg.showId)};    // the show id (an unguessable capability)
  var MODE = ${JSON.stringify(cfg.mode)};      // 'feed' (all on-air) | 'spotlight' (latest one)
  var POLL_MS = ${Math.max(1, Math.round(cfg.pollSeconds)) * 1000};

  // Which field(s) the messages fill. Change these to match this graphic's fields.
  var FEED_FIELD = ${JSON.stringify(cfg.feedField)};       // feed: one line-list field (ticker/credits)
  var AUTHOR_FIELD = ${JSON.stringify(cfg.authorField)};   // spotlight: the author field
  var MESSAGE_FIELD = ${JSON.stringify(cfg.messageField)}; // spotlight: the message field
  if (!REF || !KEY || !SHOW) return;

  var URL = 'https://' + REF + '.supabase.co/rest/v1/chat_submissions'
    + '?show_id=eq.' + SHOW + '&status=eq.on_air&select=author,message,created_at&order=created_at.asc';

  function pull() {
    fetch(URL, { cache: 'no-store', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        rows = Array.isArray(rows) ? rows : [];   // PostgREST returns [] of rows, or an error object
        var out = {};
        if (MODE === 'spotlight') {
          var last = rows[rows.length - 1];
          out[AUTHOR_FIELD] = last ? last.author : '';
          out[MESSAGE_FIELD] = last ? last.message : '';
        } else {
          out[FEED_FIELD] = rows.map(function (m) { return m.author + ': ' + m.message; }).join('\\n');
        }
        if (typeof update === 'function') update(JSON.stringify(out));
      })
      .catch(function () { /* offline or blocked — the graphic still runs */ });
  }

  pull();
  setInterval(pull, POLL_MS);
})();
${CLOSE}
`;
}
