import { useRef, useState } from 'react';
import { getAiProvider } from '../../../ai';
import { brainstorm, type ChatMessage } from '../../../ai/brainstorm';
import { EXAMPLE_PROMPTS } from '../../../ai/examplePrompts';
import { AI_MODELS, aiConfigured, loadAiSettings, saveAiSettings } from '../../../ai/settings';
import { useAuthState } from '../../auth/useAuthState';
import SignInPrompt from '../../auth/SignInPrompt';
import { fileToDataUrl, uniqueAssetPath } from '../../../assets/assetUtils';
import type { AssetFile, Resolution, SpxTemplate } from '../../../model/types';
import type { Palette } from '../../../model/wizard';
import { validateTemplate, type ValidationResult } from '../../../validation/validateTemplate';

interface Props {
  resolution: Resolution;
  fps: number;
  /** Brand colors to honor (when "Match current project" is on and a brand exists). */
  brandPalette: Palette | null;
  /** The current AI result shown in the live preview (null until the first generation). */
  result: SpxTemplate | null;
  onResult: (template: SpxTemplate | null, valid: boolean) => void;
}

/** Step 1 (Describe-it mode) — prompt + optional images/brand → a validated template. */
export default function AiStep({ resolution, fps, brandPalette, result, onResult }: Props) {
  const { needsSignIn } = useAuthState();
  const [settings, setSettings] = useState(loadAiSettings);
  const [showSettings, setShowSettings] = useState(!aiConfigured());
  const [prompt, setPrompt] = useState('');
  const [refine, setRefine] = useState('');
  const [images, setImages] = useState<AssetFile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // The brainstorm chat (optional): sharpen the idea, then use its BRIEF as the prompt.
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [latestBrief, setLatestBrief] = useState<string | null>(null);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    const history: ChatMessage[] = [...chat, { role: 'user', text }];
    setChat(history);
    setChatInput('');
    setChatBusy(true);
    setError(null);
    try {
      const { reply, brief } = await brainstorm(history);
      setChat([...history, { role: 'assistant', text: reply }]);
      if (brief) setLatestBrief(brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setChat(history.slice(0, -1)); // the failed turn goes back into the input
      setChatInput(text);
    } finally {
      setChatBusy(false);
    }
  };

  const saveSetting = (patch: Parameters<typeof saveAiSettings>[0]) => {
    saveAiSettings(patch);
    setSettings(loadAiSettings());
  };

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    const next = [...images];
    for (const file of Array.from(files)) {
      next.push({ path: uniqueAssetPath(file.name, next), data: await fileToDataUrl(file) });
    }
    setImages(next);
  };

  const run = async (fn: () => Promise<{ summary: string; template: SpxTemplate }>, label: string) => {
    setBusy(label);
    setError(null);
    try {
      const change = await fn();
      const v = validateTemplate(change.template);
      setSummary(change.summary);
      setValidation(v);
      onResult(change.template, v.ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const generate = () =>
    run(
      () => getAiProvider().generate(prompt, { images, palette: brandPalette, resolution, fps }),
      'Designing your graphic… (this can take up to a minute)',
    );

  const refineNow = () => {
    if (!result) return;
    const p = refine;
    setRefine('');
    void run(() => getAiProvider().modify(p, result), 'Refining…');
  };

  // Hosted mode, no account: AI is an account feature. The template wizard path stays fully
  // open — this only gates the Describe-it (AI) entry. Offline builds never hit this branch.
  if (needsSignIn) {
    return (
      <SignInPrompt
        feature="Describe your graphic"
        reason="Sign in to use AI — describe any graphic and get a validated, editable template."
      />
    );
  }

  return (
    <div>
      <div className="panel-section">
        <h3>Describe your graphic</h3>
        <p className="hint">
          What is it, what data does the operator fill in, and what should it feel like? The AI
          writes the same kind of readable, panel-editable code the templates use — and every
          result is validated before you can create it.
        </p>
      </div>

      {/* Example briefs: show the range (most have no starting template) + teach the shape. */}
      <div className="row wrap" style={{ marginBottom: 6, gap: 6 }}>
        {EXAMPLE_PROMPTS.map((ex) => (
          <button
            key={ex.label}
            className="wz-example"
            title={ex.prompt}
            onClick={() => setPrompt(ex.prompt)}
            disabled={!!busy}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <textarea
        rows={4}
        placeholder={'e.g. "An election results lower third for channel A7: candidate name, party, and a\nvote percentage that counts up. Dark, serious, uses our logo as a small badge on the left."'}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={!!busy}
      />

      {/* Brainstorm chat: talk the idea through, then take the refined brief. */}
      <div style={{ marginTop: 6 }}>
        <button onClick={() => setChatOpen((o) => !o)} disabled={!aiConfigured(settings)}>
          🗨 {chatOpen ? 'Hide brainstorm' : 'Brainstorm with AI…'}
        </button>
      </div>
      {chatOpen && (
        <div className="ai-chat">
          {chat.length === 0 && (
            <p className="hint">
              Not sure what you need yet? Describe the show or the moment ("halftime of a local
              derby, we need something for substitutions") and work it out together — every reply
              ends with a ready-to-use brief.
            </p>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`ai-msg ${m.role}`}>
              <span>{m.text}</span>
            </div>
          ))}
          {chatBusy && <p className="hint">⏳ Thinking…</p>}
          {latestBrief && !chatBusy && (
            <div className="ai-brief">
              <span className="hint">Current brief: {latestBrief}</span>
              <button className="primary" onClick={() => { setPrompt(latestBrief); setChatOpen(false); }}>
                Use as brief
              </button>
            </div>
          )}
          <div className="row" style={{ marginTop: 6 }}>
            <input
              className="grow"
              placeholder="Talk it through…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void sendChat(); }}
              disabled={chatBusy}
            />
            <button disabled={chatBusy || !chatInput.trim()} onClick={() => void sendChat()}>Send</button>
          </div>
        </div>
      )}

      <div className="row wrap" style={{ marginTop: 8, alignItems: 'center' }}>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.gif"
          style={{ display: 'none' }}
          onChange={(e) => { void addImages(e.target.files); e.target.value = ''; }}
        />
        <button onClick={() => fileInput.current?.click()} disabled={!!busy}>
          🖼 Add logo / picture…
        </button>
        {images.map((img) => (
          <span key={img.path} className="wz-fid" title={img.path}>
            {img.path.replace(/^images\//, '')}
            <button
              style={{ marginLeft: 6, padding: '0 6px' }}
              onClick={() => setImages(images.filter((i) => i.path !== img.path))}
              title="Remove"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      {brandPalette && (
        <p className="hint" style={{ marginTop: 6 }}>
          Using this project's brand colors (accent {brandPalette.accent}) — toggle "Match current
          project" below to let the AI pick its own.
        </p>
      )}

      <div className="row" style={{ marginTop: 10 }}>
        <button className="primary" disabled={!!busy || !prompt.trim() || !aiConfigured(settings)} onClick={() => void generate()}>
          {result ? '↻ Generate again' : '✦ Generate'}
        </button>
        <button onClick={() => setShowSettings((s) => !s)}>⚙ AI settings</button>
      </div>

      {showSettings && (
        <div className="panel-section" style={{ marginTop: 10 }}>
          <h3>AI settings</h3>
          {!settings.proxyUrl && (
            <>
              <label>Anthropic API key</label>
              <input
                type="password"
                placeholder="sk-ant-…"
                value={settings.apiKey}
                onChange={(e) => saveSetting({ apiKey: e.target.value.trim() })}
              />
              <p className="hint">
                Stored only in this browser (localStorage) and sent only to Anthropic. Get one at
                console.anthropic.com — or set VITE_ANTHROPIC_API_KEY in .env.
              </p>
            </>
          )}
          <label style={{ marginTop: 8 }}>Model</label>
          <select value={settings.model} onChange={(e) => saveSetting({ model: e.target.value })}>
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id} title={m.blurb}>{m.label}</option>
            ))}
            {!AI_MODELS.some((m) => m.id === settings.model) && (
              <option value={settings.model}>{settings.model}</option>
            )}
          </select>
          <p className="hint">{AI_MODELS.find((m) => m.id === settings.model)?.blurb ?? 'Custom model id (from .env).'}</p>
        </div>
      )}

      {busy && <p className="hint" style={{ marginTop: 10 }}>⏳ {busy}</p>}
      {error && <p className="status-bad" style={{ marginTop: 10 }}>✗ {error}</p>}

      {result && !busy && (
        <div className="change-preview" style={{ marginTop: 10 }}>
          <strong>{result.name}</strong>
          {summary && <p style={{ marginTop: 6 }}>{summary}</p>}
          <p className={validation?.ok ? 'status-ok' : 'status-bad'} style={{ marginTop: 6 }}>
            {validation?.ok
              ? '✓ Passes SPX validation — press Play in the preview, then Create project.'
              : `✗ ${validation?.errors.length} validation error(s) — refine or regenerate.`}
          </p>
          {validation && !validation.ok && (
            <ul className="hint" style={{ margin: '4px 0 0 16px' }}>
              {validation.errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <input
              className="grow"
              placeholder='Refine it — e.g. "bigger name, move it bottom-left, calmer entrance"'
              value={refine}
              onChange={(e) => setRefine(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && refine.trim()) refineNow(); }}
            />
            <button disabled={!refine.trim()} onClick={refineNow}>Refine</button>
          </div>
        </div>
      )}
    </div>
  );
}
