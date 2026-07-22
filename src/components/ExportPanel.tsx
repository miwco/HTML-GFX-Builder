import { useEffect, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import { EXPORT_TARGETS } from '../export/registry';
import { slug } from '../export/common';
import { loadPrefs, savePrefs } from '../model/prefs';
import { isRenderConfigured } from '../render/config';
import RenderPanel from './render/RenderPanel';
import { useTemplateStore } from '../store/templateStore';
import { graphicById } from '../model/library';
import { validateTemplate } from '../validation/validateTemplate';

/**
 * Export panel — validation lives HERE (there is no separate Validate tab): the checks run
 * automatically whenever the panel is open, the results are listed inline, and the download
 * stays gated on zero errors.
 */
export default function ExportPanel() {
  const template = useTemplateStore((s) => s.template);
  const sampleData = useTemplateStore((s) => s.sampleData);
  const graphicId = useTemplateStore((s) => s.saved.graphicId);
  const previewError = useTemplateStore((s) => s.previewError);
  const setValidation = useTemplateStore((s) => s.setValidation);

  // The target preselects from the remembered preference (Settings, or simply the last pick).
  const [targetId, setTargetId] = useState(() => {
    const preferred = loadPrefs().defaultExportTarget;
    return EXPORT_TARGETS.some((t) => t.id === preferred) ? preferred : EXPORT_TARGETS[0].id;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pickTarget = (id: string) => {
    setTargetId(id);
    savePrefs({ defaultExportTarget: id }); // remember the choice as the new default
  };

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
      // Targets with no playout server (HTML overlay) bake the Data panel's values in as
      // the on-load data — what you see in the preview is what the browser source shows.
      // The graphic's saved ENTRIES ride along too, read from the library at export time (the
      // same moment the show and package exports read them): an operator who built up named
      // rows here gets them in the downloaded panel, not an empty switcher. Read fresh rather
      // than held in state — entries are authored on the control-panel page, beside this one.
      const entries = graphicId ? graphicById(graphicId)?.entries : undefined;
      const zip = await target.build(template, { sampleData, entries });
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${slug(template.name)}_${target.id}.zip`);
      // Each target carries its own success line, so its deploy workflow reads correctly.
      setMessage(target.successMessage);
    } catch (err) {
      setMessage('Export failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Export</h3>
        <p className="hint">
          Pick where this graphic will run. Every package is plug-and-play: relative paths,
          bundled GSAP, no external dependencies.
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
                onChange={() => pickTarget(t.id)}
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

      {/* Video/image rendering — only on deployments with a render backend (VITE_RENDER_API).
          Unconfigured (offline/self-host default) builds show nothing here. */}
      {isRenderConfigured() && <RenderPanel />}
    </div>
  );
}
