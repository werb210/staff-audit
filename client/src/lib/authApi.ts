export async function startLogin(email: string, password: string) {
  console.log('[AUTH-API] Starting login request to /api/auth/login');
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password })
  });
  
  console.log('[AUTH-API] Login response status:', r.status, r.statusText);
  
  // Status 202 indicates MFA required, which is success for first step
  if (r.status === 202) {
    const data = await r.json();
    console.log('[AUTH-API] Got 202 response:', data);
    return data;
  }
  
  if (!r.ok) {
    console.error('[AUTH-API] Login failed with status:', r.status);
    throw new Error('login_start_failed');
  }
  
  const data = await r.json();
  console.log('[AUTH-API] Login succeeded with data:', data);
  return data;
}

export async function verifyLogin(email: string, code: string) {
  const r = await fetch('/api/auth/login/verify', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, code })
  });
  if (!r.ok) throw new Error('login_verify_failed');
  const data = await r.json(); // {access, refresh, user}
  // Note: tokens will be set by Login component after successful verification
  return data;
}