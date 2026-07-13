import AppShell from './components/AppShell';
import VideoAppShell from './components/video/VideoAppShell';
import SendIn from './showchat/SendIn';
import { useDocKindStore } from './store/docKindStore';

export default function App() {
  // Which editor world is active: SPX live graphics or the AI video editor. Persisted;
  // the wizard flips it when a project of the other kind is created or opened.
  const kind = useDocKindStore((s) => s.kind);

  // Public show-chat send-in page: <app-url>?chat=<slug>. Anyone with the link may submit;
  // RLS is the boundary. Everything else is the builder.
  const chatSlug = new URLSearchParams(window.location.search).get('chat');
  if (chatSlug) return <SendIn slug={chatSlug} />;

  // The editor is open to everyone — no login wall (Era 5.6). Account features (cloud sync,
  // community, AI) gate themselves via useAuthState and the on-demand SignInDialog.
  return kind === 'video' ? <VideoAppShell /> : <AppShell />;
}
