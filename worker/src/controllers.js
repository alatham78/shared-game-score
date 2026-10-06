import gameLogic from '../../api/src/lib/gameLogic.js';
import { newId } from './store.js';

const { withDerived } = gameLogic;

const MAX_PLAYERS = 12;
const MAX_NAME_LENGTH = 40;

function badRequest(message) {
  return { status: 400, jsonBody: { error: message } };
}

function notFound() {
  return { status: 404, jsonBody: { error: 'Game not found' } };
}

function cleanName(value) {
  return String(value ?? '').trim().slice(0, MAX_NAME_LENGTH);
}

function parseTargetScore(value) {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return { ok: false };
  return { ok: true, value: Math.round(num) };
}

export function createControllers(store) {
  async function listGames({ principal }) {
    const games = await store.listGames(principal.userId);
    return { status: 200, jsonBody: { games: games.map(withDerived) } };
  }

  async function createGame({ principal, body }) {
    const name = cleanName(body?.name) || 'Game night';
    const winDirection = body?.winDirection === 'lowest' ? 'lowest' : 'highest';

    const playerNames = (Array.isArray(body?.players) ? body.players : [])
      .map(cleanName)
      .filter(Boolean);
    if (playerNames.length < 2) return badRequest('A game needs at least 2 players');
    if (playerNames.length > MAX_PLAYERS) return badRequest(`Maximum ${MAX_PLAYERS} players`);

    const target = parseTargetScore(body?.targetScore);
    if (!target.ok) return badRequest('Winning score must be a positive number');

    const now = new Date().toISOString();
    const game = {
      id: newId(),
      userId: principal.userId,
      name,
      winDirection,
      targetScore: target.value,
      players: playerNames.map((playerName) => ({ id: newId(), name: playerName })),
      rounds: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    const created = await store.createGame(game);
    return { status: 201, jsonBody: { game: withDerived(created) } };
  }

  async function getActiveGame({ principal }) {
    const game = await store.getActiveGame(principal.userId);
    return { status: 200, jsonBody: { game: game ? withDerived(game) : null } };
  }

  async function getGame({ principal, params }) {
    const game = await store.getGame(principal.userId, params.id);
    if (!game) return notFound();
    return { status: 200, jsonBody: { game: withDerived(game) } };
  }

  async function updateGame({ principal, params, body }) {
    const game = await store.getGame(principal.userId, params.id);
    if (!game) return notFound();

    if ('targetScore' in (body || {})) {
      const target = parseTargetScore(body.targetScore);
      if (!target.ok) return badRequest('Winning score must be a positive number');
      game.targetScore = target.value;
    }
    if ('name' in (body || {})) {
      const name = cleanName(body.name);
      if (!name) return badRequest('Name cannot be empty');
      game.name = name;
    }
    if ('status' in (body || {})) {
      if (!['active', 'finished'].includes(body.status)) return badRequest('Invalid status');
      game.status = body.status;
    }

    game.updatedAt = new Date().toISOString();
    const updated = await store.updateGame(game);
    return { status: 200, jsonBody: { game: withDerived(updated) } };
  }

  async function submitRound({ principal, params, body }) {
    const game = await store.getGame(principal.userId, params.id);
    if (!game) return notFound();
    if (game.status !== 'active') return badRequest('Game is finished');

    const rawScores = body?.scores;
    if (!rawScores || typeof rawScores !== 'object') return badRequest('scores is required');

    const scores = {};
    for (const player of game.players) {
      const value = Number(rawScores[player.id] ?? 0);
      if (!Number.isFinite(value)) return badRequest(`Invalid score for ${player.name}`);
      scores[player.id] = Math.round(value);
    }

    game.rounds.push({ scores, enteredAt: new Date().toISOString() });
    game.updatedAt = new Date().toISOString();
    const updated = await store.updateGame(game);
    return { status: 200, jsonBody: { game: withDerived(updated) } };
  }

  async function undoLastRound({ principal, params }) {
    const game = await store.getGame(principal.userId, params.id);
    if (!game) return notFound();
    if (game.rounds.length === 0) return badRequest('No rounds to undo');

    game.rounds.pop();
    game.updatedAt = new Date().toISOString();
    const updated = await store.updateGame(game);
    return { status: 200, jsonBody: { game: withDerived(updated) } };
  }

  async function negotiateRealtime() {
    return { status: 200, jsonBody: { url: null, pollIntervalMs: 4000 } };
  }

  return {
    listGames,
    createGame,
    getActiveGame,
    getGame,
    updateGame,
    submitRound,
    undoLastRound,
    negotiateRealtime,
  };
}
