'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard, Database, Users, Sparkles, GitCompare, Sigma, ShieldCheck, ListOrdered, Trophy, MapPin, Swords,
  Gavel, Dice5, Globe2, HeartPulse, BookOpen, MessageSquare, Workflow, FileText, Lock, Search, Bell, Menu, X,
  ChevronRight, LogOut, UserCircle2, Command, CircleDot, LifeBuoy, Activity,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client/api';
import { trackEvent } from '@/lib/client/analytics';
import { Badge } from './ui';
import { Breadcrumbs } from './breadcrumbs';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, group: 'Command' },
  { href: '/data', label: 'Data Centre', icon: Database, group: 'Command' },
  { href: '/players', label: 'Player Intelligence', icon: Users, group: 'Scouting' },
  { href: '/talent', label: 'Talent Discovery', icon: Sparkles, group: 'Scouting' },
  { href: '/compare', label: 'Player Comparison', icon: GitCompare, group: 'Scouting' },
  { href: '/stats', label: 'Statistical Lab', icon: Sigma, group: 'Scouting' },
  { href: '/team', label: 'Team Intelligence', icon: ShieldCheck, group: 'Team & Auction' },
  { href: '/xi', label: 'Playing XI Builder', icon: ListOrdered, group: 'Team & Auction' },
  { href: '/auction', label: 'Auction Command', icon: Gavel, group: 'Team & Auction' },
  { href: '/match', label: 'Match Centre', icon: Trophy, group: 'Match & Conditions' },
  { href: '/pitch', label: 'Pitch & Venue', icon: MapPin, group: 'Match & Conditions' },
  { href: '/opposition', label: 'Opposition Intel', icon: Swords, group: 'Match & Conditions' },
  { href: '/prediction', label: 'Prediction Lab', icon: Dice5, group: 'Match & Conditions' },
  { href: '/scouting', label: 'Global Scouting', icon: Globe2, group: 'Operations' },
  { href: '/workload', label: 'Workload Mgmt', icon: HeartPulse, group: 'Operations' },
  { href: '/research', label: 'Research Library', icon: BookOpen, group: 'Operations' },
  { href: '/assistant', label: 'AI Assistant', icon: MessageSquare, group: 'Operations' },
  { href: '/automation', label: 'Automation Centre', icon: Workflow, group: 'Operations' },
  { href: '/reports', label: 'Reports & Decks', icon: FileText, group: 'Operations' },
  { href: '/settings', label: 'Security & Settings', icon: Lock, group: 'Operations' },
  { href: '/system', label: 'Service Status', icon: Activity, group: 'Operations' },
];

