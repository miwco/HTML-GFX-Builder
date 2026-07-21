import { useEffect, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import { eventButtons, fieldDescriptors, type ControlButton } from '../control/controlModel';
import SpxFieldRow from './fields/SpxFieldRow';
import { renderControlPanelHtml } from '../control/controlPanelHtml';
import { hasLiveData, liveDataBlock, stripLiveData } from '../control/liveData';
import {
  hasRealtimeControl,
  realtimeControlBlock,
  stripRealtimeControl,
  remoteControlConfig,
} from '../control/realtimeControl';
import { isBackendConfigured } from '../backend/config';
import { useAuthState } from './auth/useAuthState';
import { useAuthUi } from './auth/authUi';
import { hasChatGraphic, chatGraphicBlock, stripChatGraphic, chatBackendRefKey, type ChatMode } from '../showchat/chatGraphicBlock';
import { listMyShows, type ShowRow } from '../showchat/chatData';
import ModerationPanel from '../showchat/ModerationPanel';
import { slug } from '../export/common';
import { useTemplateStore, type PlayoutAction } from '../store/templateStore';

/**
 * The Control panel — an operator view generated from the template's fields (the same
 * modular engine that produces the standalone controlpanel.html export). Every edit
 * live-drives the preview; the action buttons play/stop/update/next it. There is no
 * per-template code: the fields become descriptors and each renders the shared field control
 * — number → stepper, textarea → line list, image → picker, etc.
 */
export default function ControlPanel() {
  const template = useTemplateStore((s) => s.template);
  const sendControl = useTemplateStore((s) => s.sendControl);
  const sendEvent = useTemplateStore((s) => s.sendEvent);
  const sampleData = useTemplateStore((s) => s.sampleData);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const [live, setLive] = useState(true);
  const [sheetUrl, setSheetUrl] = useState('');
  const [pollSecs, setPollSecs] = useState('5');
  const [moderationOpen, setModerationOpen] = useState(false);
  const [chatShows, setChatShows] = useState<ShowRow[]>([]);
  const [chatShowId, setChatShowId] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('feed');

  const controls = fieldDescriptors(template.fields); // operator view: hidden fields stay hidden
  // The machine's event buttons (empty without an explicit machine — the derived linear
  // machine's one event is `next`, which the lifecycle row already carries).
  const events = useMemo(() => eventButtons(template.js), [template.js]);
  const eventSections = useMemo(() => {
    const sections = new Map<string, ControlButton[]>();
    for (const e of events) {
      const name = e.section ?? 'Events';
      sections.set(name, [...(sections.get(name) ?? []), e]);
    }
    return [...sections.entries()];
  }, [events]);
  // A button's payload rides the event with the fields' CURRENT sample values — applied by
  // the graphic only if the machine accepts the event (the atomic multi-part change).
  const fireEvent = (e: ControlButton) => {
    const payload: Record<string, string> = {};
    for (const key of e.payload ?? []) {
      if (sampleData[key] !== undefined) payload[key] = sampleData[key];
    }
    sendEvent(e.event, Object.keys(payload).length > 0 ? payload : undefined);
  };
  const liveDataOn = hasLiveData(template.js);
  const remoteOn = hasRealtimeControl(template.js);
  const backendConfigured = isBackendConfigured();
  const { needsSignIn } = useAuthState();
  const openSignIn = useAuthUi((s) => s.openSignIn);
  const remote = backendConfigured ? remoteControlConfig(template.name) : null;

  const drive = (action: PlayoutAction) => sendControl(action);

  const downloadPanel = () => {
    // Bundle the remote-send path into the panel only when this graphic has remote control enabled.
    const html = renderControlPanelHtml(template, remoteOn ? remote : null);
    saveAs(new Blob([html], { type: 'text/html' }), `${slug(template.name)}_controlpanel.html`);
  };

  // Append / remove the remote-control receiver block in the graphic's own JS (undoable, and
  // highlighted in the editor). The exported graphic then listens on the Supabase Realtime topic.
  const enableRemote = () => {
    if (!remote) return;
    const js = stripRealtimeControl(template.js).trimEnd() + '\n\n' + realtimeControlBlock(remote);
    applyTemplate({ ...template, js });
    setActiveTab('js');
  };
  const disableRemote = () => {
    applyTemplate({ ...template, js: stripRealtimeControl(template.js) });
    setActiveTab('js');
  };

  // ── Show chat ──
  const chatOn = hasChatGraphic(template.js);
  const chatRefKey = backendConfigured ? chatBackendRefKey() : null;
  useEffect(() => {
    if (!backendConfigured || needsSignIn) return; // shows are per-account; skip when signed out
    void listMyShows().then((s) => {
      setChatShows(s);
      setChatShowId((id) => id || s[0]?.id || '');
    });
  }, [backendConfigured, needsSignIn, moderationOpen]); // refresh after moderating (shows may have been created)

  const enableChat = () => {
    if (!chatRefKey || !chatShowId) return;
    const block = chatGraphicBlock({
      ...chatRefKey,
      showId: chatShowId,
      mode: chatMode,
      pollSeconds: 4,
      feedField: 'f0',
      authorField: 'f0',
      messageField: 'f1',
    });
    applyTemplate({ ...template, js: stripChatGraphic(template.js).trimEnd() + '\n\n' + block });
    setActiveTab('js');
  };
  const disableChat = () => {
    applyTemplate({ ...template, js: stripChatGraphic(template.js) });
    setActiveTab('js');
  };

  // Add / replace the live-data polling block in the template's own JS (undoable, and
  // highlighted in the editor). It maps sheet columns to fields and calls update().
  const addLiveData = () => {
    const block = liveDataBlock({ csvUrl: sheetUrl.trim(), pollSeconds: Number(pollSecs) || 5, fields: template.fields });
    const js = stripLiveData(template.js).trimEnd() + '\n\n' + block;
    applyTemplate({ ...template, js });
    setActiveTab('js');
  };
  const removeLiveData = () => {
    applyTemplate({ ...template, js: stripLiveData(template.js) });
    setActiveTab('js');
  };

  return (
    <div>
      <div className="panel-section">
        <h3>Control panel <span className="muted">— operator view</span></h3>
        <p className="hint">
          Auto-built from this graphic's fields. Edits drive the preview live; the buttons play
          it out. <strong>Download</strong> a standalone copy to run the graphic as a browser
          source and operate it from another tab.
        </p>
      </div>

      <label className="row" style={{ gap: 8, marginBottom: 8 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={live} onChange={(e) => setLive(e.target.checked)} />
        <span>Live — send every edit to the preview</span>
      </label>

      {controls.length === 0 && <p className="muted">This template has no editable fields.</p>}
      {controls.map((d) => (
        <SpxFieldRow key={d.key} descriptor={d} live={live} />
      ))}

      {eventSections.length > 0 && (
        <div className="ctl-events">
          {eventSections.map(([section, btns]) => (
            <div key={section} className="ctl-event-section">
              <h4>{section}</h4>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {btns.map((e) => (
                  <button
                    key={e.event}
                    className={e.destructive ? 'ctl-event-destructive' : undefined}
                    onClick={() => fireEvent(e)}
                    title={
                      e.payload?.length
                        ? `Fires "${e.event}" with ${e.payload.join(', ')} — only where the graph allows it`
                        : `Fires "${e.event}" — only where the graph allows it`
                    }
                  >
                    ⚡ {e.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ctl-actions">
        <button className="primary" onClick={() => drive('play')}>▶ Play</button>
        <button onClick={() => drive('stop')}>■ Stop</button>
        <button onClick={() => drive('update')}>⟳ Update</button>
        <button onClick={() => drive('next')}>» Next</button>
      </div>

      <div className="divider" />
      <button onClick={downloadPanel} title="A self-contained operator page that drives the exported graphic">
        ⬇ Download control panel (.html)
      </button>

      <div className="divider" />
      <div className="panel-section">
        <h3>Live data <span className="muted">— Google Sheet</span></h3>
        <p className="hint">
          Drive the graphic from a spreadsheet. In Sheets: <em>File → Share → Publish to web →
          CSV</em>, paste the link, and the graphic follows every edit. The polling code is added
          to the JS for you to read and tweak (column → field mapping and all).
        </p>
        <input
          placeholder="https://docs.google.com/…/pub?output=csv"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
        />
        <div className="row" style={{ marginTop: 6 }}>
          <label className="muted" style={{ fontSize: 12 }}>every</label>
          <input type="number" style={{ width: 64 }} value={pollSecs} onChange={(e) => setPollSecs(e.target.value)} />
          <label className="muted" style={{ fontSize: 12 }}>seconds</label>
          <div className="spacer" style={{ flex: 1 }} />
          {liveDataOn && <button onClick={removeLiveData} title="Remove the live-data block">Remove</button>}
          <button className="primary" disabled={!sheetUrl.trim()} onClick={addLiveData}>
            {liveDataOn ? 'Update block' : 'Add live data'}
          </button>
        </div>
        {liveDataOn && <p className="status-ok" style={{ marginTop: 6 }}>✓ Live-data block is in the JS (see the marked region).</p>}
      </div>

      {backendConfigured && (
        <div className="panel-section">
          <div className="divider" />
          <h3>Remote control <span className="muted">— any device</span></h3>
          <p className="hint">
            Drive the <em>exported</em> graphic from another device over the cloud. Enabling adds a
            small, deletable receiver block to the JS; the downloaded control panel then also sends
            over Supabase Realtime. The graphic and panel share an unguessable <strong>topic</strong> —
            treat it as a secret. The default export stays fully offline.
          </p>
          {remote ? (
            <>
              <div className="row" style={{ marginTop: 6 }}>
                <input
                  readOnly
                  value={remote.topic}
                  style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                  title="Shared channel topic (keep secret)"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="spacer" style={{ flex: 1 }} />
                {remoteOn && <button onClick={disableRemote} title="Remove the remote-control block">Remove</button>}
                <button className="primary" onClick={enableRemote}>{remoteOn ? 'Update block' : 'Enable remote'}</button>
              </div>
              {remoteOn && (
                <p className="status-ok" style={{ marginTop: 6 }}>
                  ✓ Remote-control block is in the JS. Download the control panel and open it on any device.
                </p>
              )}
            </>
          ) : (
            <p className="muted">Sign in to enable cloud remote control.</p>
          )}
        </div>
      )}

      {backendConfigured && (
        <div className="panel-section">
          <div className="divider" />
          <h3>Show chat <span className="muted">— audience send-in</span></h3>
          <p className="hint">
            Share a public link; viewers submit messages you approve and send to air. Manage the
            queue, then add a graphic block that shows the on-air messages.
          </p>
          <button
            onClick={() =>
              needsSignIn
                ? openSignIn('Sign in to run a show chat — audience send-in with moderation.')
                : setModerationOpen(true)
            }
          >
            💬 Manage &amp; moderate
          </button>

          {needsSignIn ? (
            <p className="muted" style={{ marginTop: 6 }}>
              Show chat needs an account —{' '}
              <button className="link-inline" onClick={() => openSignIn('Sign in to run a show chat — audience send-in with moderation.')}>
                sign in
              </button>{' '}
              to create shows and moderate messages.
            </p>
          ) : chatRefKey ? (
            <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
              <select className="grow" value={chatShowId} onChange={(e) => setChatShowId(e.target.value)}>
                {chatShows.length === 0 && <option value="">Create a show first</option>}
                {chatShows.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <select value={chatMode} onChange={(e) => setChatMode(e.target.value as ChatMode)} title="How on-air messages appear">
                <option value="feed">Feed</option>
                <option value="spotlight">Spotlight</option>
              </select>
              {chatOn && <button onClick={disableChat}>Remove</button>}
              <button className="primary" disabled={!chatShowId} onClick={enableChat}>{chatOn ? 'Update block' : 'Add chat'}</button>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 6 }}>Sign in to use show chat.</p>
          )}
          {chatOn && (
            <p className="status-ok" style={{ marginTop: 6 }}>
              ✓ Chat block is in the JS ({chatMode}). Edit the field mapping in the marked region to match this graphic.
            </p>
          )}
        </div>
      )}

      {moderationOpen && <ModerationPanel onClose={() => setModerationOpen(false)} />}
    </div>
  );
}
