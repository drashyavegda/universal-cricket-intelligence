'use client';
import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import clsx from 'clsx';
import { trackEvent } from '@/lib/client/analytics';
import { FAQ_CATEGORIES, FAQ_ITEMS, type FaqCategory } from '@/lib/content/faq';

/** Searchable, categorised accordion. Keyboard accessible via native buttons. */
export function FaqExplorer() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqCategory | 'All'>('All');
  const [open, setOpen] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const inCategory = category === 'All' || item.category === category;
      const inQuery = !q || `${item.question} ${item.answer} ${item.category} ${(item.points ?? []).join(' ')}`.toLowerCase().includes(q);
      return inCategory && inQuery;
    });
  }, [query, category]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search the FAQ</span>
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slateink-500" />
          <input
            className="input pl-8"
            placeholder="Search questions — for example “PDF”, “auction”, “cookies”"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
          />
        </label>
        <div className="text-[11px] text-slateink-500">{filtered.length} of {FAQ_ITEMS.length} answers</div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
        <button onClick={() => setCategory('All')} className={clsx('tab border border-line/70', category === 'All' && 'tab-active')}>All</button>
        {FAQ_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={clsx('tab border border-line/70', category === c && 'tab-active')}>{c}</button>
        ))}
      </div>

      <div className="mt-4 divide-y divide-line/60 overflow-hidden rounded-xl border border-line/70 bg-ink-850/60">
        {filtered.map((item) => {
          const expanded = open === item.id;
          return (
            <div key={item.id} id={item.id}>
              <h3>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-ink-800/50"
                  aria-expanded={expanded}
                  aria-controls={`${item.id}-panel`}
                  onClick={() => {
                    setOpen(expanded ? null : item.id);
                    if (!expanded) trackEvent('faq_opened', { kind: item.category });
                  }}
                >
                  <span className="text-[11px] uppercase tracking-wider text-slateink-500">{item.category}</span>
                  <span className="flex-1 text-[13px] font-medium text-slate-100">{item.question}</span>
                  <ChevronDown size={15} className={clsx('shrink-0 text-slateink-400 transition-transform', expanded && 'rotate-180 text-turf-400')} />
                </button>
              </h3>
              {expanded && (
                <div id={`${item.id}-panel`} className="px-4 pb-4 text-[12.5px] leading-relaxed text-slateink-300">
                  <p>{item.answer}</p>
                  {item.points && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {item.points.map((p) => <li key={p} className="badge badge-slate">{p}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!filtered.length && (
          <div className="px-4 py-8 text-center text-[12.5px] text-slateink-400">
            No answer matches “{query}”. <a href="/contact" className="link">Ask us directly</a>.
          </div>
        )}
      </div>
    </div>
  );
}
