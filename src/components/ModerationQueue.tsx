import { useEffect, useMemo, useState } from 'react';
import { composeDocument } from '../preview/composeDocument';
import type { SpxTemplate } from '../model/types';
import type { ProjectBrand } from '../model/brand';
import {
  getModeratorItem,
  listAllForModeration,
  listReports,
  moderate,
  type CommunityReport,
  type ModeratorItem,
} from '../community/communityData';

interface Props {
  onClose: () => void;
}

type Filter = 'reported' | 'all';
type Selected = ModeratorItem & { body: unknown };

const STATUS_LABEL: Record<ModeratorItem['status'], string> = {
  pending: 'in review',
  approved: 'live',
  rejected: 'rejected',
  removed: 'removed',
};

// Fit the preview to the modal on a phone (the modal is ~full width there), cap it on desktop.
const PREVIEW_W = Math.min(460, (typeof window !== 'undefined' ? window.innerWidth : 500) - 90);

/**
 * Moderator-only takedown queue (Era 5.5 hardening). Lists every published submission and the abuse
 * reports, renders a sandboxed preview of the selected item, and lets a moderator Remove (or Restore)
 * it. Rides entirely on the live-verified RLS paths: is_moderator(), the 0005 moderator SELECT policy,
 * community_reports_read, and the moderate() UPDATE guarded by community_moderation_guard. Only ever
 * mounted when useIsModerator() is true, so the offline / non-moderator app never sees it.
 */
export default function ModerationQueue({ onClose }: Props) {
  const [items, setItems] = useState<ModeratorItem[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [filter, setFilter] = useState<Filter>('reported');
  const [selected, setSelected] = useState<Selected | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [it, rp] = await Promise.all([listAllForModeration(), listReports()]);
    setItems(it);
    setReports(rp);
    setLoading(false);
  };
  useEffect(() => {
    void refresh();
  }, []);

  // Report count per template.
  const reportCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reports) m.set(r.template_id, (m.get(r.template_id) ?? 0) + 1);
    return m;
  }, [reports]);

  const visible = useMemo(() => {
    const list = filter === 'reported' ? items.filter((i) => reportCount.has(i.id)) : items;
    if (filter === 'reported') {
      return [...list].sort((a, b) => (reportCount.get(b.id) ?? 0) - (reportCount.get(a.id) ?? 0));
    }
    return list;
  }, [items, filter, reportCount]);

  const open = async (id: string) => {
    setSelected(null);
    const item = await getModeratorItem(id);
    if (item) setSelected(item);
    else setNote('That item is no longer available.');
  };

  const act = async (id: string, status: 'removed' | 'approved') => {
    setBusy(true);
    const { error } = await moderate(id, status, status === 'removed' ? 'Removed by a moderator.' : undefined);
    setBusy(false);
    if (error) {
      setNote(error);
      return;
    }
    setNote(status === 'removed' ? '✓ Removed — it no longer appears in the gallery.' : '✓ Restored to the gallery.');
    await refresh();
    void open(id); // reflect the new status in the open detail
  };

  const selectedReports = selected ? reports.filter((r) => r.template_id === selected.id) : [];

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wz-modal pk-modal">
        <div className="wz-header">
          <div>
            <h2>🛡 Moderation</h2>
            <p className="hint">Review published templates and reports; remove anything that shouldn't be shared.</p>
          </div>
          <button className="gallery-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="pk-body">
          {/* ── Selected item detail ── */}
          {selected && (
            <div className="panel-section" style={{ outline: '2px solid var(--accent)', outlineOffset: 2 }}>
              <div className="row" style={{ alignItems: 'baseline' }}>
                <h3 style={{ margin: 0 }}>{selected.name}</h3>
                <span className="muted">{selected.kind} · {selected.author_name || 'anonymous'} · {STATUS_LABEL[selected.status]}</span>
                <div className="spacer" />
                <button onClick={() => setSelected(null)} title="Close preview">✕</button>
              </div>
              {selected.summary && <p className="hint" style={{ marginTop: 4 }}>{selected.summary}</p>}

              <ItemPreview item={selected} />

              {selectedReports.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong>⚑ {selectedReports.length} report{selectedReports.length > 1 ? 's' : ''}</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {selectedReports.map((r) => <li key={r.id} className="hint">{r.reason}</li>)}
                  </ul>
                </div>
              )}

              <div className="row" style={{ marginTop: 8 }}>
                {selected.status === 'approved' ? (
                  <button className="primary" disabled={busy} onClick={() => void act(selected.id, 'removed')}>
                    Remove from gallery
                  </button>
                ) : (
                  <button disabled={busy} onClick={() => void act(selected.id, 'approved')}>
                    Restore to gallery
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Filter + list ── */}
          <div className="row">
            {(['reported', 'all'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'primary' : ''} onClick={() => setFilter(f)}>
                {f === 'reported' ? `Reported (${new Set(reports.map((r) => r.template_id)).size})` : `All (${items.length})`}
              </button>
            ))}
          </div>

          <div className="panel-section">
            {loading ? (
              <p className="hint">Loading…</p>
            ) : visible.length === 0 ? (
              <p className="hint">{filter === 'reported' ? 'No reports — nothing flagged.' : 'Nothing published yet.'}</p>
            ) : (
              visible.map((i) => (
                <div className="pk-graphic" key={i.id}>
                  <strong>{i.name}</strong>
                  <span className="muted">{i.kind} · {i.author_name || 'anonymous'} · {STATUS_LABEL[i.status]}</span>
                  {reportCount.has(i.id) && <span className="status-bad" title="reports">⚑ {reportCount.get(i.id)}</span>}
                  <div className="spacer" />
                  <button onClick={() => void open(i.id)}>Review</button>
                </div>
              ))
            )}
          </div>

          {note && (
            <p className={note.startsWith('✓') ? 'status-ok' : 'status-bad'} style={{ marginTop: 4 }}>{note}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** A sandboxed static render of a graphic, or the palette of a look. */
function ItemPreview({ item }: { item: Selected }) {
  if (item.kind === 'look') {
    const brand = (item.body as { brand?: ProjectBrand }).brand;
    const p = brand?.palette;
    return (
      <div className="row" style={{ marginTop: 6, alignItems: 'center' }}>
        <span className="pk-swatches" aria-hidden>
          {[p?.accent, p?.panel, p?.text].map((c, idx) => <i key={idx} style={{ background: c ?? '#000' }} />)}
        </span>
        <span className="muted">{brand?.customFont?.family ?? brand?.fontId ?? 'default font'}</span>
      </div>
    );
  }

  const tpl = item.body as SpxTemplate;
  const res = tpl.resolution ?? { width: 1920, height: 1080, label: '' };
  const scale = PREVIEW_W / res.width;
  return (
    <div
      style={{ width: PREVIEW_W, height: res.height * scale, overflow: 'hidden', position: 'relative', background: '#111', marginTop: 6, borderRadius: 6 }}
    >
      <iframe
        title={`preview-${item.id}`}
        // No allow-same-origin: untrusted community content runs in an opaque origin, isolated from the app.
        sandbox="allow-scripts"
        srcDoc={composeDocument(tpl)}
        style={{ width: res.width, height: res.height, border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }}
      />
    </div>
  );
}
