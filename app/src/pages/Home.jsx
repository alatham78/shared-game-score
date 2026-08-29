import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../auth.jsx';
import { api } from '../api';
import LoginScreen from '../components/LoginScreen.jsx';

export default function Home() {
  const user = useUser();
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    api
      .listGames()
      .then(({ games: list }) => setGames(list))
      .catch((err) => setError(err.message));
  }, [user]);

  if (user === undefined) return <div className="page center-page muted">Loading…</div>;
  if (user === null) return <LoginScreen />;

  const activeGames = (games || []).filter((g) => g.status === 'active');
  const finishedGames = (games || []).filter((g) => g.status !== 'active');

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="brand-title small-title">🏆 Scorecast</h1>
        <div className="header-actions">
          <span className="muted small">{user.userDetails}</span>
          {user.identityProvider !== 'local' && (
            <a className="btn btn-ghost" href="/logout">
              Sign out
            </a>
          )}
        </div>
      </header>

      <div className="role-cards">
        <Link to="/new" className="role-card">
          <span className="role-icon">✍️</span>
          <span className="role-name">New game</span>
          <span className="muted small">Set up players on your phone</span>
        </Link>
        <Link to="/display" className="role-card">
          <span className="role-icon">📺</span>
          <span className="role-name">Scoreboard display</span>
          <span className="muted small">Open this on the TV or iPad</span>
        </Link>
      </div>

      {error && <p className="error">{error}</p>}

      {activeGames.length > 0 && (
        <section>
          <h2 className="section-title">In progress</h2>
          <ul className="game-list">
            {activeGames.map((game) => (
              <li key={game.id}>
                <Link className="game-row" to={`/entry/${game.id}`}>
                  <span className="game-name">{game.name}</span>
                  <span className="muted small">
                    {game.players.map((p) => p.name).join(', ')} · round {game.roundCount}
                  </span>
                  <span className="chev">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {finishedGames.length > 0 && (
        <section>
          <h2 className="section-title">Finished</h2>
          <ul className="game-list">
            {finishedGames.map((game) => (
              <li key={game.id}>
                <Link className="game-row finished" to={`/entry/${game.id}`}>
                  <span className="game-name">{game.name}</span>
                  <span className="muted small">
                    won by{' '}
                    {game.standings
                      .filter((row) => game.winnerIds.includes(row.playerId))
                      .map((row) => row.name)
                      .join(' & ') || '—'}
                  </span>
                  <span className="chev">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {games && games.length === 0 && (
        <p className="muted center">No games yet — start one!</p>
      )}
    </div>
  );
}
