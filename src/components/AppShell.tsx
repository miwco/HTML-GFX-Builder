import { useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import CodeEditor from './CodeEditor';
import PreviewFrame from './PreviewFrame';
import PlayoutSimulator from './PlayoutSimulator';
import SidePanel from './SidePanel';
import PacketManager from './PacketManager';
import CommunityGallery from './CommunityGallery';
import CreationWizard from './wizard/CreationWizard';
import AuthStatus from './auth/AuthStatus';
import SyncStatus from './SyncStatus';
import { isBackendConfigured } from '../backend/config';

/**
 * Two-pane workspace: code editor (left) and, on the right, the live preview (16:9,
 * sized by the template's aspect) stacked above the playout simulator and the tool
 * panels. This keeps the canvas compact on portrait monitors instead of floating in
 * dead space. The iframe ref is shared so the simulator can call play()/stop()/update()
 * on the live preview.
 */
export default function AppShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const template = useTemplateStore((s) => s.template);
  const openGallery = useTemplateStore((s) => s.openGallery);
  const undo = useTemplateStore((s) => s.undo);
  const [packetsOpen, setPacketsOpen] = useState(false);

  // Community gallery (Era 5.5) — only offered when a backend is configured (offline shows nothing).
  // A `?template=<slug>` share link auto-opens the gallery focused on that item.
  const backendConfigured = isBackendConfigured();
  const initialTemplateSlug = useMemo(
    () => (backendConfigured ? new URLSearchParams(window.location.search).get('template') : null),
    [backendConfigured],
  );
  const [communityOpen, setCommunityOpen] = useState(Boolean(initialTemplateSlug));

  // Global undo for block / AI / gallery actions. Skips Monaco and form fields so they
  // keep their own native text undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isZ = e.key === 'z' || e.key === 'Z';
      if (!isZ || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      const inEditable =
        !!el?.closest?.('.monaco-editor') ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        !!el?.isContentEditable;
      if (inEditable) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          SPX GFX Builder
        </div>
        <span className="tpl-name">{template.name}</span>
        <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
          {template.resolution.width}×{template.resolution.height} · {template.fps}&thinsp;fps
        </span>
        <div className="spacer" />
        <button onClick={() => setPacketsOpen(true)} title="Save this show's graphics together + manage brand looks">
          📦 Packets
        </button>
        {backendConfigured && (
          <button onClick={() => setCommunityOpen(true)} title="Browse and reuse templates shared by other users">
            🌐 Community
          </button>
        )}
        <button onClick={openGallery} title="Start a new project from a template">
          + New project
        </button>
        {/* Both render nothing offline; cloud status + account appear in hosted mode. */}
        <SyncStatus />
        <AuthStatus />
      </header>

      <div className="workspace">
        <section className="pane">
          <CodeEditor />
        </section>

        <section className="pane">
          <div className="preview-wrap">
            <PreviewFrame iframeRef={iframeRef} />
            <PlayoutSimulator iframeRef={iframeRef} />
          </div>
          <SidePanel />
        </section>
      </div>

      {/* Creation wizard overlay — shown on startup and via "New project". */}
      <CreationWizard />

      {/* Packet manager overlay — saved graphics collections + brand looks. */}
      {packetsOpen && <PacketManager onClose={() => setPacketsOpen(false)} />}

      {/* Community gallery overlay — browse + import shared templates (hosted mode only). */}
      {communityOpen && (
        <CommunityGallery onClose={() => setCommunityOpen(false)} initialSlug={initialTemplateSlug} />
      )}
    </div>
  );
}
