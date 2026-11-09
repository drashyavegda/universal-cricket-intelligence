import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqExplorer } from '@/components/faq-explorer';
import { FAQ_ITEMS, faqCategoriesWithCounts } from '@/lib/content/faq';
import { SITE, absoluteUrl, publicEntry, ogFor, twitterFor } from '@/lib/site';

const entry = publicEntry('/faq')!;
export const metadata: Metadata = {
  title: entry.title,
  description: entry.description,
  alternates: { canonical: '/faq' },
  openGraph: ogFor(entry, 'article'),
  twitter: twitterFor(entry),
};

/**
 * FAQPage structured data.
 *
 * Only emitted on this dedicated page, where every answer is also present in plain
 * HTML below the accordion. We make no claim that a search engine will render a
 * rich result — that is the engine's decision, not ours.
 */
function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${absoluteUrl('/faq')}#faq`,
    url: absoluteUrl('/faq'),
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: SITE.legalName, url: absoluteUrl('/') },
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.points?.length ? `${item.answer} (${item.points.join('; ')})` : item.answer },
    })),
  };
}

export default function FaqPage() {
  const counts = faqCategoriesWithCounts();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }} />
      <nav aria-label="Breadcrumb" className="text-[11.5px] text-slateink-500">
        <Link href="/" className="hover:text-white">Home</Link> <span aria-hidden>/</span> <span className="text-slateink-300">FAQ</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Frequently asked questions</h1>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slateink-300">
        Straight answers about what the platform does, how the numbers are produced, which files it reads, what the AI
        layer can and cannot do, and where the limits are. If something is not here, <Link href="/contact" className="link">ask us</Link>.
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {counts.map((c) => (
          <span key={c.category} className="badge badge-slate">{c.category} · {c.count}</span>
        ))}
      </div>

      <div className="mt-6">
        <FaqExplorer />
      </div>

      {/* Crawlable summary: the same answers in plain HTML for search engines and no-JS clients. */}
      <section className="mt-10" aria-labelledby="all-answers">
        <h2 id="all-answers" className="text-[15px] font-semibold text-white">All answers in plain text</h2>
        <div className="mt-3 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details key={`plain-${item.id}`} className="rounded-lg border border-line/60 bg-ink-900/40 px-3.5 py-2.5">
              <summary className="cursor-pointer text-[12.5px] font-medium text-slate-200">{item.question}</summary>
              <p className="mt-2 text-[12px] leading-relaxed text-slateink-400">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="disclaimer mt-8">
        These answers describe this build’s actual behaviour, including its limitations. The FAQPage structured data above is
        valid schema.org markup, but whether a search engine shows a rich result is entirely up to that search engine.
      </div>
    </div>
  );
}
