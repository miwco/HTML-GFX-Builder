import { useMemo } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { loadPackets, loadLooks, type Packet, type SavedGraphic } from '../model/packets';

interface Props {
  /** The signed-in account's email (shown in the header). */
  email: string | null;
  onClose: () => void;
}

/** A graphic together with the packet it lives in (the homebase list is cross-packet). */
interface HomeRow {
  packet: Packet;
  graphic: SavedGraphic;
}

/**
 * The signed-in user's homebase (Era 5.6 follow-up): every saved graphic across all packets
 * in one place, newest first — open any of them straight into the editor. Reads the same
 * packet store the 📦 Packet manager manages (local-first; cloud sync mirrors it for
 * signed-in users), so there is exactly ONE source of saved designs.
 */
export default function Homebase({ email, onClose }: Props) {
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const openGallery = useTemplateStore((s) => s.openGallery);

  const packets = useMemo(() => loadPackets(), []);
  const looks = useMemo(() => loadLooks(), []);
  const rows = useMemo<HomeRow[]>(
    () =>
      packets
        .flatMap((packet) => packet.graphics.map((graphic) => ({ packet, graphic })))
        .sort((a, b) => b.graphic.savedAt.localeCompare(a.graphic.savedAt)),
    [packets],
  );

  const open = (row: HomeRow) => {
    applyTemplate(row.graphic.template, { resetSampleData: true });
    setActiveTab('html');
    onClose();
  };

  const newProject = () => {
    onClose();
    openGallery();
  };

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wz-modal pk-modal" data-testid="homebase">
        <div className="wz-header">
          <div>
            <h2>Your homebase</h2>
            <p className="hint">
              {email ? `${email} · ` : ''}
              {rows.length} saved graphic{rows.length === 1 ? '' : 's'} in {packets.length} packet
              {packets.length === 1 ? '' : 's'} · {looks.length} brand look{looks.length === 1 ? '' : 's'}
            </p>
          </div>
          <button className="gallery-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="pk-body">
          {rows.length === 0 ? (
            <div className="panel-section">
              <h3>Nothing saved yet</h3>
              <p className="hint">
                Create a graphic, then save it into a packet (📦 Packets in the topbar) — it will
                appear here, and sync across your devices while you are signed in.
              </p>
              <button className="primary" onClick={newProject}>+ New project</button>
            </div>
          ) : (
            <div className="panel-section">
              <div className="row" style={{ alignItems: 'baseline' }}>
                <h3>My graphics</h3>
                <div className="spacer" />
                <button onClick={newProject}>+ New project</button>
              </div>
              {rows.map((row) => (
                <div className="pk-graphic" key={row.graphic.id}>
                  <strong>{row.graphic.name}</strong>
                  <span className="muted">
                    {row.packet.name} · {row.graphic.type} · {new Date(row.graphic.savedAt).toLocaleDateString()}
                  </span>
                  <div className="spacer" />
                  <button
                    className="primary"
                    onClick={() => open(row)}
                    title="Load into the editor (replaces the current graphic — undo with Ctrl+Z)"
                  >
                    Open
                  </button>
                </div>
              ))}
              <p className="hint" style={{ marginTop: 10 }}>
                Organize packets, export a whole show, and manage brand looks in 📦 Packets.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
