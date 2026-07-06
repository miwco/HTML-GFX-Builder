import AppShell from './components/AppShell';
import AuthGate from './components/auth/AuthGate';
import SendIn from './showchat/SendIn';

export default function App() {
  // Public show-chat send-in page: <app-url>?chat=<slug>. It is NOT behind the auth gate — anyone
  // with the link may submit; RLS is the boundary. Everything else is the builder.
  const chatSlug = new URLSearchParams(window.location.search).get('chat');
  if (chatSlug) return <SendIn slug={chatSlug} />;

  // AuthGate is a no-op unless a backend is configured AND VITE_REQUIRE_AUTH is set (hosted beta).
  // Offline / self-host builds render AppShell straight through, exactly like before Era 5.
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}
