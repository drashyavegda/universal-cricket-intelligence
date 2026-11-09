import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Info, Quote } from 'lucide-react';
import { listPublishedTestimonials } from '@/lib/core/growth/testimonials';
import { publicEntry, ogFor, twitterFor } from '@/lib/site';

const entry = publicEntry('/testimonials')!;
export const metadata: Metadata = {
  title: entry.title,
  description: entry.description,
  alternates: { canonical: '/testimonials' },
  openGraph: ogFor(entry, 'article'),
  twitter: twitterFor(entry),
};

// Reads the store on each request so newly published testimonials appear immediately.
export const dynamic = 'force-dynamic';

/**
 * No Review/AggregateRating structured data is emitted here. Self-published reviews
 * for your own product are not eligible for review rich results, and demo rows are
 * not verifiable endorsements. Claiming otherwise would be misleading markup.
 */
export default function TestimonialsPage() {
  const all = listPublishedTestimonials();
  const real = all.filter((t) => !t.sample);
  const samples = all.filter((t) => t.sample);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-[11.5px] text-slateink-500">
        <Link href="/" className="hover:text-white">Home</Link> <span aria-hidden>/</span> <span className="text-slateink-300">Testimonials</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">What users say</h1>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slateink-300">
        Quotes are only published here after a named person has given permission and an administrator has added the record.
        Nothing on this page is auto-generated, and nothing is attributed to anyone who did not say it.
      </p>

      {!real.length && (
        <div className="card card-pad mt-5 border-gold-400/30 bg-gold-400/[0.05]">
          <div className="flex items-start gap-2.5">
            <Info size={16} className="mt-0.5 shrink-0 text-gold-300" />
            <div>
              <h2 className="text-[13px] font-semibold text-gold-200">No verified testimonials are published yet</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-gold-300/85">
                This is a demo build, so the cards below are labelled <strong>Sample content</strong>. They illustrate the layout
                only and are not real customer statements. When a real quote is added in the admin panel it replaces these.
                If you have evaluated the platform and would like to be quoted, <Link href="/contact?kind=feedback" className="underline">tell us</Link>.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(real.length ? real : samples).map((t) => (
          <figure key={t.id} className="card card-pad flex flex-col">
            <Quote size={16} className={t.sample ? 'text-slateink-500' : 'text-turf-400'} />
            <blockquote className="mt-2 flex-1 text-[12.5px] leading-relaxed text-slateink-200">{t.quote}</blockquote>
            <figcaption className="mt-3 flex items-center gap-2.5 border-t border-line/60 pt-3">
              {t.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.imageUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-800 text-[11px] font-semibold text-slateink-300">
                  {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-white">{t.name}</div>
                <div className="truncate text-[10.5px] text-slateink-500">{t.role} · {t.organisation}</div>
              </div>
              {t.sample
                ? <span className="badge badge-gold">Sample</span>
                : <span className="badge badge-green"><BadgeCheck size={10} /> Verified</span>}
            </figcaption>
          </figure>
        ))}
      </div>

      {all.length === 0 && (
        <div className="card card-pad mt-6 text-[12.5px] text-slateink-300">
          No testimonials have been published. Administrators can add them from <span className="text-white">Settings → Growth &amp; trust</span>.
        </div>
      )}

      {real.length > 0 && samples.length > 0 && (
        <section className="mt-8" aria-labelledby="samples">
          <h2 id="samples" className="text-[13px] font-semibold text-white">Sample (non-verified) records still in the workspace</h2>
          <ul className="mt-2 space-y-1.5 text-[12px] text-slateink-400">
            {samples.map((t) => <li key={t.id}>· {t.name} — {t.role} — labelled Sample content, not a real endorsement.</li>)}
          </ul>
        </section>
      )}

      <div className="card card-pad mt-8">
        <h2 className="text-[14px] font-semibold text-white">How testimonials are handled</h2>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-slateink-300">
          <li>· Only an administrator can add, edit, hide or remove a testimonial; every change is written to the audit trail.</li>
          <li>· Quotes are transcribed from what the person actually said. Typos may be corrected; the meaning is never changed.</li>
          <li>· Ratings are shown only when the reviewer supplied one — they are never inferred.</li>
          <li>· Seeded demo rows carry a visible <em>Sample</em> badge and are never presented as endorsements.</li>
          <li>· Removing a testimonial removes it from this page immediately.</li>
        </ul>
      </div>
    </div>
  );
}
