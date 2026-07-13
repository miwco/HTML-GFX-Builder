// "My videos" - the saved-video-projects modal: open, delete, and save the current
// project into the durable list (the autosaved current slot is separate; this list is
// the explicit keep). Mirrors the PacketManager modal conventions.

import { useState } from 'react';
import {
  deleteSavedVideoProject,
  listSavedVideoProjects,
  upsertSavedVideoProject,
} from '../../model/videoProject';
import { useVideoProjectStore } from '../../store/videoProjectStore';

interface Props {
  onClose: () => void;
}

export default function SavedVideoProjects({ onClose }: Props) {
  const project = useVideoProjectStore((s) => s.project);
  const loadProject = useVideoProjectStore((s) => s.loadProject);
  const [items, setItems] = useState(listSavedVideoProjects);
  const [note, setNote] = useState<string | null>(null);

  const refresh = () => setItems(listSavedVideoProjects());

  const saveCurrent = () => {
    const ok = upsertSavedVideoProject(project);
    setNote(ok ? `Saved "${project.name}".` : 'Could not save - browser storage is full.');
    refresh();
  };

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wz-modal" style={{ maxWidth: 640 }} data-testid="saved-videos">
        <div className="wz-header">
          <div className="wz-title">
            <span className="wz-title-step">My videos</span>
          </div>
          <button className="gallery-close" onClick={onClose} title="Close">✕</button>
        </div>
        <div style={{ padding: '14px 18px', overflow: 'auto' }}>
          <div className="row" style={{ marginBottom: 12, alignItems: 'center', gap: 10 }}>
            <button className="primary" onClick={saveCurrent} data-testid="save-current-video">
              💾 Save current project
            </button>
            {note && <span className="hint">{note}</span>}
          </div>
          {items.length === 0 && (
            <p className="hint">No saved videos yet - the current project autosaves, but saving
            here keeps it when you start a new one.</p>
          )}
          <ul className="video-saved-list">
            {items.map((r) => (
              <li key={r.id} className="row" style={{ gap: 10, alignItems: 'center', padding: '6px 0' }}>
                <span className="grow" style={{ minWidth: 0 }}>
                  <strong>{r.name}</strong>
                  <span className="hint" style={{ marginLeft: 8 }}>
                    {r.project.width}×{r.project.height} · {r.project.fps} fps ·{' '}
                    {(r.project.durationInFrames / r.project.fps).toFixed(1)} s ·{' '}
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </span>
                </span>
                <button
                  onClick={() => {
                    loadProject(r.project);
                    onClose();
                  }}
                  data-testid={`open-video-${r.id}`}
                >
                  Open
                </button>
                <button
                  onClick={() => {
                    deleteSavedVideoProject(r.id);
                    refresh();
                  }}
                  title="Delete from saved videos"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
