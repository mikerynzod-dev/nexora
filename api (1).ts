import axios from 'axios';

let inMemoryAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryAuthToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryAuthToken;
}

export function getOrCreateCartSessionId(): string {
  const key = 'nexora_cart_session';
  try {
    let existing = window.localStorage.getItem(key);
    if (!existing || existing.length < 8) {
      const randomBytes = new Uint8Array(16);
      window.crypto.getRandomValues(randomBytes);
      existing = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
      window.localStorage.setItem(key, existing);
    }
    return existing;
  } catch {
    return 'nexora-session-fallback';
  }
}

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (inMemoryAuthToken) {
    config.headers.Authorization = `Bearer ${inMemoryAuthToken}`;
  }
  config.headers['x-cart-session'] = getOrCreateCartSessionId();
  return config;
});

export function extractApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.error;
    if (typeof msg === 'string' && msg.trim()) return msg;
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
