import { tokenStore } from './tokenStore';

const PUBLIC = [
  /^\/api\/auth\/login\b/,
  /^\/api\/auth\/login\/verify\b/,
  /^\/api\/auth\/refresh\b/,
  /^\/api\/twilio\/token\b/,  // Dialer token endpoint
  /^\/api\/auth\/mfa\/check\b/,  // MFA verification
];

let refreshing = false;

async function refreshOnce() {
  if (refreshing) return false;
  refreshing = true;
  try {
    const r = await fetch(`${API_BASE}/auth/refresh', { method: 'POST' });
    if (!r.ok) return false;
    const { access } = await r.json();
    tokenStore.setAccess(access);
    return true;
  } finally {
    refreshing = false;
  }
}

const origFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input.toString();
  const isPublic = PUBLIC.some((rx) => rx.test(url));
  const headers = new Headers(init.headers || {});
  const access = tokenStore.getAccess();

  if (!isPublic && access) headers.set('Authorization', `Bearer ${access}`);

  let res = await origFetch(input, { ...init, headers });

  if (!isPublic && res.status === 401 && tokenStore.getRefresh()) {
    const ok = await refreshOnce();
    if (ok) {
      const h2 = new Headers(init.headers || {});
      h2.set('Authorization', `Bearer ${tokenStore.getAccess() || ''}`);
      res = await origFetch(input, { ...init, headers: h2 });
    }
  }
  return res;
};