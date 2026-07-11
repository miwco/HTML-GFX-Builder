// Vite dev plugin: mounts the REAL api/render handlers on the dev server, so the full
// render loop (UI -> handlers -> local Remotion render -> download) runs offline with no
// Vercel. Handlers are fetch-style (Request -> Response) and are loaded through
// ssrLoadModule — same modules Vercel deploys, TS + HMR for free.

/** @returns {import('vite').Plugin} */
export function renderApiPlugin() {
  return {
    name: 'noacg-render-api',
    configureServer(server) {
      server.middlewares.use('/api/render', (req, res) => {
        void handle(server, req, res);
      });
    },
  };
}

const ROUTES = new Set(['start', 'status', 'cancel', 'complete', 'cleanup', 'file']);

async function handle(server, req, res) {
  try {
    // The mount strips the prefix: '/start?x' -> route 'start'.
    const [pathPart, query] = (req.url ?? '/').split('?');
    const route = pathPart.replace(/^\/+|\/+$/g, '');
    if (!ROUTES.has(route)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: { code: 'not_found', message: `no route ${route}` } }));
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    const url = `http://${req.headers.host ?? 'localhost'}/api/render/${route}${query ? '?' + query : ''}`;
    const request = new Request(url, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v ?? '')]),
      ),
      body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : body,
    });

    const mod = await server.ssrLoadModule(`/api/render/${route}.ts`);
    const response = await mod.default.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const out = Buffer.from(await response.arrayBuffer());
    res.end(out);
  } catch (err) {
    server.config.logger.error(`[render-api] ${err instanceof Error ? err.stack : err}`);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'internal', message: 'render api error (see dev server log)' } }));
  }
}
