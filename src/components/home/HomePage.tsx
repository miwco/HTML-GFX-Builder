import { useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { useRouter, type Route } from '../../app/router';
import { useTemplateStore } from '../../store/templateStore';
import { openGraphicById, useSaveUi } from '../../store/saveActions';
import {
  deleteGraphic,
  duplicateGraphic,
  graphicsInPackage,
  loadGraphics,
  updateGraphic,
  type GraphicDoc,
} from '../../model/library';
import {
  addLook,
  applyLookToTemplate,
  captureLookFromTemplate,
  createPacketNamed,
  deleteLook,
  deletePacket,
  importLook,
  loadLooks,
  loadPackets,
  renamePacket,
  type Packet,
  type SavedLook,
} from '../../model/packets';
import { saveBrand } from '../../model/brand';
import { loadShows, deleteShow, type Show } from '../../model/shows';
import { buildShowZip } from '../../export/showExport';
import {
  deleteSavedVideoProject,
  listSavedVideoProjects,
  saveCurrentVideoProject,
  type SavedVideoRecord,
} from '../../model/videoProject';
import { useDocKindStore } from '../../store/docKindStore';
import { buildGraphicsZip } from '../../export/packetExport';
import { slug } from '../../export/common';
import { isBackendConfigured } from '../../backend/config';
import { subscribeAuth } from '../../backend/auth';
import {
  listMySubmissions,
  publishGraphic,
  STATUS_LABEL,
  unpublish,
  type MySubmission,
} from '../../community/communityData';
import { publishGate } from '../../community/gate';
import type { ValidationResult } from '../../validation/validateTemplate';
import type { SpxTemplate } from '../../model/types';
import BrandLogo from '../BrandLogo';
import AuthStatus from '../auth/AuthStatus';
import SyncStatus from '../SyncStatus';
import SignInDialog from '../auth/SignInDialog';
import SaveDialogs from '../save/SaveDialogs';
import GraphicThumb from './GraphicThumb';

/**
 * Copy text, answering whether it actually landed. A clipboard write can be REFUSED — permission
 * denied, or a page served over plain http, where `navigator.clipboard` is not there at all — and
 * a button that claims "Copied" when nothing was is worse than one that says nothing. Also keeps
 * the refusal from surfacing as an unhandled rejection.
 */
function copyLink(text: string): Promise<boolean> {
  return navigator.clipboard?.writeText(text).then(() => true, () => false) ?? Promise.resolve(false);
}

/** A saved graphic's thumbnail shows the data an operator last selected, when there is one. */
function activeValues(g: GraphicDoc): Record<string, string> | undefined {
  return g.entries.find((e) => e.id === g.activeEntryId)?.values;
}

type Section = 'recent' | 'graphics' | 'packages' | 'controls' | 'rundowns' | 'videos' | 'looks';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'recent', label: 'Recent', icon: '🕘' },
  { id: 'graphics', label: 'Graphics', icon: '◫' },
  { id: 'packages', label: 'Packages', icon: '📦' },
  { id: 'controls', label: 'Control panels', icon: '🎛' },
  { id: 'rundowns', label: 'Rundowns', icon: '📋' },
  { id: 'videos', label: 'Videos', icon: '🎬' },
  { id: 'looks', label: 'Brand looks', icon: '🎨' },
];

/**
 * HOME (docs/SAVED_CONTENT_MODEL.md §3) — the routed dashboard over everything saved:
 * recent work, the graphics library, packages, control panels, videos, and brand looks.
 * Local-first and open to everyone (auth posture: no gate — sign-in only adds sync).
 * Rendered for `#/home[/<section>]` and `#/package/<id>`; browser Back/Forward walk it
 * like any pages.
 */
