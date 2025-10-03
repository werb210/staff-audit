import OtpBox from '@/components/OtpBox';
import { tokenStore } from '@/lib/tokenStore';
import { useLocation } from 'wouter';

export default function OtpPage() {
  const [, nav] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || '';

  async function onSubmit(code: string) {
    const r = await fetch('/api/auth/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (!r.ok) return; // show toast in your UI

    const { access, refresh } = await r.json();
    tokenStore.set(access, refresh);
    queueMicrotask(() => nav('/staff/dashboard', { replace: true }));
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-2 font-semibold">Verification Code</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter the 6-digit code sent to your phone
      </p>
      <OtpBox onSubmit={onSubmit} />
    </div>
  );
}