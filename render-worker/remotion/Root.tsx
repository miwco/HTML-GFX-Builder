// The composition registry: ONE composition ('noacg') whose metadata comes entirely from
// the manifest passed as input props — no per-graphic compositions, ever.

import { Composition } from 'remotion';
import { NoaCGGraphic } from './NoaCGGraphic';
import { durationInFrames, RENDER_MANIFEST_VERSION, type RenderManifest } from '../../src/render/manifest';

/** A minimal stand-in so `remotion studio` opens without a real job (renders a label). */
const PLACEHOLDER: RenderManifest = {
  version: RENDER_MANIFEST_VERSION,
  projectName: 'placeholder',
  documentHtml:
    '<!doctype html><html><head><meta name="color-scheme" content="light"><script>window.__noacgRender={version:' +
    RENDER_MANIFEST_VERSION +
    ',prepare:function(){return Promise.resolve({inMs:0,stepMs:[],outMs:0,continuous:{in:false,out:false},hasBuilders:false,runtimeVersion:1})},setSchedule:function(){},seek:function(){},vNow:function(){return 0},getErrors:function(){return []}};</script></head>' +
    '<body style="margin:0;display:grid;place-items:center;font:700 48px sans-serif;color:#f5a623">NoaCG render host — pass a manifest as input props</body></html>',
  width: 1920,
  height: 1080,
  fps: 50,
  scale: 1,
  timing: { totalDurationMs: 2000, outMode: 'none', minHoldMs: 500, epochMs: 0 },
  data: {},
  output: { format: 'mp4' },
};

export const Root: React.FC = () => (
  // Remotion's <Composition> constrains input props to Record<string, unknown>, which the
  // RenderManifest interface does not satisfy (TypeScript gives interfaces no implicit index
  // signature). RenderManifest stays the real prop type inside NoaCGGraphic; only this thin
  // registry adapts at the boundary and recovers the manifest by cast in calculateMetadata.
  <Composition
    id="noacg"
    component={NoaCGGraphic as unknown as React.FC<Record<string, unknown>>}
    defaultProps={PLACEHOLDER as unknown as Record<string, unknown>}
    durationInFrames={100}
    width={1920}
    height={1080}
    fps={50}
    calculateMetadata={({ props }) => {
      const manifest = props as unknown as RenderManifest;
      if (manifest.version !== RENDER_MANIFEST_VERSION) {
        throw new Error(`manifest version ${manifest.version} is not supported (expected ${RENDER_MANIFEST_VERSION})`);
      }
      return {
        durationInFrames: durationInFrames(manifest),
        fps: manifest.fps,
        width: manifest.width,
        height: manifest.height,
        props,
      };
    }}
  />
);
