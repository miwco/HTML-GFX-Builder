import { useRef } from 'react';
import { useTemplateStore } from '../store/templateStore';
import CodeEditor from './CodeEditor';
import PreviewFrame from './PreviewFrame';
import PlayoutSimulator from './PlayoutSimulator';
import SidePanel from './SidePanel';
import TemplateGallery from './TemplateGallery';

/**
 * Three-pane workspace: code editor (left), live preview + playout simulator (center),
 * and the supporting side panels (right). The iframe ref is shared so the simulator can
 * call play()/stop()/update() on the live preview.
 */
export default function AppShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const template = useTemplateStore((s) => s.template);
  const openGallery = useTemplateStore((s) => s.openGallery);

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

      {/* Template gallery overlay — shown on startup and via "New project". */}
      <TemplateGallery />
    </div>
  );
}
