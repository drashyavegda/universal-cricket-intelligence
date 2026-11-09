'use client';
import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, Select, Stat, nf } from '@/components/ui';
import { Globe2, Radar } from 'lucide-react';

interface Hit { playerId: string; name: string; age: number | null; role: string; region: string; level: string; discoveryScore: number; why: string[]; verificationStatus: string; sampleBalls: number; potential: number; caveats: string[] }
interface Resp {
  hits: Hit[]; coverage: { total: number; eligible: number; byRegion: { region: string; count: number }[] };
  notes: string[]; regions: string[]; roles: string[];
  sourceSets: { uploaded: number; demo: number; external: number }; identityNote: string;
}

export default function ScoutingPage() {
  const [region, setRegion] = useState('Any');
  const [role, setRole] = useState('');
  const [ageMin, setAgeMin] = useState(16);
  const [ageMax, setAgeMax] = useState(23);
  const [data, setData] = useState<Resp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setError(null);
    try { setData(await apiPost<Resp>('/api/scouting', { region, role: role || null, ageMin, ageMax })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Global Scouting Network" description="Mission-based discovery across regions, roles and age bands. Uploaded, external and demo records are counted separately so a synthetic record can never be mistaken for a scouted one.">
        <Button onClick={run} disabled={busy}><Radar size={14} />{busy ? 'Scouting…' : 'Run mission'}</Button>
      </PageHeader>

      <Card title="Mission parameters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Region"><Select value={region} onChange={setRegion} options={[{ value: 'Any', label: 'Any region' }, ...(data?.regions ?? ['Gujarat', 'Mumbai', 'Delhi', 'Karnataka']).map((r) => ({ value: r, label: r }))]} /></Field>
          <Field label="Role"><Select value={role} onChange={setRole} options={[{ value: '', label: 'Any role' }, ...(data?.roles ?? []).map((r) => ({ value: r, label: r }))]} /></Field>
          <Field label="Min age"><input className="input" type="number" value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} /></Field>
          <Field label="Max age"><input className="input" type="number" value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} /></Field>
          <div className="flex items-end"><span className="muted">Filters combine; the mission returns a ranked discovery list with verification status per player.</span></div>
        </div>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      {busy && <Loading label="Scanning the talent pool" />}
      {!data && !busy && <Empty title="No mission run yet">Set your parameters and run a scouting mission.</Empty>}

      {data && !busy && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Pool scanned" value={data.coverage.total} />
            <Stat label="Eligible" value={data.coverage.eligible} tone="green" />
            <Stat label="Uploaded records" value={data.sourceSets.uploaded} />
            <Stat label="Demo records" value={data.sourceSets.demo} tone="gold" hint="Synthetic — never present these as real players" />
            <Stat label="Top discovery" value={data.hits[0]?.name ?? '—'} hint={data.hits[0] ? `score ${nf(data.hits[0].discoveryScore, 1)}` : ''} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2" title="Discovery hits" subtitle="Performance-weighted with a hidden-gem bonus for thin samples — verify before acting">
              <div className="max-h-[520px] overflow-auto">
                <table className="table-base">
                  <thead><tr><th>#</th><th>Player</th><th>Region</th><th>Age</th><th>Score</th><th>Potential</th><th>Verification</th></tr></thead>
                  <tbody>
                    {data.hits.slice(0, 30).map((h, i) => (
                      <tr key={h.playerId}>
                        <td className="font-mono text-[10.5px] text-slateink-500">{i + 1}</td>
                        <td><Link href={`/players/${h.playerId}`} className="text-[11.5px] text-slate-100 hover:text-turf-400">{h.name}</Link><div className="text-[9.5px] text-slateink-500">{h.role} · {h.sampleBalls} balls</div></td>
                        <td className="text-[10.5px] text-slateink-400">{h.region}</td>
                        <td className="font-mono text-[11px]">{h.age ?? '—'}</td>
                        <td className="font-mono text-[11.5px] text-turf-400">{nf(h.discoveryScore, 1)}</td>
                        <td className="font-mono text-[11px] text-gold-300">{nf(h.potential, 0)}</td>
                        <td><Badge tone={h.verificationStatus === 'uploaded' ? 'green' : h.verificationStatus === 'external' ? 'amber' : 'gold'}>{h.verificationStatus}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="space-y-4">
              <Card title="Regional coverage">
                <div className="max-h-[220px] space-y-1 overflow-auto">
                  {data.coverage.byRegion.slice(0, 12).map((r) => (
                    <div key={r.region} className="flex items-center justify-between text-[10.5px]"><span className="truncate text-slateink-300">{r.region}</span><span className="font-mono text-slate-200">{r.count}</span></div>
                  ))}
                </div>
              </Card>
              <Card title="Identity & verification">
                <div className="text-[10.5px] leading-relaxed text-slateink-400">{data.identityNote}</div>
                <div className="mt-2 space-y-1 text-[10px] text-slateink-500">{data.notes.map((n, i) => <div key={i}>• {n}</div>)}</div>
              </Card>
              <Card title="Top hit rationale">
                {data.hits[0] ? (
                  <>
                    <div className="text-[12px] text-slate-100">{data.hits[0].name}</div>
                    <ul className="mt-1 space-y-0.5 text-[10.5px] text-slateink-300">{data.hits[0].why.map((w, i) => <li key={i}>• {w}</li>)}</ul>
                    <div className="mt-2 space-y-1">{data.hits[0].caveats.map((c, i) => <div key={i} className="text-[10px] text-ember-400">⚠ {c}</div>)}</div>
                  </>
                ) : <Empty title="No hits" />}
              </Card>
            </div>
          </div>
        </>
      )}
      <div className="flex items-center gap-2 text-[10.5px] text-slateink-500"><Globe2 size={12} /> Global coverage in demo mode is synthetic. Connect a licensed feed or upload regional datasets to extend it — the adapter and UI stay the same.</div>
    </div>
  );
}
