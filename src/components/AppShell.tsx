import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import PreviewFrame from './PreviewFrame';
import PlayoutSimulator from './PlayoutSimulator';
import TimelineDock from './StepTimeline';
import SidePanel from './SidePanel';
import Inspector from './Inspector';
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

// Monaco (bundled inside CodeEditor via monacoSetup) is by far the heaviest chunk in the app,
// and the code VIEW is optional — many users never open it. Loading it lazily keeps the shell,
// preview, and wizard off the Monaco download: the editor pane streams in beside them, and the
// mobile layout never fetches it until "Show code".
const CodeEditorLazy = lazy(() => import('./CodeEditor'));
function CodeEditor() {
  return (
    <Suspense fallback={<div className="code-editor-loading">Loading the code editor…</div>}>
      <CodeEditorLazy />
    </Suspense>
  );
}

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
  const redo = useTemplateStore((s) => s.redo);
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
  const toggleInspector = () =>
    setLayout((l) => {
      const inspectorCollapsed = !l.inspectorCollapsed;
      saveLayout({ inspectorCollapsed });
      return { ...l, inspectorCollapsed };
    });

  // Selecting an element ANYWHERE (canvas click, timeline row label, diamond click) is a
  // request to inspect it — a NEW selection un-collapses the Inspector. An explicit ◨
  // collapse is respected for as long as the selection stays the same; the next different
  // selection opens it again. Deselecting never opens or closes anything.
  //
  // The open is DEFERRED past the double-click window and stands down for gestures: opening
  // the Inspector resizes the workspace, and doing that mid-interaction moves the canvas
  // under the pointer — most visibly on a text double-click, where the first click selects
  // and an instant open would shift the element before the second click lands. So the open
  // waits half a second, any new pointer press cancels it (the user is still gesturing),
  // and a gesture that is live when the timer fires (inline edit, canvas drag) skips it.
  // The layout only ever moves when the user's hands are still; the next new selection
  // offers the Inspector again.
  const selectedPart = useTemplateStore((s) => s.selectedPart);
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selectedPart;
    if (isMobile || !selectedPart || selectedPart === prev) return;
    const cancel = () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', cancel, true);
    };
    const timer = setTimeout(() => {
      cancel();
      if (useTemplateStore.getState().canvasGestureActive) return;
      setLayout((l) => {
        if (!l.inspectorCollapsed) return l;
        saveLayout({ inspectorCollapsed: false });
        return { ...l, inspectorCollapsed: false };
      });
    }, 500); // the OS double-click window — a quiet half-second means the gesture is over
    window.addEventListener('pointerdown', cancel, true);
    return cancel;
  }, [selectedPart, isMobile]);

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
  // The Inspector is the rightmost column of the full workspace width in both modes, so
  // its ratio is measured from the RIGHT edge (1 - pointer fraction).
  const inspectorWidth = useSplitter(
    'x', workspaceRef,
    (r) => setLayout((l) => ({ ...l, inspectorRatio: clampRatio(1 - r, 0.12, 0.35) })),
    (r) => saveLayout({ inspectorRatio: clampRatio(1 - r, 0.12, 0.35) }),
  );

  // Global undo/redo for panel / timeline / AI actions: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (and
  // Ctrl+Y, the Windows convention). Skips Monaco and form fields so they keep their own
  // native text undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isZ = e.key === 'z' || e.key === 'Z';
      const isY = e.key === 'y' || e.key === 'Y';
      if ((!isZ && !isY) || !(e.ctrlKey || e.metaKey) || e.altKey) return;
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
      if (isY || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // The preview block, shared across the mobile and both desktop arrangements (only one
  // renders at a time, so the shared iframeRef is always attached to a single instance).
  // Order matters: stage → timeline strip → transport, like every animation tool.
  const preview = (
    <div className="preview-wrap">
      <PreviewFrame iframeRef={iframeRef} />
      <TimelineDock iframeRef={iframeRef} />
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
        {!isMobile && (
          <button
            className={layout.inspectorCollapsed ? '' : 'active'}
            onClick={toggleInspector}
            data-testid="toggle-inspector"
            title={layout.inspectorCollapsed ? 'Show the Inspector (the selected element’s properties)' : 'Collapse the Inspector'}
          >
            ◨ Inspector
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
          <section className="pane preview-pane">
            <div
              className="preview-row"
              style={{
                display: 'grid',
                height: '100%',
                minHeight: 0,
                gridTemplateColumns: layout.inspectorCollapsed
                  ? '1fr'
                  : `${1 - layout.inspectorRatio}fr 6px ${layout.inspectorRatio}fr`,
              }}
            >
              <div className="preview-cell">{preview}</div>
              {!layout.inspectorCollapsed && (
                <>
                  <Divider orient="v" splitter={inspectorWidth} testid="inspector-divider" />
                  <section className="pane inspector-pane" data-testid="inspector-pane">
                    <Inspector />
                  </section>
                </>
              )}
            </div>
          </section>
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
            <section className="pane" data-testid="panel-pane">
              <SidePanel />
            </section>
          </div>
        </div>
      ) : (
        // code-left: code on the left; the right region stacks the preview row (stage +
        // timeline | Inspector) over the FULL-WIDTH tool panels. The Inspector column is
        // exactly as tall as the preview block, so no dead corner sits under it, and the
        // panels get the whole width beside the code column.
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
          <div className="workspace-right">
            <div
              className="preview-row"
              style={{
                gridTemplateColumns: layout.inspectorCollapsed
                  ? '1fr'
                  : (() => {
                      // inspectorRatio is a fraction of the WORKSPACE width (both desktop
                      // modes share the pref and the splitter measures the workspace);
                      // this row spans only the right region — convert, and keep the
                      // preview at least 40% of the row.
                      const rightFrac = layout.codeCollapsed ? 1 : 1 - layout.codeRatio;
                      const ins = Math.min(0.6, layout.inspectorRatio / rightFrac);
                      return `${1 - ins}fr 6px ${ins}fr`;
                    })(),
              }}
            >
              <div className="preview-cell">{preview}</div>
              {!layout.inspectorCollapsed && (
                <>
                  <Divider orient="v" splitter={inspectorWidth} testid="inspector-divider" />
                  <section className="pane inspector-pane" data-testid="inspector-pane">
                    <Inspector />
                  </section>
                </>
              )}
            </div>
            <section className="pane panel-pane" data-testid="panel-pane">
              <SidePanel />
            </section>
          </div>
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
