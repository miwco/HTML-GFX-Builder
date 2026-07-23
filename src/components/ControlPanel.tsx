import { useEffect, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import { eventButtons, eventLegality, fieldDescriptors, isEventLegal, type ControlButton } from '../control/controlModel';
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
import { buildShowZip } from '../export/showExport';
import {
  addGraphicToShow,
  createShow,
  deleteShow,
  loadShows,
  moveShowGraphic,
  removeShowGraphic,
  setShowHostedSlug,
  type Show,
} from '../model/shows';
import { publishControlShow, unpublishControlShow } from '../control/hostedControl';
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
  const savedGraphicId = useTemplateStore((s) => s.saved.graphicId);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const [live, setLive] = useState(true);
  const [sheetUrl, setSheetUrl] = useState('');
  const [pollSecs, setPollSecs] = useState('5');
  const [moderationOpen, setModerationOpen] = useState(false);
  const [chatShows, setChatShows] = useState<ShowRow[]>([]);
  const [chatShowId, setChatShowId] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('feed');
  // ── Shows (the rundown level): local model, aggregated control-page export ──
  const [shows, setShows] = useState<Show[]>(() => loadShows());
  const [showId, setShowId] = useState('');
  const [newShowName, setNewShowName] = useState('');
  const [showNote, setShowNote] = useState<string | null>(null);
  const activeShow = shows.find((s) => s.id === showId) ?? null;

  const makeShow = () => {
    const next = createShow(newShowName);
    setShows(next);
    setShowId(next[next.length - 1]?.id ?? '');
    setNewShowName('');
  };
  const addCurrent = () => {
    if (!activeShow) return;
    // A saved document carries its library id into the show, so publishing the hosted control
    // page can find the graphic's saved entries (control/hostedControl.ts).
    const { shows: next, error } = addGraphicToShow(activeShow.id, template, { graphicId: savedGraphicId });
    setShows(next);
    setShowNote(error ?? `✓ "${template.name}" is in the rundown (same name updates in place).`);
  };
  const exportShow = async (show: Show) => {
    const zip = await buildShowZip(show);
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${slug(show.name)}_rundown.zip`);
    setShowNote(`✓ Exported "${show.name}" — one folder per graphic + show_controlpanel.html (rundown package).`);
  };
  // ── Hosted control (account feature): publish the show's control page online ──
  const [publishBusy, setPublishBusy] = useState(false);
  const hostedUrl = (s: string) => `${window.location.origin}/app?control=${encodeURIComponent(s)}`;
  const publishShow = async (show: Show) => {
    setPublishBusy(true);
    try {
      const hostedSlug = await publishControlShow(show);
      if (hostedSlug) {
        setShows(setShowHostedSlug(show.id, hostedSlug));
        setShowNote('✓ Hosted control page is live — share the link with your operators. Re-publish after changing the rundown.');
      }
    } catch (e) {
      setShowNote(`Publish failed: ${(e as Error).message}`);
    } finally {
      setPublishBusy(false);
    }
  };
  const unpublishShow = async (show: Show) => {
    setPublishBusy(true);
    try {
      await unpublishControlShow(show.id);
      setShows(setShowHostedSlug(show.id, undefined));
      setShowNote('Hosted control page removed — the link no longer works.');
    } catch (e) {
      setShowNote(`Unpublish failed: ${(e as Error).message}`);
    } finally {
      setPublishBusy(false);
    }
  };

  const controls = fieldDescriptors(template.fields); // operator view: hidden fields stay hidden
  // The machine's event buttons (empty without an explicit machine — the derived linear
  // machine's one event is `next`, which the lifecycle row already carries).
  const events = useMemo(() => eventButtons(template.js), [template.js]);
  // Greyed exactly where the graphic would drop the press — the same structural guard the
  // hosted control page mirrors, read against the live pointers the simulator publishes.
  const eventLegal = useMemo(() => eventLegality(template.js), [template.js]);
  const machineGroups = useTemplateStore((s) => s.machineGroups);
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
        <h3>Rehearse <span className="muted">— operator view</span></h3>
        <p className="hint">
          The operator view, here for <strong>rehearsal</strong>: auto-built from this graphic's
          fields, its edits and buttons drive <strong>this preview</strong> so you can play it
          through before air. The real on-air surface is the graphic's own <strong>Control
          panel</strong> (Home → Control panels, or the standalone copy you download below).
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
                {btns.map((e) => {
                  const legal = isEventLegal(eventLegal, e.event, machineGroups && { groups: machineGroups });
                  return (
                    <button
                      key={e.event}
                      className={e.destructive ? 'ctl-event-destructive' : undefined}
                      onClick={() => fireEvent(e)}
                      disabled={!legal}
                      title={
                        !legal
                          ? `"${e.event}" has no arrow out of the current state, so the graphic would drop it`
                          : e.payload?.length
                            ? `Fires "${e.event}" with ${e.payload.join(', ')}`
                            : `Fires "${e.event}"`
                      }
                    >
                      ⚡ {e.label}
                    </button>
                  );
                })}
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
        <h3>Rundowns <span className="muted">— graphics that run together</span></h3>
        <p className="hint">
          A rundown collects graphics that run at once (bug + lower third + ticker). Exporting it
          packages every graphic plus <strong>one</strong> control page with a card per graphic
          — the whole rundown operated from a single tab. Manage saved rundowns from Home.
        </p>
        <div className="row">
          <input
            placeholder="New rundown name"
            value={newShowName}
            onChange={(e) => setNewShowName(e.target.value)}
          />
          <button onClick={makeShow} disabled={!newShowName.trim()}>Create</button>
        </div>
        {shows.length > 0 && (
          <div className="row" style={{ marginTop: 8 }}>
            <select className="grow" value={showId} onChange={(e) => setShowId(e.target.value)}>
              <option value="">Pick a rundown…</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.graphics.length})</option>
              ))}
            </select>
            {activeShow && (
              <button className="primary" onClick={addCurrent} title="Add or update this graphic in the rundown">
                + Add current
              </button>
            )}
          </div>
        )}
        {activeShow && (
          <>
            {activeShow.graphics.length === 0 && (
              <p className="muted" style={{ marginTop: 6 }}>Empty — add the current graphic, then open other graphics and add them too.</p>
            )}
            {activeShow.graphics.map((g, i) => (
              <div key={g.id} className="row show-graphic-row">
                <span className="grow" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i + 1}. {g.name}
                </span>
                <button
                  className="show-row-btn"
                  disabled={i === 0}
                  onClick={() => setShows(moveShowGraphic(activeShow.id, g.id, -1))}
                  title="Move up the rundown"
                >↑</button>
                <button
                  className="show-row-btn"
                  disabled={i === activeShow.graphics.length - 1}
                  onClick={() => setShows(moveShowGraphic(activeShow.id, g.id, 1))}
                  title="Move down the rundown"
                >↓</button>
                <button className="show-row-btn" onClick={() => setShows(removeShowGraphic(activeShow.id, g.id))} title="Remove from the rundown">✕</button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 8 }}>
              <button onClick={() => { setShows(deleteShow(activeShow.id)); setShowId(''); }} title="Delete this rundown (its graphics stay saved wherever else they live)">
                Delete rundown
              </button>
              <div className="spacer" style={{ flex: 1 }} />
              <button className="primary" disabled={activeShow.graphics.length === 0} onClick={() => exportShow(activeShow)}>
                ⬇ Export rundown package
              </button>
            </div>
            {backendConfigured && (
              <div style={{ marginTop: 10 }}>
                {needsSignIn ? (
                  <p className="muted">
                    <button className="link-inline" onClick={() => openSignIn('Sign in to host this rundown’s control page online.')}>
                      Sign in
                    </button>{' '}
                    to host this rundown’s control page online — operators then drive it from any
                    device via a private link, with crash recovery.
                  </p>
                ) : (
                  <>
                    <div className="row">
                      <button
                        className="primary"
                        disabled={publishBusy || activeShow.graphics.length === 0}
                        onClick={() => publishShow(activeShow)}
                        title="Create or update the online control page for this rundown"
                      >
                        {activeShow.hostedSlug ? '↻ Re-publish online page' : '🌐 Host control page online'}
                      </button>
                      {activeShow.hostedSlug && (
                        <button disabled={publishBusy} onClick={() => unpublishShow(activeShow)}>Unpublish</button>
                      )}
                    </div>
                    {activeShow.hostedSlug && (
                      <div className="row" style={{ marginTop: 6 }}>
                        <input
                          readOnly
                          value={hostedUrl(activeShow.hostedSlug)}
                          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
                          title="The operator link — anyone with it can drive the rundown (keep it private)"
                          onFocus={(e) => e.currentTarget.select()}
                        />
                        <button
                          onClick={() => {
                            // Only claim the copy once it lands — the clipboard can refuse
                            // (permission, or a plain-http page with no clipboard at all).
                            void navigator.clipboard?.writeText(hostedUrl(activeShow.hostedSlug!)).then(
                              () => setShowNote('✓ Link copied.'),
                              () => setShowNote('Could not copy — select the link above and copy it by hand.'),
                            );
                          }}
                          title="Copy the operator link"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                    {activeShow.hostedSlug && (
                      <p className="hint" style={{ marginTop: 6 }}>
                        Exporting the rundown now bakes the hosted receiver into each graphic, so the
                        online page drives the exported package from any device — with recovery.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
        {/* The same slot carries confirmations AND failures ("Publish failed: …"), so it must not
            paint every one of them green. ✓ leads a success, as it does in Home. */}
        {showNote && (
          <p className={showNote.startsWith('✓') ? 'status-ok' : 'status-bad'} style={{ marginTop: 6 }}>
            {showNote}
          </p>
        )}
      </div>

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
