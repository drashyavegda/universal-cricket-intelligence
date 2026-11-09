import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, BarChart3, BrainCircuit, CheckCircle2, Database, FileText, Gavel, GitCompare, Globe2,
  HeartPulse, LineChart, ListOrdered, Lock, MapPin, MessageSquare, Search, ShieldCheck, Sparkles, Swords,
  Trophy, Users, Workflow, XCircle, CircleDot,
} from 'lucide-react';
import { SITE, publicEntry, ogFor, twitterFor } from '@/lib/site';

const entry = publicEntry('/')!;
export const metadata: Metadata = {
  title: { absolute: entry.title },
  description: entry.description,
  alternates: { canonical: '/' },
  openGraph: ogFor(entry, 'website'),
  twitter: twitterFor(entry),
};

const GROUPS = [
  {
    title: 'Data & foundation',
    blurb: 'Bring your own competition data and know exactly how trustworthy every number is.',
    items: [
      { icon: Database, label: 'Multi-format ingestion', detail: 'CSV, XLSX, JSON, PDF and plain-text imports with column mapping.' },
      { icon: ShieldCheck, label: 'Validation & quality scoring', detail: 'Row-level errors, warnings and a dataset quality score.' },
      { icon: Search, label: 'Provenance tracking', detail: 'Every metric cites its source and sample size.' },
      { icon: BrainCircuit, label: 'Entity matching & merge', detail: 'Duplicate player records merged with an audit trail.' },
    ],
  },
  {
    title: 'Player & talent intelligence',
    blurb: 'Evaluate cricketers on evidence, with the uncertainty shown next to the number.',
    items: [
      { icon: Users, label: 'Player profiles', detail: 'Phase splits, rate metrics, risk and valuation in one card.' },
      { icon: Sparkles, label: 'Talent discovery', detail: 'Age-banded searches with headroom weighting and sensitivity.' },
      { icon: GitCompare, label: 'Comparison lab', detail: 'Two to eight players, radar overlays and percentile tables.' },
      { icon: BarChart3, label: 'Rankings & stats lab', detail: 'Regression, correlation, outliers and confidence intervals.' },
    ],
  },
  {
    title: 'Team, auction & match',
    blurb: 'Turn player data into selection and spending decisions.',
    items: [
      { icon: Gavel, label: 'Auction valuation', detail: 'Bid ceilings, role scarcity and a seeded virtual auction room.' },
      { icon: ListOrdered, label: 'Best XI optimiser', detail: 'Constraint-satisfying line-ups with overseas and keeper rules.' },
      { icon: Trophy, label: 'Match prediction', detail: 'Monte Carlo simulation with score bands and quality scoring.' },
      { icon: Swords, label: 'Opposition intel', detail: 'Threats, dependency indicators and phase-level plans.' },
    ],
  },
  {
    title: 'Conditions, workload & research',
    blurb: 'Context that changes the answer: venue, fatigue and prior analysis.',
    items: [
      { icon: MapPin, label: 'Pitch & venue DNA', detail: 'Evidence-tagged venue behaviour and toss strategy.' },
      { icon: HeartPulse, label: 'Workload management', detail: 'Acute-to-chronic ratios and rotation guidance.' },
      { icon: Globe2, label: 'Scouting network', detail: 'Regional missions with verification status per hit.' },
      { icon: LineChart, label: 'Research library', detail: 'Chunked knowledge base with BM25 retrieval and citations.' },
    ],
  },
  {
    title: 'Narration & delivery',
    blurb: 'Explain the analysis to a coach, a board or a scouting meeting.',
    items: [
      { icon: MessageSquare, label: 'AI assistant', detail: 'Natural-language questions routed to the deterministic engine.' },
      { icon: Workflow, label: 'Automation centre', detail: 'Multi-agent workflows with human approval gates.' },
      { icon: FileText, label: 'Reports & decks', detail: 'Quality-gated reports exported to PDF, DOCX, XLSX and PPTX.' },
      { icon: Lock, label: 'Security & governance', detail: 'Role-based access, audit trail and a security posture score.' },
    ],
  },
];

const HONEST = [
  { ok: true, text: 'Every statistic is computed by the platform’s deterministic engines from the dataset in the workspace.' },
  { ok: true, text: 'Demo mode ships synthetic players, matches and auctions — each record is labelled DEMO in the interface.' },
  { ok: true, text: 'Exports (PDF, DOCX, XLSX, PPTX, Markdown, HTML) are generated locally by the app.' },
  { ok: false, text: 'AI narration needs your own provider key. Without one, the assistant runs a deterministic fallback.' },
  { ok: false, text: 'No payment, no live cricket feed and no official league data are bundled with this build.' },
];

