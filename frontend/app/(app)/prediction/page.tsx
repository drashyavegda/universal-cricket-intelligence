'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, Select, Slider, Stat, Tabs, nf } from '@/components/ui';
import { AreaTrend, BarCompare, LineTrend } from '@/components/charts';
import { Dice5 } from 'lucide-react';

interface SimResult {
  runs: number; seed: number; overs: number; elapsedMs: number;
  teamA: { teamId: string; name: string; winProbability: number; projected: number; score: { mean: number; p05: number; p50: number; p95: number; sd: number }; wickets: { mean: number } };
  teamB: { teamId: string; name: string; winProbability: number; projected: number; score: { mean: number; p05: number; p50: number; p95: number; sd: number }; wickets: { mean: number } };
  tieProbability: number;
  simulationError: number;
  phases: { teamId: string; phases: { phase: string; expectedRuns: number; runRate: number }[] }[];
  momentum: { over: number; projectedRunRateA: number; projectedRunRateB: number }[];
  playerForecasts: { playerId: string; name: string; teamId: string; expectedRuns: number; p30PlusRuns: number; expectedWickets: number; p2PlusWickets: number }[];
  assumptions: string[]; warnings: string[];
  venue: { name: string; city: string };
  weather: { temperatureC: number; humidityPct: number; dewExpected: boolean; rainProbability: number } | null;
}
interface Evaluation { evaluation: { n: number; brier: number | null; logLoss: number | null; calibration: { bin: string; n: number; meanPredicted: number | null; observed: number | null }[]; interpretation: string } }

