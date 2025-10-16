import { useEffect, useRef, useState } from 'react';

export default function OtpBox({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const go = (s: string) => { if (s.length === 6) onSubmit(s); };

  return (
    <input
      ref={ref}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      placeholder="Enter 6-digit code"
      value={v}
      onChange={(e) => {
        const s = e.target.value.replace(/\D/g, '').slice(0, 6);
        setV(s); go(s);
      }}
      onPaste={(e) => {
        const s = (e.clipboardData.getData('Text') || '').replace(/\D/g, '').slice(0, 6);
        e.preventDefault(); setV(s); go(s);
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') go(v); }}
      className="w-full rounded-md border px-3 py-2 text-center text-lg tracking-[0.4em]"
    />
  );
}