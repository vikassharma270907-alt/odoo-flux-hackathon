import { createContext, useContext, useEffect, useState } from 'react';
import { api, clearSession, getUser, saveSession } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  useEffect(() => {
    const out = () => { clearSession(); setUser(null); };
    window.addEventListener('bl-logout', out);
    return () => window.removeEventListener('bl-logout', out);
  }, []);
  const authenticate = async (path, body) => {
    const s = await api(path, { method: 'POST', body });
    saveSession(s); setUser(s.user); return s.user;
  };
  const value = {
    user,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    signup: (name, email, password) => authenticate('/auth/signup', { name, email, password }),
    logout: () => { clearSession(); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
