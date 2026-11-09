import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Lock, Mail, ShieldCheck } from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { SITE, publicEntry, ogFor, twitterFor } from '@/lib/site';

const entry = publicEntry('/contact')!;
export const metadata: Metadata = {
  title: entry.title,
  description: entry.description,
  alternates: { canonical: '/contact' },
  openGraph: ogFor(entry, 'article'),
  twitter: twitterFor(entry),
};

const VALID_KINDS = ['question', 'feedback', 'bug', 'data-issue', 'deletion-request'] as const;

export default function ContactPage({ searchParams }: { searchParams: { kind?: string } }) {
  const requested = String(searchParams.kind ?? '');
  const initialKind = (VALID_KINDS as readonly string[]).includes(requested) ? (requested as (typeof VALID_KINDS)[number]) : 'question';

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-[11.5px] text-slateink-500">
        <Link href="/" className="hover:text-white">Home</Link> <span aria-hidden>/</span> <span className="text-slateink-300">Contact</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Contact &amp; feedback</h1>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slateink-300">
        Ask about the platform, report a data or analytics problem, or request deletion of your data. You do not need an
        account to send a message, and you will always see a confirmation only when your message has actually been stored.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <ContactForm initialKind={initialKind} />

        <aside className="space-y-3">
          <div className="card card-pad">
            <h2 className="card-title">What happens next</h2>
            <ul className="mt-2 space-y-2 text-[11.5px] leading-relaxed text-slateink-300">
              <li className="flex gap-2"><Clock size={13} className="mt-0.5 shrink-0 text-turf-400" /> You receive a reference code on the confirmation page and the message is queued in the workspace inbox.</li>
              <li className="flex gap-2"><Mail size={13} className="mt-0.5 shrink-0 text-turf-400" /> Replies go to the email address you provide. Typical response is a few business days — this is a demo build, not a staffed support desk.</li>
              <li className="flex gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-turf-400" /> Deletion requests are recorded against your email and actioned against the application store.</li>
            </ul>
          </div>

          <div className="card card-pad">
            <h2 className="card-title">Anti-spam, without the friction</h2>
            <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-slateink-300">
              <li>· Server-side validation and sanitisation on every field</li>
              <li>· Per-network rate limiting (5 messages per 10 minutes)</li>
              <li>· Invisible honeypot and submission-timing checks</li>
              <li>· Duplicate suppression for accidental double sends</li>
              <li>· Optional CAPTCHA when the operator configures a key</li>
            </ul>
            <p className="mt-2 text-[11px] text-slateink-500">
              No puzzle is shown by default, so legitimate users are never blocked. If you hit the rate limit, nothing is lost — wait a few minutes and resend.
            </p>
          </div>

          <div className="card card-pad">
            <h2 className="card-title">Direct contact</h2>
            <p className="mt-2 text-[11.5px] leading-relaxed text-slateink-300">
              <a href={`mailto:${SITE.contactEmail}`} className="link">{SITE.contactEmail}</a>
              <br />Set <code className="rounded bg-ink-800 px-1">NEXT_PUBLIC_CONTACT_EMAIL</code> to route this to a real inbox in your deployment.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[10.5px] text-slateink-500"><Lock size={11} /> Messages are never shared with third parties.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
