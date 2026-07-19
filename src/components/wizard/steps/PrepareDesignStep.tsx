import { useState } from 'react';
import type { AssetFile, Resolution } from '../../../model/types';
import type { DesignArt, DesignStretch } from '../../../model/wizard';
import type { DesignEraseState } from '../draft';
import {
  eraseRegionFlat,
  FLAT_BG_TOLERANCE,
  type EraseRect,
  type EraseResult,
} from '../../../assets/eraseRegion';
import DesignPrepCanvas, { StretchGuides } from '../DesignPrepCanvas';

interface Props {
  art: DesignArt;
  resolution: Resolution;
  /** The current artwork asset (the cleaned file once an erase is applied). */
  images: AssetFile[];
  /** The untouched upload — every erase runs from THESE pixels, so re-runs never compound. */
  original: AssetFile | null;
  erase: DesignEraseState | null;
  onApplyErase: (erase: DesignEraseState, images: AssetFile[]) => void;
  onClearErase: () => void;
  /** Set/clear the artwork's stretch mode (lands on draft.designArt.stretch). */
  onStretch: (stretch: DesignStretch | null) => void;
  /** Preview-only: the content-width slider's demo text, pushed into the live preview. */
  onDemoText: (text: string | null) => void;
}

/** The demo name the content-width slider slices — long enough to force a real stretch. */
const DEMO_NAME = 'Alexandra Konstantinopoulos-Virtanen';

/**
 * "Import graphic", step 2 — prepare the artwork before the editor takes over. Two
 * decisions, both optional (a design that needs neither goes straight to Create):
 *
 * 1. BAKED-IN TEXT: text exported into the image file is pixels, not a field. The user
 *    marks it; the flat-fill erase (assets/eraseRegion) replaces it with the sampled
 *    background, and the erased region seeds the first real text field at create.
 * 2. SCALING: fixed (the image renders exactly as drawn — the default) or horizontal
 *    stretch (a 9-slice whose middle band widens with the operator's text). The guides are
 *    dragged here and verified live with the content-width slider — the preview runs the
 *    same emitted runtime the created template ships.
 */
