import { useEffect, useRef } from 'react';
import AppShell from './components/AppShell';
import VideoAppShell from './components/video/VideoAppShell';
import SendIn from './showchat/SendIn';
import HostedControlPage from './components/HostedControlPage';
import HomePage from './components/home/HomePage';
import GraphicControlPage from './components/home/GraphicControlPage';
import { useDocKindStore } from './store/docKindStore';
import { useTemplateStore } from './store/templateStore';
import { useRouter } from './app/router';
import { openGraphicById, useSaveUi } from './store/saveActions';

export default function App() {
  // Which editor world is active: SPX live graphics or the AI video editor. Persisted;
  // the wizard flips it when a project of the other kind is created or opened.
  const kind = useDocKindStore((s) => s.kind);

  // In-app surface routing (docs/SAVED_CONTENT_MODEL.md §3): hash routes for Home, packages,
  // per-graphic control panels, and direct graphic links — real history, so Back/Forward walk
  // between surfaces and a refresh restores the same place.
  const route = useRouter((s) => s.route);

  // A `#/graphic/<id>` route means THAT library graphic should be the working document.
  // Loading is guarded (unsaved changes ask first); handled once per route change so a
  // canceled guard doesn't re-ask in a loop. Cancel rewinds the URL to the plain editor.
  const handledGraphicRoute = useRef<string | null>(null);
  useEffect(() => {
    if (route.view !== 'graphic') {
      handledGraphicRoute.current = null;
      return;
    }
    if (handledGraphicRoute.current === route.id) return;
    handledGraphicRoute.current = route.id;
    const { saved } = useTemplateStore.getState();
    if (saved.graphicId === route.id) return; // already open (the normal refresh case)
    useSaveUi.getState().requestSwitch(
      () => {
        if (!openGraphicById(route.id)) {
          // Unknown id (deleted, other profile): land on Home rather than a dead editor.
          useRouter.getState().replace({ view: 'home', section: null });
        }
      },
      () => useRouter.getState().replace({ view: 'editor' }),
    );
  }, [route]);

  // `#/video` and `#/graphic` pin the persisted shell kind so refresh matches the URL.
  useEffect(() => {
    if (route.view === 'video' && useDocKindStore.getState().kind !== 'video') {
      useDocKindStore.getState().setKind('video');
    }
    if (route.view === 'graphic' && useDocKindStore.getState().kind !== 'spx') {
      useDocKindStore.getState().setKind('spx');
    }
  }, [route]);

  // The wizard is routed (`#/new`): opening the route opens it, Back closes it, and closing
  // it IN the app (create, ✕, Escape) rewinds the route — otherwise the still-current `#/new`
  // would immediately reopen it. The store flag stays the source the shells read; this effect
  // only keeps the two in agreement. Only a wizard the ROUTE opened is closed by leaving the
  // route — the first-visit startup wizard (galleryOpen's initial value, true only when no
  // autosaved project exists) must not be closed by the plain '' route on boot.
  const galleryOpen = useTemplateStore((s) => s.galleryOpen);
  const routedWizard = useRef(false);
  useEffect(() => {
    if (route.view === 'new') {
      if (galleryOpen) {
        routedWizard.current = true;
      } else if (routedWizard.current) {
        // Closed from inside the app while the route still says wizard: rewind the URL.
        routedWizard.current = false;
        useRouter.getState().replace({ view: 'editor' });
      } else {
        routedWizard.current = true;
        useTemplateStore.getState().openGallery();
      }
    } else {
      if (galleryOpen && routedWizard.current) useTemplateStore.getState().closeGallery();
      routedWizard.current = false;
    }
  }, [route, galleryOpen]);

  // Public show-chat send-in page: <app-url>?chat=<slug>. Anyone with the link may submit;
  // RLS is the boundary. Everything else is the builder.
  const params = new URLSearchParams(window.location.search);
  const chatSlug = params.get('chat');
  if (chatSlug) return <SendIn slug={chatSlug} />;

  // Hosted control page: <app-url>?control=<slug> — the show's operator page, no login,
  // the unguessable slug is the capability (same pattern as ?chat=).
  const controlSlug = params.get('control');
  if (controlSlug) return <HostedControlPage slug={controlSlug} />;

  // Routed surfaces: Home (and a package's view), a saved graphic's control panel.
  if (route.view === 'home' || route.view === 'package') return <HomePage route={route} />;
  if (route.view === 'control') return <GraphicControlPage id={route.id} />;

  // The editor is open to everyone — no login wall (Era 5.6). Account features (cloud sync,
  // community, AI) gate themselves via useAuthState and the on-demand SignInDialog.
  if (route.view === 'video') return <VideoAppShell />;
  if (route.view === 'graphic') return <AppShell />;
  return kind === 'video' ? <VideoAppShell /> : <AppShell />;
}
