import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext({ user: undefined, login: async () => {}, logout: async () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  async function refresh() {
    try {
      const { user: next } = await api.me();
      setUser(next ?? null);
    } catch {
      setUser(null);
    }
  }

  async function login(pin) {
    const { user: next } = await api.login(pin);
    setUser(next);
  }

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
  }

  useEffect(() => {
    refresh();
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useUser() {
  return useContext(AuthContext).user;
}

export function useAuth() {
  return useContext(AuthContext);
}
