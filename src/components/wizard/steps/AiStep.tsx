import { useRef, useState } from 'react';
import { getAiProvider } from '../../../ai';
import { brainstorm, type ChatMessage } from '../../../ai/brainstorm';
import { EXAMPLE_PROMPTS } from '../../../ai/examplePrompts';
import { AI_MODELS, aiConfigured, loadAiSettings, saveAiSettings } from '../../../ai/settings';
import type { AiPath, AiTemplateChange, GenerateOptions, SpxValidator } from '../../../ai/provider';
import type { DesignSpec } from '../../../ai/designSpec';
import { useAuthState } from '../../auth/useAuthState';
import SignInPrompt from '../../auth/SignInPrompt';
import { fileToDataUrl, uniqueAssetPath } from '../../../assets/assetUtils';
import { importTemplateFile, isTemplateFile } from '../../../model/importTemplate';
import type { AssetFile, Resolution, SpxTemplate } from '../../../model/types';
import type { Palette } from '../../../model/wizard';
import { validateTemplate, type ValidationResult } from '../../../validation/validateTemplate';
import { benchTemplateRuntime, mergeResults } from '../../../validation/runtimeBench';

interface Props {
  resolution: Resolution;
  fps: number;
  /** Brand colors to honor (when "Use current project's colors & font" is on and a brand exists). */
  brandPalette: Palette | null;
  /** The current AI result shown in the live preview (null until the first generation). */
  result: SpxTemplate | null;
  onResult: (template: SpxTemplate | null, valid: boolean) => void;
  /** Byte-faithful open of a dropped .html/.zip template — no AI, applies and closes. */
  onOpenImported: (template: SpxTemplate) => void;
  /** Continue into the catalog flow designing AROUND the dropped images (no AI needed). */
  onUseTemplates: (images: AssetFile[]) => void;
}

/** How each harness route is presented on the result card. */
function routeLabel(path: AiPath | null): string | null {
  switch (path) {
    case 'grounded':
      return '▤ Built on the catalog design system — editable everywhere, exactly like wizard output.';
    case 'grounded+polish':
      return '▤ Catalog design system plus a bounded custom flourish.';
    case 'custom':
      return '✦ Custom build — exercised end to end in the live playout bench.';
    default:
      return null;
  }
}

/**
 * Step 1 (Create-with-AI mode) — the merged create/import step: describe what you need,
 * drop in a logo, brand stills, or an existing .html / SPX template to convert. Every AI
 * result runs the full harness (validation + the live runtime bench); the no-AI import
 * ("Open as code") stays one click away and never gates on sign-in.
 */
