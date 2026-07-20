// The video editor's AI chat: the iterative loop (describe -> generate -> refine) that is
// the primary way non-technical users author a video. The FIRST generation auto-runs when
// the wizard hands over a project whose chat holds exactly one unanswered user turn -
// deterministic from data, so a reload mid-flow resumes cleanly. Every AI result applies
// as ONE undoable applyProject (tsx + motion plan + chat turns together); failed validation
// keeps the previous working code and offers the broken module for manual inspection.

import { useEffect, useRef, useState } from 'react';
import { getVideoAiProvider } from '../../ai/video';
import type { VideoGenerateResult, VideoValidator } from '../../ai/video/provider';
import { AI_MODELS, aiConfigured, loadAiSettings, saveAiSettings } from '../../ai/settings';
import { useAuthState } from '../auth/useAuthState';
import SignInPrompt from '../auth/SignInPrompt';
import { useVideoProjectStore } from '../../store/videoProjectStore';
import { describeAssets } from '../../video/types';
import { validateVideoModule } from '../../video/validate';
import { validateHyperframesComposition } from '../../video/hyperframes/validate';
import { getActivePlayerBridge, getActiveHyperframesBridge } from '../../video/bridgeRegistry';
import {
  mergeVideoInputs,
  videoSource,
  withVideoSource,
  type AuthoredSettings,
  type VideoProject,
} from '../../model/videoTypes';

function settingsOf(project: VideoProject) {
  return {
    width: project.width,
    height: project.height,
    fps: project.fps,
    durationInFrames: project.durationInFrames,
    transparent: project.transparent,
  };
}

function contextFor(project: VideoProject) {
  const infos = describeAssets(project.assets);
  const assetData = new Map<string, string>();
  for (const info of infos) {
    const asset = project.assets.find((a) => a.path === info.path);
    if (asset && typeof asset.data === 'string') assetData.set(info.name, asset.data);
  }
  return {
    engine: project.engine,
    settings: settingsOf(project),
    assets: infos,
    assetData,
    model: project.aiModel || undefined,
  };
}

/** The live validate pipeline for candidate sources, bound to the mounted preview -
 *  engine-matched, so each provider result runs its own engine's checks and probe. */
const validate: VideoValidator = (source, declaredInputs = []) => {
  const p = useVideoProjectStore.getState().project;
  return p.engine === 'hyperframes'
    ? validateHyperframesComposition(source, settingsOf(p), p.assets, getActiveHyperframesBridge())
    : validateVideoModule(source, settingsOf(p), p.assets, getActivePlayerBridge(), declaredInputs);
};