export default function PrepareDesignStep({
  art,
  resolution,
  images,
  original,
  erase,
  onApplyErase,
  onClearErase,
  onStretch,
  onDemoText,
}: Props) {
  // Has the user answered "does it have baked-in text?" — starts answered when an erase
  // already exists (coming back to the step keeps the surface open).
  const [marking, setMarking] = useState<boolean | null>(erase ? true : null);
  // A run whose background was NOT flat, held for an explicit "use it anyway" instead of
  // silently applying a fill the samples disagreed on.
  const [pending, setPending] = useState<{ rect: EraseRect; result: EraseResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [demoLen, setDemoLen] = useState(DEMO_NAME.length);

  const current = images[0] ?? null;
  const sourceW = art.sourceWidth ?? art.width;
  const sourceH = art.sourceHeight ?? art.height;
  const hz = art.stretch?.horizontal ?? null;
  // A frame-sized design covers the canvas edge to edge — there is no room to grow into,
  // so stretch mode would only ever hit its cap and shrink anyway.
  const fullFrame = art.width === resolution.width && art.height === resolution.height;
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
          { rect, uniform: true, maxDeviation: result.sampling.maxDeviation, fill: result.sampling.fill },
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
      {
        rect: pending.rect,
        uniform: false,
        maxDeviation: pending.result.sampling.maxDeviation,
        fill: pending.result.sampling.fill,
      },
      [{ ...original, data: pending.result.dataUrl }],
    );
    setPending(null);
  };

  /** Where the guides start when stretch is switched on: the erased text's edges when the
   *  user marked some (the text zone IS the stretch zone), else a middle-third default. */
  const defaultGuides = (): { left: number; right: number } => {
    if (erase) {
      const k = art.width / sourceW;
      return {
        left: Math.max(8, Math.round(erase.rect.x * k)),
        right: Math.min(art.width - 8, Math.round((erase.rect.x + erase.rect.width) * k)),
      };
    }
    return { left: Math.round(art.width * 0.35), right: Math.round(art.width * 0.65) };
  };

  const pickFixed = () => {
    onStretch(null);
    onDemoText(null);
  };
  const pickStretch = () => {
    if (fullFrame) return;
    onStretch({ horizontal: hz ?? defaultGuides() });
    onDemoText(DEMO_NAME.slice(0, demoLen));
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
      <DesignPrepCanvas
        src={shownSrc}
        sourceWidth={sourceW}
        sourceHeight={sourceH}
        rect={pending?.rect ?? erase?.rect ?? null}
        onRect={(r) => void run(r)}
        drawEnabled={marking === true && !busy}
      >
        {hz && (
          <StretchGuides
            left={hz.left}
            right={hz.right}
            artWidth={art.width}
            onChange={(next) => onStretch({ horizontal: next })}
          />
        )}
      </DesignPrepCanvas>
      {busy && <p className="hint">Sampling the background…</p>}
      {pending && (
        <div className="wz-prep-verdict bad" data-testid="erase-warning">
          <p>
            The background under this box isn't flat (its samples differ by{' '}
            {pending.result.sampling.maxDeviation} — flat is ≤ {FLAT_BG_TOLERANCE}), so a clean
            fill isn't possible. Best result: re-export the design without the text and import
            that. You can also use the average-colour fill shown above.
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
                Download cleaned artwork
              </a>
            )}
            <button data-testid="erase-remove" onClick={() => { setPending(null); onClearErase(); }}>
              Remove erase
            </button>
          </div>
        </div>
      )}

      <div className="panel-section" style={{ marginTop: 14 }}>
        <h3>Baked-in text</h3>
        <p className="hint">
          Text that is part of the image file can't be edited on air. If your design has a name
          or title baked in, mark it — the box is filled with the surrounding background, and a
          real, editable text field takes its place when the project is created.
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
            Nothing to erase.{' '}
            <button className="link-inline" data-testid="baked-yes" onClick={() => setMarking(true)}>
              Actually, there is baked-in text
            </button>
          </p>
        )}
        {marking && !erase && !pending && (
          <p className="hint" style={{ marginTop: 10 }}>
            Drag a box over the baked-in text on the artwork above. Redraw it any time — the
            erase always starts from your original file.
          </p>
        )}
      </div>

      <div className="panel-section" style={{ marginTop: 14 }}>
        <h3>How it meets long text</h3>
        <div className="wz-prep-modes">
          <button
            className={`wz-cat ${hz ? '' : 'selected'}`}
            data-testid="mode-fixed"
            onClick={pickFixed}
          >
            <strong>Fixed size</strong>
            <span className="hint">
              The design always renders exactly as drawn. Long values shrink their text to fit.
              Right for title cards, full-frame graphics, scoreboards, panels.
            </span>
          </button>
          <button
            className={`wz-cat ${hz ? 'selected' : ''}`}
            data-testid="mode-stretch"
            disabled={fullFrame}
            title={fullFrame ? 'A frame-sized design covers the canvas — there is no room to stretch into' : undefined}
            onClick={pickStretch}
          >
            <strong>Stretch horizontally</strong>
            <span className="hint">
              The plain middle of the design widens with the longest text field; the ends keep
              their exact shape. Right for lower thirds, straps, name tags.
            </span>
          </button>
        </div>
        {hz && (
          <>
            <p className="hint" style={{ marginTop: 10 }}>
              Drag the two guides on the artwork: left of the first and right of the second stay
              exactly as drawn; the band between them stretches. Then prove it below.
            </p>
            <label className="wz-prep-slider">
              Preview with wider content
              <input
                type="range"
                min={5}
                max={DEMO_NAME.length}
                value={demoLen}
                data-testid="stretch-demo-slider"
                onChange={(e) => {
                  const len = Number(e.target.value);
                  setDemoLen(len);
                  onDemoText(DEMO_NAME.slice(0, len));
                }}
              />
            </label>
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
