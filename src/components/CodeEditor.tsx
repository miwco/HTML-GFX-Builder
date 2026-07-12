import { useEffect, useRef } from 'react';
import '../monacoSetup'; // bundled Monaco + workers — no CDN, fully offline
import Editor, { type OnMount } from '@monaco-editor/react';
import { useTemplateStore, type EditorTab } from '../store/templateStore';
import { explain, tokenAt } from '../teach/explain';

const TABS: { id: EditorTab; label: string; language: string }[] = [
  { id: 'html', label: 'HTML', language: 'html' },
  { id: 'css', label: 'CSS', language: 'css' },
  { id: 'js', label: 'JS', language: 'javascript' },
];

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

// Register the hover explanations once per page (Monaco registries are global).
let hoverRegistered = false;
interface HoverModel { getLineContent(lineNumber: number): string }
interface HoverPosition { lineNumber: number; column: number }
function registerHoverExplanations(monaco: Monaco) {
  if (hoverRegistered) return;
  hoverRegistered = true;
  const provider = {
    provideHover(model: HoverModel, position: HoverPosition) {
      const line = model.getLineContent(position.lineNumber);
      const token = tokenAt(line, position.column - 1);
      if (!token) return null;
      const results = explain({ token, line });
      if (results.length === 0) return null;
      return {
        contents: results.map((r) => ({
          value:
            `**${r.title}** · ${r.category}\n\n${r.body}` +
            (r.affects ? `\n\n*In the preview:* ${r.affects}` : ''),
        })),
      };
    },
  };
  for (const lang of ['html', 'css', 'javascript']) {
    // The teach knowledge base shows up as hover tooltips right where the code is.
    monaco.languages.registerHoverProvider(lang, provider as never);
  }
}

/** Monaco-based editor with HTML / CSS / JS tabs, bound to the template store. */
export default function CodeEditor() {
  const activeTab = useTemplateStore((s) => s.activeTab);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const template = useTemplateStore((s) => s.template);
  const setHtml = useTemplateStore((s) => s.setHtml);
  const setCss = useTemplateStore((s) => s.setCss);
  const setJs = useTemplateStore((s) => s.setJs);
  const lastChange = useTemplateStore((s) => s.lastChange);

  const setEditorContext = useTemplateStore((s) => s.setEditorContext);

  const editorRef = useRef<MonacoEditor | null>(null);
  const decorationsRef = useRef<ReturnType<MonacoEditor['createDecorationsCollection']> | null>(null);

  const current = TABS.find((t) => t.id === activeTab)!;
  const value = activeTab === 'html' ? template.html : activeTab === 'css' ? template.css : template.js;

  const onChange = (next: string | undefined) => {
    const v = next ?? '';
    if (activeTab === 'html') setHtml(v);
    else if (activeTab === 'css') setCss(v);
    else setJs(v);
  };

  // Highlight + reveal the lines the last panel/AI apply changed in this tab.
  useEffect(() => {
    decorationsRef.current?.clear();
    const editor = editorRef.current;
    const range = lastChange?.ranges[activeTab];
    if (!editor || !range) return;
    // Small delay: the new value reaches Monaco right after this render commit.
    const handle = setTimeout(() => {
      decorationsRef.current?.clear();
      decorationsRef.current = editor.createDecorationsCollection([
        {
          range: { startLineNumber: range.start, startColumn: 1, endLineNumber: range.end, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: 'changed-line',
            linesDecorationsClassName: 'changed-gutter',
          },
        },
      ]);
      editor.revealLineInCenter(range.start);
    }, 80);
    return () => clearTimeout(handle);
  }, [lastChange, activeTab]);

  // Report the token under the cursor (kept for future context-aware tools) and register
  // the hover explanations.
  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    registerHoverExplanations(monaco);
    // When the editor mounts into a just-shown box (e.g. the mobile "Show code" panel), Monaco can
    // read a ~0 size at creation and stay collapsed at 5×5. Force a layout to the REAL container size
    // (bypassing Monaco's own measurement), after paint and once more shortly after, to fill it.
    const relayout = () => {
      const host = editor.getDomNode()?.closest('.editor-host') as HTMLElement | null;
      if (host && host.clientHeight) editor.layout({ width: host.clientWidth, height: host.clientHeight });
      else editor.layout();
    };
    requestAnimationFrame(relayout);
    setTimeout(relayout, 150);
    const report = () => {
      const model = editor.getModel();
      const pos = editor.getPosition();
      if (!model || !pos) return;
      const line = model.getLineContent(pos.lineNumber);
      const token = tokenAt(line, pos.column - 1);
      const tab = useTemplateStore.getState().activeTab;
      setEditorContext({ tab, token, line });
    };
    editor.onDidChangeCursorPosition(report);
    editor.onDidFocusEditorText(report);
  };

  return (
    <>
      <div className="pane-header">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              title={
                t.id !== activeTab && lastChange?.ranges[t.id]
                  ? `The last change touched the ${t.label} — click to see it highlighted`
                  : undefined
              }
            >
              {t.label}
              {/* A dot marks a tab the last panel/canvas apply changed but isn't showing. */}
              {t.id !== activeTab && lastChange?.ranges[t.id] && <span className="change-dot" />}
            </button>
          ))}
        </div>
      </div>
      <div className="editor-host">
        <Editor
          height="100%"
          theme="vs-dark"
          language={current.language}
          path={`template.${activeTab}`}
          value={value}
          onChange={onChange}
          onMount={onMount}
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
