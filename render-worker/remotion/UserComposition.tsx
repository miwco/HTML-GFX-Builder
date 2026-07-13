// The kind:'remotion' host: evaluates an authored composition module (compiled in-browser
// by the editor, imports limited to react/remotion) under a require shim that hands it
// THIS worker's React and Remotion instances - the same shim contract as the live
// preview's player host (player-host/src/moduleEval.ts), so preview and render agree.
//
// Security note: the module executes in the render page (headless Chrome inside the
// per-job sandbox microVM, or the self-hoster's own machine) - the microVM/self-host IS
// the security boundary, unchanged from the html kind. Network is deliberately NOT
// stubbed here: Remotion's own machinery (OffthreadVideo frame extraction, delayRender
// asset loading) shares this page and needs fetch. Determinism guardrails live in the
// editor's static validator (no fetch/XHR/network URLs in user SOURCE); a hostile
// client can bypass that, which is exactly why the boundary is the sandbox.

import React from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import * as Remotion from 'remotion';
import { AbsoluteFill, cancelRender } from 'remotion';
import type { RemotionRenderManifest } from '../../src/render/manifest';

type UserComponent = React.ComponentType<Record<string, unknown>>;
const moduleCache = new Map<string, UserComponent>();

function evalUserModule(compiledJs: string): UserComponent {
  const hit = moduleCache.get(compiledJs);
  if (hit) return hit;
  // Keep this map in lockstep with player-host/src/moduleEval.ts.
  const modules: Record<string, unknown> = {
    react: React,
    'react/jsx-runtime': JsxRuntime,
    'react/jsx-dev-runtime': JsxRuntime,
    remotion: Remotion,
  };
  const require = (id: string): unknown => {
    if (id in modules) return modules[id];
    throw new Error(`import "${id}" is not available - only react and remotion can be imported`);
  };
  const module = { exports: {} as Record<string, unknown> };
  const run = new Function('require', 'module', 'exports', compiledJs);
  run(require, module, module.exports);
  const candidate = module.exports.default ?? module.exports;
  if (typeof candidate !== 'function') {
    throw new Error('the composition module must default-export a React component');
  }
  moduleCache.set(compiledJs, candidate as UserComponent);
  return candidate as UserComponent;
}

/** Render/runtime errors inside the composition fail the JOB with the real message. */
class UserErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: Error) {
    cancelRender(new Error(`composition error: ${err.message}`));
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const UserComposition: React.FC<RemotionRenderManifest> = (manifest) => {
  // Resolved once per module source (evalUserModule caches by source, so the component
  // identity is stable across frames - state never resets between renders).
  const resolved = React.useMemo<{ Comp: UserComponent } | { error: Error }>(() => {
    try {
      return { Comp: evalUserModule(manifest.compiledJs) };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, [manifest.compiledJs]);
  if ('error' in resolved) {
    cancelRender(resolved.error);
    return null;
  }
  // mp4 flattens onto the picked background (same rule + color source as the html kind);
  // alpha formats paint nothing behind the composition.
  const background =
    manifest.output.format === 'mp4' ? (manifest.output.backgroundColor ?? '#000000') : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: background }}>
      <UserErrorBoundary>
        <resolved.Comp {...(manifest.inputProps ?? {})} />
      </UserErrorBoundary>
    </AbsoluteFill>
  );
};
