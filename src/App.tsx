import AppShell from './components/AppShell';
import SendIn from './showchat/SendIn';

export default function App() {
  // Public show-chat send-in page: <app-url>?chat=<slug>. Anyone with the link may submit;
  // RLS is the boundary. Everything else is the builder.
  const chatSlug = new URLSearchParams(window.location.search).get('chat');
  if (chatSlug) return <SendIn slug={chatSlug} />;

  // The editor is open to everyone — no login wall (Era 5.6). Account features (cloud sync,
  // community, AI) gate themselves via useAuthState and the on-demand SignInDialog.
  return <AppShell />;
}
