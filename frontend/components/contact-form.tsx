'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { trackEvent } from '@/lib/client/analytics';

const KINDS = [
  { value: 'question', label: 'General question' },
  { value: 'feedback', label: 'Product feedback' },
  { value: 'bug', label: 'Bug report' },
  { value: 'data-issue', label: 'Data or analytics issue' },
  { value: 'deletion-request', label: 'Data deletion request' },
] as const;

type Kind = (typeof KINDS)[number]['value'];

interface Props { initialKind?: Kind }

/** Invisible honeypot. Humans do not see or focus this field; naive bots fill it. */
function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
      <label htmlFor="website">Website (leave blank)</label>
      <input id="website" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function ContactForm({ initialKind = 'question' }: Props) {
  const router = useRouter();
  const mountedAt = useRef<number>(Date.now());
  const [form, setForm] = useState({ name: '', email: '', organisation: '', kind: initialKind, message: '', consent: false });
  const [honeypot, setHoneypot] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const set = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value })), []);

  useEffect(() => {
    if (!siteKey) return;
    const render = () => {
      const w = window as unknown as { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void } };
      const el = document.getElementById('turnstile-slot');
      if (w.turnstile && el) w.turnstile.render(el, { sitekey: siteKey, callback: (token: string) => setCaptchaToken(token), theme: 'dark' });
    };
    if ((window as unknown as { turnstile?: unknown }).turnstile) { render(); return; }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [siteKey]);

  const messageCount = useMemo(() => form.message.trim().length, [form.message]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    setBanner(null);
    try {
      const res = await fetch('/api/public/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          honeypot,
          captchaToken,
          elapsedMs: Date.now() - mountedAt.current,
          pageUrl: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      });
      const data = (await res.json()) as { ok?: boolean; reference?: string; errors?: Record<string, string>; error?: string; reason?: string };

      // Success is only ever claimed when the server confirmed it stored the message.
      if (!res.ok || !data.ok || !data.reference) {
        setErrors(data.errors ?? {});
        const reason = data.reason;
        setBanner(
          reason === 'rate_limited'
            ? 'Too many messages from this network in a short period. Please wait a few minutes, or email us directly — nothing was lost.'
            : reason === 'captcha'
              ? 'CAPTCHA verification failed. Please retry the challenge and submit again.'
              : reason === 'duplicate'
                ? 'This message looks identical to one we already received. We will reply by email.'
                : (data.error || 'Your message could not be sent. Please review the highlighted fields and try again.'),
        );
        trackEvent('form_failed', { kind: form.kind, result: reason ?? 'unknown' });
        setBusy(false);
        return;
      }

      trackEvent('form_submitted', { kind: form.kind, result: 'success' });
      router.push(`/thank-you?kind=${encodeURIComponent(form.kind)}&ref=${encodeURIComponent(data.reference)}`);
    } catch {
      setBanner('Network problem — the message was not sent. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card card-pad relative space-y-3" noValidate>
      <Honeypot value={honeypot} onChange={setHoneypot} />

      {banner && (
        <div role="alert" className="danger-note flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Your name *</span>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={80} autoComplete="name" required aria-invalid={Boolean(errors.name)} />
          {errors.name && <span className="mt-1 block text-[11px] text-danger-400">{errors.name}</span>}
        </label>
        <label className="block">
          <span className="label">Email *</span>
          <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={160} autoComplete="email" required aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="mt-1 block text-[11px] text-danger-400">{errors.email}</span>}
        </label>
        <label className="block">
          <span className="label">Organisation</span>
          <input className="input" value={form.organisation} onChange={(e) => set('organisation', e.target.value)} maxLength={120} autoComplete="organization" />
          {errors.organisation && <span className="mt-1 block text-[11px] text-danger-400">{errors.organisation}</span>}
        </label>
        <label className="block">
          <span className="label">Reason *</span>
          <select className="input" value={form.kind} onChange={(e) => set('kind', e.target.value as Kind)}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="label">Message * <span className="normal-case tracking-normal text-slateink-500">({messageCount}/2000)</span></span>
        <textarea className="input min-h-[140px] resize-y" value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={2000} required aria-invalid={Boolean(errors.message)} placeholder="What would you like to ask or report? Please avoid pasting personal data about third parties." />
        {errors.message && <span className="mt-1 block text-[11px] text-danger-400">{errors.message}</span>}
      </label>

      {siteKey && <div id="turnstile-slot" className="min-h-[65px]" />}

      <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slateink-300">
        <input type="checkbox" className="mt-0.5" checked={form.consent} onChange={(e) => set('consent', e.target.checked)} required />
        <span>
          I agree that this message and my contact details may be stored so the team can reply, as described in the{' '}
          <a href="/privacy" className="link">privacy policy</a>. I can ask for deletion at any time. *
        </span>
      </label>
      {errors.consent && <span className="block text-[11px] text-danger-400">{errors.consent}</span>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Sending…' : <><Send size={14} /> Send message</>}
        </button>
        <span className="text-[11px] text-slateink-500">Server-validated · rate limited · no data sent to third parties</span>
      </div>
    </form>
  );
}

/** Small shared success visual for the thank-you page. */
export function SuccessMark() {
  return <CheckCircle2 size={28} className="text-turf-400" />;
}
