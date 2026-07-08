import { useState } from 'react';
import { AI_MODELS, loadAiSettings, saveAiSettings } from '../ai/settings';
import { loadPrefs, savePrefs } from '../model/prefs';
import { EXPORT_TARGETS } from '../export/registry';

interface Props {
  onClose: () => void;
}

/**
 * Account/app settings (reached from the topbar account menu). Everything here is stored in
 * THIS browser: the AI key goes only to Anthropic, never to our backend. Style defaults live
 * where the work happens instead — the project brand (wizard "Match current project") and the
 * 📦 Packets brand looks — so this dialog stays small on purpose.
 */
export default function SettingsDialog({ onClose }: Props) {
  const [ai, setAi] = useState(loadAiSettings);
  const [prefs, setPrefs] = useState(loadPrefs);

  const saveAi = (patch: Parameters<typeof saveAiSettings>[0]) => {
    saveAiSettings(patch);
    setAi(loadAiSettings());
  };
  const savePref = (patch: Parameters<typeof savePrefs>[0]) => {
    savePrefs(patch);
    setPrefs(loadPrefs());
  };

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wz-modal pk-modal settings-modal" data-testid="settings">
        <div className="wz-header">
          <div>
            <h2>Settings</h2>
            <p className="hint">Stored in this browser. Your API key is sent only to Anthropic.</p>
          </div>
          <button className="gallery-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="pk-body">
          <div className="panel-section">
            <h3>AI</h3>
            {!ai.proxyUrl && (
              <>
                <label htmlFor="set-ai-key">Anthropic API key</label>
                <input
                  id="set-ai-key"
                  type="password"
                  placeholder="sk-ant-…"
                  value={ai.apiKey}
                  onChange={(e) => saveAi({ apiKey: e.target.value.trim() })}
                />
                <p className="hint">
                  Bring-your-own-key AI is free. Get a key at console.anthropic.com — or set
                  VITE_ANTHROPIC_API_KEY in .env for a self-hosted build.
                </p>
              </>
            )}
            <label htmlFor="set-ai-model" style={{ marginTop: 8 }}>Model</label>
            <select id="set-ai-model" value={ai.model} onChange={(e) => saveAi({ model: e.target.value })}>
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id} title={m.blurb}>{m.label}</option>
              ))}
              {!AI_MODELS.some((m) => m.id === ai.model) && <option value={ai.model}>{ai.model}</option>}
            </select>
            <p className="hint">{AI_MODELS.find((m) => m.id === ai.model)?.blurb ?? 'Custom model id (from .env).'}</p>
          </div>

          <div className="panel-section">
            <h3>Workflow defaults</h3>
            <label htmlFor="set-export-target">Default export target</label>
            <select
              id="set-export-target"
              value={prefs.defaultExportTarget || EXPORT_TARGETS[0].id}
              onChange={(e) => savePref({ defaultExportTarget: e.target.value })}
            >
              {EXPORT_TARGETS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <p className="hint">
              Preselected in the Export tab (picking a target there updates this too — it
              remembers your last choice).
            </p>
          </div>

          <div className="panel-section">
            <h3>Brand &amp; style defaults</h3>
            <p className="hint">
              Your visual defaults live where the work happens: the <strong>project brand</strong> is
              captured on every wizard Create (and preselected via "Match current project"), and
              named <strong>brand looks</strong> — palette + font, shareable as files — live under
              📦 Packets. Imported fonts and logos travel inside each graphic and its export.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
