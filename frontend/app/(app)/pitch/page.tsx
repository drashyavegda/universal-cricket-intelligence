'use client';
import { useEffect, useState } from 'react';
import { apiPost } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, KV, Loading, PageHeader, Select, Slider, Stat, Tabs, nf } from '@/components/ui';
import { BarCompare, LineTrend } from '@/components/charts';
import { MapPin } from 'lucide-react';

interface PitchResp {
  venue: { id: string; name: string; city: string; avgFirstInnings: number; avgSecondInnings: number; chaseWinRate: number; dewRisk: number; sampleMatches: number; pitch: { paceRating: number; bounceRating: number; seamRating: number; spinRating: number; battingFriendliness: number; surfaceSpeed: number; twoPaced: number; deterioration: number } };
  weather: { temperatureC: number; humidityPct: number; windKph: number; cloudCoverPct: number; rainProbability: number; dewExpected: boolean; source: string } | null;
  dna: { summary: string; values: { label: string; value: string; evidence: string; note: string }[]; dna: { trait: string; score: number; evidence: string }[] };
  toss: { decision: string; confidence: number; reasons: string[]; caveat: string };
  whatIf: { projectedFirst: number; projectedSecond: number; chaseEdge: number; spinAdvantage: number; paceAdvantage: number; selectionBias: string; note: string };
  rankings: { batters: { id: string; name: string; role: string; score: number; reason: string; synthetic: boolean }[]; spinners: { id: string; name: string; score: number; reason: string }[]; pacers: { id: string; name: string; score: number; reason: string }[] };
  auctionImplication: string;
  venues: { id: string; name: string; city: string }[];
}

