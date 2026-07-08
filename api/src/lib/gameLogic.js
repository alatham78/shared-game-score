'use strict';

/**
 * Pure scoring logic shared by the API endpoints.
 *
 * A game looks like:
 * {
 *   id, userId, name,
 *   winDirection: 'highest' | 'lowest',
 *   targetScore: number | null,
 *   players: [{ id, name }],
 *   rounds: [{ scores: { [playerId]: number }, enteredAt }],
 *   status: 'active' | 'finished',
 *   createdAt, updatedAt
 * }
 */

function totalsByPlayer(game) {
  const totals = {};
  for (const player of game.players) totals[player.id] = 0;
  for (const round of game.rounds) {
    for (const [playerId, score] of Object.entries(round.scores)) {
      if (playerId in totals) totals[playerId] += Number(score) || 0;
    }
  }
  return totals;
}

/**
 * Returns players sorted best-first for the game's win direction, with
 * dense ranks (ties share a rank) and, when a target score is set, the
 * points each player still needs before reaching it.
 */
function standings(game) {
  const totals = totalsByPlayer(game);
  const direction = game.winDirection === 'lowest' ? 1 : -1;
  const rows = game.players.map((player) => ({
    playerId: player.id,
    name: player.name,
    total: totals[player.id],
  }));
  rows.sort((a, b) => direction * (a.total - b.total) || a.name.localeCompare(b.name));

  let rank = 0;
  let prevTotal = null;
  for (const row of rows) {
    if (row.total !== prevTotal) {
      rank += 1;
      prevTotal = row.total;
    }
    row.rank = rank;
    if (typeof game.targetScore === 'number') {
      row.needed = Math.max(0, game.targetScore - row.total);
    }
  }
  return rows;
}

/** Ids of the player(s) currently in first place. */
function leaderIds(game) {
  const rows = standings(game);
  if (rows.length === 0 || game.rounds.length === 0) return [];
  return rows.filter((row) => row.rank === 1).map((row) => row.playerId);
}

/**
 * A target score ends the game once any player reaches it. For
 * highest-wins games the best total wins; for lowest-wins games (e.g.
 * Mexican Train scored with a limit) the lowest total wins when someone
 * busts the limit.
 */
function thresholdReached(game) {
  if (typeof game.targetScore !== 'number') return false;
  const totals = totalsByPlayer(game);
  return Object.values(totals).some((total) => total >= game.targetScore);
}

/** Winner ids when the game is over (by threshold or explicit finish). */
function winnerIds(game) {
  if (game.status !== 'finished' && !thresholdReached(game)) return [];
  return leaderIds(game);
}

/** Adds derived, read-only fields the clients render from. */
function withDerived(game) {
  return {
    ...game,
    standings: standings(game),
    leaderIds: leaderIds(game),
    thresholdReached: thresholdReached(game),
    winnerIds: winnerIds(game),
    roundCount: game.rounds.length,
  };
}

module.exports = { totalsByPlayer, standings, leaderIds, thresholdReached, winnerIds, withDerived };
