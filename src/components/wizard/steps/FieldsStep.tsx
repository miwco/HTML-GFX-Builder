import { useRef } from 'react';
import { fileToDataUrl, uniqueAssetPath } from '../../../assets/assetUtils';
import type { TemplateVariant } from '../../../model/wizard';
import type { DraftPatch, WizardDraft } from '../draft';

interface Props {
  variant: TemplateVariant;
  draft: WizardDraft;
  onDraft: (patch: DraftPatch) => void;
}

/** Step 3 — the data fields: the visible text lines plus the design's logo slot. */
export default function FieldsStep({ variant, draft, onDraft }: Props) {
  const lines = draft.lines;
  const logoInput = useRef<HTMLInputElement>(null);

  const setLine = (i: number, key: 'title' | 'sample', value: string) => {
    const next = lines.map((l, k) => (k === i ? { ...l, [key]: value } : l));
    onDraft({ lines: next });
  };

  // The logo slot: built-in designs always carry one; optional designs get a toggle.
  // Unset (null) follows "a logo image exists" — the import flow pre-fills it.
  const logoOn =
    variant.logo === 'built-in' || (draft.logoEnabled ?? draft.logoAssetPath !== null);
  const logoImage = draft.importedImages.find((a) => a.path === draft.logoAssetPath);

  /** Upload a custom logo: embed it as a data-URL asset and point the slot at it. */
  const uploadLogo = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    const path = uniqueAssetPath(file.name, draft.importedImages);
    onDraft({
      importedImages: [...draft.importedImages, { path, data: dataUrl }],
      logoAssetPath: path,
      logoEnabled: true,
    });
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Text lines <span className="muted">(the design adapts — {variant.maxLines} max for {variant.name})</span></h3>
        {lines.map((line, i) => (
          <div className="wz-line-row" key={i}>
            <span className="wz-fid">f{i}</span>
            <input
              placeholder="Label shown to the operator"
              value={line.title}
              onChange={(e) => setLine(i, 'title', e.target.value)}
            />
            {variant.suggestedLines[i]?.sample.includes('\n') ? (
              <textarea
                rows={5}
                placeholder="One entry per line — e.g.  Role | Name"
                value={line.sample}
                onChange={(e) => setLine(i, 'sample', e.target.value)}
              />
            ) : (
              <input
                placeholder="Sample text shown in the design"
                value={line.sample}
                onChange={(e) => setLine(i, 'sample', e.target.value)}
              />
            )}
            <button
              disabled={lines.length <= 1}
              title="Remove this line"
              onClick={() => onDraft({ lines: lines.filter((_, k) => k !== i) })}
            >
              ✕
            </button>
          </div>
        ))}
        {lines.length < variant.maxLines && (
          <button onClick={() => onDraft({ lines: [...lines, { title: `Line ${lines.length + 1}`, sample: 'More text' }] })}>
            + Add a line
          </button>
        )}
      </div>

      {variant.logo !== 'none' && (
        <div className="panel-section">
          <h3>Logo <span className="muted">(a real SPX image field — swap the file at playout)</span></h3>
          <label className="row" style={{ gap: 8, alignItems: 'center', cursor: variant.logo === 'built-in' ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={logoOn}
              disabled={variant.logo === 'built-in'}
              onChange={(e) => onDraft({ logoEnabled: e.target.checked })}
            />
            <span>
              <strong>Include a logo slot</strong>
              <span className="hint" style={{ display: 'block' }}>
                {variant.logo === 'built-in'
                  ? 'This design always carries its logo slot — upload yours or pick a file later in SPX.'
                  : 'Adds an image field to the design; leave it empty for a clean placeholder.'}
              </span>
            </span>
          </label>
          {logoOn && (
            <div className="row" style={{ gap: 8, marginTop: 10, alignItems: 'center' }}>
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files?.[0]) void uploadLogo(e.target.files[0]); e.target.value = ''; }}
              />
              <button onClick={() => logoInput.current?.click()}>⬆ Upload a logo…</button>
              {logoImage && typeof logoImage.data === 'string' && (
                <>
                  <img
                    src={logoImage.data}
                    alt="Logo preview"
                    style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }}
                  />
                  <span className="hint">{logoImage.path.replace('images/', '')}</span>
                  <button
                    title="Remove the uploaded logo (the slot keeps its placeholder)"
                    onClick={() => onDraft({ logoAssetPath: null })}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="panel-section">
        <h3>Need more fields? <span className="muted">(after creating)</span></h3>
        <p className="hint">
          The wizard keeps to the lines this design actually shows. Extra fields and custom
          layouts are added after creating, where the design can adapt to them: the Data tab
          adds a field, and AI editing or the canvas editor works it into the graphic.
        </p>
      </div>
    </div>
  );
}
