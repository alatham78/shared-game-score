const jsonHeaders = { 'content-type': 'application/json' };
const TOKEN_KEY = 'scorecast-token';

function authHeaders(extra = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { ...extra, authorization: `Bearer ${token}` } : extra;
}

async function request(path, options = {}) {
  const headers = authHeaders(options.headers);
  const res = await fetch(path, { credentials: 'include', ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? 'Not signed in'
        : `Request failed (${res.status})`
    );
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body;
}

export const api = {
  me: () => request('/api/me'),
  login: async (pin) => {
    const body = await request('/api/login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ pin }),
    });
    if (body.token) sessionStorage.setItem(TOKEN_KEY, body.token);
    return body;
  },
  logout: async () => {
    sessionStorage.removeItem(TOKEN_KEY);
    return request('/api/logout', { method: 'POST' });
  },
  listGames: () => request('/api/games'),
  getGame: (id) => request(`/api/games/${id}`),
  getActiveGame: () => request('/api/games/active'),
  createGame: (payload) =>
    request('/api/games', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(payload) }),
  updateGame: (id, payload) =>
    request(`/api/games/${id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(payload) }),
  submitRound: (id, scores) =>
    request(`/api/games/${id}/rounds`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ scores }),
    }),
  undoLastRound: (id) => request(`/api/games/${id}/rounds/last`, { method: 'DELETE' }),
  negotiate: () => request('/api/negotiate'),
};