export default function AiStep({
  resolution,
  fps,
  brandPalette,
  result,
  onResult,
  onOpenImported,
  onUseTemplates,
}: Props) {
  const { needsSignIn } = useAuthState();
  const [settings, setSettings] = useState(loadAiSettings);
  const [showSettings, setShowSettings] = useState(!aiConfigured());
  const [prompt, setPrompt] = useState('');
  const [refine, setRefine] = useState('');
  const [images, setImages] = useState<AssetFile[]>([]);
  const [imported, setImported] = useState<{ fileName: string; template: SpxTemplate } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  // Harness provenance for the result card + the spec that produced a grounded result
  // (passed back on refine so "warmer colours" re-assembles instead of editing code).
  const [lastPath, setLastPath] = useState<AiPath | null>(null);
  const [lastSpec, setLastSpec] = useState<DesignSpec | null>(null);
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

  // One drop zone, three inputs: images become generation assets, an .html/.zip becomes
  // an imported template (deterministic parse first — the AI only ever sees parsed code).
  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    setError(null);
    const list = Array.from(files);
    const templateFile = list.find(isTemplateFile);
    if (templateFile) {
      try {
        setImported({ fileName: templateFile.name, template: await importTemplateFile(templateFile) });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    const next = [...images];
    for (const file of list) {
      if (!file.type.startsWith('image/')) continue;
      next.push({ path: uniqueAssetPath(file.name, next), data: await fileToDataUrl(file) });
    }
    if (next.length !== images.length) setImages(next);
  };

  // The harness's injected validation pipeline: static rules + the live runtime bench
  // (lifecycle, field binding, overlap/overflow, double-length stress) — bench findings
  // drive the provider's repair rounds.
  const validate: SpxValidator = async (t) => mergeResults(validateTemplate(t), await benchTemplateRuntime(t));

  const run = async (fn: (options: GenerateOptions) => Promise<AiTemplateChange>, label: string) => {
    setBusy(label);
    setError(null);
    try {
      const change = await fn({ validate, onProgress: (stage) => setBusy(stage) });
      const v = change.validation ?? validateTemplate(change.template);
      setSummary(change.summary);
      setValidation(v);
      setLastPath(change.path ?? null);
      setLastSpec(change.spec ?? null);
      onResult(change.template, v.ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const context = { images, palette: brandPalette, resolution, fps };

  const generate = () =>
    run(
      (options) =>
        imported
          ? getAiProvider().convertImport(prompt, imported.template, context, options)
          : getAiProvider().generate(prompt, context, options),
      imported ? 'Converting your template…' : 'Designing your graphic… (this can take a minute)',
    );

  const refineNow = () => {
    if (!result) return;
    const p = refine;
    setRefine('');
    void run(
      (options) => getAiProvider().modify(p, result, { ...options, spec: lastSpec ?? undefined }),
      'Refining…',
    );
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Create with AI</h3>
        <p className="hint">
          Describe what you need — and drop in a logo, brand stills, or an existing template to
          convert. Every result is validated AND exercised in a live playout test before you can
          create it, and lands as clean, editable code.
        </p>
      </div>

      {/* The drop zone (images + existing templates). Never gated: the no-AI import lives here. */}
      <div
        className={`wz-drop ${dragOver ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*,.html,.htm,.zip"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }}
        />
        <strong>Drop a logo, images — or an existing template — here</strong>
        <span className="hint">
          Images feed the design (logos work best as PNG with transparency). An{' '}
          <code className="inline">.html</code> file or an SPX-style <code className="inline">.zip</code>{' '}
          can be opened as code unchanged, or converted to house standards with AI.
        </span>
      </div>

      {imported && (
        <div className="change-preview" style={{ marginTop: 10 }}>
          <strong>{imported.template.name}</strong>
          <span className="hint" style={{ marginLeft: 8 }}>{imported.fileName} — existing template</span>
          <p className="hint" style={{ marginTop: 6 }}>
            <b>Open as code</b> keeps it byte-for-byte (validate and re-export it as SPX /
            CasparCG / OGraf). Or describe what to change and <b>Convert</b> brings it to the
            house standards with AI.
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="primary" onClick={() => onOpenImported(imported.template)}>
              ‹› Open as code (no AI)
            </button>
            <button onClick={() => setImported(null)}>✕ Remove</button>
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="row wrap" style={{ marginTop: 8, alignItems: 'center' }}>
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
          <button onClick={() => onUseTemplates(images)} title="Skip the AI: pick a catalog design with a logo slot and your first image pre-placed">
            ▤ Design around these with a catalog template ›
          </button>
        </div>
      )}

      {needsSignIn ? (
        // Hosted mode, no account: AI is an account feature — but only the AI. The import
        // above (Open as code) and the catalog continuation stay fully open.
        <div style={{ marginTop: 12 }}>
          <SignInPrompt
            feature="Create with AI"
            reason="Sign in to use AI — describe any graphic and get a validated, editable template."
          />
        </div>
      ) : (
        <>
          {/* Example briefs: show the range (most have no starting template) + teach the shape. */}
          <div className="row wrap" style={{ marginTop: 12, marginBottom: 6, gap: 6 }}>
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
            placeholder={
              imported
                ? 'e.g. "Keep the layout but bring it to our look: darker panel, our amber accent, calmer entrance."'
                : 'e.g. "An election results lower third for channel A7: candidate name, party, and a\nvote percentage that counts up. Dark, serious, uses our logo as a small badge on the left."'
            }
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

          {brandPalette && (
            <p className="hint" style={{ marginTop: 6 }}>
              Using this project's brand colors (accent {brandPalette.accent}) — toggle "Match current
              project" below to let the AI pick its own.
            </p>
          )}

          <div className="row" style={{ marginTop: 10 }}>
            <button
              className="primary"
              disabled={!!busy || !aiConfigured(settings) || (!prompt.trim() && !imported)}
              onClick={() => void generate()}
            >
              {imported ? '⚡ Convert with AI' : result ? '↻ Generate again' : '✦ Generate'}
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
              {routeLabel(lastPath) && <p className="hint" style={{ marginTop: 4 }}>{routeLabel(lastPath)}</p>}
              <p className={validation?.ok ? 'status-ok' : 'status-bad'} style={{ marginTop: 6 }}>
                {validation?.ok
                  ? '✓ Passes SPX validation and the live playout test — press Play in the preview, then Create project.'
                  : `✗ ${validation?.errors.length} check(s) failing — refine or regenerate.`}
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
        </>
      )}
    </div>
  );
}
