import { useState } from 'react';
import { useAuth } from '../auth.jsx';

export default function LoginScreen() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(pin);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page center-page">
      <div className="login-card">
        <div className="brand-mark">🏆</div>
        <h1 className="brand-title">Scorecast</h1>
        <p className="muted">
          Keep score on your phone. Watch it live on the TV.
        </p>
        <form onSubmit={submit} className="form">
          <label className="field">
            <span className="field-label">Household PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter the shared PIN"
              autoFocus
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy || !pin}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted small">
          Use the same PIN on every device — phones enter scores, TVs and tablets
          display them.
        </p>
      </div>
    </div>
  );
}
