'use client';
import Link from 'next/link';
import { useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, KV, Loading, PageHeader, ProgressBar, Stat, nf, pct } from '@/components/ui';
import { BarCompare, LineTrend } from '@/components/charts';
import { ServiceStatus } from '@/components/service-status';
import { Activity, ArrowUpRight, Database, Gavel, ShieldCheck, Sparkles, Users, Wifi, WifiOff } from 'lucide-react';

interface Overview {
  mode: string; referenceDate: string;
  counts: { players: number; uncapped: number; teams: number; matches: number; venues: number; datasets: number; reports: number };
  team: { id: string; name: string; purseLakh: number; squadSize: number; slotsLeft: number; balanceScore: number; weaknesses: { title: string; severity: string; evidence: string; suggestion: string }[] };
  talent: { id: string; name: string; age: number | null; role: string; score: number; confidence: number }[];
  quality: { datasetScore: number; trustScore: number; errors: number; warnings: number };
  trust: { score: number; label: string; drivers: { label: string; value: number; weight: number }[] };
  security: { score: number; grade: string; gaps: number };
  recentMatches: { id: string; date: string; venue: string; home: string; away: string; score: string; winner: string }[];
  sparkline: { name: string; sr: number; age: number }[];
  ai: { configured: boolean; provider: string; model: string };
  disclaimer: string;
}

