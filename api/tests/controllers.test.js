'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Point the file store at a temp dir before the store module is loaded.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'scoreboard-test-'));
delete process.env.COSMOS_CONNECTION_STRING;
delete process.env.WEBPUBSUB_CONNECTION_STRING;

const controllers = require('../src/lib/controllers');

const principal = { userId: 'test-user', userDetails: 'test@example.com' };
const otherPrincipal = { userId: 'other-user', userDetails: 'other@example.com' };

test('full game flow: create, score rounds, undo, finish', async (t) => {
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

test('negotiate falls back to polling when Web PubSub is not configured', async () => {
  const result = await controllers.negotiateRealtime({ principal });
  assert.equal(result.jsonBody.url, null);
  assert.equal(result.jsonBody.pollIntervalMs, 4000);
});
