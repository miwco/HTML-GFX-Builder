import { useEffect, useRef } from 'react';
import { useTemplateStore } from '../store/templateStore';
import CodeEditor from './CodeEditor';
import PreviewFrame from './PreviewFrame';
import PlayoutSimulator from './PlayoutSimulator';
import SidePanel from './SidePanel';
import CreationWizard from './wizard/CreationWizard';

/**
 * Three-pane workspace: code editor (left), live preview + playout simulator (center),
 * and the supporting side panels (right). The iframe ref is shared so the simulator can
 * call play()/stop()/update() on the live preview.
 */
export default function AppShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const template = useTemplateStore((s) => s.template);
  const openGallery = useTemplateStore((s) => s.openGallery);
  const undo = useTemplateStore((s) => s.undo);

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
        <button onClick={openGallery} title="Start a new project from a template">
          + New project
        </button>
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
        </section>

        <section className="pane">
          <SidePanel />
        </section>
      </div>

      {/* Creation wizard overlay — shown on startup and via "New project". */}
      <CreationWizard />
    </div>
  );
}
