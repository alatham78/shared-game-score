export default function LoginScreen() {
  return (
    <div className="page center-page">
      <div className="login-card">
        <div className="brand-mark">🏆</div>
        <h1 className="brand-title">Scorecast</h1>
        <p className="muted">
          Keep score on your phone. Watch it live on the TV.
        </p>
        <a className="btn btn-primary btn-block" href="/login/microsoft">
          Sign in with Microsoft
        </a>
        <a className="btn btn-secondary btn-block" href="/login/github">
          Sign in with GitHub
        </a>
        <p className="muted small">
          Sign in with the same account on every device — phones enter scores,
          TVs and tablets display them.
        </p>
      </div>
    </div>
  );
}
