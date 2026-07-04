import { useEffect, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import { EXPORT_TARGETS } from '../export/registry';
import { slug } from '../export/common';
import { useTemplateStore } from '../store/templateStore';
import { validateTemplate } from '../validation/validateTemplate';

/**
 * Export panel — validation lives HERE (there is no separate Validate tab): the checks run
 * automatically whenever the panel is open, the results are listed inline, and the download
 * stays gated on zero errors.
 */
export default function ExportPanel() {
  const template = useTemplateStore((s) => s.template);
  const previewError = useTemplateStore((s) => s.previewError);
  const setValidation = useTemplateStore((s) => s.setValidation);

  const [targetId, setTargetId] = useState(EXPORT_TARGETS[0].id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const target = EXPORT_TARGETS.find((t) => t.id === targetId)!;

  // Live validation: re-runs when the template (or a preview runtime error) changes.
  const validation = useMemo(
    () => validateTemplate(template, { runtimeError: previewError }),
    [template, previewError],
  );
  useEffect(() => setValidation(validation), [validation, setValidation]);

  const exportZip = async () => {
    setMessage(null);
    if (!validation.ok) return;
    setBusy(true);
    try {
      const zip = await target.build(template);
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${slug(template.name)}_${target.id}.zip`);
      setMessage('✓ Exported. Drop the unzipped folder into your SPX templates.');
    } catch (err) {
      setMessage('Export failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Export SPX package</h3>
        <p className="hint">
          The package is plug-and-play: relative paths, bundled GSAP, no external dependencies.
        </p>
      </div>

      <div className="stack">
        {EXPORT_TARGETS.map((t) => (
          <label
            key={t.id}
            className="issue"
            style={{ display: 'block', cursor: 'pointer', borderColor: targetId === t.id ? 'var(--accent)' : undefined }}
          >
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <input
                type="radio"
                name="export-target"
                style={{ width: 'auto', marginTop: 3 }}
                checked={targetId === t.id}
                onChange={() => setTargetId(t.id)}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{t.label}</div>
                <div className="hint">{t.description}</div>
              </div>
            </div>
          </label>
        ))}
      </div>

      <button
        className="primary"
        style={{ marginTop: 12, width: '100%' }}
        disabled={busy || !validation.ok}
        onClick={exportZip}
        title={validation.ok ? undefined : 'Fix the validation errors below first'}
      >
        {busy ? 'Building…' : `Validate & download (${target.label})`}
      </button>

      {message && (
        <p className={message.startsWith('✓') ? 'status-ok' : 'status-bad'} style={{ marginTop: 10 }}>
          {message}
        </p>
      )}

      {/* Validation results — always visible so problems surface before you reach for export. */}
      <div className="panel-section" style={{ marginTop: 14 }}>
        <p className={validation.ok ? 'status-ok' : 'status-bad'}>
          {validation.ok
            ? '✓ Template is valid and ready to export.'
            : `✗ ${validation.errors.length} error(s) must be fixed before export.`}
        </p>

        {validation.errors.map((issue, i) => (
          <div className="issue error" key={`e${i}`}>
            <span className="rule">{issue.rule}</span>
            {issue.message}
          </div>
        ))}

        {validation.warnings.map((issue, i) => (
          <div className="issue warn" key={`w${i}`}>
            <span className="rule">{issue.rule} · warning</span>
            {issue.message}
          </div>
        ))}
      </div>
    </div>
  );
}
