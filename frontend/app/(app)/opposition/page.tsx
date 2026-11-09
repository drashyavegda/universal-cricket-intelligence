'use client';
import { useEffect, useState } from 'react';
import { apiPost } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, KV, Loading, PageHeader, Select, Stat, nf } from '@/components/ui';
import { Swords } from 'lucide-react';

interface Report {
  teamName: string;
  form: { played: number; wins: number; losses: number; winRate: number | null; recent: string[] };
  structure: { role: string; count: number; threat: number }[];
  keyPlayers: { playerId: string; name: string; role: string; threat: number; why: string; counter: string }[];
  dependency: { metric: string; value: string; interpretation: string }[];
  weaknesses: { title: string; severity: string; evidence: string; suggestion: string }[];
  bowlingPlan: { phase: string; plan: string; evidence: string }[];
  battingPlan: { phase: string; plan: string; evidence: string }[];
  matchups: { batterName: string; bowlerName: string; balls: number; runs: number; dismissals: number; note: string }[];
  scenarios: { scenario: string; effect: string }[];
  caveat: string;
}
interface Resp { report: Report; teams: { id: string; name: string }[]; ownTeam: { id: string; name: string } }

export default function OppositionPage() {
  const [opponentId, setOpponentId] = useState('');
  const [data, setData] = useState<Resp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (id?: string) => {
    setBusy(true); setError(null);
    try { setData(await apiPost<Resp>('/api/opposition', { opponentId: id ?? (opponentId || undefined) })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Opposition Intelligence" description="Structure, key-player dependency, phase plans and match-ups derived from observed scorecards. This is inference from public match data — it is not any team’s private strategy.">
        <Select value={opponentId} onChange={(v) => { setOpponentId(v); void load(v); }} options={[{ value: '', label: 'Select opponent…' }, ...(data?.teams ?? []).map((t) => ({ value: t.id, label: t.name }))]} className="max-w-[240px]" />
        <Button onClick={() => load()} disabled={busy}><Swords size={14} />{busy ? 'Scouting…' : 'Refresh intel'}</Button>
      </PageHeader>

      {error && <Alert tone="error">{error}</Alert>}
      {busy && <Loading label="Building opposition brief" />}
      {data && !busy && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Opponent" value={data.report.teamName} />
            <Stat label="Form (workspace)" value={data.report.form.winRate === null ? '—' : `${(data.report.form.winRate * 100).toFixed(0)}%`} hint={`${data.report.form.wins}W ${data.report.form.losses}L from ${data.report.form.played}`} />
            <Stat label="Recent" value={data.report.form.recent.join(' ') || '—'} />
            <Stat label="Threat players" value={data.report.keyPlayers.length} tone="gold" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Key players & counters" subtitle="Threat = batting and bowling percentile blend">
              <div className="space-y-1.5">
                {data.report.keyPlayers.map((p) => (
                  <div key={p.playerId} className="rounded-lg border border-line/60 p-2">
                    <div className="flex items-center justify-between text-[11.5px]"><span className="text-slate-100">{p.name}</span><span className="font-mono text-gold-300">{nf(p.threat, 0)}</span></div>
                    <div className="text-[10px] text-slateink-400">{p.why}</div>
                    <div className="mt-0.5 text-[10px] text-turf-400">Counter: {p.counter}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Dependency indicators" subtitle="How removable is their top order?">
              <div className="space-y-2">
                {data.report.dependency.map((d) => (
                  <div key={d.metric} className="rounded-lg border border-line/60 p-2">
                    <div className="flex items-center justify-between text-[11px]"><span className="text-slateink-300">{d.metric}</span><span className="font-mono text-slate-200">{d.value}</span></div>
                    <div className="text-[10px] text-slateink-500">{d.interpretation}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2"><KV items={data.report.structure.slice(0, 6).map((s) => ({ k: s.role, v: `${s.count} · threat ${s.threat}` }))} /></div>
            </Card>

            <Card title="Weaknesses to attack">
              {data.report.weaknesses.length === 0 ? <Empty title="No structural weakness detected" /> : data.report.weaknesses.map((w) => (
                <div key={w.title} className="mb-1.5 rounded-lg border border-line/60 p-2">
                  <div className="flex items-center justify-between text-[11.5px]"><span className="text-slate-200">{w.title}</span><Badge tone={w.severity === 'high' ? 'red' : 'amber'}>{w.severity}</Badge></div>
                  <div className="text-[10px] text-slateink-400">{w.evidence}</div>
                </div>
              ))}
            </Card>

            <Card title="Bowling plan" subtitle="Phase by phase, with the evidence behind each call">
              {data.report.bowlingPlan.map((p) => (
                <div key={p.phase} className="mb-1.5 rounded-lg border border-turf-500/20 bg-turf-500/[0.04] p-2">
                  <div className="text-[11px] font-medium text-turf-300">{p.phase}</div>
                  <div className="text-[10.5px] text-slate-200">{p.plan}</div>
                  <div className="text-[9.5px] text-slateink-500">{p.evidence}</div>
                </div>
              ))}
            </Card>

            <Card title="Batting plan">
              {data.report.battingPlan.map((p) => (
                <div key={p.phase} className="mb-1.5 rounded-lg border border-gold-400/20 bg-gold-400/[0.04] p-2">
                  <div className="text-[11px] font-medium text-gold-300">{p.phase}</div>
                  <div className="text-[10.5px] text-slate-200">{p.plan}</div>
                  <div className="text-[9.5px] text-slateink-500">{p.evidence}</div>
                </div>
              ))}
            </Card>

            <Card title="Scenario simulations">
              {data.report.scenarios.map((s) => (
                <div key={s.scenario} className="mb-1.5">
                  <div className="text-[11px] text-slate-200">{s.scenario}</div>
                  <div className="text-[10px] text-slateink-400">→ {s.effect}</div>
                </div>
              ))}
            </Card>

            <Card className="lg:col-span-2" title="Head-to-head match-ups (your bowlers vs their batters)" subtitle="From ball-by-ball events in the workspace">
              {data.report.matchups.length === 0 ? <Empty title="No overlapping ball-by-ball match-ups">Upload event-level data to unlock this section.</Empty> : (
                <table className="table-base">
                  <thead><tr><th>Their batter</th><th>Your bowler</th><th>Balls</th><th>Runs</th><th>Wkts</th><th>Note</th></tr></thead>
                  <tbody>
                    {data.report.matchups.map((m, i) => (
                      <tr key={i}><td className="text-[11.5px]">{m.batterName}</td><td className="text-[11.5px] text-slateink-300">{m.bowlerName}</td><td className="font-mono text-[11px]">{m.balls}</td><td className="font-mono text-[11px]">{m.runs}</td><td className="font-mono text-[11px]">{m.dismissals}</td><td className="text-[10px] text-slateink-500">{m.note}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Method & limits">
              <div className="danger-note">{data.report.caveat}</div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
