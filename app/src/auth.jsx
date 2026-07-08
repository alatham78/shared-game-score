import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Static Web Apps exposes the signed-in user at /.auth/me (no code needed).
 * In local dev there is no SWA in front of Vite, so we fall back to a fake
 * local user to keep the full flow working offline.
 */
const AuthContext = createContext({ user: undefined });

async function fetchUser() {
  try {
    const res = await fetch('/.auth/me', { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error('no auth endpoint');
    const data = await res.json();
    return data?.clientPrincipal ?? null;
  } catch {
    if (import.meta.env.DEV) {
      return { userId: 'local-dev-user', userDetails: 'dev@localhost', identityProvider: 'local' };
    }
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading
  useEffect(() => {
    fetchUser().then(setUser);
  }, []);
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

export function useUser() {
  return useContext(AuthContext).user;
}