export default function HomePage({ route }: { route: Route }) {
  const navigate = useRouter((s) => s.navigate);
  const requestSwitch = useSaveUi((s) => s.requestSwitch);
  const workingName = useTemplateStore((s) => s.template.name);
  const workingSaved = useTemplateStore((s) => s.saved);

  // One nonce refreshes every list after any mutation (the model layer is the store).
  const [rev, setRev] = useState(0);
  const refresh = () => setRev((r) => r + 1);
  /* eslint-disable react-hooks/exhaustive-deps */
  const graphics = useMemo(() => loadGraphics().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [rev]);
  const packages = useMemo(() => loadPackets(), [rev]);
  const looks = useMemo(() => loadLooks(), [rev]);
  const rundowns = useMemo(() => loadShows(), [rev]);
  const videos = useMemo(() => listSavedVideoProjects(), [rev]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q ? graphics.filter((g) => g.name.toLowerCase().includes(q)) : graphics;

  // Community publishing (moved here from the retired packet manager): only surfaces with a
  // configured backend AND a signed-in account — the offline app grows zero community UI.
  const backendConfigured = isBackendConfigured();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => subscribeAuth((s) => setSignedIn(s.status === 'signed-in' && !!s.user)), []);
  const communityOn = backendConfigured && signedIn;
  const [publish, setPublish] = useState<{ name: string; template: SpxTemplate; gate: ValidationResult } | null>(null);
  const [mySubs, setMySubs] = useState<MySubmission[]>([]);
  // Which share link was just copied. A clipboard write is invisible — without this the button
  // looks broken and gets pressed again.
  const [copiedSub, setCopiedSub] = useState<string | null>(null);
  useEffect(() => {
    if (communityOn) void listMySubmissions().then(setMySubs).catch(() => {});
    else setMySubs([]);
  }, [communityOn, rev]);

  const section: Section =
    route.view === 'home' && SECTIONS.some((s) => s.id === route.section)
      ? (route.section as Section)
      : route.view === 'package'
        ? 'packages'
        : 'recent';
  const packageView = route.view === 'package' ? packages.find((p) => p.id === route.id) ?? null : null;

  const openGraphic = (g: GraphicDoc) => {
    requestSwitch(() => {
      openGraphicById(g.id);
      navigate({ view: 'graphic', id: g.id });
    });
  };

  const openVideo = (record: SavedVideoRecord) => {
    saveCurrentVideoProject(record.project);
    useDocKindStore.getState().setKind('video');
    navigate({ view: 'video' });
  };

  const exportPackage = async (packet: Packet) => {
    const docs = graphicsInPackage(packet.id);
    const zip = await buildGraphicsZip(
      packet.name,
      docs.map((d) => ({ name: d.name, template: d.template, entries: d.entries })),
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${slug(packet.name)}_package.zip`);
  };

  const packageName = (id: string | null) => (id ? packages.find((p) => p.id === id)?.name ?? null : null);

  return (
    <div className="app home-page" data-testid="home-page">
      <header className="topbar">
        <button className="brand brand-home" onClick={() => navigate({ view: 'editor' })} title="Back to the editor">
          <BrandLogo size={24} />
        </button>
        <span className="divider-dot" aria-hidden="true">·</span>
        <span className="tpl-name">Home</span>
        <div className="spacer" />
        <button
          onClick={() => navigate({ view: 'editor' })}
          data-testid="home-continue-editing"
          title="Back to the graphic open in the editor"
        >
          ↩ Continue editing <strong style={{ marginLeft: 4 }}>{workingName}</strong>
          {workingSaved.dirty ? ' •' : ''}
        </button>
        <button className="primary" onClick={() => navigate({ view: 'new' })} data-testid="home-new-project">
          + New project
        </button>
        <SyncStatus />
        <AuthStatus />
      </header>

      <div className="home-body">
        <nav className="home-nav" aria-label="Home sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={s.id === section && !packageView ? 'active' : ''}
              onClick={() => navigate(s.id === 'recent' ? { view: 'home', section: null } : { view: 'home', section: s.id })}
              data-testid={`home-nav-${s.id}`}
            >
              <span aria-hidden="true">{s.icon}</span> {s.label}
            </button>
          ))}
        </nav>

        <main className="home-content">
          {publish && (
            <PublishSheet
              target={publish}
              onDone={(note) => {
                setPublish(null);
                if (note) refresh();
              }}
            />
          )}
          {packageView ? (
            <PackageView
              packet={packageView}
              graphics={graphicsInPackage(packageView.id)}
              onOpen={openGraphic}
              onExport={() => void exportPackage(packageView)}
              onChanged={refresh}
            />
          ) : (
            <>
              {(section === 'graphics' || section === 'recent') && (
                <div className="home-search row">
                  <input
                    className="grow"
                    placeholder="Search graphics…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    data-testid="home-search"
                  />
                </div>
              )}

              {section === 'recent' && (
                <>
                  <h2>Recent work</h2>
                  {filtered.length === 0 && videos.length === 0 && (
                    <EmptyHint onNew={() => navigate({ view: 'new' })} />
                  )}
                  <GraphicList
                    graphics={filtered.slice(0, 8)}
                    packages={packages}
                    packageName={packageName}
                    onOpen={openGraphic}
                    onChanged={refresh}
                  />
                  {filtered.length > 8 && (
                    <button className="link-inline" onClick={() => navigate({ view: 'home', section: 'graphics' })}>
                      View all {filtered.length} graphics →
                    </button>
                  )}
                  {videos.length > 0 && (
                    <>
                      <h2 style={{ marginTop: 18 }}>Recent videos</h2>
                      <VideoList videos={videos.slice(0, 4)} onOpen={openVideo} onChanged={refresh} />
                    </>
                  )}
                </>
              )}

              {section === 'graphics' && (
                <>
                  <h2>Graphics <span className="muted">({filtered.length})</span></h2>
                  {filtered.length === 0 && <EmptyHint onNew={() => navigate({ view: 'new' })} />}
                  <GraphicList
                    graphics={filtered}
                    packages={packages}
                    packageName={packageName}
                    onOpen={openGraphic}
                    onChanged={refresh}
                    onPublish={communityOn ? (g) => setPublish({ name: g.name, template: g.template, gate: publishGate(g.template) }) : undefined}
                  />
                  {communityOn && mySubs.length > 0 && (
                    <div className="panel-section" style={{ marginTop: 14 }}>
                      <h3>🌐 My community templates</h3>
                      {mySubs.map((s) => (
                        <div className="pk-graphic" key={s.id}>
                          <strong>{s.name}</strong>
                          <span className="muted">{s.kind} · {STATUS_LABEL[s.status]}</span>
                          <div className="spacer" />
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}${window.location.pathname}?template=${encodeURIComponent(s.slug)}`;
                              void copyLink(url).then((ok) => {
                                if (!ok) return;
                                setCopiedSub(s.id);
                                setTimeout(() => setCopiedSub((c) => (c === s.id ? null : c)), 2000);
                              });
                            }}
                            title="Copy a share link"
                          >
                            {copiedSub === s.id ? '✓ Copied' : '🔗'}
                          </button>
                          <button onClick={() => { void unpublish(s.id).then(refresh); }} title="Remove from the community">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {section === 'packages' && (
                <PackagesSection
                  packages={packages}
                  countIn={(id) => graphicsInPackage(id).length}
                  onOpenPackage={(p) => navigate({ view: 'package', id: p.id })}
                  onChanged={refresh}
                />
              )}

              {section === 'controls' && (
                <>
                  <h2>Control panels</h2>
                  <p className="hint">
                    Every saved graphic has a control panel: its fields, its saved entries, and
                    the buttons its state machine defines — for rehearsing here and for driving
                    the exported graphic live.
                  </p>
                  {graphics.length === 0 && <EmptyHint onNew={() => navigate({ view: 'new' })} />}
                  {graphics.map((g) => (
                    <div className="pk-graphic" key={g.id}>
                      <strong>{g.name}</strong>
                      <span className="muted">
                        {g.entries.length} entr{g.entries.length === 1 ? 'y' : 'ies'}
                        {packageName(g.packageId) ? ` · 📦 ${packageName(g.packageId)}` : ''}
                      </span>
                      <div className="spacer" />
                      <button
                        className="primary"
                        onClick={() => navigate({ view: 'control', id: g.id })}
                        data-testid={`open-control-${g.id}`}
                      >
                        🎛 Open control panel
                      </button>
                    </div>
                  ))}
                </>
              )}

              {section === 'rundowns' && (
                <RundownsSection rundowns={rundowns} onChanged={refresh} onNew={() => navigate({ view: 'new' })} />
              )}

              {section === 'videos' && (
                <>
                  <h2>Videos <span className="muted">({videos.length})</span></h2>
                  <p className="hint">
                    Standalone AI video / animation projects — separate from live broadcast
                    graphics. The video editor has its own workspace.
                  </p>
                  {videos.length === 0 && (
                    <p className="hint">Nothing yet — create one with “Video or animation with AI” in the wizard.</p>
                  )}
                  <VideoList videos={videos} onOpen={openVideo} onChanged={refresh} />
                </>
              )}

              {section === 'looks' && <LooksSection looks={looks} onChanged={refresh} onDone={() => navigate({ view: 'editor' })} />}
            </>
          )}
        </main>
      </div>

      {/* The guard + save dialogs can appear over Home too (e.g. opening a graphic while the
          editor holds unsaved work), and account features need their sign-in dialog. */}
      <SaveDialogs />
      <SignInDialog />
    </div>
  );
}