export default function VideoAiChatPanel() {
  const { needsSignIn } = useAuthState();
  const project = useVideoProjectStore((s) => s.project);
  const busy = useVideoProjectStore((s) => s.busy);
  const setBusy = useVideoProjectStore((s) => s.setBusy);
  const applyProject = useVideoProjectStore((s) => s.applyProject);
  const appendChat = useVideoProjectStore((s) => s.appendChat);
  const dropLastChat = useVideoProjectStore((s) => s.dropLastChat);
  const requestReplay = useVideoProjectStore((s) => s.requestReplay);

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(loadAiSettings);
  const [showSettings, setShowSettings] = useState(false);
  // A result whose validation failed: not applied, offered for manual inspection.
  const [failed, setFailed] = useState<VideoGenerateResult | null>(null);
  // A transient "it worked" confirmation under the newest turn - the generation pipeline
  // is long enough that "did anything happen?" needs an explicit answer. Cleared by the
  // next request (and by failures, which show their own state).
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const saveSetting = (patch: Parameters<typeof saveAiSettings>[0]) => {
    saveAiSettings(patch);
    setSettings(loadAiSettings());
  };

  /** Apply a provider result: ONE undoable snapshot bundling code + plan + assistant turn. */
  const applyResult = (result: VideoGenerateResult, authoredFor: AuthoredSettings) => {
    const p = useVideoProjectStore.getState().project;
    applyProject({
      ...withVideoSource(p, result.source),
      motionPlan: result.motionPlan ?? p.motionPlan,
      // Adopt the newly declared inputs, keeping any values the user already edited (a
      // refinement re-declares them; null means the provider left them unchanged).
      inputs: result.inputs ? mergeVideoInputs(p.inputs, result.inputs) : p.inputs,
      // The settings this code was WRITTEN against - the ones the model was told about when
      // the request went out, not whatever they are once it comes back. Changing them later
      // is what settingsDrift reports on.
      authoredFor,
      chat: [...p.chat, { role: 'assistant', text: result.summary, at: new Date().toISOString() }],
    });
    requestReplay();
  };

  const handleResult = (result: VideoGenerateResult, authoredFor: AuthoredSettings) => {
    if (result.validation && !result.validation.ok) {
      // Keep the previous working composition; surface the broken module + errors. The
      // replay bump makes the player reload the CURRENT project code - validation left
      // the failed candidate mounted in the host.
      setFailed(result);
      appendChat({
        role: 'assistant',
        text: `${result.summary} - but the result failed validation, so I kept your previous version. (${result.validation.errors.length} error(s) below.)`,
        at: new Date().toISOString(),
      });
      requestReplay();
    } else {
      setFailed(null);
      applyResult(result, authoredFor);
      setDone(true);
    }
  };

  /** Each provider stage lands in the busy line so a long generation is never silent. */
  const onProgress = (stage: string) => setBusy(stage);

  const runGenerate = async (prompt: string) => {
    setBusy('Designing your animation… (this can take a minute)');
    setError(null);
    setDone(false);
    const p = useVideoProjectStore.getState().project;
    try {
      const result = await getVideoAiProvider().generateVideo(prompt, contextFor(p), validate, onProgress);
      handleResult(result, settingsOf(p));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  /** One refinement, whoever asked for it: the chat box, or another panel via requestAi. */
  const runRefine = async (text: string) => {
    setError(null);
    setDone(false);
    appendChat({ role: 'user', text, at: new Date().toISOString() });
    setBusy('Refining…');
    const p = useVideoProjectStore.getState().project;
    try {
      const result = await getVideoAiProvider().refineVideo(
        text,
        { source: videoSource(p), chat: p.chat, inputs: p.inputs },
        contextFor(p),
        validate,
        onProgress,
      );
      handleResult(result, settingsOf(p));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      dropLastChat(); // the failed turn goes back into the input
      setInput(text);
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    await runRefine(text);
  };

  // A refinement asked for from another panel (Settings' "update the code" offer). It runs
  // down this same path, so it shows up as a normal turn in the conversation and its failures,
  // undo, and "apply anyway" behave exactly like a typed one.
  //
  // Guarded by the REQUEST ITSELF, not just by clearing it: under StrictMode the effect is
  // invoked twice from the same commit, both times seeing the request still set (the clear
  // hasn't committed yet) - which would send it to the model twice. Reset once it's gone, so
  // asking for the very same change again still works.
  const pendingRequest = useVideoProjectStore((s) => s.pendingRequest);
  const clearPendingRequest = useVideoProjectStore((s) => s.clearPendingRequest);
  const sentRequest = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingRequest) {
      sentRequest.current = null;
      return;
    }
    if (busy || needsSignIn || sentRequest.current === pendingRequest) return;
    sentRequest.current = pendingRequest;
    clearPendingRequest();
    void runRefine(pendingRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run each request exactly once
  }, [pendingRequest, busy, needsSignIn]);

  // Auto-run the FIRST generation: the wizard seeds chat with one user turn and no reply.
  // Guarded PER PROJECT ID - creating or opening another project in the same session must
  // fire its own first run (the panel component survives document swaps).
  const autoRanFor = useRef<string | null>(null);
  const needsFirstRun =
    project.chat.length === 1 && project.chat[0].role === 'user' && !busy;
  useEffect(() => {
    if (!needsFirstRun || autoRanFor.current === project.id || needsSignIn) return;
    autoRanFor.current = project.id;
    void runGenerate(project.chat[0].text);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per unanswered brief
  }, [needsFirstRun, needsSignIn, project.id]);

  // Keep the newest turn visible.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [project.chat.length, busy]);

  // Hosted mode, signed out: AI is an account feature (editing/preview/save stay open).
  if (needsSignIn) {
    return (
      <SignInPrompt
        feature="AI video editing"
        reason="Sign in to use AI - describe changes and get real, editable composition code."
      />
    );
  }

  return (
    <div className="video-chat" data-testid="video-chat">
      <div className="video-chat-scroll" ref={scrollRef}>
        {project.chat.length === 0 && (
          <p className="hint" style={{ padding: '8px 2px' }}>
            Describe what you want ("make the title bigger", "a faster, more energetic
            opening") - every change lands as real code you can inspect and edit.
          </p>
        )}
        {project.chat.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role}`}>
            <span>{m.text}</span>
          </div>
        ))}
        {busy && <p className="hint">⏳ {busy}</p>}
        {done && !busy && (
          <p className="status-ok" data-testid="video-ai-done">
            ✔ Done - the new version is playing in the preview. Ask below for any change.
          </p>
        )}
        {error && (
          <p className="status-bad">
            ✗ {error}
            {/* A failed FIRST generation leaves an unanswered brief - offer the retry
                the auto-run guard won't repeat on its own. */}
            {project.chat.length === 1 && project.chat[0].role === 'user' && !busy && (
              <button
                style={{ marginLeft: 8 }}
                onClick={() => {
                  setError(null);
                  void runGenerate(project.chat[0].text);
                }}
                data-testid="video-retry-generate"
              >
                ↻ Try again
              </button>
            )}
          </p>
        )}
        {failed && (
          <div className="change-preview" style={{ marginTop: 8 }}>
            <p className="status-bad">✗ {failed.validation?.errors.length} validation error(s):</p>
            <ul className="hint" style={{ margin: '4px 0 0 16px' }}>
              {failed.validation?.errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
            <div className="row" style={{ marginTop: 8 }}>
              <button
                onClick={() => {
                  applyResult(failed, settingsOf(useVideoProjectStore.getState().project));
                  setFailed(null);
                }}
                title="Apply the broken module anyway to inspect and fix it in the code editor"
              >
                Apply anyway
              </button>
              <button onClick={() => setFailed(null)}>Discard</button>
            </div>
          </div>
        )}
      </div>

      <div className="row video-chat-input">
        <input
          className="grow"
          placeholder='Ask for a change - e.g. "make the first second more energetic"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send();
          }}
          disabled={!!busy}
          data-testid="video-chat-field"
        />
        <button
          className="primary"
          disabled={!!busy || !input.trim()}
          onClick={() => void send()}
        >
          Send
        </button>
        <button onClick={() => setShowSettings((s) => !s)} title="AI key and model">
          ⚙
        </button>
      </div>

      {!aiConfigured(settings) && (
        <p className="hint" style={{ marginTop: 6 }}>
          No AI key configured - requests use the offline sample generator. Add a key under ⚙
          for real generation.
        </p>
      )}

      {showSettings && (
        <div className="panel-section" style={{ marginTop: 8 }}>
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
                Stored only in this browser (localStorage) and sent only to Anthropic.
              </p>
            </>
          )}
          <label style={{ marginTop: 8 }}>Model</label>
          <select value={settings.model} onChange={(e) => saveSetting({ model: e.target.value })}>
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id} title={m.blurb}>
                {m.label}
              </option>
            ))}
            {!AI_MODELS.some((m) => m.id === settings.model) && (
              <option value={settings.model}>{settings.model}</option>
            )}
          </select>
        </div>
      )}
    </div>
  );
}
