import type { AuthState, BroadcastState, RankingEntry, Item } from './types';
import { getFreshToken } from './auth';

const URLS = {
  AUTH: (import.meta as any).env?.VITE_AUTH_URL ?? 'http://localhost:4001',
  GAME: (import.meta as any).env?.VITE_GAME_URL ?? 'http://localhost:4002',
  MARKET: (import.meta as any).env?.VITE_MARKETPLACE_URL ?? 'http://localhost:4004',
  RANKING: (import.meta as any).env?.VITE_RANKING_URL ?? 'http://localhost:4005',
};

interface ReqOpts {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function req<T = unknown>(url: string, opts: ReqOpts = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth) {
    const token = await getFreshToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'error' in data && (data as { error: string }).error) || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

interface AuthResp {
  token: string;
  user: AuthState['user'];
}

export const api = {
  register: (b: { username: string; email: string; password: string }) =>
    req<AuthResp>(`${URLS.AUTH}/auth/register`, { method: 'POST', body: b }),

  login: (b: { email: string; password: string }) =>
    req<AuthResp>(`${URLS.AUTH}/auth/login`, { method: 'POST', body: b }),

  newGame: (vsAi: boolean) =>
    req<{ gameId: string }>(`${URLS.GAME}/game`, { method: 'POST', body: { vsAi }, auth: true }),

  getGame: (id: string) => req<BroadcastState>(`${URLS.GAME}/game/${id}`),

  joinGame: (id: string) =>
    req<{ joined: true }>(`${URLS.GAME}/game/${id}/join`, { method: 'POST', auth: true }),

  items: () => req<{ items: Item[] }>(`${URLS.MARKET}/marketplace/items`),

  userItems: (userId: string) =>
    req<{ items: Item[] }>(`${URLS.MARKET}/marketplace/user/${userId}/items`),

  createCheckoutSession: (itemId: number) =>
    req<{ url?: string; success?: boolean; message?: string }>(
      `${URLS.MARKET}/marketplace/create-checkout-session`,
      { method: 'POST', body: { itemId }, auth: true }
    ),

  confirmPurchase: (sessionId: string) =>
    req<{ success: boolean; message?: string }>(
      `${URLS.MARKET}/marketplace/confirm-purchase`,
      { method: 'POST', body: { sessionId }, auth: true }
    ),

  setActiveSkin: (skinId: number | null) =>
    req<{ success: boolean }>(
      `${URLS.MARKET}/marketplace/user/active-skin`,
      { method: 'PATCH', body: { skinId }, auth: true }
    ),

  ranking: (limit = 20) =>
    req<{ ranking: RankingEntry[] }>(`${URLS.RANKING}/ranking?limit=${limit}`),
};
