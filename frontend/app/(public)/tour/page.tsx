import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, KeyRound, Database } from 'lucide-react';
import { TOUR_GROUPS, TOUR_MODULES } from '@/lib/content/tour';
import { publicEntry, ogFor, twitterFor } from '@/lib/site';

const entry = publicEntry('/tour')!;
export const metadata: Metadata = {
  title: entry.title,
  description: entry.description,
  alternates: { canonical: '/tour' },
  openGraph: ogFor(entry, 'article'),
  twitter: twitterFor(entry),
};

export default function TourPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-[11.5px] text-slateink-500">
        <Link href="/" className="hover:text-white">Home</Link> <span aria-hidden>/</span> <span className="text-slateink-300">Platform tour</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">All thirty modules, and what each one actually does</h1>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slateink-300">
        Every module below is implemented in this build. Two of them need external input to be fully useful: AI narration
        needs a provider key, and anything analytical becomes meaningful once you upload your own competition data instead of
        the synthetic demo records.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-[11.5px]">
        <span className="badge badge-green"><CheckCircle2 size={11} /> Live in this build</span>
        <span className="badge badge-amber"><KeyRound size={11} /> Needs an AI provider key</span>
        <span className="badge badge-slate"><Database size={11} /> Needs your dataset to be meaningful</span>
      </div>

      <div className="mt-6 space-y-6">
        {TOUR_GROUPS.map((group) => (
          <section key={group} aria-labelledby={`group-${group}`}>
            <h2 id={`group-${group}`} className="text-[12px] font-semibold uppercase tracking-[0.18em] text-turf-400">{group}</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {TOUR_MODULES.filter((m) => m.group === group).map((m) => (
                <article key={m.n} className="rounded-xl border border-line/70 bg-ink-850/60 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink-800 text-[10.5px] font-semibold text-turf-400">{String(m.n).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <h3 className="text-[12.5px] font-semibold text-white">{m.name}</h3>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-slateink-400">{m.what}</p>
                      <span className={`mt-2 inline-flex ${m.status === 'Live' ? 'badge badge-green' : m.status.includes('AI') ? 'badge badge-amber' : 'badge badge-slate'}`}>{m.status}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="card card-pad mt-8">
        <h2 className="text-[14px] font-semibold text-white">What is deliberately not included</h2>
        <ul className="mt-2 grid gap-1.5 text-[12px] leading-relaxed text-slateink-300 sm:grid-cols-2">
          <li>· No live scoring or streaming feed</li>
          <li>· No bundled official league data</li>
          <li>· No payment or subscription processing</li>
          <li>· No medical diagnosis or injury clearance</li>
          <li>· No OCR for scanned PDFs</li>
          <li>· No automatic upload of your data to third parties</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard" className="btn-primary">Open the workspace <ArrowRight size={13} /></Link>
          <Link href="/faq" className="btn-ghost">Read the FAQ</Link>
          <Link href="/testimonials" className="btn-ghost">See what users say</Link>
        </div>
      </div>
    </div>
  );
}
