import { createControllers } from './controllers.js';
import { D1Store } from './store.js';
import {
  cookieHeader,
  pinMatches,
  principalFromRequest,
  sessionToken,
} from './auth.js';

const routes = [
  { method: 'GET', pattern: /^\/api\/me$/, auth: true, handler: 'me' },
  { method: 'POST', pattern: /^\/api\/login$/, auth: false, handler: 'login' },
  { method: 'POST', pattern: /^\/api\/logout$/, auth: false, handler: 'logout' },
  { method: 'GET', pattern: /^\/api\/games$/, auth: true, controller: 'listGames' },
  { method: 'POST', pattern: /^\/api\/games$/, auth: true, controller: 'createGame' },
  { method: 'GET', pattern: /^\/api\/games\/active$/, auth: true, controller: 'getActiveGame' },
  { method: 'GET', pattern: /^\/api\/games\/(?<id>[^/]+)$/, auth: true, controller: 'getGame' },
  { method: 'PATCH', pattern: /^\/api\/games\/(?<id>[^/]+)$/, auth: true, controller: 'updateGame' },
  {
    method: 'POST',
    pattern: /^\/api\/games\/(?<id>[^/]+)\/rounds$/,
    auth: true,
    controller: 'submitRound',
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/games\/(?<id>[^/]+)\/rounds\/last$/,
    auth: true,
    controller: 'undoLastRound',
  },
  { method: 'GET', pattern: /^\/api\/negotiate$/, auth: true, controller: 'negotiateRealtime' },
];

function json(status, jsonBody, extraHeaders = {}) {
  return new Response(JSON.stringify(jsonBody ?? {}), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    const route = routes.find((r) => r.method === request.method && r.pattern.test(url.pathname));
    if (!route) return json(404, { error: 'Not found' });

    const pin = env.PIN;
    if (!pin) return json(500, { error: 'PIN is not configured' });

    if (route.handler === 'login') {
      let body = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      if (!(await pinMatches(body.pin, pin))) {
        return json(401, { error: 'Wrong PIN' });
      }
      const token = await sessionToken(pin);
      return json(
        200,
        { user: { userId: 'household', userDetails: 'Household' }, token },
        { 'set-cookie': cookieHeader(request, token, 60 * 60 * 24 * 30) }
      );
    }

    if (route.handler === 'logout') {
      return json(200, { ok: true }, { 'set-cookie': cookieHeader(request, '', 0) });
    }

    const principal = await principalFromRequest(request, pin);
    if (route.auth && !principal) return json(401, { error: 'Not signed in' });

    if (route.handler === 'me') {
      return json(200, { user: principal });
    }

    let body = null;
    if (request.method === 'POST' || request.method === 'PATCH') {
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    }

    const params = url.pathname.match(route.pattern).groups || {};
    const controllers = createControllers(new D1Store(env.DB));
    try {
      const result = await controllers[route.controller]({ principal, params, body });
      return json(result.status, result.jsonBody);
    } catch (err) {
      console.error(err);
      return json(500, { error: 'Internal server error' });
    }
  },
};
