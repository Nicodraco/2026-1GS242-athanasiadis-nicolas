import type { AuthState, AuthUser } from './types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

let _token: string | null = null;
let _user: AuthUser | null = null;
const listeners: Array<() => void> = [];

function loadFromStorage(): { token: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  const rawToken = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  let token: string | null = null;
  let user: AuthUser | null = null;
  if (rawToken && rawToken !== 'exists') token = rawToken;
  if (!token && rawToken === 'exists') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }
  if (rawUser) { try { user = JSON.parse(rawUser) as AuthUser; } catch { /* ignore */ } }
  return { token, user };
}

export function setAuth(token: string | null, user: AuthUser | null): void {
  _token = token;
  _user = user;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
  listeners.forEach(fn => fn());
}

export async function getFreshToken(): Promise<string | null> {
  if (_token) return _token;
  const { token } = loadFromStorage();
  if (token) _token = token;
  return _token;
}

export function updateAuthUser(partial: Partial<AuthUser>): void {
  if (_user) {
    _user = { ..._user, ...partial };
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(_user));
    }
    listeners.forEach(fn => fn());
  }
}

export function getAuth(): AuthState | null {
  if (!_token || !_user) {
    const stored = loadFromStorage();
    if (stored.token) _token = stored.token;
    if (stored.user) _user = stored.user;
  }
  if (_token && _user) return { token: _token, user: _user };
  return null;
}

export function clearAuth(): void {
  _token = null;
  _user = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  listeners.forEach(fn => fn());
}

export function onAuthChange(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
