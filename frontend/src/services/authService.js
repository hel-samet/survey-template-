import { api, tokenStore } from './api.js';

function decodeToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export const authService = {
  async login(username, password) {
    const { data } = await api.post('/auth/login', { username, password });
    tokenStore.set(data.token);
    return data.user;
  },

  logout() {
    tokenStore.clear();
  },

  // Reads the stored JWT; returns null when missing or expired.
  getCurrentUser() {
    const token = tokenStore.get();
    if (!token) return null;

    const payload = decodeToken(token);
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
      tokenStore.clear();
      return null;
    }
    return { username: payload.sub };
  },
};