export default function DashboardPage() {
  const { data, loading, error } = useApi<Overview>('/api/overview');

  if (loading) return <Loading label="Assembling workspace intelligence" />;
  if (error) return <Alert tone="error" title="Could not load the workspace">{error}</Alert>;
  if (!data) return <Empty title="No workspace data" />;

  return (
    <div className="space-y-5">
      <PageHeader title="Overview" badge={<Badge tone="gold">{data.mode} MODE</Badge>}
        description={`Competition workspace reference date ${data.referenceDate}. Every figure below is computed by the platform’s deterministic engines from the current dataset.`}>
        <Link href="/talent"><Button><Sparkles size={14} /> Run talent scan</Button></Link>
        <Link href="/auction"><Button variant="ghost"><Gavel size={14} /> Auction room</Button></Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Players in workspace" value={data.counts.players} hint={`${data.counts.uncapped} uncapped · ${data.counts.teams} teams · ${data.counts.venues} venues`} icon={<Users size={15} className="text-turf-400" />} />
        <Stat label="Analysis trust" value={`${data.trust.score}`} tone={data.trust.score >= 62 ? 'green' : 'amber'} hint={`${data.trust.label} — dataset quality, coverage, sample adequacy, source reliability`} icon={<Activity size={15} className="text-turf-400" />} />
        <Stat label={`${data.team.name} balance`} value={`${data.team.balanceScore}/100`} tone={data.team.balanceScore > 60 ? 'green' : 'amber'} hint={`${data.team.squadSize} players · ${data.team.slotsLeft} slots · ₹${data.team.purseLakh}L purse`} icon={<ShieldCheck size={15} className="text-gold-300" />} />
        <Stat label="Security posture" value={`${data.security.score}`} tone={data.security.score >= 80 ? 'green' : 'amber'} hint={`${data.security.grade} · ${data.security.gaps} control gap(s)`} icon={<ShieldCheck size={15} className="text-turf-400" />} />
      </div>

      {/* Deployment seam: is the optional FastAPI compute tier reachable right now?
          Rendered as its own row so a sleeping Render instance is visible, not hidden. */}
      <ServiceStatus variant="compact" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Top young talent — live from the ranking engine" subtitle="Weighted percentile scores with evidence adjustment; age is a headroom multiplier, not the sort key."
          actions={<Link href="/talent" className="text-[11px] text-turf-400 hover:underline">Open discovery →</Link>}>
          {data.talent.length === 0 ? <Empty title="No eligible young players" /> : (
            <div className="space-y-2">
              {data.talent.map((p, i) => (
                <Link key={p.id} href={`/players/${p.id}`} className="flex items-center gap-3 rounded-lg border border-line/60 bg-ink-900/40 px-3 py-2 hover:border-turf-500/40">
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-ink-800 text-[11px] font-semibold text-gold-300">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-slate-100">{p.name}</div>
                    <div className="text-[10.5px] text-slateink-500">{p.role} · {p.age ?? 'age n/a'} yrs · confidence {pct(p.confidence)}</div>
                  </div>
                  <div className="w-24"><ProgressBar value={p.score} tone="green" /></div>
                  <div className="w-10 text-right font-mono text-[12px] text-turf-400">{nf(p.score, 0)}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Data & AI status">
          <div className="space-y-2.5">
            <div className="rounded-lg border border-line bg-ink-900/50 p-2.5">
              <div className="flex items-center justify-between text-[11px]"><span className="text-slateink-400">Dataset quality</span><span className="text-slate-200">{data.quality.datasetScore}/100</span></div>
              <div className="mt-1.5"><ProgressBar value={data.quality.datasetScore} /></div>
              <div className="mt-1.5 text-[10.5px] text-slateink-500">{data.quality.errors} error(s) · {data.quality.warnings} warning(s) · {data.counts.datasets} dataset(s)</div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-900/50 p-2.5 text-[11.5px]">
              {data.ai.configured ? <Wifi size={13} className="text-turf-400" /> : <WifiOff size={13} className="text-ember-400" />}
              <div>
                <div className="text-slate-200">{data.ai.configured ? `AI live · ${data.ai.model}` : 'AI in deterministic demo mode'}</div>
                <div className="text-[10.5px] text-slateink-500">{data.ai.configured ? 'Narration via configured provider' : 'No AI_API_KEY — narration is generated from computed statistics'}</div>
              </div>
            </div>
            <KV cols={2} items={[
              { k: 'Matches', v: data.counts.matches },
              { k: 'Saved reports', v: data.counts.reports },
              { k: 'Storage', v: 'JSON store (demo)' },
              { k: 'Reference date', v: data.referenceDate },
            ]} />
            <Link href="/data" className="flex items-center justify-between rounded-lg border border-turf-500/30 bg-turf-500/[0.06] px-2.5 py-2 text-[11.5px] text-turf-300 hover:bg-turf-500/10">
              <span className="flex items-center gap-1.5"><Database size={12} /> Upload or approve a dataset</span><ArrowUpRight size={12} />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Strike-rate distribution across the workspace" subtitle="Raw computed strike rates — a quick sanity check on the cohort before ranking.">
          <BarCompare data={data.sparkline.slice(0, 22).map((p) => ({ name: p.name.split(' ')[0], value: Number(p.sr.toFixed(0)) }))} colour="#10B981" height={200} label="Strike rate" />
        </Card>
        <Card title="Squad weaknesses" subtitle="Detected by the team intelligence engine">
          {data.team.weaknesses.length === 0 ? <Empty title="No structural weakness detected" /> : (
            <div className="space-y-2">
              {data.team.weaknesses.map((w) => (
                <div key={w.title} className="rounded-lg border border-line/70 bg-ink-900/40 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-medium text-slate-200">{w.title}</div>
                    <Badge tone={w.severity === 'high' ? 'red' : w.severity === 'medium' ? 'amber' : 'slate'}>{w.severity}</Badge>
                  </div>
                  <div className="mt-1 text-[10.5px] leading-relaxed text-slateink-400">{w.evidence}</div>
                  <div className="mt-1 text-[10.5px] text-turf-400">→ {w.suggestion}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Recent demo fixtures" subtitle="Scorecards are synthetic and generated ball-by-ball">
          <div className="space-y-1.5">
            {data.recentMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-line/50 px-2.5 py-2 text-[11.5px]">
                <div>
                  <div className="text-slate-200">{m.home} vs {m.away}</div>
                  <div className="text-[10px] text-slateink-500">{m.date} · {m.venue}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-slate-300">{m.score}</div>
                  <div className="text-[10px] text-turf-400">{m.winner} won</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Trust decomposition" subtitle="Why the recommendations should or should not be believed">
          <div className="space-y-2">
            {data.trust.drivers.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-[11px]"><span className="text-slateink-400">{d.label} (weight {d.weight})</span><span className="text-slate-200">{nf(d.value, 0)}</span></div>
                <ProgressBar value={d.value} tone={d.value >= 70 ? 'green' : d.value >= 50 ? 'gold' : 'red'} />
              </div>
            ))}
          </div>
          <div className="disclaimer mt-3">{data.disclaimer}</div>
        </Card>
      </div>
    </div>
  );
}
