import { useRef, useState } from 'react';
import { DATA_FTYPES, type Ftype, type SpxField } from '../model/types';
import { fileToDataUrl, isImageAsset, uniqueAssetPath } from '../assets/assetUtils';
import { addFieldToDefinition, nextFieldId } from '../blocks/edit';
import { useTemplateStore } from '../store/templateStore';

// The broadcast field set (same as the wizard's extras).
const ADD_FTYPES: { value: Ftype; label: string }[] = [
  { value: 'textfield', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'filelist', label: 'Image' },
];

/** Image field ("filelist"): pick an already-added image, or upload a new one. */
function ImageFieldControl({ value, set }: { value: string; set: (v: string) => void }) {
  const assets = useTemplateStore((s) => s.template.assets);
  const addAsset = useTemplateStore((s) => s.addAsset);
  const fileInput = useRef<HTMLInputElement>(null);
  const images = assets.filter((a) => isImageAsset(a.path));

  const upload = async (file: File) => {
    const path = uniqueAssetPath(file.name, assets);
    addAsset({ path, data: await fileToDataUrl(file) });
    set(path); // the field value is the image's relative path, e.g. images/logo.png
  };

  return (
    <div>
      <div className="row">
        <select
          className="grow"
          value={images.some((a) => a.path === value) ? value : ''}
          onChange={(e) => set(e.target.value)}
          title="Images already in this project (bundled into the export under images/)"
        >
          <option value="">(no image)</option>
          {images.map((a) => (
            <option key={a.path} value={a.path}>{a.path}</option>
          ))}
        </select>
        <input
          ref={fileInput}
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) void upload(e.target.files[0]); e.target.value = ''; }}
        />
        <button onClick={() => fileInput.current?.click()} title="Upload an image — bundled into the export under images/">
          ⬆ Upload…
        </button>
      </div>
    </div>
  );
}

/** Render the appropriate input control for a field's ftype. */
function FieldControl({ field }: { field: SpxField }) {
  const value = useTemplateStore((s) => s.sampleData[field.field] ?? '');
  const setSampleValue = useTemplateStore((s) => s.setSampleValue);
  const set = (v: string) => setSampleValue(field.field, v);

  switch (field.ftype) {
    case 'filelist':
      return <ImageFieldControl value={value} set={set} />;
    case 'textarea':
      return <textarea rows={3} value={value} onChange={(e) => set(e.target.value)} />;
    case 'number':
      return <input type="number" value={value} onChange={(e) => set(e.target.value)} />;
    case 'color':
      return (
        <div className="row">
          <input type="color" style={{ width: 44, padding: 2 }} value={value || '#000000'} onChange={(e) => set(e.target.value)} />
          <input className="grow" value={value} onChange={(e) => set(e.target.value)} />
        </div>
      );
    case 'checkbox':
      return (
        <label className="row" style={{ marginTop: 4 }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={value === '1' || value === 'true'}
            onChange={(e) => set(e.target.checked ? '1' : '0')}
          />
          <span className="muted">enabled</span>
        </label>
      );
    case 'dropdown':
      return (
        <select value={value} onChange={(e) => set(e.target.value)}>
          {(field.items ?? []).map((it) => (
            <option key={it.value} value={it.value}>
              {it.text}
            </option>
          ))}
        </select>
      );
    default:
      return <input value={value} onChange={(e) => set(e.target.value)} />;
  }
}

/**
 * Edit the sample/test data fed to update(). Fields are parsed from the template's
 * SPXGCTemplateDefinition; each renders the control matching its ftype.
 */
export default function SampleDataPanel() {
  const template = useTemplateStore((s) => s.template);
  const fields = useTemplateStore((s) => s.template.fields);
  const resetSampleData = useTemplateStore((s) => s.resetSampleData);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Ftype>('textfield');

  const dataFields = fields.filter((f) => DATA_FTYPES.includes(f.ftype));
  const noteFields = fields.filter((f) => ['instruction', 'caption'].includes(f.ftype));

  // Append a field to the SPX definition (the editor highlights the new entry). The field
  // is definition-only until it's wired to an element — AI modify does that in one prompt.
  const addField = () => {
    const field: SpxField = {
      field: nextFieldId(fields),
      ftype: newType,
      title: newTitle.trim() || 'New field',
      value: newType === 'number' ? '0' : '',
      ...(newType === 'filelist' ? { assetfolder: './images/', extension: 'png' } : {}),
    };
    applyTemplate(addFieldToDefinition(template, field));
    setActiveTab('html'); // the definition lives in the HTML — show what was added
    setNewTitle('');
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Sample data</h3>
        <p className="hint">
          These values are sent to <code className="inline">update(data)</code> as JSON when you press
          Play or Update. They come from the template's field definitions.
        </p>
      </div>

      {dataFields.length === 0 && <p className="muted">No editable data fields in this template.</p>}

      {dataFields.map((f) => (
        <div className="field-row" key={f.field}>
          <div className="field-meta">
            <label style={{ margin: 0 }}>{f.title || f.field}</label>
            <span className="field-id">{f.field}</span>
          </div>
          <FieldControl field={f} />
        </div>
      ))}

      {noteFields.length > 0 && (
        <>
          <div className="divider" />
          {noteFields.map((f, i) => (
            <p className="hint" key={i}>
              {f.ftype === 'instruction' ? 'ℹ ' : ''}
              {f.value}
            </p>
          ))}
        </>
      )}

      {dataFields.length > 0 && (
        <>
          <div className="divider" />
          <button onClick={resetSampleData}>Reset to defaults</button>
        </>
      )}

      <div className="divider" />
      <div className="panel-section">
        <h3>Add a field</h3>
        <div className="row">
          <input
            className="grow"
            placeholder="Label the operator sees, e.g. Sponsor"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addField(); }}
          />
          <select value={newType} onChange={(e) => setNewType(e.target.value as Ftype)}>
            {ADD_FTYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button onClick={addField} title="Append the field to the SPX definition">+ Add</button>
        </div>
        <p className="hint" style={{ marginTop: 6 }}>
          Lands in the SPX definition (highlighted in the HTML). To show it in the design, ask the
          AI — e.g. “display the new Sponsor field under the title”.
        </p>
      </div>
    </div>
  );
}
