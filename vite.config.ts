import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { devPort, writeLaunchConfig } from './scripts/dev-port.mjs';
import { renderApiPlugin } from './scripts/renderDevPlugin.mjs';

// NoaCG Studio — dev/build config.
// Two pages: index.html is the static public landing at "/", app.html is the editor at
// "/app". Vercel serves /app via cleanUrls (vercel.json); this tiny plugin gives the dev
// and preview servers the same clean URL. `?raw` imports bundle GSAP + template snippets.
function appCleanUrl(): Plugin {
  const rewrite = (req: { url?: string }) => {
    if (req.url === '/app' || req.url?.startsWith('/app?')) {
      req.url = '/app.html' + (req.url.slice('/app'.length) || '');
    }
  };
  return {
    name: 'app-clean-url',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
  };
}

export default defineConfig(({ command }) => {
  // Keep the Claude preview launch config pointing at this checkout's port (worktrees get
  // their own — see scripts/dev-port.mjs). Serve-time only: builds shouldn't touch files.
  if (command === 'serve') writeLaunchConfig();
  return {
    // renderApiPlugin mounts the real api/render handlers on the dev server, so the cloud
    // render loop runs fully offline (local Remotion executor) during development.
    plugins: [react(), appCleanUrl(), renderApiPlugin()],
    // strictPort: the port is this checkout's identity (playwright + the dev scripts derive
    // the same number), so failing loudly beats silently drifting onto a neighbour's port.
    // open: skipped on CI runners — there is no browser to open, only Playwright's.
    server: { port: devPort(), strictPort: true, open: !process.env.CI },
    build: {
      target: 'es2020',
      outDir: 'dist',
      rollupOptions: {
        input: { landing: 'index.html', app: 'app.html' },
      },
    },
  };
});
