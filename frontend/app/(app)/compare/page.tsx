'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, Loading, PageHeader, Select, nf } from '@/components/ui';
import { FingerprintRadar, BarCompare } from '@/components/charts';
import { GitCompare, Plus, X } from 'lucide-react';

interface PlayerOption { id: string; name: string; role: string; team: string; age: number | null }
interface CompareResp {
  players: {
    player: { id: string; name: string; age: number | null; role: string; team: string; synthetic: boolean };
    metrics: { batting: Record<string, number | string | null>; bowling: Record<string, number | string | null>; consistency: Record<string, number | null>; form: { formIndex: number | null } };
    percentiles: Record<string, number | null>;
    potential: { potential: number; band: string };
    risk: { riskScore: number; riskBand: string; decision: string };
    fingerprint: { axis: string; value: number }[];
  }[];
  replacement: { out: { name: string }; in: { name: string }; deltaBatting: number; deltaBowling: number; deltaBalance: number; verdict: string; caveats: string[] } | null;
  verdict: string;
  caveat: string;
}
interface Team { id: string; name: string; isUserTeam: boolean }

const COLOURS = ['#34D399', '#E8C15C', '#60A5FA', '#FB923C', '#A78BFA', '#F472B6', '#22D3EE', '#FACC15'];

function CompareWorkspace() {
  const search = useSearchParams();
  const preselect = search.get('ids')?.split(',').filter(Boolean) ?? [];
  const [ids, setIds] = useState<string[]>(preselect.slice(0, 4));
  const [picker, setPicker] = useState('');
  const [result, setResult] = useState<CompareResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const [teamId, setTeamId] = useState('');
  const players = useApi<{ players: PlayerOption[] }>('/api/players?pageSize=100&sort=name');
  const teams = useApi<{ teams: Team[] }>('/api/teams');

  useEffect(() => {
    if (!ids.length && players.data?.players.length) setIds(players.data.players.slice(0, 3).map((p) => p.id));
  }, [players.data, ids.length]);

  useEffect(() => {
    if (teams.data && !teamId) setTeamId(teams.data.teams.find((t) => t.isUserTeam)?.id ?? teams.data.teams[0].id);
  }, [teams.data, teamId]);

  const compare = async () => {
    if (ids.length < 2) { setError('Select at least two players.'); return; }
    setBusy(true); setError(null);
    try {
      const res = await apiPost<CompareResp>('/api/compare', { ids, teamId: teamId || undefined, replacement: outId && inId ? { outId, inId } : undefined });
      setResult(res);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => { if (ids.length >= 2) void compare(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ids.length]);

  const add = (id: string) => { if (id && !ids.includes(id) && ids.length < 8) setIds([...ids, id]); };
  const radarData = result ? result.players[0].fingerprint.map((f, i) => {
    const row: { axis: string; [k: string]: number | string } = { axis: f.axis };
    result.players.forEach((p, idx) => { row[`p${idx}`] = p.fingerprint[i].value; });
    return row;
  }) : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Player Comparison" description="Compare 2–8 players on percentile fingerprints, then test a replacement against the live squad balance model.">
        <Button onClick={compare} disabled={busy}><GitCompare size={14} />{busy ? 'Comparing…' : 'Compare'}</Button>
      </PageHeader>

      <Card title="Selection" subtitle="Percentile axes are computed inside the full workspace cohort">
        <div className="flex flex-wrap items-center gap-2">
          {ids.map((id) => {
            const p = players.data?.players.find((x) => x.id === id);
            return (
              <Badge key={id} tone="green" className="gap-1.5 py-1">
                {p?.name ?? id}
                <button onClick={() => setIds(ids.filter((x) => x !== id))}><X size={10} /></button>
              </Badge>
            );
          })}
          <div className="flex items-center gap-1">
            <Select value={picker} onChange={(v) => { add(v); setPicker(''); }} options={[{ value: '', label: 'Add player…' }, ...(players.data?.players ?? []).filter((p) => !ids.includes(p.id)).map((p) => ({ value: p.id, label: `${p.name} (${p.role}, ${p.age ?? '—'})` }))]} className="max-w-[240px]" />
            <Plus size={14} className="text-slateink-500" />
          </div>
        </div>
        {error && <div className="mt-2"><Alert tone="error">{error}</Alert></div>}
      </Card>

      {busy && <Loading label="Building comparison" />}
      {result && !busy && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Fingerprint radar" subtitle="Cohort percentiles, not raw values">
              <FingerprintRadar data={radarData} series={result.players.map((p, i) => ({ key: `p${i}`, label: p.player.name, colour: COLOURS[i % COLOURS.length] }))} height={340} />
            </Card>
            <Card title="Verdict" subtitle="Generated from the comparison, not from a model">
              <p className="text-[12px] leading-relaxed text-slateink-300">{result.verdict}</p>
              <p className="mt-2 text-[10.5px] text-slateink-500">{result.caveat}</p>
              <div className="mt-3">
                <BarCompare data={result.players.map((p) => ({ name: p.player.name.split(' ')[0], value: p.potential.potential }))} colour="#E8C15C" height={150} label="Potential" />
              </div>
            </Card>
          </div>

          <Card title="Metric comparison" subtitle="All values computed from the workspace dataset; “—” means unavailable, never zero">
            <div className="overflow-auto">
              <table className="table-base">
                <thead><tr><th>Metric</th>{result.players.map((p) => <th key={p.player.id}>{p.player.name}</th>)}</tr></thead>
                <tbody>
                  {[
                    { label: 'Age', get: (p: CompareResp['players'][number]) => p.player.age ?? '—' },
                    { label: 'Role', get: (p: CompareResp['players'][number]) => p.player.role },
                    { label: 'Runs', get: (p: CompareResp['players'][number]) => p.metrics.batting.runs },
                    { label: 'Balls faced', get: (p: CompareResp['players'][number]) => p.metrics.batting.balls },
                    { label: 'Strike rate', get: (p: CompareResp['players'][number]) => nf(Number(p.metrics.batting.strikeRate)) },
                    { label: 'Average', get: (p: CompareResp['players'][number]) => nf(Number(p.metrics.batting.average)) },
                    { label: 'Boundary %', get: (p: CompareResp['players'][number]) => `${nf(Number(p.metrics.batting.boundaryPct))}%` },
                    { label: 'Wickets', get: (p: CompareResp['players'][number]) => p.metrics.bowling.wickets },
                    { label: 'Economy', get: (p: CompareResp['players'][number]) => nf(Number(p.metrics.bowling.economy), 2) },
                    { label: 'Bowling SR', get: (p: CompareResp['players'][number]) => nf(Number(p.metrics.bowling.strikeRate)) },
                    { label: 'Consistency (CV)', get: (p: CompareResp['players'][number]) => nf(p.metrics.consistency.cv, 3) },
                    { label: 'Form index', get: (p: CompareResp['players'][number]) => nf(p.metrics.form.formIndex) },
                    { label: 'Potential', get: (p: CompareResp['players'][number]) => `${p.potential.potential} (${p.potential.band})` },
                    { label: 'Risk', get: (p: CompareResp['players'][number]) => `${p.risk.riskScore} (${p.risk.riskBand})` },
                    { label: 'Decision label', get: (p: CompareResp['players'][number]) => p.risk.decision },
                  ].map((row) => (
                    <tr key={row.label}><td className="text-[11.5px] text-slateink-300">{row.label}</td>{result.players.map((p) => <td key={p.player.id} className="font-mono text-[11.5px]">{String(row.get(p))}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Player replacement simulator" subtitle="Estimate how swapping one squad member for another changes squad balance">
            <div className="grid gap-2 sm:grid-cols-4">
              <Select value={teamId} onChange={setTeamId} options={(teams.data?.teams ?? []).map((t) => ({ value: t.id, label: t.name }))} />
              <Select value={outId} onChange={setOutId} options={[{ value: '', label: 'Replace out…' }, ...result.players.map((p) => ({ value: p.player.id, label: p.player.name }))]} />
              <Select value={inId} onChange={setInId} options={[{ value: '', label: 'Replace in…' }, ...result.players.map((p) => ({ value: p.player.id, label: p.player.name }))]} />
              <Button onClick={compare} disabled={!outId || !inId}>Simulate replacement</Button>
            </div>
            {result.replacement && (
              <div className="mt-3 rounded-lg border border-line bg-ink-900/50 p-3">
                <div className="text-[12px] text-slate-200">{result.replacement.out.name} → {result.replacement.in.name}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-[11px]">
                  <span className={result.replacement.deltaBatting >= 0 ? 'text-turf-400' : 'text-danger-400'}>Batting depth {result.replacement.deltaBatting >= 0 ? '+' : ''}{result.replacement.deltaBatting}</span>
                  <span className={result.replacement.deltaBowling >= 0 ? 'text-turf-400' : 'text-danger-400'}>Bowling depth {result.replacement.deltaBowling >= 0 ? '+' : ''}{result.replacement.deltaBowling}</span>
                  <span className={result.replacement.deltaBalance >= 0 ? 'text-turf-400' : 'text-danger-400'}>Balance {result.replacement.deltaBalance >= 0 ? '+' : ''}{result.replacement.deltaBalance}</span>
                </div>
                <div className="mt-1 text-[11px] text-slateink-300">{result.replacement.verdict}</div>
                <div className="mt-1 space-y-0.5 text-[10px] text-slateink-500">{result.replacement.caveats.map((c, i) => <div key={i}>• {c}</div>)}</div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * `useSearchParams()` suspends during prerender, so the workspace is wrapped in a
 * Suspense boundary. Without it `next build` fails on this route.
 */
export default function ComparePage() {
  return (
    <Suspense fallback={<Loading label="Preparing comparison lab" />}>
      <CompareWorkspace />
    </Suspense>
  );
}
