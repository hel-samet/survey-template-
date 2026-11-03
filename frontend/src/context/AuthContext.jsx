import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { AUTH_LOGOUT_EVENT } from '../services/api.js';
import { authService } from '../services/authService.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());

  // api.js fires this event when the server rejects an expired token.
  useEffect(() => {
    const handleLogout = () => setUser(null);
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
  }, []);

  const login = useCallback(async (username, password, captchaToken) => {
    const loggedIn = await authService.login(username, password, captchaToken);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