export default function LandingPage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="badge badge-gold">Demo build · synthetic data clearly labelled</span>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[42px]">
              Cricket decisions backed by evidence — <span className="text-turf-400">not vibes</span>
            </h1>
            <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-slateink-300 sm:text-sm">
              {SITE.legalName} turns raw scorecards into scouting shortlists, playing XI combinations, auction bid ceilings and
              board-ready reports. Thirty modules, one deterministic analytics core, and AI that explains the numbers instead of inventing them.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link href="/dashboard" className="btn-primary">Open the workspace <ArrowRight size={14} /></Link>
              <Link href="/tour" className="btn-ghost">Take the 30-module tour</Link>
              <Link href="/faq" className="btn-ghost">Read the FAQ</Link>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: '30', v: 'analytics modules' },
                { k: '6', v: 'export formats' },
                { k: '4', v: 'role-based access tiers' },
                { k: '0', v: 'hard-coded results' },
              ].map((s) => (
                <div key={s.v} className="rounded-xl border border-line/70 bg-ink-850/60 px-3 py-2.5">
                  <dt className="text-lg font-semibold text-white">{s.k}</dt>
                  <dd className="text-[10.5px] uppercase tracking-wide text-slateink-500">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <h2 className="card-title">What this build really does</h2>
              <CircleDot size={14} className="text-turf-400" />
            </div>
            <ul className="mt-3 space-y-2.5">
              {HONEST.map((row) => (
                <li key={row.text} className="flex gap-2 text-[12px] leading-relaxed text-slateink-300">
                  {row.ok
                    ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-turf-400" />
                    : <XCircle size={14} className="mt-0.5 shrink-0 text-ember-400" />}
                  <span>{row.text}</span>
                </li>
              ))}
            </ul>
            <div className="disclaimer mt-3">
              Uploaded competition data stays in your own deployment. Nothing is sent to a third party by this demo build.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="modules">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="modules" className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Thirty modules, grouped by the decision they support</h2>
            <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-slateink-400">
              Each module reads the same dataset, so a scout’s shortlist, the auction ceiling and the report appendix cannot drift apart.
            </p>
          </div>
          <Link href="/tour" className="link text-[12.5px]">See the full tour →</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.title} className="card card-pad">
              <h3 className="text-[13.5px] font-semibold text-white">{group.title}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-slateink-400">{group.blurb}</p>
              <ul className="mt-3 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.label} className="flex gap-2">
                    <item.icon size={14} className="mt-0.5 shrink-0 text-turf-400" />
                    <div>
                      <div className="text-[12px] font-medium text-slate-200">{item.label}</div>
                      <div className="text-[11px] leading-relaxed text-slateink-500">{item.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line/70 bg-ink-900/40 py-10" aria-labelledby="how">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="how" className="text-xl font-semibold tracking-tight text-white sm:text-2xl">From upload to boardroom in four steps</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '01', t: 'Upload a dataset', d: 'CSV, XLSX, JSON, PDF scorecards or text. Map the columns once; the mapping is stored with the dataset.' },
              { n: '02', t: 'Validate & approve', d: 'Review row-level errors and warnings, then approve. Unapproved rows never feed analytics.' },
              { n: '03', t: 'Run the analysis', d: 'Profiles, shortlists, XI combinations, auction ceilings, venue DNA and match forecasts.' },
              { n: '04', t: 'Package the decision', d: 'Generate a quality-gated report and export to the format your audience actually opens.' },
            ].map((step) => (
              <li key={step.n} className="card card-pad">
                <div className="text-[10px] font-semibold tracking-[0.24em] text-turf-400">{step.n}</div>
                <div className="mt-1.5 text-[13px] font-semibold text-white">{step.t}</div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-slateink-400">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="trust">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card card-pad lg:col-span-2">
            <h2 id="trust" className="text-[15px] font-semibold text-white">Why the numbers can be checked</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { t: 'Sample sizes are always visible', d: 'A 60% strike-rate uplift across 18 balls is flagged as low confidence, not promoted as a finding.' },
                { t: 'Every metric keeps its source', d: 'Provenance chips show whether a figure came from demo seed data, an upload or a computed model.' },
                { t: 'AI never calculates', d: 'The language model receives computed facts and writes prose. It cannot invent a statistic.' },
                { t: 'Quality gate before export', d: 'Reports carry a quality score and an open-issues list; exports are blocked from claiming completeness.' },
              ].map((x) => (
                <div key={x.t} className="rounded-lg border border-line/70 bg-ink-900/50 p-3">
                  <div className="text-[12px] font-medium text-slate-200">{x.t}</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slateink-400">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <h2 className="card-title">Explore before signing in</h2>
            <p className="mt-2 text-[11.5px] leading-relaxed text-slateink-400">
              The FAQ and privacy pages are public. The workspace itself requires an account — the demo credentials are shown on the sign-in page.
            </p>
            <div className="mt-3 space-y-1.5">
              <Link href="/faq" className="block rounded-lg border border-line/70 bg-ink-900/50 px-3 py-2 text-[12px] text-slateink-200 hover:border-turf-500/50 hover:text-white">Frequently asked questions</Link>
              <Link href="/testimonials" className="block rounded-lg border border-line/70 bg-ink-900/50 px-3 py-2 text-[12px] text-slateink-200 hover:border-turf-500/50 hover:text-white">What users say</Link>
              <Link href="/privacy" className="block rounded-lg border border-line/70 bg-ink-900/50 px-3 py-2 text-[12px] text-slateink-200 hover:border-turf-500/50 hover:text-white">Privacy policy</Link>
              <Link href="/contact" className="block rounded-lg border border-line/70 bg-ink-900/50 px-3 py-2 text-[12px] text-slateink-200 hover:border-turf-500/50 hover:text-white">Contact &amp; feedback</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card card-pad flex flex-col items-start justify-between gap-4 bg-gradient-to-br from-turf-500/10 via-ink-850/60 to-gold-400/10 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Start with the demo workspace</h2>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-slateink-300">
              Sign in with a seeded demo account to explore every module. Upload your own dataset when you are ready — the demo records stay clearly labelled.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="btn-primary">Sign in to the demo</Link>
            <Link href="/contact" className="btn-ghost">Talk to the team</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
