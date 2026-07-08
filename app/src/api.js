const jsonHeaders = { 'content-type': 'application/json' };

async function request(path, options = {}) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body;
}

export const api = {
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
