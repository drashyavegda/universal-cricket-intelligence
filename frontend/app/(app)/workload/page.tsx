'use client';
import { useEffect, useState } from 'react';
import { apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, ProgressBar, Select, Stat, nf } from '@/components/ui';
import { BarCompare } from '@/components/charts';
import { HeartPulse } from 'lucide-react';

interface Profile {
  playerId: string; name: string; matchesLast21: number; matchesLast90: number; ballsBowledLast21: number; ballsBowledLast90: number;
  ballsFacedLast21: number; consecutiveMatches: number; restDaysBetweenLast: number | null; acuteChronicRatio: number | null;
  workloadIndex: number; riskIndicator: string; flags: { label: string; detail: string; action: string }[];
  scheduleCongestion: { windowDays: number; matches: number; note: string }[]; rotationSuggestion: string;
  availability: { status: string; note: string }; disclaimer: string;
}

export default function WorkloadPage() {
  const list = useApi<{ profiles: Profile[]; referenceDate: string; summary: { elevated: number; watch: number; low: number }; policy: string }>('/api/workload');
  const [playerId, setPlayerId] = useState('');
  const [extraMatches, setExtraMatches] = useState(2);
  const [extraOvers, setExtraOvers] = useState(8);
  const [availability, setAvailability] = useState('unknown');
  const [selected, setSelected] = useState<{ profile: Profile; whatIf: { projectedIndex: number; delta: number; projectedRisk: string; note: string } } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (list.data?.profiles.length && !playerId) setPlayerId(list.data.profiles[0].playerId); }, [list.data, playerId]);

  const analyse = async () => {
    setBusy(true);
    try { setSelected(await apiPost<{ profile: Profile; whatIf: { projectedIndex: number; delta: number; projectedRisk: string; note: string } }>('/api/workload', { playerId, extraMatches, extraOvers, availability })); }
    finally { setBusy(false); }
  };

  const profile = selected?.profile ?? list.data?.profiles.find((p) => p.playerId === playerId);

  return (
    <div className="space-y-4">
      <PageHeader title="Workload Management" description="Load quantification from match logs. This module never diagnoses injury and never declares a player fit or unavailable — it flags patterns for a conversation with medical staff.">
        <Button onClick={analyse} disabled={busy}><HeartPulse size={14} />{busy ? 'Analysing…' : 'Analyse player'}</Button>
      </PageHeader>

      {list.loading && <Loading />}
      {list.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Players profiled" value={list.data.profiles.length} />
          <Stat label="Elevated load" value={list.data.summary.elevated} tone="red" />
          <Stat label="Watch" value={list.data.summary.watch} tone="amber" />
          <Stat label="Reference date" value={list.data.referenceDate} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Live workload board" subtitle="Top 60 players by recent load; click a row to analyse">
          <div className="max-h-[480px] overflow-auto">
            <table className="table-base">
              <thead><tr><th>Player</th><th>Matches 21d</th><th>Balls 21d</th><th>Acute:chronic</th><th>Index</th><th>Indicator</th></tr></thead>
              <tbody>
                {list.data?.profiles.slice(0, 40).map((p) => (
                  <tr key={p.playerId} onClick={() => { setPlayerId(p.playerId); setSelected(null); }} className="cursor-pointer">
                    <td className="text-[11.5px] text-slate-100">{p.name}</td>
                    <td className="font-mono text-[11px]">{p.matchesLast21}</td>
                    <td className="font-mono text-[11px]">{p.ballsBowledLast21}</td>
                    <td className="font-mono text-[11px]">{p.acuteChronicRatio ?? '—'}</td>
                    <td className="w-24"><ProgressBar value={p.workloadIndex} tone={p.workloadIndex >= 70 ? 'red' : p.workloadIndex >= 45 ? 'gold' : 'green'} /></td>
                    <td><Badge tone={p.riskIndicator === 'elevated' ? 'red' : p.riskIndicator === 'watch' ? 'amber' : 'green'}>{p.riskIndicator}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="What-if load simulator" subtitle="Add matches and overs to project the index">
            <div className="space-y-2">
              <Field label="Player"><Select value={playerId} onChange={(v) => { setPlayerId(v); setSelected(null); }} options={(list.data?.profiles ?? []).map((p) => ({ value: p.playerId, label: p.name }))} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Extra matches"><input className="input" type="number" min={0} max={12} value={extraMatches} onChange={(e) => setExtraMatches(Number(e.target.value))} /></Field>
                <Field label="Extra overs"><input className="input" type="number" min={0} max={40} value={extraOvers} onChange={(e) => setExtraOvers(Number(e.target.value))} /></Field>
              </div>
              <Field label="Verified availability (human-entered)" hint="The platform does not infer fitness. Only record what an authorised source confirms.">
                <Select value={availability} onChange={setAvailability} options={[{ value: 'unknown', label: 'Unknown (default)' }, { value: 'available', label: 'Available' }, { value: 'managed', label: 'Managed / modified load' }, { value: 'unavailable', label: 'Unavailable' }]} />
              </Field>
              <Button className="w-full" onClick={analyse} disabled={!playerId}>Run analysis</Button>
            </div>
          </Card>

          {profile && (
            <Card title={profile.name} subtitle={selected ? selected.whatIf.note : 'Current load profile'}>
              <KV items={[
                { k: 'Workload index', v: `${profile.workloadIndex}/100 (${profile.riskIndicator})` },
                { k: 'Matches 21d / 90d', v: `${profile.matchesLast21} / ${profile.matchesLast90}` },
                { k: 'Balls bowled 21d', v: profile.ballsBowledLast21 },
                { k: 'Acute:chronic', v: profile.acuteChronicRatio ?? 'insufficient chronic load' },
                { k: 'Consecutive matches', v: profile.consecutiveMatches },
                { k: 'Availability', v: profile.availability.status },
              ]} />
              {selected && <div className="mt-2 rounded-lg border border-turf-500/25 bg-turf-500/[0.06] px-2 py-1.5 text-[10.5px] text-turf-300">Projected index {selected.whatIf.projectedIndex} ({selected.whatIf.projectedRisk}), change {selected.whatIf.delta >= 0 ? '+' : ''}{selected.whatIf.delta}</div>}
              <div className="mt-2 space-y-1">{profile.flags.map((f) => <div key={f.label} className="rounded border border-ember-500/25 bg-ember-500/[0.06] px-2 py-1 text-[10px] text-ember-400"><strong>{f.label}</strong>: {f.detail} → {f.action}</div>)}</div>
              <div className="mt-2 text-[10.5px] text-slateink-400">{profile.rotationSuggestion}</div>
              <div className="danger-note mt-2">{profile.disclaimer}</div>
            </Card>
          )}
        </div>
      </div>

      <Card title="Schedule congestion" subtitle="Matches within rolling windows of the reference date">
        <BarCompare data={(profile?.scheduleCongestion ?? []).map((c) => ({ name: `${c.windowDays}d`, value: c.matches }))} colour="#E8C15C" height={160} label="Matches" />
        <div className="mt-2 text-[10.5px] text-slateink-400">{list.data?.policy}</div>
      </Card>
    </div>
  );
}
