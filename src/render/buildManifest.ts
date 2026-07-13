// Build a RenderManifest from the current template + Data-panel values + user choices.
// Browser-only (composeRenderDocument fetches /fonts); the result is the complete,
// self-describing render job — POST it to the render API or feed it to the local runner.

import { composeRenderDocument } from './composeRenderDocument';
import { measureRenderDocument } from './measure';
import { RENDER_CONFIG } from './limits';
import { defaultStillTimeMs } from './schedule';
import {
  RENDER_MANIFEST_VERSION,
  type MeasuredDurations,
  type RenderFormatId,
  type RenderManifest,
} from './manifest';
import type { SpxTemplate } from '../model/types';

export interface RenderRequestOptions {
  format: RenderFormatId;
  /** Output = template resolution × scale. Default 1. */
  scale?: number;
  /** Default: the template's fps. */
  fps?: number;
  totalDurationMs: number;
  /** Default: 'none' when the template's SPX out setting is 'none', else 'auto'. */
  outMode?: 'auto' | 'none';
  backgroundColor?: string;
  vp9?: boolean;
  stillTimeMs?: number;
  /** Virtual wall clock at t=0. Default: now. Fixtures pin it for byte-stable renders. */
  epochMs?: number;
}

/** Compose the document, run the client measurement pass, and assemble the manifest. */
export async function buildRenderManifest(
  template: SpxTemplate,
  sampleData: Record<string, string>,
  options: RenderRequestOptions,
): Promise<{ manifest: RenderManifest; measured: MeasuredDurations }> {
  const documentHtml = await composeRenderDocument(template);
  const fps = options.fps ?? template.fps;
  const measured = await measureRenderDocument(documentHtml, template.resolution, fps, sampleData);

  const timing = {
    totalDurationMs: options.totalDurationMs,
    outMode: options.outMode ?? (template.settings.out === 'none' ? 'none' as const : 'auto' as const),
    minHoldMs: RENDER_CONFIG.minHoldMs,
    epochMs: options.epochMs ?? Date.now(),
  };
  const manifest: RenderManifest = {
    version: RENDER_MANIFEST_VERSION,
    kind: 'html',
    projectName: template.name,
    documentHtml,
    width: template.resolution.width,
    height: template.resolution.height,
    fps,
    scale: options.scale ?? 1,
    timing,
    data: { ...sampleData },
    output: {
      format: options.format,
      backgroundColor: options.backgroundColor,
      vp9: options.vp9,
      // The still moment is resolved HERE (client-side, where the measurement lives) so
      // the renderer never needs duration knowledge for a still.
      stillTimeMs: options.format === 'png-still'
        ? (options.stillTimeMs ?? defaultStillTimeMs(measured, timing))
        : options.stillTimeMs,
    },
    estimatedDurations: measured,
  };
  return { manifest, measured };
}
