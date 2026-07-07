import { useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { useTemplateStore } from '../store/templateStore';
import {
  addLook,
  applyLookToTemplate,
  captureLookFromTemplate,
  createPacket,
  deleteLook,
  deletePacket,
  importLook,
  loadLooks,
  loadPackets,
  removeGraphic,
  saveGraphicToPacket,
  type Packet,
  type SavedLook,
} from '../model/packets';
import { saveBrand, type ProjectBrand } from '../model/brand';
import { buildPacketZip } from '../export/packetExport';
import { slug } from '../export/common';
import { isBackendConfigured } from '../backend/config';
import { subscribeAuth } from '../backend/auth';
import { useAuthUi } from './auth/authUi';
import {
  listMySubmissions,
  publishGraphic,
  publishLook,
  unpublish,
  type MySubmission,
} from '../community/communityData';
import { publishGate } from '../community/gate';
import type { ValidationResult } from '../validation/validateTemplate';
import type { SpxTemplate } from '../model/types';

/** What the publish sheet is about to share. Graphics carry a pre-run gate result; looks are always
 *  valid (just palette + font) so they skip the gate. */
type PublishTarget =
  | { kind: 'graphic'; name: string; template: SpxTemplate; gate: ValidationResult }
  | { kind: 'look'; name: string; brand: ProjectBrand };

const STATUS_LABEL: Record<MySubmission['status'], string> = {
  pending: 'in review',
  approved: 'live',
  rejected: 'rejected',
  removed: 'removed',
};

interface Props {
  onClose: () => void;
}

/**
 * The packet manager: a show's graphics saved together (open any, export the whole set
 * as one zip) plus named brand looks (apply to the current graphic, set for new ones,
 * share as a .json file). Everything lives in this browser's localStorage.
 */
export default function PacketManager({ onClose }: Props) {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);

  const [packets, setPackets] = useState<Packet[]>(loadPackets);
  const [looks, setLooks] = useState<SavedLook[]>(loadLooks);
  const [targetPacket, setTargetPacket] = useState<string>(packets[0]?.id ?? 'new');
  const [newPacketName, setNewPacketName] = useState('');
  const [newLookName, setNewLookName] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  // ── Community sharing (Era 5.5) — only surfaces when a backend is configured AND signed in, so the
  //    offline app shows none of this. ────────────────────────────────────────────────────────────
  const backendConfigured = isBackendConfigured();
  const [signedIn, setSignedIn] = useState(false);
  const communityOn = backendConfigured && signedIn;
  const openSignIn = useAuthUi((s) => s.openSignIn);
  const [mySubs, setMySubs] = useState<MySubmission[]>([]);
  const [publish, setPublish] = useState<PublishTarget | null>(null);
  const [summary, setSummary] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => subscribeAuth((s) => setSignedIn(s.status === 'signed-in' && !!s.user)), []);

  const refreshSubs = async () => setMySubs(await listMySubmissions());
  useEffect(() => {
    if (communityOn) void refreshSubs();
    else setMySubs([]);
  }, [communityOn]);

  const startPublishGraphic = (t: SpxTemplate) => {
    setSummary('');
    setPublish({ kind: 'graphic', name: t.name, template: t, gate: publishGate(t) });
  };
  const startPublishLook = (look: SavedLook) => {
    setSummary('');
    setPublish({ kind: 'look', name: look.name, brand: look.brand });
  };

  const confirmPublish = async () => {
    if (!publish) return;
    if (publish.kind === 'graphic' && !publish.gate.ok) return; // blocked; button is disabled too
    setPublishing(true);
    const res =
      publish.kind === 'graphic'
        ? await publishGraphic(publish.template, summary)
        : await publishLook(publish.name, publish.brand, summary);
    setPublishing(false);
    if (res.error) {
      setNote(res.error);
      return;
    }
    setPublish(null);
    setNote(`✓ Published "${publish.name}" to the community.`);
    void refreshSubs();
  };

  const unpublishSub = async (id: string) => {
    const { error } = await unpublish(id);
    setNote(error ?? '✓ Removed from the community.');
    void refreshSubs();
  };

  const copyLink = (slugStr: string) => {
    const url = `${window.location.origin}${window.location.pathname}?template=${encodeURIComponent(slugStr)}`;
    void navigator.clipboard?.writeText(url);
    setNote('✓ Share link copied.');
  };

  const saveCurrent = () => {
    let packetId = targetPacket;
    let list = packets;
    if (packetId === 'new') {
      list = createPacket(newPacketName || 'My show');
      packetId = list[list.length - 1].id;
      setTargetPacket(packetId);
      setNewPacketName('');
    }
    const { packets: next, error } = saveGraphicToPacket(packetId, template);
    setPackets(next);
    setNote(error ?? `✓ Saved "${template.name}" — saving again with the same name updates it.`);
  };

  const openGraphic = (packet: Packet, graphicId: string) => {
    const graphic = packet.graphics.find((g) => g.id === graphicId);
    if (!graphic) return;
    applyTemplate(graphic.template, { resetSampleData: true });
    setActiveTab('html');
    onClose();
  };

  const exportPacket = async (packet: Packet) => {
    setNote(null);
    const zip = await buildPacketZip(packet);
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${slug(packet.name)}_packet.zip`);
    setNote(`✓ Exported "${packet.name}" (${packet.graphics.length} graphics, one folder each).`);
  };

  const saveLook = () => {
    setLooks(addLook(newLookName || 'My look', captureLookFromTemplate(template)));
    setNewLookName('');
    setNote('✓ Look saved — colors captured from the current graphic (Style-panel tweaks included).');
  };

  const applyLook = (look: SavedLook) => {
    applyTemplate(applyLookToTemplate(template, look.brand));
    setActiveTab('css'); // the retinted :root vars light up in the editor
    setNote(`✓ Applied "${look.name}" to the current graphic (undo with Ctrl+Z).`);
  };

  const shareLook = (look: SavedLook) => {
    const blob = new Blob([JSON.stringify({ name: look.name, brand: look.brand }, null, 2)], { type: 'application/json' });
    saveAs(blob, `${slug(look.name)}.look.json`);
  };

  const onImportLook = async (file: File | undefined) => {
    if (!file) return;
    const { looks: next, error } = importLook(await file.text());
    if (next) setLooks(next);
    setNote(error ?? '✓ Look imported.');
  };

  return (
    <div className="gallery-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wz-modal pk-modal">
        <div className="wz-header">
          <div>
            <h2>Packets</h2>
            <p className="hint">A show's graphics saved together, plus named brand looks — stored in this browser.</p>
          </div>
          <button className="gallery-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="pk-body">
          {/* ── Publish sheet (Era 5.5) — runs the automated gate, then takes a one-line summary ── */}
          {publish && (
            <div className="panel-section" style={{ outline: '2px solid var(--accent)', outlineOffset: 2 }}>
              <h3 style={{ marginTop: 0 }}>Publish “{publish.name}”</h3>
              {publish.kind === 'graphic' && !publish.gate.ok && (
                <div className="status-bad">
                  <strong>Fix before sharing:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {publish.gate.errors.map((e, i) => <li key={i}>{e.message}</li>)}
                  </ul>
                </div>
              )}
              {publish.kind === 'graphic' && publish.gate.ok && publish.gate.warnings.length > 0 && (
                <details className="hint">
                  <summary>{publish.gate.warnings.length} note{publish.gate.warnings.length > 1 ? 's' : ''} — won't block</summary>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {publish.gate.warnings.map((w, i) => <li key={i}>{w.message}</li>)}
                  </ul>
                </details>
              )}
              <p className="hint">Shared with other signed-in users; its fonts and images travel with it. Unpublish anytime.</p>
              <div className="row">
                <input
                  className="grow"
                  placeholder="One-line description — what it is, when to use it"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  maxLength={140}
                />
              </div>
              <div className="row">
                <button
                  className="primary"
                  disabled={publishing || (publish.kind === 'graphic' && !publish.gate.ok)}
                  onClick={() => void confirmPublish()}
                >
                  {publishing ? 'Publishing…' : 'Publish'}
                </button>
                <button onClick={() => setPublish(null)} disabled={publishing}>Cancel</button>
              </div>
            </div>
          )}

          {/* ── Save the current graphic ── */}
          <div className="panel-section">
            <h3>Save the current graphic</h3>
            <div className="row">
              <span className="wz-fid">{template.name}</span>
              <select className="grow" value={targetPacket} onChange={(e) => setTargetPacket(e.target.value)}>
                {packets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="new">＋ New packet…</option>
              </select>
              {targetPacket === 'new' && (
                <input
                  placeholder="Show name, e.g. Friday Fight Night"
                  value={newPacketName}
                  onChange={(e) => setNewPacketName(e.target.value)}
                />
              )}
              <button className="primary" onClick={saveCurrent}>Save</button>
            </div>
          </div>

          {/* ── Share to community (Era 5.5) — needs a backend + an account. Signed-out visitors in
                 hosted mode get a sign-in nudge instead (local packets above work without one). ── */}
          {backendConfigured && !signedIn && (
            <div className="panel-section">
              <h3>🌐 Share to community</h3>
              <p className="hint">
                Publishing to the community (and syncing packets across devices) needs an account —{' '}
                <button className="link-inline" onClick={() => openSignIn('Sign in to publish to the community and sync your packets across devices.')}>
                  sign in
                </button>{' '}
                to unlock it. Everything above stays saved in this browser.
              </p>
            </div>
          )}
          {communityOn && (
            <div className="panel-section">
              <h3>🌐 Share to community</h3>
              <p className="hint">
                Publish this graphic — or any saved graphic / look (🌐) — for other signed-in users to browse and
                reuse. An automated check runs first.
              </p>
              <div className="row">
                <span className="wz-fid">{template.name}</span>
                <div className="spacer" />
                <button className="primary" onClick={() => startPublishGraphic(template)}>🌐 Publish this graphic</button>
              </div>
              {mySubs.length > 0 && (
                <>
                  <h4 style={{ margin: '10px 0 4px' }}>My submissions</h4>
                  {mySubs.map((s) => (
                    <div className="pk-graphic" key={s.id}>
                      <strong>{s.name}</strong>
                      <span className="muted">{s.kind} · {STATUS_LABEL[s.status]}</span>
                      {s.moderation_note && <span className="status-bad" title={s.moderation_note}>ⓘ</span>}
                      <div className="spacer" />
                      <button onClick={() => copyLink(s.slug)} title="Copy a share link">🔗</button>
                      <button onClick={() => void unpublishSub(s.id)} title="Remove from the community">✕</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Packets ── */}
          {packets.map((packet) => (
            <div className="panel-section pk-packet" key={packet.id}>
              <div className="row" style={{ alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>📦 {packet.name} <span className="muted">({packet.graphics.length})</span></h3>
                <div className="spacer" />
                <button onClick={() => void exportPacket(packet)} disabled={packet.graphics.length === 0} title="One zip: a folder per graphic, plug-and-play">
                  ⬇ Export packet
                </button>
                <button onClick={() => { setPackets(deletePacket(packet.id)); }} title="Delete this packet (graphics in it are removed from storage)">
                  🗑
                </button>
              </div>
              {packet.graphics.length === 0 && <p className="hint">Empty — save the current graphic into it above.</p>}
              {packet.graphics.map((g) => (
                <div className="pk-graphic" key={g.id}>
                  <strong>{g.name}</strong>
                  <span className="muted">{g.type} · {new Date(g.savedAt).toLocaleDateString()}</span>
                  <div className="spacer" />
                  {communityOn && (
                    <button onClick={() => startPublishGraphic(g.template)} title="Publish to the community">🌐</button>
                  )}
                  <button onClick={() => openGraphic(packet, g.id)} title="Load into the editor (replaces the current graphic — undo with Ctrl+Z)">
                    Open
                  </button>
                  <button onClick={() => setPackets(removeGraphic(packet.id, g.id))} title="Remove from the packet">✕</button>
                </div>
              ))}
            </div>
          ))}

          {/* ── Looks ── */}
          <div className="panel-section">
            <h3>Brand looks</h3>
            <p className="hint">
              A look = this graphic's colors + font, captured as a named brand. Apply it to any
              graphic, use it for new ones, or share it as a file.
            </p>
            <div className="row">
              <input
                className="grow"
                placeholder="Look name, e.g. Channel A7 red"
                value={newLookName}
                onChange={(e) => setNewLookName(e.target.value)}
              />
              <button className="primary" onClick={saveLook}>Save current look</button>
              <input
                ref={importInput}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => { void onImportLook(e.target.files?.[0]); e.target.value = ''; }}
              />
              <button onClick={() => importInput.current?.click()} title="Import a shared .look.json file">⬆ Import…</button>
            </div>
            {looks.map((look) => (
              <div className="pk-graphic" key={look.id}>
                <span className="pk-swatches" aria-hidden>
                  {[look.brand.palette.accent, look.brand.palette.panel, look.brand.palette.text].map((c, i) => (
                    <i key={i} style={{ background: c }} />
                  ))}
                </span>
                <strong>{look.name}</strong>
                <span className="muted">
                  {look.brand.customFont?.family ?? look.brand.fontId ?? ''}
                </span>
                <div className="spacer" />
                <button onClick={() => applyLook(look)} title="Retint the current graphic's :root vars + font">Apply</button>
                <button onClick={() => { saveBrand(look.brand); setNote(`✓ "${look.name}" is now the project brand for new graphics.`); }} title="New graphics from the wizard will match this look">
                  Use for new
                </button>
                {communityOn && (
                  <button onClick={() => startPublishLook(look)} title="Publish to the community">🌐</button>
                )}
                <button onClick={() => shareLook(look)} title="Download as a shareable .look.json">⬇</button>
                <button onClick={() => setLooks(deleteLook(look.id))} title="Delete this look">✕</button>
              </div>
            ))}
          </div>

          {note && (
            <p className={note.startsWith('✓') ? 'status-ok' : 'status-bad'} style={{ marginTop: 4 }}>{note}</p>
          )}
        </div>
      </div>
    </div>
  );
}