export default function PitchPage() {
  const [venueId, setVenueId] = useState('');
  const [data, setData] = useState<PitchResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batting, setBatting] = useState(6.5);
  const [pace, setPace] = useState(6);
  const [spin, setSpin] = useState(5.5);
  const [dew, setDew] = useState(0.5);
  const [tab, setTab] = useState<'dna' | 'whatif' | 'selection' | 'compare'>('dna');

  const load = async (id?: string, adjustment?: { battingFriendliness: number; paceRating: number; spinRating: number; dewRisk: number }) => {
    setBusy(true); setError(null);
    try {
      const res = await apiPost<PitchResp>('/api/pitch', { venueId: id ?? (venueId || undefined), adjustment });
      setData(res);
      if (!venueId) setVenueId(res.venue.id);
      setBatting(res.venue.pitch.battingFriendliness); setPace(res.venue.pitch.paceRating); setSpin(res.venue.pitch.spinRating); setDew(res.venue.dewRisk);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Pitch & Venue Intelligence" description="Historic aggregates, current observations, forecasts and model inference are kept separate and labelled — never blended silently.">
        <Select value={venueId} onChange={(v) => { setVenueId(v); void load(v); }} options={(data?.venues ?? []).map((v) => ({ value: v.id, label: `${v.name} — ${v.city}` }))} className="max-w-[280px]" />
        <Button onClick={() => load()} disabled={busy}><MapPin size={14} />{busy ? 'Reading…' : 'Refresh'}</Button>
      </PageHeader>

      {error && <Alert tone="error">{error}</Alert>}
      {busy && !data && <Loading label="Reading venue profile" />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Stat label="1st innings par" value={data.venue.avgFirstInnings} hint={`${data.venue.sampleMatches} sampled fixtures`} />
            <Stat label="Chase win share" value={`${(data.venue.chaseWinRate * 100).toFixed(0)}%`} tone={data.venue.chaseWinRate > 0.53 ? 'green' : 'amber'} />
            <Stat label="Spin rating" value={`${data.venue.pitch.spinRating}/10`} tone="gold" />
            <Stat label="Pace rating" value={`${data.venue.pitch.paceRating}/10`} tone="green" />
            <Stat label="Dew risk" value={`${(data.venue.dewRisk * 100).toFixed(0)}%`} tone={data.venue.dewRisk > 0.6 ? 'amber' : 'default'} />
            <Stat label="Toss lean" value={data.toss.decision === 'bowl' ? 'Bowl' : 'Bat'} hint={`${(data.toss.confidence * 100).toFixed(0)}% confidence`} />
          </div>

          <Tabs tabs={[{ key: 'dna', label: 'Venue DNA' }, { key: 'whatif', label: 'What-if simulator' }, { key: 'selection', label: 'Suitability rankings' }, { key: 'compare', label: 'Venue comparison' }]} active={tab} onChange={setTab} />

          {tab === 'dna' && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2" title={`${data.venue.name} — evidence table`} subtitle={data.dna.summary}>
                <div className="max-h-[420px] overflow-auto">
                  <table className="table-base">
                    <thead><tr><th>Signal</th><th>Value</th><th>Evidence</th><th>Note</th></tr></thead>
                    <tbody>
                      {data.dna.values.map((v) => (
                        <tr key={v.label}>
                          <td className="text-[11.5px] text-slate-200">{v.label}</td>
                          <td className="font-mono text-[11.5px] text-turf-400">{v.value}</td>
                          <td><Badge tone={v.evidence === 'historical' ? 'green' : v.evidence === 'observation' ? 'gold' : v.evidence === 'forecast' ? 'amber' : 'slate'}>{v.evidence}</Badge></td>
                          <td className="text-[10.5px] text-slateink-500">{v.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <div className="space-y-4">
                <Card title="Venue DNA profile">
                  <BarCompare data={data.dna.dna.map((d) => ({ name: d.trait, value: d.score }))} colour="#E8C15C" height={240} label="Score" horizontal />
                </Card>
                <Card title="Toss strategy" subtitle={`${data.toss.decision === 'bowl' ? 'Bowl first' : 'Bat first'} · ${(data.toss.confidence * 100).toFixed(0)}% confidence`}>
                  <ul className="space-y-1 text-[11px] text-slateink-300">{data.toss.reasons.map((r, i) => <li key={i}>• {r}</li>)}</ul>
                  <div className="disclaimer mt-2">{data.toss.caveat}</div>
                </Card>
              </div>
            </div>
          )}

          {tab === 'whatif' && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="Surface what-if" subtitle="Adjust the surface profile and see the projected effect">
                <div className="space-y-3">
                  <Slider label="Batting friendliness" value={batting} min={1} max={10} step={0.5} onChange={setBatting} />
                  <Slider label="Pace rating" value={pace} min={1} max={10} step={0.5} onChange={setPace} />
                  <Slider label="Spin rating" value={spin} min={1} max={10} step={0.5} onChange={setSpin} />
                  <Slider label="Dew risk" value={dew} min={0} max={1} step={0.05} onChange={setDew} />
                  <Button className="w-full" onClick={() => load(venueId, { battingFriendliness: batting, paceRating: pace, spinRating: spin, dewRisk: dew })}>Recalculate</Button>
                </div>
              </Card>
              <Card className="lg:col-span-2" title="Projected effect">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="1st innings" value={data.whatIf.projectedFirst} />
                  <Stat label="2nd innings" value={data.whatIf.projectedSecond} />
                  <Stat label="Chase edge" value={data.whatIf.chaseEdge >= 0 ? `+${data.whatIf.chaseEdge}` : data.whatIf.chaseEdge} tone={data.whatIf.chaseEdge > 0 ? 'green' : 'amber'} />
                  <Stat label="Spin vs pace" value={`${data.whatIf.spinAdvantage} / ${data.whatIf.paceAdvantage}`} />
                </div>
                <div className="mt-3 rounded-lg border border-line bg-ink-900/50 p-2.5 text-[11.5px] text-turf-300">{data.whatIf.selectionBias}</div>
                <div className="disclaimer mt-2">{data.whatIf.note}</div>
                <div className="mt-3 text-[11.5px] text-slateink-300">{data.auctionImplication}</div>
              </Card>
            </div>
          )}

          {tab === 'selection' && (
            <div className="grid gap-4 lg:grid-cols-3">
              {[{ title: 'Batters', rows: data.rankings.batters }, { title: 'Spinners', rows: data.rankings.spinners }, { title: 'Pacers', rows: data.rankings.pacers }].map((group) => (
                <Card key={group.title} title={group.title} subtitle="Pitch suitability score for this surface">
                  <div className="space-y-1">
                    {group.rows.slice(0, 8).map((p, i) => (
                      <div key={p.id} className="rounded border border-line/50 px-2 py-1.5">
                        <div className="flex items-center justify-between text-[11.5px]">
                          <span className="text-slate-200">{i + 1}. {p.name}{'synthetic' in p && p.synthetic ? ' ·DEMO' : ''}</span>
                          <span className="font-mono text-turf-400">{nf(p.score, 0)}</span>
                        </div>
                        <div className="text-[9.5px] leading-snug text-slateink-500">{p.reason}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {tab === 'compare' && (
            <Card title="Venue comparison" subtitle="Historical aggregates side by side">
              <div className="overflow-auto">
                <table className="table-base">
                  <thead><tr><th>Venue</th><th>1st inns</th><th>Chase %</th><th>Pace</th><th>Spin</th><th>Batting</th><th>Deterioration</th></tr></thead>
                  <tbody>
                    {data.venues.map((v) => (
                      <tr key={v.id}><td className="text-[11.5px] text-slate-200">{v.name}<div className="text-[10px] text-slateink-500">{v.city}</div></td><td colSpan={6} className="text-[10.5px] text-slateink-400">Select this venue to load its full profile</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2"><LineTrend data={data.dna.dna.map((d) => ({ name: d.trait, score: d.score }))} series={[{ key: 'score', label: data.venue.name }]} height={220} /></div>
            </Card>
          )}
        </>
      )}
      {!data && !busy && <Empty title="No venue loaded" />}
    </div>
  );
}
