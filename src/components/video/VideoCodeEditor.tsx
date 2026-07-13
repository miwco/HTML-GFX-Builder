// The video shell's Monaco editor: one TSX file (the Remotion composition module).
// Lazy-loaded like the SPX CodeEditor - Monaco is the heaviest chunk and the code view
// is optional. Typing goes through setTsx (no store history - Monaco's own undo covers
// keystrokes); syntax-only diagnostics (see monacoSetup.ts).

import '../../monacoSetup'; // bundled Monaco + workers - no CDN, fully offline
import Editor from '@monaco-editor/react';
import { useVideoProjectStore } from '../../store/videoProjectStore';

export default function VideoCodeEditor() {
  const tsx = useVideoProjectStore((s) => s.project.tsx);
  const setTsx = useVideoProjectStore((s) => s.setTsx);

  return (
    <>
      <div className="pane-header">
        <div className="tabs">
          <button className="tab active">Composition.tsx</button>
        </div>
      </div>
      <div className="editor-host">
        <Editor
          height="100%"
          theme="vs-dark"
          language="typescript"
          path="file:///video/Composition.tsx"
          value={tsx}
          onChange={(next) => setTsx(next ?? '')}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 10 },
          }}
        />
      </div>
    </>
  );
}