interface Me { user: { id: string; name: string; email: string; role: string } | null; guest: boolean; role: string }
interface NotificationItem { id: string; title: string; body: string; level: string; read: boolean; at: string; href?: string }
interface SearchHit { id: string; name: string; role: string; team: string; age: number | null }

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    apiGet<Me>('/api/auth/me').then(setMe).catch(() => setMe(null));
    apiGet<{ notifications: NotificationItem[] }>('/api/notifications').then((r) => setNotifications(r.notifications)).catch(() => undefined);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((v) => !v); }
      if (e.key === 'Escape') { setPaletteOpen(false); setNotifOpen(false); setProfileOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setHits([]); return; }
    const timer = setTimeout(() => {
      apiGet<{ players: SearchHit[] }>(`/api/players?q=${encodeURIComponent(query)}&pageSize=6`)
        .then((r) => setHits(r.players)).catch(() => setHits([]));
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof NAV>();
    NAV.forEach((n) => map.set(n.group, [...(map.get(n.group) ?? []), n]));
    return [...map.entries()];
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const logout = async () => {
    trackEvent('sign_out', { surface: 'workspace' });
    await apiPost('/api/auth/login', {}, 'DELETE').catch(() => undefined);
    setMe(null);
    router.push('/login');
  };

  return (
    <div className="min-h-screen">
      <aside className={clsx('fixed inset-y-0 left-0 z-40 w-[248px] border-r border-line/80 bg-ink-900/95 backdrop-blur transition-transform lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center gap-2 border-b border-line/80 px-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-turf-400 to-turf-600 text-ink-950">
            <CircleDot size={18} />
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-none tracking-tight text-white">Cricket Intelligence</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-turf-400">Universal Platform</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={16} /></button>
        </div>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-2 py-3">
          {grouped.map(([group, items]) => (
            <div key={group} className="mb-4">
              <div className="px-2 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-slateink-500">{group}</div>
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className={clsx('mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition',
                      active ? 'bg-turf-500/12 text-white ring-1 ring-turf-500/30' : 'text-slateink-300 hover:bg-ink-800/70 hover:text-white')}>
                    <item.icon size={15} className={active ? 'text-turf-400' : 'text-slateink-500'} />
                    <span className="truncate">{item.label}</span>
                    {active && <ChevronRight size={12} className="ml-auto text-turf-400" />}
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="mt-2 rounded-lg border border-line/70 bg-ink-800/50 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-gold-300">DEMO DATA</div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-slateink-400">All players, matches and prices are synthetic. Upload your own dataset to analyse real records.</p>
          </div>
        </nav>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line/80 bg-ink-950/85 px-3 backdrop-blur sm:px-5">
          <button className="rounded-lg border border-line p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={16} /></button>
          <button onClick={() => setPaletteOpen(true)} className="group flex flex-1 items-center gap-2 rounded-lg border border-line bg-ink-900/70 px-3 py-2 text-left text-xs text-slateink-400 hover:border-turf-500/40 sm:max-w-md">
            <Search size={14} />
            <span className="flex-1">Search players, teams, reports…</span>
            <span className="hidden items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[10px] text-slateink-500 sm:flex"><Command size={10} />K</span>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <Badge tone="green">DEMO</Badge>
            <button onClick={() => setHelpOpen(true)} className="rounded-lg border border-line p-2 text-slateink-300 hover:text-white" aria-label="Help"><LifeBuoy size={15} /></button>
            <div className="relative">
              <button onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }} className="relative rounded-lg border border-line p-2 text-slateink-300 hover:text-white" aria-label="Notifications">
                <Bell size={15} />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-ember-500 text-[9px] font-bold text-ink-950">{unread}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-line bg-ink-850 p-2 shadow-2xl">
                  <div className="flex items-center justify-between px-1 py-1">
                    <div className="card-title">Notifications</div>
                    <button className="text-[10px] text-turf-400 hover:underline" onClick={async () => { await apiPost('/api/notifications', { all: true }, 'PATCH'); setNotifications((n) => n.map((x) => ({ ...x, read: true }))); }}>Mark all read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.slice(0, 8).map((n) => (
                      <Link key={n.id} href={n.href ?? '#'} onClick={() => setNotifOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-ink-800">
                        <div className="flex items-center gap-1.5">
                          <span className={clsx('h-1.5 w-1.5 rounded-full', n.level === 'warn' ? 'bg-ember-500' : n.level === 'success' ? 'bg-turf-500' : n.level === 'error' ? 'bg-danger-500' : 'bg-slateink-500')} />
                          <div className="text-[12px] font-medium text-slate-200">{n.title}</div>
                          {!n.read && <span className="ml-auto text-[9px] uppercase text-turf-400">new</span>}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-slateink-400">{n.body}</div>
                      </Link>
                    ))}
                    {!notifications.length && <div className="px-2 py-4 text-center text-[11px] text-slateink-500">No notifications yet.</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-xs text-slate-200 hover:border-turf-500/40">
                <UserCircle2 size={16} className="text-turf-400" />
                <span className="hidden sm:inline">{me?.user?.name ?? 'Guest'}</span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-ink-850 p-2 shadow-2xl">
                  <div className="px-2 py-2">
                    <div className="text-sm font-medium text-white">{me?.user?.name ?? 'Guest session'}</div>
                    <div className="text-[11px] text-slateink-400">{me?.user?.email ?? 'Not signed in'}</div>
                    <div className="mt-1"><Badge tone={me?.user ? 'green' : 'slate'}>{me?.role ?? 'viewer'} role</Badge></div>
                  </div>
                  <div className="mt-1 border-t border-line/70 pt-1">
                    <Link href="/settings" onClick={() => setProfileOpen(false)} className="block rounded-lg px-2 py-1.5 text-[12px] text-slate-200 hover:bg-ink-800">Account & security</Link>
                    <Link href="/settings?tab=ai" onClick={() => setProfileOpen(false)} className="block rounded-lg px-2 py-1.5 text-[12px] text-slate-200 hover:bg-ink-800">AI provider</Link>
                    {me?.user
                      ? <button onClick={logout} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] text-danger-400 hover:bg-ink-800"><LogOut size={12} />Sign out</button>
                      : <Link href="/login" onClick={() => setProfileOpen(false)} className="block rounded-lg px-2 py-1.5 text-[12px] text-turf-400 hover:bg-ink-800">Sign in</Link>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6">
          <div className="mb-3"><Breadcrumbs /></div>
          {children}
        </main>
        <footer className="border-t border-line/60 px-5 py-4 text-[10.5px] text-slateink-500">
          Universal Cricket Intelligence Platform · v1.0.0 · deterministic analytics with explainable AI narration · synthetic demo records are labelled DEMO
        </footer>
      </div>

      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[10vh]" onClick={() => setPaletteOpen(false)}>
          <div className="w-full max-w-xl rounded-xl border border-line bg-ink-850 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <Search size={15} className="text-slateink-400" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players by name, state or team…" className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slateink-500 focus:outline-none" />
              <button onClick={() => setPaletteOpen(false)} className="rounded border border-line px-1.5 py-0.5 text-[10px] text-slateink-400">ESC</button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {hits.map((h) => (
                <Link key={h.id} href={`/players/${h.id}`} onClick={() => setPaletteOpen(false)} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-ink-800">
                  <div>
                    <div className="text-[12.5px] text-slate-200">{h.name}</div>
                    <div className="text-[10.5px] text-slateink-500">{h.role} · {h.team} · {h.age ?? 'age n/a'}</div>
                  </div>
                  <ChevronRight size={13} className="text-slateink-500" />
                </Link>
              ))}
              {!hits.length && (
                <div className="p-3">
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-slateink-500">Jump to</div>
                  {NAV.slice(0, 8).map((n) => (
                    <Link key={n.href} href={n.href} onClick={() => setPaletteOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-300 hover:bg-ink-800">
                      <n.icon size={13} className="text-slateink-500" />{n.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setHelpOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-line bg-ink-850 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Help centre</h2>
              <button onClick={() => setHelpOpen(false)}><X size={16} /></button>
            </div>
            <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-slateink-300">
              <p><strong className="text-slate-200">Start here:</strong> Data Centre → upload or approve the demo dataset → Talent Discovery → Auction Command Centre.</p>
              <p><strong className="text-slate-200">Demo accounts:</strong> owner@demo.local / Demo#12345 (full permissions). Guests can read and compute but cannot persist changes.</p>
              <p><strong className="text-slate-200">AI provider:</strong> without an AI_API_KEY every AI surface returns deterministic narration labelled DEMO. No key is ever exposed to the browser.</p>
              <p><strong className="text-slate-200">Keyboard:</strong> ⌘K / Ctrl+K opens global search.</p>
              <p className="text-slateink-500">Documentation: README.md, FEATURE_GUIDE.md, API_DOCUMENTATION.md, SECURITY.md in the project root.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
