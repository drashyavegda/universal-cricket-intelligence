'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/client/api';
import { trackEvent } from '@/lib/client/analytics';
import { Alert, Button, Card, Field } from '@/components/ui';
import { CircleDot, Lock, ShieldCheck } from 'lucide-react';

interface Me { demoAccounts: { email: string; password: string; role: string }[] }

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/dashboard';
  const [email, setEmail] = useState('owner@demo.local');
  const [password, setPassword] = useState('Demo#12345');
  const [totp, setTotp] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<Me['demoAccounts']>([]);

  useEffect(() => { apiGet<Me>('/api/auth/me').then((r) => setAccounts(r.demoAccounts)).catch(() => undefined); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await apiPost('/api/auth/login', { email, password, totp: totp || undefined });
      trackEvent('sign_in', { surface: 'login', result: 'success' });
      router.push(next && next.startsWith('/') ? next : '/dashboard');
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      if (/two-factor/i.test(message)) setNeedsTotp(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-turf-400 to-turf-600 text-ink-950"><CircleDot size={20} /></div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-white">Universal Cricket Intelligence</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-turf-400">Analytics · Scouting · Auction</div>
          </div>
        </div>
        <Card title="Sign in" subtitle="Demo workspace — no external service required">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email"><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
            <Field label="Password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
            {needsTotp && <Field label="Two-factor code" hint="Enter the 6-digit TOTP code from your authenticator app."><input className="input" value={totp} onChange={(e) => setTotp(e.target.value)} inputMode="numeric" /></Field>}
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
          </form>
          <div className="mt-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-slateink-500">Demo accounts (seeded, demo-only)</div>
            {accounts.map((a) => (
              <button key={a.email} onClick={() => { setEmail(a.email); setPassword(a.password); }} className="flex w-full items-center justify-between rounded-lg border border-line bg-ink-900/60 px-2.5 py-1.5 text-left text-[11.5px] text-slateink-300 hover:border-turf-500/40">
                <span>{a.email}</span><span className="font-mono text-[10.5px] text-slateink-500">{a.role}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-slateink-500">
            <Link href="/tour" className="link">Continue as guest (read &amp; compute only)</Link>
          </div>
        </Card>
        <div className="mt-4 space-y-1.5 text-[10.5px] leading-relaxed text-slateink-500">
          <div className="flex items-center gap-1.5"><Lock size={11} /> scrypt-hashed passwords, HttpOnly session cookie, lockout after 5 failed attempts.</div>
          <div className="flex items-center gap-1.5"><ShieldCheck size={11} /> No API keys are stored in the browser. AI keys live only in server environment variables.</div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-slateink-400">Preparing sign-in…</div>}>
      <LoginForm />
    </Suspense>
  );
}
