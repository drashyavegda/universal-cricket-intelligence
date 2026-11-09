'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { CircleDot, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { SITE } from '@/lib/site';

const NAV = [
  { href: '/tour', label: 'Platform tour' },
  { href: '/faq', label: 'FAQ' },
  { href: '/testimonials', label: 'Testimonials' },
  { href: '/contact', label: 'Contact' },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label={`${SITE.legalName} home`}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-turf-400 to-turf-600 text-ink-950"><CircleDot size={18} /></span>
          <span className="leading-none">
            <span className="block text-[13px] font-semibold tracking-tight text-white">Cricket Intelligence</span>
            <span className="mt-0.5 block text-[9.5px] uppercase tracking-[0.18em] text-turf-400">Universal Platform</span>
          </span>
        </Link>
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className={clsx('rounded-lg px-3 py-1.5 text-[12.5px] transition', pathname === item.href ? 'bg-turf-500/12 text-white ring-1 ring-turf-500/30' : 'text-slateink-300 hover:bg-ink-800/70 hover:text-white')}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Link href="/privacy" className="px-2 text-[12px] text-slateink-400 hover:text-white">Privacy</Link>
          <Link href="/login" className="btn-ghost btn-xs">Sign in</Link>
          <Link href="/dashboard" className="btn-primary btn-xs">Open workspace <ArrowRight size={12} /></Link>
        </div>
        <button className="ml-auto sm:ml-0 md:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Toggle navigation">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-line/70 px-4 py-3 md:hidden" aria-label="Mobile">
          {NAV.concat([{ href: '/privacy', label: 'Privacy policy' }]).map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-2 text-[13px] text-slateink-300 hover:bg-ink-800/70 hover:text-white">
              {item.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/login" onClick={() => setOpen(false)} className="btn-ghost btn-xs">Sign in</Link>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="btn-primary btn-xs">Workspace</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-line/70 bg-ink-950/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-turf-400 to-turf-600 text-ink-950"><CircleDot size={15} /></span>
            <span className="text-[12.5px] font-semibold text-white">{SITE.legalName}</span>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-slateink-400">
            Deterministic cricket analytics with explainable AI narration. Synthetic demo records are always labelled DEMO; nothing on this site is presented as official competition data.
          </p>
        </div>
        <nav aria-label="Platform">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slateink-500">Platform</h2>
          <ul className="mt-3 space-y-2 text-[12px]">
            <li><Link href="/tour" className="text-slateink-300 hover:text-white">30-module tour</Link></li>
            <li><Link href="/faq" className="text-slateink-300 hover:text-white">FAQ</Link></li>
            <li><Link href="/login" className="text-slateink-300 hover:text-white">Sign in</Link></li>
            <li><Link href="/dashboard" className="text-slateink-300 hover:text-white">Workspace dashboard</Link></li>
          </ul>
        </nav>
        <nav aria-label="Trust">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slateink-500">Trust</h2>
          <ul className="mt-3 space-y-2 text-[12px]">
            <li><Link href="/privacy" className="text-slateink-300 hover:text-white">Privacy policy</Link></li>
            <li><Link href="/contact" className="text-slateink-300 hover:text-white">Contact &amp; feedback</Link></li>
            <li><Link href="/testimonials" className="text-slateink-300 hover:text-white">Testimonials</Link></li>
            <li><Link href="/contact?kind=deletion-request" className="text-slateink-300 hover:text-white">Request data deletion</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slateink-500">Status</h2>
          <ul className="mt-3 space-y-2 text-[12px] text-slateink-300">
            <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-turf-400" /> Security headers enabled</li>
            <li>Analytics: consent-gated{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? '' : ' · not configured'}</li>
            <li><a href="/sitemap.xml" className="hover:text-white">Sitemap</a> · <a href="/robots.txt" className="hover:text-white">robots.txt</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/60 px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 text-[10.5px] text-slateink-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {SITE.legalName}. Demo build — not a commercial launch.</span>
          <span>Contact: <a className="hover:text-white" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></span>
        </div>
      </div>
    </footer>
  );
}
