import { useEffect, useState } from 'react';
import {
  listMyShows,
  createShow,
  setShowOpen,
  deleteShow,
  listQueue,
  moderate,
  subscribeQueue,
  type ShowRow,
  type ChatRow,
} from './chatData';

interface Props {
  onClose: () => void;
}

const STATUS_ORDER: Record<ChatRow['status'], number> = { pending: 0, on_air: 1, approved: 2, rejected: 3 };

/**
 * The owner's Show Chat moderation queue (Era 5.4). Create shows, share the public send-in link,
 * and moderate submissions with live (Realtime) updates. "Air" promotes a message to status
 * 'on_air' — the graphic block shows on-air messages (feed = all, spotlight = the latest).
 */
export default function ModerationPanel({ onClose }: Props) {
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [activeShow, setActiveShow] = useState<string | null>(null);
  const [queue, setQueue] = useState<ChatRow[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void listMyShows().then((s) => {
      setShows(s);
      setActiveShow((a) => a ?? s[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!activeShow) return;
    const refresh = () => void listQueue(activeShow).then(setQueue);
    refresh();
    const unsub = subscribeQueue(activeShow, refresh);
    return () => unsub();
  }, [activeShow]);

  const show = shows.find((s) => s.id === activeShow) ?? null;
  const sendInUrl = show
    ? `${window.location.origin}${window.location.pathname}?chat=${encodeURIComponent(show.slug)}`
    : '';

  const create = async () => {
    const { show: created, error } = await createShow(newTitle);
    if (created) {
      setShows([created, ...shows]);
      setActiveShow(created.id);
      setNewTitle('');
    } else {
      setNote(error ?? 'Could not create the show.');
    }
  };

  const toggleOpen = async () => {
    if (!show) return;
    await setShowOpen(show.id, !show.is_open);
    setShows(shows.map((s) => (s.id === show.id ? { ...s, is_open: !s.is_open } : s)));
  };

  const removeShow = async () => {
    if (!show) return;
    await deleteShow(show.id);
    const next = shows.filter((s) => s.id !== show.id);
    setShows(next);
    setActiveShow(next[0]?.id ?? null);
    setQueue([]);
  };

  const act = (id: string, status: ChatRow['status']) => void moderate(id, status); // Realtime refreshes the list
  // Only claim the copy once it lands — the clipboard can refuse (permission, or a plain-http
  // page, where navigator.clipboard is missing entirely).
  const copyLink = () => void navigator.clipboard?.writeText(sendInUrl).then(
    () => setNote('✓ Send-in link copied.'),
    () => setNote('Could not copy — select the link and copy it by hand.'),
  );

  const sorted = [...queue].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.created_at.localeCompare(a.created_at));

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wz-modal pk-modal">
        <div className="wz-header">
          <div>
            <h2>Show chat <span className="muted">— moderation</span></h2>
            <p className="hint">Approve audience messages and send them to air. Updates live.</p>
          </div>
          <button className="gallery-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="pk-body">
          <div className="panel-section">
            <div className="row" style={{ alignItems: 'center' }}>
              <select className="grow" value={activeShow ?? ''} onChange={(e) => setActiveShow(e.target.value || null)}>
                {shows.length === 0 && <option value="">No shows yet</option>}
                {shows.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}{s.is_open ? '' : ' (closed)'}</option>
                ))}
              </select>
              <input placeholder="New show title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <button className="primary" onClick={create}>+ Create</button>
            </div>
            {show && (
              <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
                <input readOnly value={sendInUrl} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 12 }} title="Public send-in link — share with your audience" />
                <button onClick={copyLink}>Copy link</button>
                <button onClick={toggleOpen}>{show.is_open ? 'Close' : 'Open'} submissions</button>
                <button onClick={removeShow} title="Delete this show and its messages">🗑</button>
              </div>
            )}
            {/* One slot, both outcomes — "Could not create the show." must not read as success. */}
            {note && (
              <p className={note.startsWith('✓') ? 'status-ok' : 'status-bad'} style={{ marginTop: 6 }}>{note}</p>
            )}
          </div>

          {show && (
            <div className="panel-section">
              {sorted.length === 0 && <p className="muted">No messages yet. Share the send-in link.</p>}
              {sorted.filter((m) => m.status !== 'rejected').map((m) => (
                <div className="chat-row" key={m.id}>
                  <div className="chat-msg">
                    <span className={`chat-badge chat-${m.status}`}>{m.status === 'on_air' ? 'ON AIR' : m.status}</span>
                    <strong>{m.author}</strong> {m.message}
                  </div>
                  <div className="chat-acts">
                    {m.status === 'pending' && <button className="primary" onClick={() => act(m.id, 'approved')}>Approve</button>}
                    {(m.status === 'approved' || m.status === 'pending') && <button onClick={() => act(m.id, 'on_air')} title="Show on air">▶ Air</button>}
                    {m.status === 'on_air' && <button onClick={() => act(m.id, 'approved')} title="Take off air">■ Unair</button>}
                    <button onClick={() => act(m.id, 'rejected')} title="Reject">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
