'use client';
import { useEffect, useState } from 'react';
import { apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, Select, Stat, Toggle, nf } from '@/components/ui';
import { BarCompare } from '@/components/charts';
import { CheckCircle2, ListOrdered, XCircle } from 'lucide-react';

interface XIOption {
  label: string; flavour: string; score: number;
  players: { id: string; name: string; role: string; age: number | null; overseas: boolean; battingPosition: number | null; bowlingOvers: number; contributions: { label: string; value: string }[]; synthetic: boolean }[];
  battingOrder: { position: number; playerId: string; name: string; rationale: string }[];
  bowlingPlan: { over: number; bowlerId: string; bowlerName: string; phase: string; expectedEconomy: number | null }[];
  dna: { label: string; value: number; unit?: string }[];
  constraintsSatisfied: { constraint: string; satisfied: boolean; detail: string }[];
  warnings: string[];
}
interface XIResp { team: { id: string; name: string }; venue: { id: string; name: string } | null; cohortSize: number; notes: string[]; options: XIOption[] }

export default function XIPage() {
  const teams = useApi<{ teams: { id: string; name: string; isUserTeam: boolean }[] }>('/api/teams');
  const venues = useApi<{ venues: { id: string; name: string }[] }>('/api/venues');
  const [teamId, setTeamId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [overseasLimit, setOverseasLimit] = useState(4);
  const [requireKeeper, setRequireKeeper] = useState(true);
  const [minBowling, setMinBowling] = useState(5);
  const [minBatters, setMinBatters] = useState(5);
  const [result, setResult] = useState<XIResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (teams.data && !teamId) setTeamId(teams.data.teams.find((t) => t.isUserTeam)?.id ?? teams.data.teams[0].id);
  }, [teams.data, teamId]);

  const optimise = async () => {
    setBusy(true); setError(null);
    try {
      const res = await apiPost<XIResp>('/api/xi', {
        teamId, venueId: venueId || undefined, overseasLimit, requireKeeper, minBowlingOptions: minBowling, minBatters,
        flavours: ['balanced', 'batting', 'bowling', 'young', 'matchup'],
      });
      setResult(res); setActive(0);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const option = result?.options[active];

  return (
    <div className="space-y-4">
      <PageHeader title="Playing XI Builder" description="Constrained optimisation: 40 seeded restarts of role-constrained construction followed by pairwise local search. Constraints are enforced and reported, and the search only guarantees a local optimum.">
        <Button onClick={optimise} disabled={busy || !teamId}><ListOrdered size={14} />{busy ? 'Optimising…' : 'Optimise XI'}</Button>
      </PageHeader>

      <Card title="Constraints" subtitle="Hard requirements — the search will report if a constraint cannot be satisfied">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Team"><Select value={teamId} onChange={setTeamId} options={(teams.data?.teams ?? []).map((t) => ({ value: t.id, label: t.name }))} /></Field>
          <Field label="Venue"><Select value={venueId} onChange={setVenueId} options={[{ value: '', label: 'Neutral (no pitch weighting)' }, ...(venues.data?.venues ?? []).map((v) => ({ value: v.id, label: v.name }))]} /></Field>
          <Field label="Overseas limit"><input className="input" type="number" min={0} max={8} value={overseasLimit} onChange={(e) => setOverseasLimit(Number(e.target.value))} /></Field>
          <Field label="Min bowling options"><input className="input" type="number" min={3} max={7} value={minBowling} onChange={(e) => setMinBowling(Number(e.target.value))} /></Field>
          <Field label="Min batters"><input className="input" type="number" min={4} max={7} value={minBatters} onChange={(e) => setMinBatters(Number(e.target.value))} /></Field>
          <div className="flex items-end"><Toggle checked={requireKeeper} onChange={setRequireKeeper} label="Require wicketkeeper" /></div>
        </div>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      {busy && <Loading label="Searching the XI space" />}

      {option && result && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {result.options.map((o, i) => (
              <button key={o.flavour} onClick={() => setActive(i)} className={`rounded-lg border px-3 py-1.5 text-[11.5px] ${active === i ? 'border-turf-500/50 bg-turf-500/10 text-white' : 'border-line text-slateink-300 hover:border-turf-500/30'}`}>
                {o.label} <span className="ml-1 font-mono text-[10.5px] text-turf-400">{nf(o.score, 1)}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2" title={`${option.label} XI`} subtitle={`Objective score ${nf(option.score, 2)} · pool of ${result.cohortSize} eligible players${result.venue ? ` · pitch weighting for ${result.venue.name}` : ''}`}>
              <div className="overflow-auto">
                <table className="table-base">
                  <thead><tr><th>#</th><th>Player</th><th>Role</th><th>Age</th><th>Overs</th><th>Bat / Bowl impact</th><th>Data</th></tr></thead>
                  <tbody>
                    {option.players.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono text-[10.5px] text-slateink-500">{p.battingPosition}</td>
                        <td className="text-[12px] text-slate-100">{p.name}{p.overseas && <Badge tone="slate" className="ml-1">OS</Badge>}</td>
                        <td className="text-[11px] text-slateink-300">{p.role}</td>
                        <td className="font-mono text-[11.5px]">{p.age ?? '—'}</td>
                        <td className="font-mono text-[11.5px]">{p.bowlingOvers}</td>
                        <td className="font-mono text-[10.5px] text-slateink-400">{p.contributions.filter((c) => c.label !== 'Pitch fit').map((c) => `${c.label.split(' ')[0]} ${c.value}`).join(' / ')}</td>
                        <td>{p.synthetic ? <Badge tone="gold">DEMO</Badge> : <Badge tone="green">UP</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="card-title mb-1.5">Batting order</div>
                  <div className="space-y-1">
                    {option.battingOrder.map((b) => (
                      <div key={b.playerId} className="rounded border border-line/60 px-2 py-1">
                        <div className="text-[11.5px]"><span className="font-mono text-gold-300">{b.position}</span> <span className="text-slate-200">{b.name}</span></div>
                        <div className="text-[10px] text-slateink-500">{b.rationale}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="card-title mb-1.5">20-over bowling plan</div>
                  <div className="grid grid-cols-4 gap-1">
                    {option.bowlingPlan.map((b) => (
                      <div key={b.over} className="rounded border border-line/60 px-1.5 py-1">
                        <div className="text-[9.5px] text-slateink-500">Ov {b.over} · {b.phase.slice(0, 2)}</div>
                        <div className="truncate text-[10.5px] text-slate-200">{b.bowlerName.split(' ')[0]}</div>
                        <div className="font-mono text-[9.5px] text-turf-400">{nf(b.expectedEconomy, 1)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <Card title="Constraint check">
                {option.constraintsSatisfied.map((c) => (
                  <div key={c.constraint} className="mb-1.5 flex items-start gap-2 text-[11px]">
                    {c.satisfied ? <CheckCircle2 size={13} className="mt-0.5 text-turf-400" /> : <XCircle size={13} className="mt-0.5 text-danger-400" />}
                    <div><div className="text-slate-200">{c.constraint}</div><div className="text-[10px] text-slateink-500">{c.detail}</div></div>
                  </div>
                ))}
                {option.warnings.map((w, i) => <Alert key={i} tone="warn">{w}</Alert>)}
              </Card>
              <Card title="Combination DNA">
                <BarCompare data={option.dna.filter((d) => !d.unit).map((d) => ({ name: d.label.replace(' (avg pct)', ''), value: d.value }))} colour="#E8C15C" height={160} label="Score" />
                <KV cols={2} items={option.dna.filter((d) => d.unit).map((d) => ({ k: d.label, v: `${d.value}${d.unit ? ` ${d.unit}` : ''}` }))} />
              </Card>
            </div>
          </div>

          <Card title="Method & assumptions">
            <ul className="space-y-1 text-[10.5px] leading-relaxed text-slateink-400">{result.notes.map((n, i) => <li key={i}>• {n}</li>)}</ul>
            <div className="disclaimer mt-2">The optimiser ranks combinations by a weighted objective. It does not know player form on the day, injuries (unless you mark them unavailable) or the opposition’s plans — combine with the Opposition Intelligence report.</div>
          </Card>
        </>
      )}
      {!option && !busy && <Empty title="No XI generated yet">Pick a team and press Optimise XI. Try different flavours to see how the balance changes.</Empty>}
    </div>
  );
}
