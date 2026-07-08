'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { standings, leaderIds, thresholdReached, winnerIds } = require('../src/lib/gameLogic');

function makeGame(overrides = {}) {
  return {
    id: 'g1',
    userId: 'u1',
    name: 'Test',
    winDirection: 'highest',
    targetScore: null,
    players: [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
      { id: 'c', name: 'Carol' },
    ],
    rounds: [],
    status: 'active',
    ...overrides,
  };
}

test('standings sort highest-first for highest-wins games', () => {
  const game = makeGame({
    rounds: [{ scores: { a: 10, b: 25, c: 5 } }, { scores: { a: 30, b: 5, c: 5 } }],
  });
  const rows = standings(game);
  assert.deepEqual(
    rows.map((r) => [r.name, r.total, r.rank]),
    [
      ['Alice', 40, 1],
      ['Bob', 30, 2],
      ['Carol', 10, 3],
    ]
  );
});

test('standings sort lowest-first for lowest-wins games (Mexican Train)', () => {
  const game = makeGame({
    winDirection: 'lowest',
    rounds: [{ scores: { a: 12, b: 0, c: 33 } }],
  });
  const rows = standings(game);
  assert.deepEqual(
    rows.map((r) => r.name),
    ['Bob', 'Alice', 'Carol']
  );
  assert.equal(rows[0].rank, 1);
});

test('tied players share a rank', () => {
  const game = makeGame({ rounds: [{ scores: { a: 10, b: 10, c: 3 } }] });
  const rows = standings(game);
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[1].rank, 1);
  assert.equal(rows[2].rank, 2);
  assert.deepEqual(leaderIds(game).sort(), ['a', 'b']);
});

test('no leader before any round is scored', () => {
  assert.deepEqual(leaderIds(makeGame()), []);
});

test('needed points appear only when a target score is set', () => {
  const noTarget = standings(makeGame({ rounds: [{ scores: { a: 10, b: 0, c: 0 } }] }));
  assert.equal(noTarget[0].needed, undefined);

  const withTarget = standings(
    makeGame({ targetScore: 200, rounds: [{ scores: { a: 150, b: 220, c: 0 } }] })
  );
  const byName = Object.fromEntries(withTarget.map((r) => [r.name, r.needed]));
  assert.equal(byName.Alice, 50);
  assert.equal(byName.Bob, 0); // already past the target — never negative
  assert.equal(byName.Carol, 200);
});

test('threshold ends a highest-wins game with the top score winning', () => {
  const game = makeGame({
    targetScore: 200,
    rounds: [{ scores: { a: 150, b: 210, c: 100 } }],
  });
  assert.equal(thresholdReached(game), true);
  assert.deepEqual(winnerIds(game), ['b']);
});

test('threshold ends a lowest-wins game with the LOWEST score winning', () => {
  const game = makeGame({
    winDirection: 'lowest',
    targetScore: 100,
    rounds: [{ scores: { a: 40, b: 105, c: 80 } }],
  });
  assert.equal(thresholdReached(game), true);
  assert.deepEqual(winnerIds(game), ['a']);
});

test('no winner while an active game is under the threshold', () => {
  const game = makeGame({ targetScore: 500, rounds: [{ scores: { a: 10, b: 20, c: 30 } }] });
  assert.equal(thresholdReached(game), false);
  assert.deepEqual(winnerIds(game), []);
});

test('explicitly finished game has a winner even without a threshold', () => {
  const game = makeGame({ status: 'finished', rounds: [{ scores: { a: 10, b: 20, c: 30 } }] });
  assert.deepEqual(winnerIds(game), ['c']);
});