/** The publish sheet (moved from the retired packet manager): the automated gate first,
 *  then a one-line summary, then the share. */
function PublishSheet({
  target,
  onDone,
}: {
  target: { name: string; template: SpxTemplate; gate: ValidationResult };
  onDone: (published: boolean) => void;
}) {
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    if (!target.gate.ok) return;
    setBusy(true);
    const res = await publishGraphic(target.template, summary);
    setBusy(false);
    if (res.error) setError(res.error);
    else onDone(true);
  };
  return (
    <div className="panel-section" style={{ outline: '2px solid var(--accent)', outlineOffset: 2, marginBottom: 14 }} data-testid="publish-sheet">
      <h3 style={{ marginTop: 0 }}>Publish “{target.name}”</h3>
      {!target.gate.ok && (
        <div className="status-bad">
          <strong>Fix before sharing:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {target.gate.errors.map((e, i) => <li key={i}>{e.message}</li>)}
          </ul>
        </div>
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
      {error && <p className="status-bad">{error}</p>}
      <div className="row">
        <button className="primary" disabled={busy || !target.gate.ok} onClick={() => void confirm()}>
          {busy ? 'Publishing…' : 'Publish'}
        </button>
        <button onClick={() => onDone(false)} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}

function EmptyHint({ onNew }: { onNew: () => void }) {
  return (
    <div className="panel-section">
      <h3>Nothing saved yet</h3>
      <p className="hint">
        Create a graphic and press 💾 Save in the editor — it appears here, and syncs across
        your devices while you are signed in.
      </p>
      <button className="primary" onClick={onNew}>+ New project</button>
    </div>
  );
}

/** One graphic row with the full action set: open, control panel, rename, duplicate, move, delete. */
function GraphicRow({
  g,
  packages,
  packageLabel,
  onOpen,
  onChanged,
  onPublish,
}: {
  g: GraphicDoc;
  packages: Packet[];
  packageLabel: string | null;
  onOpen: (g: GraphicDoc) => void;
  onChanged: () => void;
  /** Present only when community publishing is available (backend + signed in). */
  onPublish?: (g: GraphicDoc) => void;
}) {
  const navigate = useRouter((s) => s.navigate);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(g.name);
  const [moving, setMoving] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (deleteTimer.current) clearTimeout(deleteTimer.current); }, []);

  const commitRename = () => {
    setRenaming(false);
    if (name.trim() && name.trim() !== g.name) {
      updateGraphic(g.id, { name: name.trim() });
      // The open working copy keeps its own name until re-opened; the row updates now.
      onChanged();
    }
  };

  const move = (value: string) => {
    setMoving(false);
    if (value === '__keep') return;
    if (value === '__new') {
      const pkgName = window.prompt('New package name:', 'My show');
      if (!pkgName) return;
      const packet = createPacketNamed(pkgName);
      updateGraphic(g.id, { packageId: packet.id });
    } else {
      updateGraphic(g.id, { packageId: value === '__standalone' ? null : value });
    }
    onChanged();
  };

  return (
    <div className="pk-graphic" data-testid={`graphic-row-${g.id}`}>
      <GraphicThumb template={g.template} values={activeValues(g)} label={g.name} />
      <div className="pk-info">
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setName(g.name); setRenaming(false); }
            }}
            data-testid="rename-input"
          />
        ) : (
          <strong>{g.name}</strong>
        )}
        <span className="muted">
          {g.type}
          {packageLabel ? ` · 📦 ${packageLabel}` : ''}
          {' · '}
          {new Date(g.updatedAt).toLocaleDateString()}
        </span>
      </div>
      <div className="spacer" />
      <div className="pk-actions">
      {moving ? (
        <select autoFocus defaultValue="__keep" onChange={(e) => move(e.target.value)} onBlur={() => setMoving(false)} data-testid="move-select">
          <option value="__keep" disabled>Move to…</option>
          <option value="__standalone">Standalone (no package)</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>📦 {p.name}</option>
          ))}
          <option value="__new">＋ New package…</option>
        </select>
      ) : (
        <>
          <button className="primary" onClick={() => onOpen(g)} title="Open in the editor" data-testid="open-graphic">
            Open
          </button>
          <button onClick={() => navigate({ view: 'control', id: g.id })} title="Open its control panel">🎛</button>
          <button onClick={() => { setName(g.name); setRenaming(true); }} title="Rename">✎</button>
          <button
            onClick={() => { duplicateGraphic(g.id); onChanged(); }}
            title="Duplicate"
          >
            ⧉
          </button>
          <button onClick={() => setMoving(true)} title="Move to a package">📦</button>
          {onPublish && (
            <button onClick={() => onPublish(g)} title="Publish to the community" data-testid="publish-graphic">🌐</button>
          )}
          <button
            className={deleteArmed ? 'reset-armed' : ''}
            onClick={() => {
              if (deleteArmed) {
                if (deleteTimer.current) clearTimeout(deleteTimer.current);
                setDeleteArmed(false);
                deleteGraphic(g.id);
                onChanged();
              } else {
                setDeleteArmed(true);
                if (deleteTimer.current) clearTimeout(deleteTimer.current);
                deleteTimer.current = setTimeout(() => setDeleteArmed(false), 3500);
              }
            }}
            title={deleteArmed ? 'Click again to delete this graphic' : 'Delete'}
            data-testid="delete-graphic"
          >
            {deleteArmed ? 'Delete?' : '🗑'}
          </button>
        </>
      )}
      </div>
    </div>
  );
}

