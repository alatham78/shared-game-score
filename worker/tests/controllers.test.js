import test from 'node:test';
import assert from 'node:assert/strict';
import { createControllers } from '../src/controllers.js';
import { MemoryStore } from '../src/store.js';

const principal = { userId: 'test-user', userDetails: 'test@example.com' };
const otherPrincipal = { userId: 'other-user', userDetails: 'other@example.com' };

test('full game flow: create, score rounds, undo, finish', async (t) => {
  const controllers = createControllers(new MemoryStore());
  const created = await controllers.createGame({
    principal,
    body: { name: 'Flip 7 night', players: ['Ann', 'Ben'], winDirection: 'highest', targetScore: 200 },
  });
  assert.equal(created.status, 201);
  const game = created.jsonBody.game;
  const [ann, ben] = game.players;
  assert.equal(game.targetScore, 200);
  assert.equal(game.status, 'active');

  await t.test('active game endpoint returns it', async () => {
    const active = await controllers.getActiveGame({ principal });
    assert.equal(active.jsonBody.game.id, game.id);
  });

  await t.test('rounds accumulate and standings update', async () => {
    await controllers.submitRound({
      principal,
      params: { id: game.id },
      body: { scores: { [ann.id]: 15, [ben.id]: 32 } },
    });
    const second = await controllers.submitRound({
      principal,
      params: { id: game.id },
      body: { scores: { [ann.id]: 40, [ben.id]: 2 } },
    });
    const updated = second.jsonBody.game;
    assert.equal(updated.roundCount, 2);
    assert.deepEqual(
      updated.standings.map((r) => [r.name, r.total]),
      [
        ['Ann', 55],
        ['Ben', 34],
      ]
    );
    assert.deepEqual(updated.leaderIds, [ann.id]);
  });

  await t.test('undo removes the last round', async () => {
    const undone = await controllers.undoLastRound({ principal, params: { id: game.id } });
    assert.equal(undone.jsonBody.game.roundCount, 1);
  });

  await t.test('missing players default to 0 for the round', async () => {
    const result = await controllers.submitRound({
      principal,
      params: { id: game.id },
      body: { scores: { [ann.id]: 7 } },
    });
    const totals = Object.fromEntries(result.jsonBody.game.standings.map((r) => [r.name, r.total]));
    assert.equal(totals.Ann, 22);
    assert.equal(totals.Ben, 32);
  });

  await t.test('finishing blocks further rounds', async () => {
    await controllers.updateGame({ principal, params: { id: game.id }, body: { status: 'finished' } });
    const rejected = await controllers.submitRound({
      principal,
      params: { id: game.id },
      body: { scores: { [ann.id]: 1, [ben.id]: 1 } },
    });
    assert.equal(rejected.status, 400);
  });
});

test('validation: rejects bad input', async () => {
  const controllers = createControllers(new MemoryStore());
  const onePlayer = await controllers.createGame({ principal, body: { players: ['Solo'] } });
  assert.equal(onePlayer.status, 400);

  const badTarget = await controllers.createGame({
    principal,
    body: { players: ['A', 'B'], targetScore: -5 },
  });
  assert.equal(badTarget.status, 400);

  const created = await controllers.createGame({ principal, body: { players: ['A', 'B'] } });
  const badScore = await controllers.submitRound({
    principal,
    params: { id: created.jsonBody.game.id },
    body: { scores: { [created.jsonBody.game.players[0].id]: 'abc' } },
  });
  assert.equal(badScore.status, 400);
});

test('games are isolated per user', async () => {
  const controllers = createControllers(new MemoryStore());
  const created = await controllers.createGame({
    principal,
    body: { players: ['A', 'B'] },
  });
  const stolen = await controllers.getGame({
    principal: otherPrincipal,
    params: { id: created.jsonBody.game.id },
  });
  assert.equal(stolen.status, 404);

  const list = await controllers.listGames({ principal: otherPrincipal });
  assert.equal(list.jsonBody.games.length, 0);
});

test('scoreboard keeps a finished game when nothing else is in progress', async () => {
  const controllers = createControllers(new MemoryStore());
  const created = await controllers.createGame({
    principal,
    body: { players: ['A', 'B'] },
  });
  await controllers.updateGame({
    principal,
    params: { id: created.jsonBody.game.id },
    body: { status: 'finished' },
  });
  const shown = await controllers.getActiveGame({ principal });
  assert.equal(shown.jsonBody.game.id, created.jsonBody.game.id);
  assert.equal(shown.jsonBody.game.status, 'finished');

  const next = await controllers.createGame({
    principal,
    body: { players: ['C', 'D'] },
  });
  const preferred = await controllers.getActiveGame({ principal });
  assert.equal(preferred.jsonBody.game.id, next.jsonBody.game.id);
  assert.equal(preferred.jsonBody.game.status, 'active');
});

test('negotiate falls back to polling', async () => {
  const controllers = createControllers(new MemoryStore());
  const result = await controllers.negotiateRealtime({ principal });
  assert.equal(result.jsonBody.url, null);
  assert.equal(result.jsonBody.pollIntervalMs, 4000);
});
