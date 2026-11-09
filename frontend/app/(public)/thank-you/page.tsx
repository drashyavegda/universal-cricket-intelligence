import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Home, MessageSquare } from 'lucide-react';
import { publicEntry } from '@/lib/site';

const entry = publicEntry('/thank-you')!;
export const metadata: Metadata = {
  title: entry.title,
  description: entry.description,
  alternates: { canonical: '/thank-you' },
  // Confirmation pages carry no search value and would be indexed as thin content.
  robots: { index: false, follow: false },
};

const LABELS: Record<string, string> = {
  question: 'general question',
  feedback: 'product feedback',
  bug: 'bug report',
  'data-issue': 'data or analytics issue',
  'deletion-request': 'data deletion request',
};

const REF_PATTERN = /^FB-[A-Z0-9]{6}$/;

export default function ThankYouPage({ searchParams }: { searchParams: { ref?: string; kind?: string; status?: string } }) {
  const ref = String(searchParams.ref ?? '');
  const kind = String(searchParams.kind ?? '');
  const failed = searchParams.status === 'failed';
  const confirmed = REF_PATTERN.test(ref);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <div className="card card-pad">
        {failed ? (
          <div className="flex items-start gap-3">
            <AlertTriangle size={26} className="mt-0.5 shrink-0 text-danger-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Your message was not sent</h1>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slateink-300">
                The submission failed, so nothing was stored and there is nothing to confirm. Nothing you typed is lost while
                this page stays open — use the button below to go back and retry, or email us directly.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/contact" className="btn-primary"><MessageSquare size={13} /> Back to the form</Link>
                <Link href="/" className="btn-ghost"><Home size={13} /> Home</Link>
              </div>
            </div>
          </div>
        ) : confirmed ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 size={26} className="mt-0.5 shrink-0 text-turf-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Thank you — your message is in</h1>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slateink-300">
                We stored your {LABELS[kind] ?? 'message'} and queued it for review. Quote the reference below if you follow up.
              </p>
              <div className="mt-3 rounded-lg border border-line/70 bg-ink-900/60 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slateink-500">Reference</div>
                <div className="font-mono text-[13.5px] text-turf-300">{ref}</div>
              </div>
              <ol className="mt-4 space-y-1.5 text-[11.5px] leading-relaxed text-slateink-400">
                <li>1. The message appears in the workspace inbox for the platform team.</li>
                <li>2. A reply goes to the email address you supplied.</li>
                <li>3. Deletion requests are actioned against the application store; provider backups follow their own retention schedule.</li>
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/faq" className="btn-ghost">Browse the FAQ</Link>
                <Link href="/dashboard" className="btn-primary">Open the workspace <ArrowRight size={13} /></Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <MessageSquare size={26} className="mt-0.5 shrink-0 text-slateink-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Nothing to confirm yet</h1>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slateink-300">
                This page only shows a confirmation after a message has genuinely been stored — there is no reference in this
                link, so we cannot claim a submission succeeded. If you meant to send us something, the form takes under a minute.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/contact" className="btn-primary">Open the contact form</Link>
                <Link href="/" className="btn-ghost"><Home size={13} /> Home</Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-line/60 pt-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slateink-500">Where to go next</h2>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {[
              { href: '/', label: 'Platform overview' },
              { href: '/tour', label: 'All 30 modules' },
              { href: '/faq', label: 'FAQ' },
              { href: '/privacy', label: 'Privacy policy' },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg border border-line/70 bg-ink-900/50 px-3 py-2 text-[12px] text-slateink-200 hover:border-turf-500/50 hover:text-white">{l.label}</Link>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-slateink-500">
        Pages like this one are excluded from search indexes — <Link href="/robots.txt" className="hover:text-white">see robots.txt</Link>.
      </p>
    </div>
  );
}