function GraphicList({
  graphics,
  packages,
  packageName,
  onOpen,
  onChanged,
  onPublish,
}: {
  graphics: GraphicDoc[];
  packages: Packet[];
  packageName: (id: string | null) => string | null;
  onOpen: (g: GraphicDoc) => void;
  onChanged: () => void;
  onPublish?: (g: GraphicDoc) => void;
}) {
  return (
    <>
      {graphics.map((g) => (
        <GraphicRow
          key={g.id}
          g={g}
          packages={packages}
          packageLabel={packageName(g.packageId)}
          onOpen={onOpen}
          onChanged={onChanged}
          onPublish={onPublish}
        />
      ))}
    </>
  );
}

function PackagesSection({
  packages,
  countIn,
  onOpenPackage,
  onChanged,
}: {
  packages: Packet[];
  countIn: (id: string) => number;
  onOpenPackage: (p: Packet) => void;
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState('');
  return (
    <>
      <h2>Packages</h2>
      <p className="hint">
        A package is a folder for related graphics — “Election Night” with its lower thirds,
        results graphic, and ticker filed together. To run several graphics at once on air,
        that is a <strong>rundown</strong> (in a graphic’s control panel).
      </p>
      <div className="row" style={{ marginBottom: 10 }}>
        <input
          className="grow"
          placeholder="New package name, e.g. Election Night"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) { createPacketNamed(newName); setNewName(''); onChanged(); }
          }}
          data-testid="new-package-name"
        />
        <button
          className="primary"
          disabled={!newName.trim()}
          onClick={() => { createPacketNamed(newName); setNewName(''); onChanged(); }}
          data-testid="create-package"
        >
          + Create package
        </button>
      </div>
      {packages.length === 0 && <p className="hint">No packages yet — you can also create one when saving a graphic.</p>}
      {packages.map((p) => (
        <div className="pk-graphic" key={p.id} data-testid={`package-row-${p.id}`}>
          <strong>📦 {p.name}</strong>
          <span className="muted">{countIn(p.id)} graphic{countIn(p.id) === 1 ? '' : 's'}</span>
          <div className="spacer" />
          <button className="primary" onClick={() => onOpenPackage(p)} data-testid="open-package">Open</button>
        </div>
      ))}
    </>
  );
}

