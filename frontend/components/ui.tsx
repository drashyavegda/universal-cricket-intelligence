'use client';
import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

export function Card({ children, className, title, subtitle, actions, id }: { children?: React.ReactNode; className?: string; title?: string; subtitle?: string; actions?: React.ReactNode; id?: string }) {
  return (
    <div id={id} className={clsx('card card-pad animate-fade-up', className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="mt-1 text-xs text-slateink-400">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'default', icon }: { label: string; value: React.ReactNode; hint?: string; tone?: 'default' | 'green' | 'gold' | 'red' | 'amber'; icon?: React.ReactNode }) {
  const toneClass = { default: 'text-white', green: 'text-turf-400', gold: 'text-gold-300', red: 'text-danger-400', amber: 'text-ember-400' }[tone];
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <div className="card-title">{label}</div>
        {icon}
      </div>
      <div className={clsx('mt-2 kpi', toneClass)}>{value}</div>
      {hint && <div className="mt-1 text-[11px] leading-snug text-slateink-500">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'slate', className }: { children: React.ReactNode; tone?: 'green' | 'gold' | 'red' | 'amber' | 'slate'; className?: string }) {
  const map = { green: 'badge-green', gold: 'badge-gold', red: 'badge-red', amber: 'badge-amber', slate: 'badge-slate' };
  return <span className={clsx(map[tone], className)}>{children}</span>;
}

export function Button({ children, variant = 'primary', size, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'gold' | 'ghost' | 'danger'; size?: 'xs' }) {
  const map = { primary: 'btn-primary', gold: 'btn-gold', ghost: 'btn-ghost', danger: 'btn-danger' };
  return <button className={clsx(map[variant], size === 'xs' && 'btn-xs', className)} {...rest}>{children}</button>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <div className="mt-1 text-[11px] text-slateink-500">{hint}</div>}
    </div>
  );
}

export function Select({ value, onChange, options, className }: { value: string | number; onChange: (v: string) => void; options: { value: string | number; label: string }[]; className?: string }) {
  return (
    <select className={clsx('input', className)} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Slider({ value, onChange, min = 0, max = 3, step = 0.1, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string }) {
  return (
    <div>
      {label && <div className="mb-1 flex items-center justify-between text-[11px] text-slateink-400"><span>{label}</span><span className="font-mono text-slate-200">{value}</span></div>}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-turf-500" />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-ink-900/60 px-3 py-2 text-left text-xs text-slate-200 hover:border-turf-500/40">
      <span>{label}</span>
      <span className={clsx('relative h-5 w-9 rounded-full transition', checked ? 'bg-turf-500' : 'bg-ink-700')}>
        <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: { key: T; label: string }[]; active: T; onChange: (k: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-ink-900/60 p-1">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)} className={clsx('tab', active === t.key && 'tab-active')}>{t.label}</button>
      ))}
    </div>
  );
}

export function Alert({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'error' | 'success'; title?: string; children: React.ReactNode }) {
  const icon = { info: <Info size={14} />, warn: <AlertTriangle size={14} />, error: <XCircle size={14} />, success: <CheckCircle2 size={14} /> }[tone];
  const cls = { info: 'border-line bg-ink-800/60 text-slateink-300', warn: 'border-ember-500/30 bg-ember-500/[0.07] text-ember-400', error: 'border-danger-500/30 bg-danger-500/[0.07] text-danger-400', success: 'border-turf-500/30 bg-turf-500/[0.07] text-turf-400' }[tone];
  return (
    <div className={clsx('flex items-start gap-2 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed', cls)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>{title && <div className="font-semibold">{title}</div>}{children}</div>
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return <div className="flex items-center gap-2 py-8 text-xs text-slateink-400"><Loader2 size={14} className="animate-spin" />{label}…</div>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center"><div className="text-sm font-medium text-slate-300">{title}</div>{children && <div className="mt-1 text-xs text-slateink-400">{children}</div>}</div>;
}

export function ProgressBar({ value, tone = 'green' }: { value: number; tone?: 'green' | 'gold' | 'red' }) {
  const bg = { green: 'bg-turf-500', gold: 'bg-gold-400', red: 'bg-danger-500' }[tone];
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700"><div className={clsx('h-full rounded-full transition-all', bg)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function KV({ items, cols = 2 }: { items: { k: string; v: React.ReactNode }[]; cols?: number }) {
  return (
    <dl className={clsx('grid gap-x-4 gap-y-2', cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : '')}>
      {items.map((i) => (
        <div key={i.k} className="border-b border-line/50 pb-1.5">
          <dt className="text-[10.5px] uppercase tracking-wider text-slateink-500">{i.k}</dt>
          <dd className="mt-0.5 text-[13px] text-slate-200">{i.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageHeader({ title, description, children, badge }: { title: string; description?: string; children?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-line/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slateink-400">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export const nf = (v: number | null | undefined, digits = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(digits));
export const pct = (v: number | null | undefined, digits = 0) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(digits)}%`);
export const money = (lakh: number | null | undefined) => (lakh === null || lakh === undefined ? '—' : `₹${Number(lakh).toFixed(0)}L`);
