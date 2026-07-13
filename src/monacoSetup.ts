// Self-hosted Monaco: the editor is bundled with the app (like GSAP) instead of being
// downloaded from a CDN at runtime — the builder works fully offline and never breaks
// because a CDN is slow or blocked on a production network.
//
// Two pieces:
//   1. loader.config({ monaco }) points @monaco-editor/react at the bundled instance
//      (its default is an AMD loader fetching from cdn.jsdelivr.net).
//   2. MonacoEnvironment.getWorker hands Vite-bundled web workers to the editor
//      (language smarts for HTML/CSS/JS run in workers).

import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });

// TSX support for the video editor's Composition.tsx model. Syntax-only diagnostics: without
// react/remotion type acquisition, semantic checking would drown the editor in "cannot find
// module" noise. Only the typescript defaults change — the SPX JS tab uses javascriptDefaults
// and keeps its behavior. (monaco 0.55 moved these to the top-level `typescript` namespace.)
monaco.typescript.typescriptDefaults.setCompilerOptions({
  jsx: monaco.typescript.JsxEmit.ReactJSX,
  target: monaco.typescript.ScriptTarget.ES2020,
  allowNonTsExtensions: true,
  moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
});
monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
});
