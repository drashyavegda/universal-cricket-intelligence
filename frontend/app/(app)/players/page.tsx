'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/client/api';
import { Badge, Button, Card, Empty, Loading, PageHeader, Select, nf } from '@/components/ui';

interface PlayerRow {
  id: string; name: string; age: number | null; role: string; team: string; state: string; overseas: boolean; capped: boolean;
  wicketkeeper: boolean; synthetic: boolean; confidence: number; runs: number; balls: number; wickets: number;
  strikeRate: number | null; average: number | null; economy: number | null; sampleLabel: string; formIndex: number | null; dotBallPct: number | null;
}
interface Resp { players: PlayerRow[]; pagination: { page: number; pages: number; total: number }; facets: { roles: string[]; teams: string[]; minAge: number; maxAge: number } }

export default function PlayersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState('strikeRate');
  const [capped, setCapped] = useState('all');
  const [overseas, setOverseas] = useState('all');
  const [maxAge, setMaxAge] = useState('');
  const url = `/api/players?page=${page}&pageSize=25&q=${encodeURIComponent(q)}&role=${role}&sort=${sort}&capped=${capped}&overseas=${overseas}${maxAge ? `&maxAge=${maxAge}` : ''}`;
  const { data, loading, error } = useApi<Resp>(url, [page, q, role, sort, capped, overseas, maxAge]);

  return (
    <div className="space-y-4">
      <PageHeader title="Player Intelligence" description="One canonical player record per identity, with computed metrics, percentile context and evidence quality. Click any player for the full intelligence card.">
        <a href="/api/export?type=players&format=csv"><Button variant="ghost">CSV</Button></a>
        <a href="/api/export?type=players&format=xlsx"><Button variant="ghost">Excel</Button></a>
      </PageHeader>

      <Card>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input className="input" placeholder="Search name, team, state…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <Select value={role} onChange={(v) => { setRole(v); setPage(1); }} options={[{ value: 'all', label: 'All roles' }, ...(data?.facets.roles ?? []).map((r) => ({ value: r, label: r }))]} />
          <Select value={sort} onChange={setSort} options={[{ value: 'strikeRate', label: 'Sort: strike rate' }, { value: 'economy', label: 'Sort: economy' }, { value: 'runs', label: 'Sort: runs' }, { value: 'wickets', label: 'Sort: wickets' }, { value: 'age', label: 'Sort: age' }, { value: 'name', label: 'Sort: name' }]} />
          <Select value={capped} onChange={setCapped} options={[{ value: 'all', label: 'Capped & uncapped' }, { value: 'false', label: 'Uncapped only' }, { value: 'true', label: 'Capped only' }]} />
          <Select value={overseas} onChange={setOverseas} options={[{ value: 'all', label: 'All players' }, { value: 'false', label: 'Domestic only' }, { value: 'true', label: 'Overseas only' }]} />
          <input className="input" placeholder="Max age" inputMode="numeric" value={maxAge} onChange={(e) => { setMaxAge(e.target.value.replace(/\D/g, '')); setPage(1); }} />
        </div>
      </Card>

      {loading && <Loading />}
      {error && <Empty title="Could not load players">{error}</Empty>}
      {data && (
        <Card title={`${data.pagination.total} players`} subtitle={`Page ${data.pagination.page} of ${data.pagination.pages || 1} · metrics computed from the workspace dataset`}>
          <div className="overflow-auto">
            <table className="table-base">
              <thead><tr><th>Player</th><th>Role</th><th>Age</th><th>Runs</th><th>SR</th><th>Avg</th><th>Wkts</th><th>Econ</th><th>Sample</th><th>Data</th></tr></thead>
              <tbody>
                {data.players.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/players/${p.id}`} className="text-[12.5px] font-medium text-slate-100 hover:text-turf-400">{p.name}</Link><div className="text-[10px] text-slateink-500">{p.team} · {p.state}</div></td>
                    <td className="text-[11.5px] text-slateink-300">{p.role}{p.wicketkeeper && ' 🧤'}</td>
                    <td className="font-mono text-[11.5px]">{p.age ?? '—'}</td>
                    <td className="font-mono text-[11.5px]">{p.runs}</td>
                    <td className="font-mono text-[11.5px] text-turf-400">{nf(p.strikeRate)}</td>
                    <td className="font-mono text-[11.5px]">{nf(p.average)}</td>
                    <td className="font-mono text-[11.5px]">{p.wickets}</td>
                    <td className="font-mono text-[11.5px] text-gold-300">{nf(p.economy, 2)}</td>
                    <td><Badge tone={p.sampleLabel === 'strong' ? 'green' : p.sampleLabel === 'moderate' ? 'gold' : p.sampleLabel === 'limited' ? 'amber' : 'red'}>{p.sampleLabel}</Badge></td>
                    <td>{p.synthetic ? <Badge tone="gold">DEMO</Badge> : <Badge tone="green">UPLOADED</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slateink-400">
            <span>Percentiles are computed inside the current filtered cohort, so they change with the filters.</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="ghost" size="xs" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
