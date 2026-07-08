'use strict';

/**
 * Local development server. Serves the same controllers as the Azure
 * Functions app over plain Node HTTP so you can develop without the
 * Functions Core Tools or any Azure resources (data goes to .data/).
 *
 * Auth: if no x-ms-client-principal header is present (in production SWA
 * always injects it), a fake local principal is used so the app works
 * out of the box with `npm run dev`.
 *
 *   node dev-server.js          # listens on :7071 (Vite proxies /api here)
 */

const http = require('node:http');
const controllers = require('./src/lib/controllers');
const { parsePrincipal } = require('./src/lib/auth');

const PORT = process.env.PORT || 7071;

const DEV_PRINCIPAL = Buffer.from(
  JSON.stringify({
    userId: 'local-dev-user',
    userDetails: 'dev@localhost',
    identityProvider: 'local',
    userRoles: ['anonymous', 'authenticated'],
  })
).toString('base64');

const routes = [
  { method: 'GET', pattern: /^\/api\/games$/, controller: controllers.listGames },
  { method: 'POST', pattern: /^\/api\/games$/, controller: controllers.createGame },
  { method: 'GET', pattern: /^\/api\/games\/active$/, controller: controllers.getActiveGame },
  { method: 'GET', pattern: /^\/api\/games\/(?<id>[^/]+)$/, controller: controllers.getGame },
  { method: 'PATCH', pattern: /^\/api\/games\/(?<id>[^/]+)$/, controller: controllers.updateGame },
  { method: 'POST', pattern: /^\/api\/games\/(?<id>[^/]+)\/rounds$/, controller: controllers.submitRound },
  { method: 'DELETE', pattern: /^\/api\/games\/(?<id>[^/]+)\/rounds\/last$/, controller: controllers.undoLastRound },
  { method: 'GET', pattern: /^\/api\/negotiate$/, controller: controllers.negotiateRealtime },
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));

  const send = (status, jsonBody) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(jsonBody ?? {}));
  };

  if (!route) return send(404, { error: 'Not found' });

  const principal = parsePrincipal(req.headers['x-ms-client-principal'] || DEV_PRINCIPAL);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let body = null;
  if (chunks.length) {
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      body = null;
    }
  }

  const params = url.pathname.match(route.pattern).groups || {};
  try {
    const result = await route.controller({ principal, params, body });
    send(result.status, result.jsonBody);
  } catch (err) {
    console.error(err);
    send(500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`API dev server listening on http://localhost:${PORT}`);
});
