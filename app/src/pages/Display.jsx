import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../auth.jsx';
import { useLiveGame } from '../useLiveGame';
import Confetti from '../components/Confetti.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Read-only scoreboard for TVs and tablets. Auto-follows the account's
 * active game, animates rank changes, and celebrates leader changes
 * and the eventual winner with confetti.
 */
export default function Display() {
  const user = useUser();
  const { game, connected } = useLiveGame();
  const [burst, setBurst] = useState(0);
  const [celebrating, setCelebrating] = useState(null); // playerId taking the lead
  const prevRef = useRef({ gameId: null, leaderIds: [], roundCount: 0 });

  useEffect(() => {
    if (!game) return;
    const prev = prevRef.current;
    const sameGame = prev.gameId === game.id;
    const leadersChanged =
      game.leaderIds.length > 0 &&
      (game.leaderIds.length !== prev.leaderIds.length ||
        game.leaderIds.some((id) => !prev.leaderIds.includes(id)));

    if (sameGame && prev.roundCount > 0 && game.roundCount > prev.roundCount && leadersChanged) {
      setBurst((b) => b + 1);
      setCelebrating(game.leaderIds[0]);
      const timer = setTimeout(() => setCelebrating(null), 3000);
      prevRef.current = { gameId: game.id, leaderIds: game.leaderIds, roundCount: game.roundCount };
      return () => clearTimeout(timer);
    }
    prevRef.current = { gameId: game.id, leaderIds: game.leaderIds, roundCount: game.roundCount };
  }, [game]);

  if (user === null) {
    return (
      <div className="display-root center-page">
        <p className="display-empty">
          Please <Link to="/">sign in</Link> to show the scoreboard.
        </p>
      </div>
    );
  }
  if (game === undefined || user === undefined) {
    return <div className="display-root center-page display-empty">Loading…</div>;
  }
  if (game === null) {
    return (
      <div className="display-root center-page">
        <div className="display-empty">
          <div className="brand-mark">🏆</div>
          <h1>Waiting for a game…</h1>
          <p className="muted">Start one from your phone and it will appear here.</p>
        </div>
      </div>
    );
  }

  const gameOver = game.status === 'finished' || game.thresholdReached;
  const winners = game.standings.filter((row) => game.winnerIds.includes(row.playerId));
  const rowCount = game.standings.length;
  const rowHeight = Math.max(
    64,
    Math.min(150, Math.floor((window.innerHeight - 170) / Math.max(rowCount, 1)))
  );

  return (
    <div className="display-root">
      <Confetti burst={burst} rain={gameOver} />

      <header className="display-header">
        <h1 className="display-title">{game.name}</h1>
        <div className="display-meta">
          {game.targetScore && (
            <span className="pill">
              🎯 {game.winDirection === 'highest' ? 'first to' : 'limit'} {game.targetScore}
            </span>
          )}
          <span className="pill">
            {gameOver ? 'final' : `round ${game.roundCount}`}
          </span>
          <span className={`live-dot ${connected ? 'live' : ''}`} title={connected ? 'live' : 'refreshing'} />
        </div>
      </header>

      {gameOver && winners.length > 0 && (
        <div className="winner-banner">
          🏆 {winners.map((w) => w.name).join(' & ')} {winners.length > 1 ? 'win!' : 'wins!'}
        </div>
      )}

      <div className="board" style={{ height: rowCount * rowHeight }}>
        {game.standings.map((row, index) => {
          const isLeader = game.leaderIds.includes(row.playerId) && game.roundCount > 0;
          const isWinner = gameOver && game.winnerIds.includes(row.playerId);
          const classes = [
            'board-row',
            isLeader ? 'leader' : '',
            isWinner ? 'winner' : '',
            celebrating === row.playerId ? 'celebrating' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={row.playerId}
              className={classes}
              style={{
                transform: `translateY(${index * rowHeight}px)`,
                height: rowHeight - 10,
              }}
            >
              <span className="board-rank">
                {isLeader && game.roundCount > 0 ? '👑' : MEDALS[row.rank - 1] || row.rank}
              </span>
              <span className="board-name">{row.name}</span>
              {typeof row.needed === 'number' && !gameOver && (
                <span className="board-needed">
                  {row.needed === 0
                    ? game.winDirection === 'highest'
                      ? 'made it!'
                      : 'over the limit'
                    : `needs ${row.needed}`}
                </span>
              )}
              <span className="board-score">
                <AnimatedNumber value={row.total} />
              </span>
            </div>
          );
        })}
      </div>

      <footer className="display-footer muted small">
        {game.winDirection === 'highest' ? 'highest score wins' : 'lowest score wins'} · scores update
        automatically
      </footer>
    </div>
  );
}
