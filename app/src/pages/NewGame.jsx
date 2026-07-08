import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function NewGame() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [players, setPlayers] = useState(['', '']);
  const [winDirection, setWinDirection] = useState('highest');
  const [targetScore, setTargetScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setPlayer = (index, value) =>
    setPlayers((list) => list.map((p, i) => (i === index ? value : p)));

  const removePlayer = (index) =>
    setPlayers((list) => list.filter((_, i) => i !== index));

  async function create(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { game } = await api.createGame({
        name: name || 'Game night',
        players: players.map((p) => p.trim()).filter(Boolean),
        winDirection,
        targetScore: targetScore === '' ? null : Number(targetScore),
      });
      navigate(`/entry/${game.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="page narrow">
      <header className="page-header">
        <Link className="btn btn-ghost" to="/">‹ Back</Link>
        <h1 className="page-title">New game</h1>
      </header>

      <form onSubmit={create} className="form">
        <label className="field">
          <span className="field-label">Game name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Flip 7, Mexican Train…"
            maxLength={40}
          />
        </label>

        <div className="field">
          <span className="field-label">Players</span>
          {players.map((player, index) => (
            <div className="player-input-row" key={index}>
              <input
                value={player}
                onChange={(e) => setPlayer(index, e.target.value)}
                placeholder={`Player ${index + 1}`}
                maxLength={40}
                autoComplete="off"
              />
              {players.length > 2 && (
                <button
                  type="button"
                  className="btn btn-ghost icon-btn"
                  aria-label={`Remove player ${index + 1}`}
                  onClick={() => removePlayer(index)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {players.length < 12 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPlayers((list) => [...list, ''])}
            >
              + Add player
            </button>
          )}
        </div>

        <div className="field">
          <span className="field-label">Who wins?</span>
          <div className="segmented">
            <button
              type="button"
              className={winDirection === 'highest' ? 'on' : ''}
              onClick={() => setWinDirection('highest')}
            >
              Highest score
              <small>Flip 7, Yahtzee…</small>
            </button>
            <button
              type="button"
              className={winDirection === 'lowest' ? 'on' : ''}
              onClick={() => setWinDirection('lowest')}
            >
              Lowest score
              <small>Mexican Train, Hearts…</small>
            </button>
          </div>
        </div>

        <label className="field">
          <span className="field-label">
            {winDirection === 'highest' ? 'Winning score (optional)' : 'Score limit (optional)'}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            placeholder={winDirection === 'highest' ? 'e.g. 200 — first to reach it wins' : 'e.g. 100 — game ends when reached, lowest wins'}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary btn-block" disabled={saving}>
          {saving ? 'Creating…' : 'Start game'}
        </button>
      </form>
    </div>
  );
}
