'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, KV, Loading, PageHeader, ProgressBar, Stat, Tabs, nf, pct, money } from '@/components/ui';
import { FingerprintRadar, LineTrend, AreaTrend } from '@/components/charts';
import { Download, FileText, Gavel, GitCompare, Globe2, ShieldAlert, Sigma, Sparkles } from 'lucide-react';

interface Detail {
  player: { id: string; name: string; age: number | null; dob: string | null; role: string; team: string; state: string; battingStyle: string; bowlingType: string; capped: boolean; overseas: boolean; wicketkeeper: boolean; synthetic: boolean; confidence: number; competition: string; season: string; format: string; sources: { sourceName: string; kind?: string; fetchedAt: string }[] };
  metrics: { batting: Record<string, number | string | null>; bowling: Record<string, number | string | null>; consistency: Record<string, number | null>; form: { last5Runs: number[]; last5Avg: number | null; last5SR: number | null; trendSlope: number | null; formIndex: number | null; sampleSize: number }; phase: Record<string, number | string | null>; allRounderIndex: number | null };
  percentiles: Record<string, number | null>;
  potential: { potential: number; band: string; demonstrated: number; scenarios: { label: string; score: number; note: string }[]; drivers: { label: string; value: string; effect: string; detail: string }[]; confidence: number; caveats: string[]; improvementSlope: number | null; seasonsTracked: number };
  risk: { riskScore: number; riskBand: string; qualityScore: number; decision: string; components: { name: string; risk: number; weight: number; detail: string }[]; evidenceGaps: string[]; notes: string[]; valueScore: number | null };
  valuation: { fairValueLakh: number; rangeLakh: { low: number; high: number }; maxBid: { conservative: number; balanced: number; aggressive: number }; drivers: { label: string; value: string; direction: string }[]; caveats: string[]; qualityScore: number; scarcityIndex: number };
  trajectory: { trends: { label: string; slope: number | null; r2: number | null; interpretation: string }[]; forecasts: { horizon: string; scenario: string; projectedRuns: number | null; projectedStrikeRate: number | null; projectedWickets: number | null; ageThen: number | null; note: string }[]; developmentWeaknesses: { area: string; detail: string; suggestion: string }[]; retentionAdvice: { verdict: string; rationale: string[] }; uncertainty: string[]; milestones: { label: string; detail: string }[] };
  workload: { workloadIndex: number; riskIndicator: string; matchesLast21: number; ballsBowledLast21: number; acuteChronicRatio: number | null; flags: { label: string; detail: string; action: string }[]; rotationSuggestion: string; disclaimer: string; availability: { status: string; note: string } };
  rankingCard: { rank: number; of: number; score: number; components: { label: string; weight: number; percentile: number | null; contribution: number; missing: boolean }[]; explanation: string; positives: string[]; negatives: string[] } | null;
  situational: { inningsLog: { date: string; runs: number; ballsFaced: number; wickets: number; opponent: string }[]; phaseBatting: Record<string, { balls: number; runs: number }>; phaseBowling: Record<string, { balls: number; runs: number }> };
  eligibility: { uncapped: boolean; domestic: boolean; draftable: boolean; ageAtReference: number | null; referenceDate: string; note: string };
  similarPlayers: { id: string; name: string; age: number | null }[];
}

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const { data, loading, error } = useApi<Detail>(`/api/players/${params.id}`);
  const [tab, setTab] = useState<'overview' | 'evidence' | 'risk' | 'career' | 'workload'>('overview');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  if (loading) return <Loading label="Computing player intelligence" />;
  if (error || !data) return <Alert tone="error" title="Player unavailable">{error ?? 'Not found'}</Alert>;
  const { player, metrics, potential, risk, valuation, trajectory, workload, rankingCard } = data;

  const radar = [
    { axis: 'Average', value: data.percentiles['batting.average'] ?? 0 },
    { axis: 'Strike rate', value: data.percentiles['batting.strikeRate'] ?? 0 },
    { axis: 'Boundaries', value: data.percentiles['batting.boundaryPct'] ?? 0 },
    { axis: 'Economy', value: data.percentiles['bowling.economy'] ?? 0 },
    { axis: 'Wickets', value: data.percentiles['bowling.strikeRate'] ?? 0 },
    { axis: 'Consistency', value: data.percentiles['consistency.floorRate'] ?? 0 },
    { axis: 'Form', value: data.percentiles['form.formIndex'] ?? 0 },
    { axis: 'Potential', value: potential.potential },
  ];

  const generateReport = async () => {
    setReportBusy(true); setReportError(null);
    try {
      const res = await apiPost<{ report: { id: string } }>('/api/reports', { type: 'player', playerId: player.id });
      setReportId(res.report.id);
    } catch (e) {
      setReportError((e as Error).message);
    } finally { setReportBusy(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={player.name} badge={player.synthetic ? <Badge tone="gold">DEMO</Badge> : <Badge tone="green">UPLOADED</Badge>}
        description={`${player.role} · ${player.state} · ${player.battingStyle} · ${player.bowlingType === 'None' ? 'no frontline bowling' : player.bowlingType} · ${player.competition} ${player.season}`}>
        <Button variant="ghost" onClick={generateReport} disabled={reportBusy}>{reportBusy ? 'Generating…' : 'Generate scouting report'}</Button>
        {reportId && <a href={`/api/reports/${reportId}/export?format=pdf`}><Button variant="gold"><Download size={14} /> PDF</Button></a>}
        <Link href={`/compare?ids=${player.id}`}><Button variant="ghost">Compare</Button></Link>
      </PageHeader>

      {reportError && <Alert tone="warn">{reportError} — sign in as analyst or owner to save reports.</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Age at reference" value={player.age ?? '—'} hint={player.dob ? `DOB ${player.dob} · ref ${data.eligibility.referenceDate}` : 'No DOB in dataset — not inferred'} />
        <Stat label="Batting" value={nf(Number(metrics.batting.strikeRate))} tone="green" hint={`SR · avg ${nf(Number(metrics.batting.average))} · ${metrics.batting.runs} runs`} />
        <Stat label="Bowling" value={nf(Number(metrics.bowling.economy), 2)} tone="gold" hint={`econ · ${metrics.bowling.wickets} wkts · SR ${nf(Number(metrics.bowling.strikeRate))}`} />
        <Stat label="Potential" value={potential.potential} tone={potential.potential > 62 ? 'green' : 'amber'} hint={potential.band} />
        <Stat label="Risk" value={risk.riskScore} tone={risk.riskScore < 42 ? 'green' : risk.riskScore < 58 ? 'amber' : 'red'} hint={`${risk.riskBand} · ${risk.decision}`} />
      </div>

      <Tabs tabs={[{ key: 'overview', label: 'Overview' }, { key: 'evidence', label: 'Evidence' }, { key: 'risk', label: 'Risk & value' }, { key: 'career', label: 'Career & forecasts' }, { key: 'workload', label: 'Workload' }]} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Performance fingerprint" subtitle="Percentile ranks inside the current workspace cohort (0–100)">
            <FingerprintRadar data={radar} series={[{ key: 'value', label: player.name, colour: '#34D399' }]} height={320} />
          </Card>
          <Card title="Ranking card" subtitle={rankingCard ? `#${rankingCard.rank} of ${rankingCard.of} under the default scouting blend` : 'Not ranked'}>
            {rankingCard ? (
              <>
                <div className="mb-2 text-[11.5px] leading-relaxed text-slateink-300">{rankingCard.explanation}</div>
                {rankingCard.components.slice(0, 6).map((c) => (
                  <div key={c.label} className="mb-1.5">
                    <div className="flex items-center justify-between text-[10.5px] text-slateink-400"><span>{c.label} ×{c.weight}</span><span>{c.missing ? 'missing' : `${nf(c.percentile, 0)} pct`}</span></div>
                    <ProgressBar value={c.percentile ?? 0} tone={c.missing ? 'red' : 'green'} />
                  </div>
                ))}
                <div className="mt-2 space-y-1 text-[10.5px] text-turf-400">{rankingCard.positives.slice(0, 2).map((p, i) => <div key={i}>▲ {p}</div>)}</div>
                <div className="mt-1 space-y-1 text-[10.5px] text-ember-400">{rankingCard.negatives.map((p, i) => <div key={i}>▼ {p}</div>)}</div>
              </>
            ) : <Empty title="No ranking available" />}
            <div className="mt-3 space-y-1 text-[10.5px] text-slateink-500">
              <div>Eligibility: {data.eligibility.uncapped ? 'uncapped' : 'capped'} · {data.eligibility.domestic ? 'domestic' : 'overseas'}</div>
              <div>{data.eligibility.note}</div>
            </div>
          </Card>

          <Card title="Recent innings" subtitle={`Last ${metrics.form.sampleSize} innings · form index ${nf(metrics.form.formIndex)}`}>
            <LineTrend data={data.situational.inningsLog.map((m, i) => ({ name: `#${i + 1}`, runs: m.runs, balls: m.ballsFaced }))} series={[{ key: 'runs', label: 'Runs' }, { key: 'balls', label: 'Balls faced', colour: '#E8C15C' }]} height={200} />
          </Card>

          <Card title="Phase profile" subtitle="Phase splits come from source data; they are not estimated">
            <div className="space-y-2">
              {(['powerplay', 'middle', 'death'] as const).map((ph) => {
                const bat = data.situational.phaseBatting[ph];
                const bowl = data.situational.phaseBowling[ph];
                const sr = bat && bat.balls ? (bat.runs / bat.balls) * 100 : null;
                const econ = bowl && bowl.balls ? (bowl.runs / bowl.balls) * 6 : null;
                return (
                  <div key={ph} className="rounded-lg border border-line/60 px-2.5 py-2">
                    <div className="flex items-center justify-between text-[11.5px]"><span className="capitalize text-slate-200">{ph}</span><span className="font-mono text-turf-400">SR {nf(sr)}</span></div>
                    <div className="text-[10.5px] text-slateink-500">{bat?.runs ?? 0} runs / {bat?.balls ?? 0} balls · bowling econ {nf(econ, 2)} over {bowl?.balls ?? 0} balls</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Similar players" subtitle="Same role, nearest age — a sanity check on the profile">
            <div className="space-y-1">
              {data.similarPlayers.map((p) => (
                <Link key={p.id} href={`/players/${p.id}`} className="flex items-center justify-between rounded-lg border border-line/50 px-2 py-1.5 text-[11.5px] hover:border-turf-500/40">
                  <span className="text-slate-200">{p.name}</span><span className="text-slateink-500">{p.age ?? '—'} yrs</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Computed batting metrics" subtitle="Every value is derived; null means the input was missing">
            <KV cols={2} items={[
              { k: 'Matches / innings', v: `${metrics.batting.matches} / ${metrics.batting.innings}` },
              { k: 'Runs / balls', v: `${metrics.batting.runs} / ${metrics.batting.balls}` },
              { k: 'Strike rate', v: nf(Number(metrics.batting.strikeRate)) },
              { k: 'Average (runs ÷ dismissals)', v: nf(Number(metrics.batting.average)) },
              { k: 'Boundary % of balls', v: `${nf(Number(metrics.batting.boundaryPct))}%` },
              { k: 'Balls per boundary', v: nf(Number(metrics.batting.ballsPerBoundary)) },
              { k: 'Conversion rate (50+ per inns)', v: pct(metrics.batting.conversionRate as number) },
              { k: 'Sample label', v: metrics.batting.sampleLabel },
            ]} />
          </Card>
          <Card title="Computed bowling metrics">
            <KV cols={2} items={[
              { k: 'Balls / overs', v: `${metrics.bowling.balls} / ${(Number(metrics.bowling.balls) / 6).toFixed(1)}` },
              { k: 'Wickets', v: metrics.bowling.wickets },
              { k: 'Economy', v: nf(Number(metrics.bowling.economy), 2) },
              { k: 'Bowling average', v: nf(Number(metrics.bowling.average), 2) },
              { k: 'Bowling strike rate', v: nf(Number(metrics.bowling.strikeRate)) },
              { k: 'Dot-ball %', v: metrics.bowling.dotBallPct === null ? 'not available (no ball-by-ball)' : `${nf(Number(metrics.bowling.dotBallPct))}%` },
              { k: 'All-rounder index', v: metrics.allRounderIndex ?? '—' },
              { k: 'Sample label', v: metrics.bowling.sampleLabel },
            ]} />
          </Card>
          <Card title="Consistency & form">
            <KV cols={2} items={[
              { k: 'SD of innings runs', v: nf(metrics.consistency.sdRuns, 2) },
              { k: 'Coefficient of variation', v: nf(metrics.consistency.cv, 3) },
              { k: 'Floor rate (≥20 runs)', v: pct(metrics.consistency.floorRate as number) },
              { k: 'Ceiling (max in log)', v: metrics.consistency.ceiling ?? '—' },
              { k: 'Last 5 runs', v: metrics.form.last5Runs.join(', ') || '—' },
              { k: 'Last 5 SR', v: nf(metrics.form.last5SR) },
              { k: 'Trend slope (runs/innings)', v: nf(metrics.form.trendSlope, 3) },
              { k: 'Form index', v: nf(metrics.form.formIndex) },
            ]} />
            <div className="disclaimer mt-3">Coefficient of variation is only reported for runs (a ratio metric with a meaningful zero). It is deliberately not computed for strike rate.</div>
          </Card>
          <Card title="Provenance">
            <div className="space-y-1.5 text-[11px]">
              {player.sources.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded border border-line/60 px-2 py-1.5">
                  <span className="text-slate-200">{s.sourceName}</span>
                  <span className="text-slateink-500">{s.kind ?? 'source'} · {s.fetchedAt.slice(0, 10)}</span>
                </div>
              ))}
            </div>
            <KV items={[{ k: 'Record confidence', v: pct(player.confidence) }, { k: 'Data type', v: player.synthetic ? 'Synthetic demo' : 'Uploaded' }]} />
            <div className="mt-2"><Link href="/data" className="link text-[11.5px]">Open the record in Data Centre →</Link></div>
          </Card>
        </div>
      )}

      {tab === 'risk' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={`Decision: ${risk.decision}`} subtitle={`Quality ${risk.qualityScore}/100 · risk ${risk.riskScore}/100 (${risk.riskBand})`}>
            {risk.components.map((c) => (
              <div key={c.name} className="mb-2">
                <div className="flex items-center justify-between text-[11px]"><span className="text-slateink-300">{c.name} ×{c.weight}</span><span className="font-mono text-slate-200">{nf(c.risk, 0)}</span></div>
                <ProgressBar value={c.risk} tone={c.risk > 60 ? 'red' : c.risk > 45 ? 'gold' : 'green'} />
                <div className="text-[10px] text-slateink-500">{c.detail}</div>
              </div>
            ))}
            <div className="mt-3 space-y-1">{risk.evidenceGaps.map((g, i) => <div key={i} className="flex gap-1.5 text-[10.5px] text-ember-400"><ShieldAlert size={11} className="mt-0.5 shrink-0" />{g}</div>)}</div>
            <div className="disclaimer mt-3">{risk.notes[0]}</div>
          </Card>
          <Card title="Valuation & bid ceilings" subtitle="Estimated worth first; a maximum bid is a separate strategy decision">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-line bg-ink-900/50 p-2"><div className="text-[10px] uppercase text-slateink-500">Fair value</div><div className="text-lg font-semibold text-gold-300">{money(valuation.fairValueLakh)}</div><div className="text-[10px] text-slateink-500">{money(valuation.rangeLakh.low)}–{money(valuation.rangeLakh.high)}</div></div>
              <div className="rounded-lg border border-line bg-ink-900/50 p-2"><div className="text-[10px] uppercase text-slateink-500">Conservative</div><div className="text-lg font-semibold text-turf-400">{money(valuation.maxBid.conservative)}</div></div>
              <div className="rounded-lg border border-line bg-ink-900/50 p-2"><div className="text-[10px] uppercase text-slateink-500">Aggressive</div><div className="text-lg font-semibold text-ember-400">{money(valuation.maxBid.aggressive)}</div></div>
            </div>
            <div className="mt-3 space-y-1.5">
              {valuation.drivers.map((d) => (
                <div key={d.label} className="flex items-center justify-between text-[11px]"><span className="text-slateink-400">{d.label}</span><span className={d.direction === 'up' ? 'text-turf-400' : d.direction === 'down' ? 'text-ember-400' : 'text-slate-300'}>{d.value}</span></div>
              ))}
            </div>
            <div className="disclaimer mt-3">{valuation.caveats.join(' ')}</div>
          </Card>
        </div>
      )}

      {tab === 'career' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Career trajectory" subtitle="Season aggregates from the dataset; forecasts are OLS extrapolations with an age curve">
            <AreaTrend data={trajectory.forecasts.filter((f) => f.scenario === 'expected').map((f) => ({ name: f.horizon, runs: f.projectedRuns ?? 0, sr: f.projectedStrikeRate ?? 0 }))} series={[{ key: 'runs', label: 'Projected runs (expected)' }]} height={220} />
            <div className="mt-3 space-y-1.5">
              {trajectory.trends.map((t) => (
                <div key={t.label} className="flex items-center justify-between text-[11px]"><span className="text-slateink-400">{t.label}</span><span className="text-slate-200">{t.interpretation}{t.r2 !== null && ` (R² ${t.r2})`}</span></div>
              ))}
            </div>
          </Card>
          <Card title="Forecast scenarios" subtitle="Conservative / expected / high-growth, with explicit assumptions">
            <table className="table-base">
              <thead><tr><th>Horizon</th><th>Scenario</th><th>Runs</th><th>SR</th><th>Wkts</th></tr></thead>
              <tbody>
                {trajectory.forecasts.filter((f) => f.scenario !== 'high-growth' || f.horizon === 'Next season').map((f) => (
                  <tr key={`${f.horizon}-${f.scenario}`}><td className="text-[11.5px]">{f.horizon}</td><td><Badge tone={f.scenario === 'expected' ? 'green' : f.scenario === 'conservative' ? 'slate' : 'gold'}>{f.scenario}</Badge></td><td className="font-mono text-[11.5px]">{f.projectedRuns ?? '—'}</td><td className="font-mono text-[11.5px]">{f.projectedStrikeRate ?? '—'}</td><td className="font-mono text-[11.5px]">{f.projectedWickets ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 space-y-1 text-[10.5px] text-slateink-500">{trajectory.uncertainty.map((u, i) => <div key={i}>• {u}</div>)}</div>
          </Card>
          <Card title="Development focus">
            {trajectory.developmentWeaknesses.map((w) => (
              <div key={w.area} className="mb-2 rounded-lg border border-line/60 p-2.5">
                <div className="text-[12px] font-medium text-slate-200">{w.area}</div>
                <div className="text-[10.5px] text-slateink-400">{w.detail}</div>
                <div className="mt-0.5 text-[10.5px] text-turf-400">→ {w.suggestion}</div>
              </div>
            ))}
          </Card>
          <Card title="Retention view" subtitle={trajectory.retentionAdvice.verdict}>
            <ul className="space-y-1 text-[11.5px] text-slateink-300">{trajectory.retentionAdvice.rationale.map((r, i) => <li key={i}>• {r}</li>)}</ul>
            <KV items={trajectory.milestones.map((m) => ({ k: m.label, v: m.detail }))} />
          </Card>
        </div>
      )}

      {tab === 'workload' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Workload profile" subtitle={`Reference date ${data.eligibility.referenceDate}`}>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Matches (21d)" value={workload.matchesLast21} />
              <Stat label="Balls bowled (21d)" value={workload.ballsBowledLast21} />
              <Stat label="Acute:chronic ratio" value={workload.acuteChronicRatio ?? '—'} tone={(workload.acuteChronicRatio ?? 0) > 1.5 ? 'red' : 'green'} />
              <Stat label="Workload index" value={workload.workloadIndex} tone={workload.riskIndicator === 'elevated' ? 'red' : workload.riskIndicator === 'watch' ? 'amber' : 'green'} />
            </div>
            <div className="mt-3 space-y-1.5">
              {workload.flags.map((f) => (
                <div key={f.label} className="rounded-lg border border-ember-500/25 bg-ember-500/[0.06] p-2 text-[10.5px] text-ember-400"><strong>{f.label}:</strong> {f.detail} → {f.action}</div>
              ))}
              {!workload.flags.length && <div className="text-[11px] text-turf-400">No workload flags for this player at the reference date.</div>}
            </div>
          </Card>
          <Card title="Rotation & availability">
            <div className="text-[11.5px] leading-relaxed text-slateink-300">{workload.rotationSuggestion}</div>
            <KV items={[{ k: 'Availability status', v: workload.availability.status }, { k: 'Source', v: workload.availability.note }]} />
            <div className="danger-note mt-3">{workload.disclaimer}</div>
          </Card>
        </div>
      )}

      {/* Related analysis: every profile links onward to the modules that can act on it,
          so no page is a dead end and internal linking never loops back on itself. */}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="card-title">Related analysis for this player</h2>
          <span className="text-[10px] text-slateink-500">Links carry the player id where the target page supports it</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: `/compare?ids=${player.id}`, label: 'Compare with another player', detail: 'Open the comparison lab with this player pre-selected', icon: GitCompare },
            { href: '/stats', label: 'Statistical workbench', detail: 'Run distributions and confidence intervals on his record', icon: Sigma },
            { href: '/talent', label: 'Talent discovery', detail: 'See how he ranks inside an age-banded shortlist', icon: Sparkles },
            { href: '/auction', label: 'Auction valuation', detail: 'Bid ceiling, role scarcity and purse impact', icon: Gavel },
            { href: '/scouting', label: 'Scouting network', detail: 'Verification status and regional coverage', icon: Globe2 },
            { href: '/reports', label: 'Build a report', detail: 'Package this profile for a selection meeting', icon: FileText },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="group flex items-start gap-2 rounded-lg border border-line/70 bg-ink-900/50 p-2.5 hover:border-turf-500/45">
              <link.icon size={14} className="mt-0.5 shrink-0 text-turf-400" />
              <span className="min-w-0">
                <span className="block text-[12px] font-medium text-slate-200 group-hover:text-white">{link.label}</span>
                <span className="block text-[10.5px] leading-relaxed text-slateink-500">{link.detail}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <Link href="/players" className="link">Back to the player directory</Link>
          <span className="text-slateink-600">·</span>
          <Link href="/dashboard" className="link">Workspace overview</Link>
          <span className="text-slateink-600">·</span>
          <Link href="/faq#metrics" className="link">How to read this card</Link>
        </div>
      </div>
    </div>
  );
}
