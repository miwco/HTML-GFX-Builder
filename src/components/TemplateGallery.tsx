import { useEffect, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { TEMPLATE_REGISTRY, type TemplateEntry } from '../templates/index';
import { RESOLUTIONS, FPS_OPTIONS, type Resolution } from '../model/types';

/** Minimal SVG thumbnail representing each template type. */
function TemplateThumbnail({ type }: { type: string }) {
  const W = 160;
  const H = 90;

  switch (type) {
    case 'lower-third':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="#111" />
          <rect x="0" y="60" width={W} height="30" fill="#0a3d62" />
          <rect x="0" y="60" width="6" height="30" fill="#ffd32a" />
          <rect x="12" y="66" width="80" height="8" rx="2" fill="#fff" opacity="0.9" />
          <rect x="12" y="79" width="55" height="5" rx="2" fill="#9fc6ff" opacity="0.8" />
        </svg>
      );
    case 'fullscreen':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="rgba(0,0,0,0.8)" />
          <rect x="20" y="28" width="120" height="12" rx="3" fill="#fff" opacity="0.9" />
          <rect x="40" y="46" width="80" height="7" rx="2" fill="#aaa" opacity="0.7" />
        </svg>
      );
    case 'starting-soon':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="#0d1b2a" />
          <rect x="55" y="18" width="50" height="5" rx="2" fill="#3aa0ff" opacity="0.9" />
          <rect x="20" y="32" width="120" height="14" rx="3" fill="#fff" opacity="0.9" />
          <rect x="45" y="54" width="70" height="6" rx="2" fill="#888" opacity="0.7" />
        </svg>
      );
    case 'bug':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="#111" />
          <rect x="108" y="8" width="44" height="22" rx="3" fill="rgba(0,0,0,0.7)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <rect x="114" y="16" width="32" height="6" rx="2" fill="#fff" opacity="0.85" />
        </svg>
      );
    case 'info-box':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="#111" />
          <rect x="80" y="44" width="72" height="38" rx="2" fill="rgba(10,10,20,0.88)" />
          <rect x="80" y="44" width="4" height="38" fill="#3aa0ff" />
          <rect x="90" y="52" width="52" height="6" rx="2" fill="#fff" opacity="0.9" />
          <rect x="90" y="63" width="44" height="4" rx="1" fill="#888" opacity="0.7" />
          <rect x="90" y="70" width="36" height="4" rx="1" fill="#888" opacity="0.7" />
        </svg>
      );
    case 'countdown':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="#111" />
          <rect x="30" y="28" width="100" height="32" rx="4" fill="rgba(255,255,255,0.04)" />
          <rect x="50" y="13" width="60" height="7" rx="2" fill="#888" opacity="0.6" />
          <text x="80" y="52" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="800" fontFamily="Arial">5:00</text>
        </svg>
      );
    case 'scoreboard':
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="#111" />
          <rect x="0" y="0" width={W} height="28" fill="#111827" />
          <rect x="8" y="7" width="50" height="6" rx="2" fill="#aaa" opacity="0.8" />
          <text x="68" y="16" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800" fontFamily="Arial">0</text>
          <rect x="74" y="5" width="12" height="18" rx="1" fill="rgba(255,255,255,0.04)" />
          <text x="86" y="16" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800" fontFamily="Arial">0</text>
          <rect x="93" y="7" width="50" height="6" rx="2" fill="#aaa" opacity="0.8" />
        </svg>
      );
    case 'blank':
    default:
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          <text x="80" y="48" textAnchor="middle" fill="#555" fontSize="28" fontWeight="300" fontFamily="Arial">+</text>
          <rect x="55" y="58" width="50" height="4" rx="2" fill="#333" />
        </svg>
      );
  }
}

/**
 * Full-screen template gallery overlay shown on startup and via "New project".
 * The user picks a template type, resolution, and fps → creates and loads the template.
 */
export default function TemplateGallery() {
  const galleryOpen = useTemplateStore((s) => s.galleryOpen);
  const closeGallery = useTemplateStore((s) => s.closeGallery);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);

  const [selectedEntry, setSelectedEntry] = useState<TemplateEntry>(TEMPLATE_REGISTRY[0]);
  const [resolution, setResolution] = useState<Resolution>(RESOLUTIONS[0]);
  const [fps, setFps] = useState(25);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeGallery(); };
    if (galleryOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galleryOpen, closeGallery]);

  if (!galleryOpen) return null;

  const handleCreate = () => {
    applyTemplate(selectedEntry.create(resolution, fps));
  };

  const categories = [...new Set(TEMPLATE_REGISTRY.map((e) => e.category))];

  return (
    <div
      className="gallery-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) closeGallery(); }}
    >
      <div className="gallery-modal">
        {/* Header */}
        <div className="gallery-header">
          <div>
            <h2>New project</h2>
            <p className="hint">Choose a starter template, then edit the code to make it yours.</p>
          </div>
          <div className="gallery-settings">
            <div className="field-row" style={{ alignItems: 'center', gap: 8 }}>
              <label style={{ margin: 0, whiteSpace: 'nowrap' }}>Resolution</label>
              <select
                value={resolution.label}
                onChange={(e) => {
                  const r = RESOLUTIONS.find((r) => r.label === e.target.value);
                  if (r) setResolution(r);
                }}
              >
                {RESOLUTIONS.map((r) => (
                  <option key={r.label} value={r.label}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="field-row" style={{ alignItems: 'center', gap: 8 }}>
              <label style={{ margin: 0, whiteSpace: 'nowrap' }}>FPS</label>
              <select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                {FPS_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f} fps</option>
                ))}
              </select>
            </div>
          </div>
          <button
            className="gallery-close"
            onClick={closeGallery}
            title="Cancel (keep current project)"
          >
            ✕
          </button>
        </div>

        {/* Template grid, grouped by category */}
        <div className="gallery-body">
          {categories.map((cat) => (
            <div key={cat} className="gallery-category">
              <h3 className="gallery-cat-label">{cat}</h3>
              <div className="gallery-grid">
                {TEMPLATE_REGISTRY.filter((e) => e.category === cat).map((entry) => (
                  <button
                    key={entry.type}
                    className={`gallery-card ${selectedEntry.type === entry.type ? 'selected' : ''}`}
                    onClick={() => setSelectedEntry(entry)}
                    onDoubleClick={handleCreate}
                    title={entry.description}
                  >
                    <div className="gallery-thumb">
                      <TemplateThumbnail type={entry.type} />
                    </div>
                    <div className="gallery-card-name">{entry.name}</div>
                    <div className="gallery-card-desc">{entry.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="gallery-footer">
          <div className="gallery-selection-info">
            <strong>{selectedEntry.name}</strong>
            <span className="muted" style={{ marginLeft: 8 }}>
              {resolution.width}×{resolution.height} · {fps} fps
            </span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button onClick={closeGallery}>Cancel</button>
            <button className="primary" onClick={handleCreate}>
              Create project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
