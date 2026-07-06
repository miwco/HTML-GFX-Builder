import { useEffect, useState, type FormEvent } from 'react';
import { resolveShow, submit } from './chatData';

type Show = { id: string; title: string; is_open: boolean };

/**
 * The public send-in page (Era 5.4). Reached at <app-url>?chat=<slug> — no login, no builder shell.
 * Anyone with the link submits a name + message; it lands in the owner's moderation queue (pending).
 * The share slug is an unguessable capability; the RLS anon-insert policy is the real gate.
 */
export default function SendIn({ slug }: { slug: string }) {
  const [show, setShow] = useState<Show | null | 'loading'>('loading');
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let live = true;
    void resolveShow(slug).then((s) => {
      if (live) setShow(s);
    });
    return () => {
      live = false;
    };
  }, [slug]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (show === 'loading' || !show) return;
    setBusy(true);
    setError(null);
    const res = await submit(show.id, author.trim(), message.trim());
    setBusy(false);
    if (res.error) {
      setError(/slow down|too many/i.test(res.error) ? 'Slow down a moment, then try again.' : 'Could not send. Please try again.');
      return;
    }
    setSent(true);
    setMessage('');
  };

  return (
    <div className="sendin">
      <div className="sendin-card">
        {show === 'loading' && <p className="muted">Loading…</p>}
        {show === null && (
          <>
            <div className="sendin-title">Chat not found</div>
            <p className="muted">This link is invalid or the show was removed.</p>
          </>
        )}
        {show && show !== 'loading' && (
          <>
            <div className="sendin-title">{show.title}</div>
            {!show.is_open ? (
              <p className="muted">Submissions are closed right now. Check back during the show.</p>
            ) : sent ? (
              <>
                <p className="sendin-ok">✓ Sent! A moderator will review it.</p>
                <button className="sendin-again" onClick={() => setSent(false)}>Send another</button>
              </>
            ) : (
              <form onSubmit={send}>
                <label htmlFor="si-name">Your name</label>
                <input id="si-name" value={author} maxLength={40} required onChange={(e) => setAuthor(e.target.value)} />
                <label htmlFor="si-msg" style={{ marginTop: 10 }}>Message</label>
                <textarea id="si-msg" value={message} maxLength={280} required rows={3} onChange={(e) => setMessage(e.target.value)} />
                <div className="sendin-count muted">{message.length}/280</div>
                <button type="submit" className="primary sendin-send" disabled={busy || !author.trim() || !message.trim()}>
                  Send to the show
                </button>
                {error && <p className="sendin-error">{error}</p>}
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
