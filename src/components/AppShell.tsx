import { useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import CodeEditor from './CodeEditor';
import PreviewFrame from './PreviewFrame';
import PlayoutSimulator from './PlayoutSimulator';
import TimelineView from './TimelineView';
import SidePanel from './SidePanel';
import PacketManager from './PacketManager';
import CommunityGallery from './CommunityGallery';
import ModerationQueue from './ModerationQueue';
import CreationWizard from './wizard/CreationWizard';
import BrandLogo from './BrandLogo';
import AuthStatus from './auth/AuthStatus';
import SignInDialog from './auth/SignInDialog';
import { useAuthState } from './auth/useAuthState';
import { useAuthUi } from './auth/authUi';
import SyncStatus from './SyncStatus';
import { isBackendConfigured } from '../backend/config';
import { useIsModerator } from '../community/useIsModerator';
import { useIsMobile } from './useIsMobile';
import { useSplitter, type Splitter } from './useSplitter';
import { clampRatio, loadLayout, saveLayout, type LayoutPrefs } from '../model/layout';

/** A drag handle between two regions (vertical between columns, horizontal between rows). */
function Divider({ orient, splitter, testid }: { orient: 'v' | 'h'; splitter: Splitter; testid: string }) {
  return (
    <div
      className={`${orient === 'v' ? 'workspace-divider' : 'workspace-divider-h'}${splitter.dragging ? ' dragging' : ''}`}
      data-testid={testid}
      role="separator"
      aria-orientation={orient === 'v' ? 'vertical' : 'horizontal'}
      onPointerDown={splitter.onPointerDown}
      onPointerMove={splitter.onPointerMove}
      onPointerUp={splitter.onPointerUp}
    />
  );
}

/**
 * The workspace: on desktop, two switchable arrangements — code editor on the left beside the
 * preview-over-panels column, or a full-width preview on top with code + panels below — with a
 * collapsible code pane and drag dividers between regions. On a phone it reflows to one column.
 * The iframe ref is shared so the simulator can call play()/stop()/update() on the live preview.
 */
export default function AppShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const template = useTemplateStore((s) => s.template);
  const openGallery = useTemplateStore((s) => s.openGallery);
  const undo = useTemplateStore((s) => s.undo);
  const [packetsOpen, setPacketsOpen] = useState(false);

  // Community gallery (Era 5.5) — only offered when a backend is configured (offline shows nothing).
  // Browsing needs an account (the RPCs are authenticated-only), so signed-out visitors get the
  // sign-in dialog instead of an empty gallery. A `?template=<slug>` share link auto-opens the
  // gallery focused on that item once signed in.
  const backendConfigured = isBackendConfigured();
  const { signedIn, needsSignIn } = useAuthState();
  const openSignIn = useAuthUi((s) => s.openSignIn);
  const initialTemplateSlug = useMemo(
    () => (backendConfigured ? new URLSearchParams(window.location.search).get('template') : null),
    [backendConfigured],
  );
  const [communityOpen, setCommunityOpen] = useState(false);
  const openCommunity = () => {
    if (needsSignIn) openSignIn('Sign in to browse the community gallery.');
    else setCommunityOpen(true);
  };
  // Share-link deep link: open the gallery as soon as we know the visitor's auth state — signed
  // in opens it directly; signed out asks for sign-in first, then opens it (once).
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (!initialTemplateSlug || deepLinkDone.current) return;
    if (signedIn && backendConfigured) {
      deepLinkDone.current = true;
      setCommunityOpen(true);
    } else if (needsSignIn) {
      openSignIn('Sign in to view this shared template.');
    }
  }, [initialTemplateSlug, signedIn, needsSignIn, backendConfigured, openSignIn]);

  // Moderator takedown queue — the button appears only for users in the moderators table.
  const isModerator = useIsModerator();
  const [moderationOpen, setModerationOpen] = useState(false);

  // On a phone the app reflows to a single column (preview + panels first); the code editor is
  // collapsed and mounted on demand (Monaco is heavy and secondary on mobile).
  const isMobile = useIsMobile();
  const [codeOpen, setCodeOpen] = useState(false);

  // Desktop layout (the mobile branch ignores this). Two arrangements — code-on-the-left, or a
  // full-width preview on top with code + panels below — plus a collapsible code pane and drag
  // dividers between regions. Remembered in localStorage (the first persisted UI preference).
  const workspaceRef = useRef<HTMLDivElement>(null);
  const bottomRowRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutPrefs>(loadLayout);

  const toggleCode = () =>
    setLayout((l) => {
      const codeCollapsed = !l.codeCollapsed;
      saveLayout({ codeCollapsed });
      return { ...l, codeCollapsed };
    });
  const toggleMode = () =>
    setLayout((l) => {
      const mode = l.mode === 'code-left' ? 'preview-top' : 'code-left';
      saveLayout({ mode });
      return { ...l, mode };
    });

  // Drag dividers. Column splits use the tight [0.2,0.7] bounds; the preview HEIGHT split allows a
  // wider range so the preview can dominate. Persist on release only (not on every move).
  const codeWidth = useSplitter(
    'x', workspaceRef,
    (r) => setLayout((l) => ({ ...l, codeRatio: clampRatio(r, 0.2, 0.7) })),
    (r) => saveLayout({ codeRatio: clampRatio(r, 0.2, 0.7) }),
  );
  const previewHeight = useSplitter(
    'y', workspaceRef,
    (r) => setLayout((l) => ({ ...l, previewRatio: clampRatio(r, 0.25, 0.85) })),
    (r) => saveLayout({ previewRatio: clampRatio(r, 0.25, 0.85) }),
  );
  const bottomWidth = useSplitter(
    'x', bottomRowRef,
    (r) => setLayout((l) => ({ ...l, bottomRatio: clampRatio(r, 0.2, 0.7) })),
    (r) => saveLayout({ bottomRatio: clampRatio(r, 0.2, 0.7) }),
  );

  // Global undo for block / AI / gallery actions. Skips Monaco and form fields so they
  // keep their own native text undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isZ = e.key === 'z' || e.key === 'Z';
      if (!isZ || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      const inEditable =
        !!el?.closest?.('.monaco-editor') ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        !!el?.isContentEditable;
      if (inEditable) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  // The preview block, shared across the mobile and both desktop arrangements (only one
  // renders at a time, so the shared iframeRef is always attached to a single instance).
  // Order matters: stage → timeline strip → transport, like every animation tool.
  const preview = (
    <div className="preview-wrap">
      <PreviewFrame iframeRef={iframeRef} />
      <TimelineView iframeRef={iframeRef} />
      <PlayoutSimulator iframeRef={iframeRef} />
    </div>
  );

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand brand-home" onClick={openGallery} title="NoaCG Studio — start a new project">
          <BrandLogo size={24} />
        </button>
        <span className="divider-dot" aria-hidden="true">·</span>
        <span className="tpl-name">{template.name}</span>
        <span className="mono muted" style={{ fontSize: 11, marginLeft: 6 }}>
          {template.resolution.width}×{template.resolution.height} · {template.fps}&thinsp;fps
        </span>
        <div className="spacer" />
        {!isMobile && (
          <button onClick={toggleMode} data-testid="toggle-layout" title="Switch the workspace arrangement">
            {layout.mode === 'code-left' ? '⬒ Preview top' : '◧ Code left'}
          </button>
        )}
        {!isMobile && (
          <button
            className={layout.codeCollapsed ? '' : 'active'}
            onClick={toggleCode}
            data-testid="toggle-code"
            title={layout.codeCollapsed ? 'Show the code editor' : 'Collapse the code editor to give the preview full width'}
          >
            {layout.codeCollapsed ? '▸ Show code' : '▾ Hide code'}
          </button>
        )}
        <button onClick={() => setPacketsOpen(true)} title="Save this show's graphics together + manage brand looks">
          📦 Packets
        </button>
        {backendConfigured && (
          <button onClick={openCommunity} title="Browse and reuse templates shared by other users">
            🌐 Community
          </button>
        )}
        {isModerator && (
          <button onClick={() => setModerationOpen(true)} title="Review and remove published community templates">
            🛡 Moderate
          </button>
        )}
        <button onClick={openGallery} title="Start a new project from a template">
          + New project
        </button>
        {/* Both render nothing offline; cloud status + account appear in hosted mode. */}
        <SyncStatus />
        <AuthStatus />
      </header>

      {isMobile ? (
        <div className="workspace workspace-mobile">
          {preview}
          <SidePanel />
          <div className="mobile-code">
            <button className="mobile-code-toggle" onClick={() => setCodeOpen((o) => !o)}>
              {codeOpen ? '▾ Hide code' : '▸ Show code'}
            </button>
            {codeOpen && <CodeEditor />}
          </div>
        </div>
      ) : layout.mode === 'preview-top' ? (
        <div
          className="workspace preview-top"
          ref={workspaceRef}
          style={{ gridTemplateRows: `${layout.previewRatio}fr 6px ${1 - layout.previewRatio}fr` }}
        >
          <section className="pane preview-pane">{preview}</section>
          <Divider orient="h" splitter={previewHeight} testid="preview-divider" />
          <div
            className="bottom-row"
            ref={bottomRowRef}
            style={{
              gridTemplateColumns: layout.codeCollapsed
                ? '1fr'
                : `${layout.bottomRatio}fr 6px ${1 - layout.bottomRatio}fr`,
            }}
          >
            {!layout.codeCollapsed && (
              <>
                <section className="pane" data-testid="code-pane">
                  <CodeEditor />
                </section>
                <Divider orient="v" splitter={bottomWidth} testid="bottom-divider" />
              </>
            )}
            <section className="pane">
              <SidePanel />
            </section>
          </div>
        </div>
      ) : (
        <div
          className="workspace"
          ref={workspaceRef}
          style={{
            gridTemplateColumns: layout.codeCollapsed
              ? '1fr'
              : `${layout.codeRatio}fr 6px ${1 - layout.codeRatio}fr`,
          }}
        >
          {!layout.codeCollapsed && (
            <>
              <section className="pane" data-testid="code-pane">
                <CodeEditor />
              </section>
              <Divider orient="v" splitter={codeWidth} testid="workspace-divider" />
            </>
          )}
          <section className="pane">
            {preview}
            <SidePanel />
          </section>
        </div>
      )}

      {/* Creation wizard overlay — shown on startup and via "New project". */}
      <CreationWizard />

      {/* Packet manager overlay — saved graphics collections + brand looks. */}
      {packetsOpen && <PacketManager onClose={() => setPacketsOpen(false)} />}

      {/* Community gallery overlay — browse + import shared templates (hosted mode only). */}
      {communityOpen && (
        <CommunityGallery onClose={() => setCommunityOpen(false)} initialSlug={initialTemplateSlug} />
      )}

      {/* Moderator takedown queue overlay — only reachable when the button is shown (a moderator). */}
      {moderationOpen && <ModerationQueue onClose={() => setModerationOpen(false)} />}

      {/* On-demand sign-in dialog — opened by the topbar button or any account-gated feature. */}
      <SignInDialog />
    </div>
  );
}
