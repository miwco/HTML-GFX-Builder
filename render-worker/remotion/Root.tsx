// The composition registry: TWO generic compositions whose metadata comes entirely from
// the manifest passed as input props — no per-graphic compositions, ever.
//   'noacg'      — kind:'html': the SPX render document driven by the virtual clock.
//   'noacg-user' — kind:'remotion': an authored composition module from the video editor.

import { Composition } from 'remotion';
import { NoaCGGraphic } from './NoaCGGraphic';
import { UserComposition } from './UserComposition';
import {
  durationInFrames,
  RENDER_MANIFEST_VERSION,
  type HtmlRenderManifest,
  type RemotionRenderManifest,
  type RenderManifest,
} from '../../src/render/manifest';

/** A minimal stand-in so `remotion studio` opens without a real job (renders a label). */
const PLACEHOLDER: HtmlRenderManifest = {
  version: RENDER_MANIFEST_VERSION,
  kind: 'html',
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

/** A tiny always-valid module so `remotion studio` opens the user composition too. */
const USER_PLACEHOLDER: RemotionRenderManifest = {
  version: RENDER_MANIFEST_VERSION,
  kind: 'remotion',
  projectName: 'placeholder',
  compiledJs: 'exports.default = function C() { return null; };',
  inputProps: {},
  durationInFrames: 100,
  width: 1920,
  height: 1080,
  fps: 50,
  scale: 1,
  output: { format: 'mp4' },
};

function guardManifest(props: Record<string, unknown>, expectedKind: RenderManifest['kind']): RenderManifest {
  const manifest = props as unknown as RenderManifest;
  if (manifest.version !== RENDER_MANIFEST_VERSION) {
    throw new Error(`manifest version ${manifest.version} is not supported (expected ${RENDER_MANIFEST_VERSION})`);
  }
  if (manifest.kind !== expectedKind) {
    throw new Error(`this composition requires kind '${expectedKind}', got '${manifest.kind}'`);
  }
  return manifest;
}

export const Root: React.FC = () => (
  // Remotion's <Composition> constrains input props to Record<string, unknown>, which the
  // manifest interfaces do not satisfy (TypeScript gives interfaces no implicit index
  // signature). The manifests stay the real prop types inside the components; only this
  // thin registry adapts at the boundary and recovers them by cast in calculateMetadata.
  <>
    <Composition
      id="noacg"
      component={NoaCGGraphic as unknown as React.FC<Record<string, unknown>>}
      defaultProps={PLACEHOLDER as unknown as Record<string, unknown>}
      durationInFrames={100}
      width={1920}
      height={1080}
      fps={50}
      calculateMetadata={({ props }) => {
        const manifest = guardManifest(props, 'html');
        return {
          durationInFrames: durationInFrames(manifest),
          fps: manifest.fps,
          width: manifest.width,
          height: manifest.height,
          props,
        };
      }}
    />
    <Composition
      id="noacg-user"
      component={UserComposition as unknown as React.FC<Record<string, unknown>>}
      defaultProps={USER_PLACEHOLDER as unknown as Record<string, unknown>}
      durationInFrames={100}
      width={1920}
      height={1080}
      fps={50}
      calculateMetadata={({ props }) => {
        const manifest = guardManifest(props, 'remotion');
        return {
          durationInFrames: durationInFrames(manifest),
          fps: manifest.fps,
          width: manifest.width,
          height: manifest.height,
          props,
        };
      }}
    />
  </>
);