export default function PredictionPage() {
  const teams = useApi<{ teams: { id: string; name: string }[]; venues: { id: string; name: string }[] }>('/api/predict');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [venueId, setVenueId] = useState('');
  const [sims, setSims] = useState(5000);
  const [seed, setSeed] = useState(2027);
  const [result, setResult] = useState<SimResult | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation['evaluation'] | null>(null);
  const [tab, setTab] = useState<'sim' | 'eval'>('sim');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teams.data?.teams.length) {
      if (!teamA) setTeamA(teams.data.teams[0].id);
      if (!teamB) setTeamB(teams.data.teams[1].id);
    }
  }, [teams.data, teamA, teamB]);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const res = await apiPost<SimResult>('/api/predict', { teamAId: teamA, teamBId: teamB, simulations: sims, seed, venueId: venueId || undefined });
      setResult(res);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (tab === 'eval' && !evaluation) apiGet<Evaluation>('/api/predict?evaluate=true').then((r) => setEvaluation(r.evaluation)).catch(() => undefined);
  }, [tab, evaluation]);

  return (
    <div className="space-y-4">
      <PageHeader title="Prediction Lab" description="Monte Carlo match simulation with a per-ball hazard model calibrated to the selected XIs and venue. Default 5,000 simulations; outputs are distributions, never guarantees.">
        <Button onClick={run} disabled={busy || !teamA || !teamB}><Dice5 size={14} />{busy ? 'Simulating…' : 'Run simulation'}</Button>
      </PageHeader>

      <Tabs tabs={[{ key: 'sim', label: 'Match simulation' }, { key: 'eval', label: 'Prediction quality' }]} active={tab} onChange={setTab} />

      {tab === 'sim' && (
        <>
          <Card title="Match setup">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Team A"><Select value={teamA} onChange={setTeamA} options={(teams.data?.teams ?? []).map((t) => ({ value: t.id, label: t.name }))} /></Field>
              <Field label="Team B"><Select value={teamB} onChange={setTeamB} options={(teams.data?.teams ?? []).map((t) => ({ value: t.id, label: t.name }))} /></Field>
              <Field label="Venue"><Select value={venueId} onChange={setVenueId} options={[{ value: '', label: 'Default venue' }, ...(teams.data?.venues ?? []).map((v) => ({ value: v.id, label: v.name }))]} /></Field>
              <Field label={`Simulations: ${sims.toLocaleString()}`}><Slider value={sims} min={500} max={20000} step={500} onChange={setSims} /></Field>
              <Field label="Seed"><input className="input" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></Field>
            </div>
            {error && <div className="mt-2"><Alert tone="error">{error}</Alert></div>}
          </Card>

          {busy && <Loading label={`Running ${sims.toLocaleString()} simulations`} />}
          {result && !busy && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Stat label={`${result.teamA.name} win`} value={`${(result.teamA.winProbability * 100).toFixed(1)}%`} tone="green" hint={`±${(result.simulationError * 100).toFixed(1)}pp simulation error`} />
                <Stat label={`${result.teamB.name} win`} value={`${(result.teamB.winProbability * 100).toFixed(1)}%`} hint="Draws/ties resolved as no-result in this model" />
                <Stat label="Tie" value={`${(result.tieProbability * 100).toFixed(1)}%`} />
                <Stat label="Projected scores" value={`${result.teamA.projected} – ${result.teamB.projected}`} tone="gold" hint={`${result.runs.toLocaleString()} sims in ${result.elapsedMs} ms · seed ${result.seed}`} />
                <Stat label="Venue" value={result.venue.name.split(' ')[0]} hint={`${result.venue.city}${result.weather?.dewExpected ? ' · dew expected' : ''} · ${result.weather?.temperatureC ?? '—'}°C`} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2" title="Momentum — projected run rate by over" subtitle="Average of all simulated innings for each side">
                  <LineTrend data={result.momentum.map((m) => ({ name: `Ov ${m.over}`, A: m.projectedRunRateA, B: m.projectedRunRateB }))} series={[{ key: 'A', label: result.teamA.name }, { key: 'B', label: result.teamB.name, colour: '#E8C15C' }]} height={250} />
                </Card>
                <Card title="Score distributions" subtitle="Median with 5–95% band">
                  {[result.teamA, result.teamB].map((t) => (
                    <div key={t.teamId} className="mb-2 rounded-lg border border-line/60 p-2.5">
                      <div className="flex items-center justify-between text-[11.5px]"><span className="text-slate-200">{t.name}</span><span className="font-mono text-turf-400">{t.score.p50}</span></div>
                      <div className="text-[10px] text-slateink-500">5% {t.score.p05} · 95% {t.score.p95} · SD {nf(t.score.sd, 1)} · wickets {nf(t.wickets.mean, 1)}</div>
                    </div>
                  ))}
                  <div className="disclaimer mt-1">A win probability of 55% means the model expects the side to win 55 times in 100 simulated matches, not that they are “slightly better”.</div>
                </Card>
                <Card title="Phase forecasts" subtitle="Expected runs by phase">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {result.phases.map((p) => (
                      <div key={p.teamId}>
                        <div className="mb-1 text-[10.5px] text-slateink-400">{result.teamA.teamId === p.teamId ? result.teamA.name : result.teamB.name}</div>
                        <BarCompare data={p.phases.map((x) => ({ name: x.phase.slice(0, 2), value: x.expectedRuns }))} colour={result.teamA.teamId === p.teamId ? '#34D399' : '#E8C15C'} height={140} label="Runs" />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="lg:col-span-2" title="Individual forecasts" subtitle="Expected contributions across all simulations">
                  <div className="max-h-[280px] overflow-auto">
                    <table className="table-base">
                      <thead><tr><th>Player</th><th>Team</th><th>Exp. runs</th><th>P(30+)</th><th>Exp. wkts</th><th>P(2+ wkts)</th></tr></thead>
                      <tbody>
                        {result.playerForecasts.slice(0, 14).map((f) => (
                          <tr key={f.playerId}>
                            <td className="text-[11.5px] text-slate-100">{f.name}</td>
                            <td className="text-[10.5px] text-slateink-400">{f.teamId === result.teamA.teamId ? result.teamA.name.split(' ')[0] : result.teamB.name.split(' ')[0]}</td>
                            <td className="font-mono text-[11px] text-turf-400">{nf(f.expectedRuns, 1)}</td>
                            <td className="font-mono text-[11px]">{(f.p30PlusRuns * 100).toFixed(0)}%</td>
                            <td className="font-mono text-[11px] text-gold-300">{nf(f.expectedWickets, 2)}</td>
                            <td className="font-mono text-[11px]">{(f.p2PlusWickets * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              <Card title="Model assumptions">
                <ul className="space-y-1 text-[10.5px] leading-relaxed text-slateink-400">{result.assumptions.map((a, i) => <li key={i}>• {a}</li>)}</ul>
                {result.warnings.map((w, i) => <Alert key={i} tone="warn">{w}</Alert>)}
              </Card>
            </>
          )}
        </>
      )}

      {tab === 'eval' && (
        <Card title="Prediction quality on historical fixtures" subtitle="Same model re-run on the workspace fixtures and scored with Brier / log loss">
          {!evaluation ? <Loading label="Scoring historical predictions" /> : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <KV cols={2} items={[
                  { k: 'Fixtures evaluated', v: evaluation.n },
                  { k: 'Brier score', v: evaluation.brier ?? '—' },
                  { k: 'Log loss', v: evaluation.logLoss ?? '—' },
                  { k: 'Baseline (coin flip)', v: '0.2500 Brier' },
                ]} />
                <div className="mt-2 text-[11px] leading-relaxed text-slateink-300">{evaluation.interpretation}</div>
              </div>
              <div>
                <div className="card-title mb-1.5">Calibration</div>
                <table className="table-base">
                  <thead><tr><th>Predicted band</th><th>n</th><th>Mean predicted</th><th>Observed</th></tr></thead>
                  <tbody>
                    {evaluation.calibration.map((c) => (
                      <tr key={c.bin}><td className="text-[11px]">{c.bin}</td><td className="font-mono text-[11px]">{c.n}</td><td className="font-mono text-[11px]">{c.meanPredicted === null ? '—' : `${(c.meanPredicted * 100).toFixed(1)}%`}</td><td className="font-mono text-[11px]">{c.observed === null ? '—' : `${(c.observed * 100).toFixed(0)}%`}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="disclaimer mt-2">With only a handful of demo fixtures, these scores carry very wide uncertainty. They are a sanity check, not evidence of predictive skill.</div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
