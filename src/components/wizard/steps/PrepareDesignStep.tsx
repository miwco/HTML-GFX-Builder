import { useState } from 'react';
import type { AssetFile } from '../../../model/types';
import type { DesignArt } from '../../../model/wizard';
import type { DesignEraseState } from '../draft';
import {
  eraseRegionFlat,
  FLAT_BG_TOLERANCE,
  type EraseRect,
  type EraseResult,
} from '../../../assets/eraseRegion';
import DesignPrepCanvas from '../DesignPrepCanvas';

interface Props {
  art: DesignArt;
  /** The current artwork asset (the cleaned file once an erase is applied). */
  images: AssetFile[];
  /** The untouched upload — every erase runs from THESE pixels, so re-runs never compound. */
  original: AssetFile | null;
  erase: DesignEraseState | null;
  onApplyErase: (erase: DesignEraseState, images: AssetFile[]) => void;
  onClearErase: () => void;
}

/**
 * "Import graphic", step 2 — prepare the artwork before the editor takes over.
 *
 * Text that was exported INTO the design file can't become a live field — it is pixels. This
 * step erases it deterministically (flat-fill from the sampled background, assets/eraseRegion)
 * so a real field can take its place; the erased region seeds that first field at create.
 * Everything is optional: a design with no baked-in text goes straight through.
 */
export default function PrepareDesignStep({
  art,
  images,
  original,
  erase,
  onApplyErase,
  onClearErase,
}: Props) {
  // Has the user answered "does it have baked-in text?" — starts answered when an erase
  // already exists (coming back to the step keeps the surface open).
  const [marking, setMarking] = useState<boolean | null>(erase ? true : null);
  // A run whose background was NOT flat, held for an explicit "use it anyway" instead of
  // silently applying a fill the samples disagreed on.
  const [pending, setPending] = useState<{ rect: EraseRect; result: EraseResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const [comparing, setComparing] = useState(false);

  const current = images[0] ?? null;
  const sourceW = art.sourceWidth ?? art.width;
  const sourceH = art.sourceHeight ?? art.height;
  const cleanedUrl = pending
    ? pending.result.dataUrl
    : erase && typeof current?.data === 'string'
      ? current.data
      : null;
  const downloadName = `${(current?.path ?? 'images/design.png').replace(/^.*\//, '').replace(/\.[^.]+$/, '')}-clean.png`;

  const run = async (rect: EraseRect) => {
    if (!original || typeof original.data !== 'string') return;
    setBusy(true);
    setPending(null);
    try {
      const result = await eraseRegionFlat(original.data, rect);
      if (result.sampling.uniform) {
        onApplyErase(
          { rect, uniform: true, maxDeviation: result.sampling.maxDeviation },
          [{ ...original, data: result.dataUrl }],
        );
      } else {
        setPending({ rect, result });
      }
    } finally {
      setBusy(false);
    }
  };

  const applyPending = () => {
    if (!pending || !original) return;
    onApplyErase(
      { rect: pending.rect, uniform: false, maxDeviation: pending.result.sampling.maxDeviation },
      [{ ...original, data: pending.result.dataUrl }],
    );
    setPending(null);
  };

  const removeErase = () => {
    setPending(null);
    onClearErase();
  };

  // What the surface shows: the pending (unconfirmed) fill, the original while the user
  // holds "compare", otherwise the current (possibly cleaned) artwork.
  const shownSrc = pending
    ? pending.result.dataUrl
    : comparing && original && typeof original.data === 'string'
      ? original.data
      : typeof current?.data === 'string'
        ? current.data
        : '';

  return (
    <div>
      <div className="panel-section">
        <h3>Baked-in text</h3>
        <p className="hint">
          Text that is part of the image file can't be edited on air. If your design has a name
          or title baked in, mark it here — the box is filled with the surrounding background,
          and a real, editable text field takes its place when the project is created.
        </p>
        {marking === null && (
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button data-testid="baked-no" onClick={() => setMarking(false)}>
              No baked-in text
            </button>
            <button className="primary" data-testid="baked-yes" onClick={() => setMarking(true)}>
              Yes — mark it
            </button>
          </div>
        )}
        {marking === false && (
          <p className="hint" style={{ marginTop: 10 }}>
            Nothing to erase — continue below.{' '}
            <button className="link-inline" data-testid="baked-yes" onClick={() => setMarking(true)}>
              Actually, there is baked-in text
            </button>
          </p>
        )}
        {marking && (
          <>
            <p className="hint" style={{ marginTop: 10 }}>
              Drag a box over the baked-in text. Redraw it any time — the erase always starts
              from your original file.
            </p>
            <DesignPrepCanvas
              src={shownSrc}
              sourceWidth={sourceW}
              sourceHeight={sourceH}
              rect={pending?.rect ?? erase?.rect ?? null}
              onRect={(r) => void run(r)}
              drawEnabled={!busy}
            />
            {busy && <p className="hint">Sampling the background…</p>}
            {pending && (
              <div className="wz-prep-verdict bad" data-testid="erase-warning">
                <p>
                  The background under this box isn't flat (its samples differ by{' '}
                  {pending.result.sampling.maxDeviation} — flat is ≤ {FLAT_BG_TOLERANCE}), so a
                  clean fill isn't possible. Best result: re-export the design without the text
                  and import that. You can also use the average-colour fill shown above.
                </p>
                <div className="row" style={{ gap: 8 }}>
                  <button data-testid="erase-continue-anyway" onClick={applyPending}>
                    Use it anyway
                  </button>
                  <button onClick={() => setPending(null)}>Discard</button>
                </div>
              </div>
            )}
            {erase && !pending && (
              <div className="wz-prep-verdict good" data-testid="erase-done">
                <p>
                  {erase.uniform
                    ? 'The background is flat — the text was erased cleanly.'
                    : 'Filled with the average background colour (the samples were not flat).'}{' '}
                  A text field will sit in the erased region when the project is created.
                </p>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    onPointerDown={() => setComparing(true)}
                    onPointerUp={() => setComparing(false)}
                    onPointerLeave={() => setComparing(false)}
                    title="Hold to see the original"
                  >
                    Hold to compare
                  </button>
                  {cleanedUrl && (
                    <a className="btn" data-testid="erase-download" href={cleanedUrl} download={downloadName}>
                      Download cleaned PNG
                    </a>
                  )}
                  <button data-testid="erase-remove" onClick={removeErase}>
                    Remove erase
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="panel-section" style={{ marginTop: 14 }}>
        <h3>What happens next</h3>
        <p className="hint">
          Create the project and you land in the editor with the <strong>Data</strong> tab open —
          add more text, number, and image fields there, style them, and animate the graphic.
        </p>
      </div>
    </div>
  );
}
