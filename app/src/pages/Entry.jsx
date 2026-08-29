import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

/**
 * Phone-first score entry. One row per player for the current round;
 * submit pushes the round and every display updates.
 */
export default function Entry() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [scores, setScores] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState('');

  useEffect(() => {
    api
      .getGame(gameId)
      .then(({ game: g }) => setGame(g))
      .catch((err) => setError(err.message));
  }, [gameId]);

  const totals = useMemo(() => {
    const map = {};
    for (const row of game?.standings ?? []) map[row.playerId] = row;
    return map;
  }, [game]);

  function applyResult(promise) {
    setBusy(true);
    setError(null);
    return promise
      .then(({ game: g }) => setGame(g))
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }

  async function submitRound(event) {
    event.preventDefault();
    const parsed = {};
    for (const player of game.players) {
      parsed[player.id] = Number(scores[player.id] ?? 0) || 0;
    }
    await applyResult(api.submitRound(game.id, parsed));
    setScores({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveTarget() {
    await applyResult(
      api.updateGame(game.id, { targetScore: targetDraft === '' ? null : Number(targetDraft) })
    );
    setEditingTarget(false);
  }

  if (error && !game) return <div className="page center-page error">{error}</div>;
  if (!game) return <div className="page center-page muted">Loading…</div>;

  const isFinished = game.status !== 'active';
  const winners = game.standings.filter((row) => game.winnerIds.includes(row.playerId));

  return (
    <div className="page narrow">
      <header className="page-header">
        <Link className="btn btn-ghost" to="/">‹ Games</Link>
        <h1 className="page-title">{game.name}</h1>
      </header>

      <div className="entry-meta">
        <span className="pill">{game.winDirection === 'highest' ? '↑ highest wins' : '↓ lowest wins'}</span>
        {editingTarget ? (
          <span className="pill target-edit">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              autoFocus
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
              placeholder="target"
            />
            <button className="btn btn-ghost icon-btn" onClick={saveTarget} disabled={busy}>✓</button>
            <button className="btn btn-ghost icon-btn" onClick={() => setEditingTarget(false)}>✕</button>
          </span>
        ) : (
          <button
            className="pill pill-btn"
            onClick={() => {
              setTargetDraft(game.targetScore ?? '');
              setEditingTarget(true);
            }}
          >
            🎯 {game.targetScore ? `${game.winDirection === 'highest' ? 'to win' : 'limit'}: ${game.targetScore}` : 'set winning score'}
          </button>
        )}
        <span className="pill">round {game.roundCount + (isFinished ? 0 : 1)}</span>
      </div>

      {(isFinished || game.thresholdReached) && (
        <div className="winner-callout">
          🏆 {winners.map((w) => w.name).join(' & ')} {winners.length > 1 ? 'win' : 'wins'}!
          {!isFinished && (
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => applyResult(api.updateGame(game.id, { status: 'finished' }))}
            >
              Finish game
            </button>
          )}
        </div>
      )}

      {!isFinished && (
        <form onSubmit={submitRound} className="round-form">
          <h2 className="section-title">Scores for round {game.roundCount + 1}</h2>
          {game.standings.map((row) => (
            <label className="score-row" key={row.playerId}>
              <span className="score-player">
                <span className="score-name">{row.name}</span>
                <span className="muted small">
                  total {row.total}
                  {row.neededLabel && ` · ${row.neededLabel}`}
                </span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                step="1"
                placeholder="0"
                value={scores[row.playerId] ?? ''}
                onChange={(e) =>
                  setScores((s) => ({ ...s, [row.playerId]: e.target.value }))
                }
              />
            </label>
          ))}
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Saving…' : `Submit round ${game.roundCount + 1}`}
          </button>
        </form>
      )}

      {game.rounds.length > 0 && (
        <section>
          <div className="history-header">
            <h2 className="section-title">Round history</h2>
            {!isFinished && (
              <button
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => applyResult(api.undoLastRound(game.id))}
              >
                ↩ Undo last
              </button>
            )}
          </div>
          <div className="table-scroll">
            <table className="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  {game.players.map((p) => (
                    <th key={p.id}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {game.rounds.map((round, i) => (
                  <tr key={i}>
                    <td className="muted">{i + 1}</td>
                    {game.players.map((p) => (
                      <td key={p.id}>{round.scores[p.id] ?? 0}</td>
                    ))}
                  </tr>
                ))}
                <tr className="totals-row">
                  <td>Σ</td>
                  {game.players.map((p) => (
                    <td key={p.id}>{totals[p.id]?.total ?? 0}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="muted small center">
        📺 Open <Link to="/display">the scoreboard display</Link> on a TV or iPad —
        it updates automatically after each round.
      </p>
    </div>
  );
}
