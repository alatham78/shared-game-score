import { useUser } from '../auth.jsx';
import LoginScreen from './LoginScreen.jsx';

/** Blocks /new and /entry until SWA (or local-dev) auth has resolved. */
export default function RequireAuth({ children }) {
  const user = useUser();
  if (user === undefined) return <div className="page center-page muted">Loading…</div>;
  if (user === null) return <LoginScreen />;
  return children;
}
