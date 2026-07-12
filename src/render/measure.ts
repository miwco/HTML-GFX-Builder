// Client-side duration measurement — the editor's estimate pass.
//
// Loads the composed render document into a hidden iframe AT TEMPLATE RESOLUTION (layout-
// sized phases like credit rolls and marquees measure wrong at any other size), calls
// __noacgRender.prepare(), and returns the measured durations. The Export UI feeds these
// into computeSchedule for the IN/HOLD/OUT breakdown and preflight; the renderer re-runs
// the identical measurement in its own page — those numbers are authoritative.

import type { MeasuredDurations } from './manifest';

const PREPARE_TIMEOUT_MS = 15_000;

interface RenderWindow extends Window {
  __noacgRender?: {
    version: number;
    prepare(opts: { epochMs: number; fps: number; data: Record<string, string> }): Promise<MeasuredDurations>;
    getErrors(): string[];
  };
}

/** Measure a composed render document. Throws with the in-page error list on failure. */
export async function measureRenderDocument(
  documentHtml: string,
  resolution: { width: number; height: number },
  fps: number,
  data: Record<string, string>,
): Promise<MeasuredDurations> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.style.cssText = [
    'position: fixed', 'left: -200vw', 'top: 0', 'visibility: hidden',
    `width: ${resolution.width}px`, `height: ${resolution.height}px`, 'border: 0',
  ].join('; ');
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('render document load timed out')), PREPARE_TIMEOUT_MS);
      iframe.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
      iframe.srcdoc = documentHtml;
    });

    const w = iframe.contentWindow as RenderWindow | null;
    const runtime = w?.__noacgRender;
    if (!runtime) throw new Error('render runtime missing from the composed document');

    const measured = await Promise.race([
      runtime.prepare({ epochMs: 0, fps, data }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('measurement timed out')), PREPARE_TIMEOUT_MS)),
    ]);

    const errors = runtime.getErrors();
    if (errors.length > 0) throw new Error('render document errors: ' + errors.join(' | '));
    return measured;
  } finally {
    iframe.remove();
  }
}
