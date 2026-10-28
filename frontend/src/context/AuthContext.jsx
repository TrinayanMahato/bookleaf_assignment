import { useCallback, useEffect, useMemo, useState } from 'react';
import { loginAdmin, loginAuthor } from '../api/auth.api';
import { sessionStore, tokenStore, UNAUTHORIZED_EVENT } from '../api/client';
import { decodeToken, isTokenExpired } from '../utils/jwt';

const USER_KEY = 'bookleaf.user';
import AuthContext from './auth-context';

// Restores a saved session only if the token is still valid and its role matches the saved user.
const restoreSession = () => {
  const token = tokenStore.get();
  const payload = token && decodeToken(token);
  let user = null;
  try {
    user = JSON.parse(sessionStore.get(USER_KEY));
  } catch {
    /* corrupted entry: treat as logged out */
  }
  if (!payload || isTokenExpired(payload) || !user || user.role !== payload.role) {
    tokenStore.clear();
    sessionStore.remove(USER_KEY);
    return { token: null, user: null };
  }
  return { token, user };
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(restoreSession);

  const logout = useCallback(() => {
    tokenStore.clear();
    sessionStore.remove(USER_KEY);
    setSession({ token: null, user: null });
  }, []);

  const login = useCallback(async (role, credentials) => {
    const { token, user } = await (role === 'admin' ? loginAdmin(credentials) : loginAuthor(credentials));
    tokenStore.set(token);
    sessionStore.set(USER_KEY, JSON.stringify(user));
    setSession({ token, user });
    return user;
  }, []);

  // Any 401 from the API (expired or revoked token) ends the session.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  // Log out exactly when the token expires, even if the user is idle.
  useEffect(() => {
    const exp = session.token && decodeToken(session.token)?.exp;
    if (!exp) return undefined;
    const timer = setTimeout(logout, exp * 1000 - Date.now());
    return () => clearTimeout(timer);
  }, [session.token, logout]);

  const value = useMemo(() => ({ ...session, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