/**
 * The Rundowns Home section: DISCOVER and manage the rundowns built in the editor's control
 * panel (a rundown = graphics that run together on air, model/shows.ts). Building one - creating
 * it, adding the graphic you are editing - stays in that control panel, where the graphic
 * context is, exactly as saving into a package does. Here you see them all, export a package,
 * copy a published operator link, or delete one.
 */
function RundownsSection({
  rundowns,
  onChanged,
  onNew,
}: {
  rundowns: Show[];
  onChanged: () => void;
  onNew: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const exportRundown = async (r: Show) => {
    const zip = await buildShowZip(r);
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${slug(r.name)}_rundown.zip`);
  };
  return (
    <>
      <h2>Rundowns</h2>
      <p className="hint">
        A rundown is several graphics that run together on air — a bug, a lower third, and a
        ticker as one show, operated from a single control page. Build one from a graphic’s
        <strong> control panel</strong> (“Add current” to a rundown); manage and export them here.
      </p>
      {rundowns.length === 0 && (
        <p className="hint">
          No rundowns yet.{' '}
          <button className="link-inline" onClick={onNew}>Create a graphic</button>, then add it to a
          rundown from its control panel.
        </p>
      )}
      {rundowns.map((r) => (
        <div className="pk-graphic" key={r.id} data-testid={`rundown-row-${r.id}`}>
          <strong>📋 {r.name}</strong>
          <span className="muted">
            {r.graphics.length} graphic{r.graphics.length === 1 ? '' : 's'}
            {r.hostedSlug ? ' · 🌐 published' : ''}
          </span>
          <div className="spacer" />
          {r.hostedSlug && (
            <button
              onClick={() => {
                void copyLink(`${window.location.origin}/app?control=${encodeURIComponent(r.hostedSlug!)}`).then((ok) => {
                  if (!ok) return;
                  setCopiedLink(r.id);
                  setTimeout(() => setCopiedLink((c) => (c === r.id ? null : c)), 2000);
                });
              }}
              title="Copy the operator link (keep it private)"
            >
              {copiedLink === r.id ? '✓ Copied' : '🔗 Copy link'}
            </button>
          )}
          <button
            className="primary"
            disabled={r.graphics.length === 0}
            onClick={() => void exportRundown(r)}
            data-testid="export-rundown"
          >
            ⬇ Export
          </button>
          {confirmDelete === r.id ? (
            <button
              className="destructive"
              onClick={() => { deleteShow(r.id); setConfirmDelete(null); onChanged(); }}
              title="Delete this rundown (its graphics stay saved wherever else they live)"
            >
              Delete?
            </button>
          ) : (
            <button onClick={() => setConfirmDelete(r.id)} title="Delete this rundown">🗑</button>
          )}
        </div>
      ))}
    </>
  );
}

function PackageView({
  packet,
  graphics,
  onOpen,
  onExport,
  onChanged,
}: {
  packet: Packet;
  graphics: GraphicDoc[];
  onOpen: (g: GraphicDoc) => void;
  onExport: () => void;
  onChanged: () => void;
}) {
  const navigate = useRouter((s) => s.navigate);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(packet.name);
  const [deleteArmed, setDeleteArmed] = useState(false);

  return (
    <>
      <button className="link-inline" onClick={() => navigate({ view: 'home', section: 'packages' })}>
        ‹ All packages
      </button>
      <div className="row" style={{ alignItems: 'center', marginTop: 6 }}>
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { setRenaming(false); if (name.trim()) { renamePacket(packet.id, name); onChanged(); } }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
        ) : (
          <h2 style={{ margin: 0 }}>📦 {packet.name}</h2>
        )}
        <button onClick={() => { setName(packet.name); setRenaming(true); }} title="Rename package">✎</button>
        <div className="spacer" />
        <button onClick={onExport} disabled={graphics.length === 0} title="One zip: a plug-and-play folder per graphic" data-testid="export-package">
          ⬇ Export package
        </button>
        <button
          className={deleteArmed ? 'reset-armed' : ''}
          onClick={() => {
            if (deleteArmed) {
              // Deleting the FOLDER never deletes the graphics — they become standalone.
              for (const g of graphics) updateGraphic(g.id, { packageId: null });
              deletePacket(packet.id);
              navigate({ view: 'home', section: 'packages' });
            } else {
              setDeleteArmed(true);
              setTimeout(() => setDeleteArmed(false), 3500);
            }
          }}
          title={deleteArmed ? 'Click again — its graphics become standalone' : 'Delete this package (graphics are kept)'}
        >
          {deleteArmed ? 'Delete package?' : '🗑'}
        </button>
      </div>
      {graphics.length === 0 && (
        <p className="hint" style={{ marginTop: 10 }}>
          Empty — save a graphic into this package from the editor's 💾 Save dialog, or move one
          here from Graphics.
        </p>
      )}
      <div style={{ marginTop: 10 }}>
        {graphics.map((g) => (
          <div className="pk-graphic" key={g.id}>
            <GraphicThumb template={g.template} values={activeValues(g)} label={g.name} />
            <div className="pk-info">
              <strong>{g.name}</strong>
              <span className="muted">{g.type} · {new Date(g.updatedAt).toLocaleDateString()}</span>
            </div>
            <div className="spacer" />
            <div className="pk-actions">
              <button className="primary" onClick={() => onOpen(g)}>Open</button>
              <button onClick={() => navigate({ view: 'control', id: g.id })} title="Open its control panel">🎛</button>
              <button onClick={() => { updateGraphic(g.id, { packageId: null }); onChanged(); }} title="Remove from the package (kept as standalone)">✕</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function VideoList({
  videos,
  onOpen,
  onChanged,
}: {
  videos: SavedVideoRecord[];
  onOpen: (v: SavedVideoRecord) => void;
  onChanged: () => void;
}) {
  return (
    <>
      {videos.map((v) => (
        <div className="pk-graphic" key={v.id}>
          <div className="pk-info">
            <strong>{v.name}</strong>
            <span className="muted">{v.project.engine} · {new Date(v.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="spacer" />
          <div className="pk-actions">
            <button className="primary" onClick={() => onOpen(v)} title="Open in the video editor">Open</button>
            <button onClick={() => { deleteSavedVideoProject(v.id); onChanged(); }} title="Delete">🗑</button>
          </div>
        </div>
      ))}
    </>
  );
}

function LooksSection({ looks, onChanged, onDone }: { looks: SavedLook[]; onChanged: () => void; onDone: () => void }) {
  const template = useTemplateStore((s) => s.template);
  const applyTemplate = useTemplateStore((s) => s.applyTemplate);
  const setActiveTab = useTemplateStore((s) => s.setActiveTab);
  const [newLookName, setNewLookName] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const onImportLook = async (file: File | undefined) => {
    if (!file) return;
    const { error } = importLook(await file.text());
    setNote(error ?? '✓ Look imported.');
    onChanged();
  };

  return (
    <>
      <h2>Brand looks</h2>
      <p className="hint">
        A look = colors + font captured as a named brand. Apply it to the graphic open in the
        editor, or use it as the default for new graphics.
      </p>
      <div className="row">
        <input
          className="grow"
          placeholder="Look name, e.g. Channel A7 red"
          value={newLookName}
          onChange={(e) => setNewLookName(e.target.value)}
        />
        <button
          className="primary"
          onClick={() => {
            addLook(newLookName || 'My look', captureLookFromTemplate(template));
            setNewLookName('');
            setNote('✓ Look saved from the graphic open in the editor.');
            onChanged();
          }}
        >
          Save current look
        </button>
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
          <div className="pk-info">
            <strong>{look.name}</strong>
            <span className="muted">{look.brand.customFont?.family ?? look.brand.fontId ?? ''}</span>
          </div>
          <div className="spacer" />
          <div className="pk-actions">
          <button
            onClick={() => {
              applyTemplate(applyLookToTemplate(template, look.brand));
              setActiveTab('css'); // land on the retinted :root vars, highlighted like any patch
              setNote(`✓ Applied "${look.name}" to the open graphic — back in the editor now.`);
              onDone();
            }}
            title="Retint the graphic open in the editor"
          >
            Apply
          </button>
          <button
            onClick={() => { saveBrand(look.brand); setNote(`✓ "${look.name}" is now the brand for new graphics.`); }}
            title="New graphics from the wizard will match this look"
          >
            Use for new
          </button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify({ name: look.name, brand: look.brand }, null, 2)], { type: 'application/json' });
              saveAs(blob, `${slug(look.name)}.look.json`);
            }}
            title="Download as a shareable .look.json"
          >
            ⬇
          </button>
          <button onClick={() => { deleteLook(look.id); onChanged(); }} title="Delete this look">✕</button>
          </div>
        </div>
      ))}
      {note && <p className={note.startsWith('✓') ? 'status-ok' : 'status-bad'}>{note}</p>}
    </>
  );
}
