// Evaluate a compiled composition module under a require shim that exposes ONLY react
// and remotion (plus the jsx runtimes sucrase's automatic-JSX output requires). This is
// the runtime half of the import whitelist - the app's static validator is the other
// half - and it guarantees a single React instance so hooks work inside the Player.
//
// Paired with the app's compile options (src/video/compile.ts): sucrase transforms
// ['typescript', 'jsx', 'imports'], jsxRuntime 'automatic' -> CJS requiring
// 'react/jsx-runtime'. Change one side only in lockstep with the other.

import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as Remotion from 'remotion';

const MODULES: Record<string, unknown> = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  'react/jsx-dev-runtime': jsxRuntime,
  remotion: Remotion,
};

function requireShim(name: string): unknown {
  if (name in MODULES) return MODULES[name];
  throw new Error(`Import "${name}" is not available - only 'react' and 'remotion' can be imported.`);
}

export type UserComponent = React.ComponentType<Record<string, unknown>>;

export function evalModule(compiledJs: string): UserComponent {
  const module = { exports: {} as Record<string, unknown> };
  // new Function (not eval): no closure capture, so the module can't see host internals.
  const run = new Function('require', 'module', 'exports', compiledJs);
  run(requireShim, module, module.exports);
  const candidate = module.exports.default ?? module.exports;
  if (typeof candidate !== 'function') {
    throw new Error('The module must default-export a React component.');
  }
  return candidate as UserComponent;
}
