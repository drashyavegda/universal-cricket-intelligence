'use client';
import { useEffect, useState } from 'react';
import { apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, ProgressBar, Select, Slider, Stat, Tabs, nf, money } from '@/components/ui';
import { BarCompare } from '@/components/charts';
import { Gavel, TrendingDown, TrendingUp } from 'lucide-react';

interface Valuation { playerId: string; name: string; role: string; age: number | null; qualityScore: number; scarcityIndex: number; demandIndex: number; fairValueLakh: number; rangeLakh: { low: number; high: number }; maxBid: { conservative: number; balanced: number; aggressive: number }; sampleReliability: number; drivers: { label: string; value: string }[]; caveats: string[] }
interface AuctionGet {
  team: { id: string; name: string; purseLakh: number; slots: number; overseasLimit: number };
  budget: { totalPurseLakh: number; spentLakh: number; remainingLakh: number; vacantSlots: number; overseasSlots: number; averagePerSlotLakh: number };
  valuations: Valuation[];
  valueBuckets: { overpriced: Valuation[]; undervalued: Valuation[] };
  roleShortage: Record<string, number>;
  tierStats: { baseTier: number; n: number; medianMultiple: number | null }[];
  method: string[];
  history: { playerId: string; basePriceLakh: number; soldPriceLakh: number | null; status: string; season: string }[];
  caveat: string;
}
interface SimResp {
  seed: number;
  lots: { playerId: string; playerName: string; role: string; basePriceLakh: number; status: string; soldToName: string | null; priceLakh: number | null; biddingWar: { amountLakh: number }[]; userRecommendation: { action: string; reason: string; maxBidLakh: number } }[];
  teams: { teamId: string; name: string; shortName: string; purseLakh: number; spentLakh: number; slots: number; overseasLeft: number; isUserTeam: boolean }[];
  userSummary: { signed: number; spent: number; purseLeft: number; slotsLeft: number; roleGaps: string[]; notes: string[] };
  assumptions: string[];
  disclaimer: string;
  valuations: Valuation[];
}

export default function AuctionPage() {
  const [tab, setTab] = useState<'budget' | 'room' | 'market'>('budget');
  const teams = useApi<{ teams: { id: string; name: string; isUserTeam: boolean }[] }>('/api/teams');
  const [teamId, setTeamId] = useState('');
  const [purse, setPurse] = useState(12000);
  const [aggression, setAggression] = useState(1);
  const [seed, setSeed] = useState(2027);
  const [maxLots, setMaxLots] = useState(25);
  const [sim, setSim] = useState<SimResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teams.data && !teamId) setTeamId(teams.data.teams.find((t) => t.isUserTeam)?.id ?? teams.data.teams[0].id);
  }, [teams.data, teamId]);

  const market = useApi<AuctionGet>(teamId ? `/api/auction?teamId=${teamId}` : null, [teamId]);

  const runSim = async () => {
    setBusy(true); setError(null);
    try {
      const res = await apiPost<SimResp>('/api/auction', { teamId, purseLakh: purse, aggression, seed, maxLots });
      setSim(res); setTab('room');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const budget = market.data?.budget;

  return (
    <div className="space-y-4">
      <PageHeader title="Auction Command Centre" description="Valuation, bid ceilings, budget management and a virtual auction room. Estimated value is never presented as an expected price, and simulated rivals are a model — not real franchise behaviour.">
        <Select value={teamId} onChange={setTeamId} options={(teams.data?.teams ?? []).map((t) => ({ value: t.id, label: t.name }))} className="max-w-[200px]" />
        <Button onClick={runSim} disabled={busy}><Gavel size={14} />{busy ? 'Simulating…' : 'Run auction simulation'}</Button>
      </PageHeader>

      <Tabs tabs={[{ key: 'budget', label: 'Budget & valuations' }, { key: 'room', label: 'Virtual auction room' }, { key: 'market', label: 'Market intelligence' }]} active={tab} onChange={setTab} />
      {error && <Alert tone="error">{error}</Alert>}

      {tab === 'budget' && (
        <>
          {market.loading && <Loading label="Valuing the player pool" />}
          {budget && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <Stat label="Total purse" value={money(budget.totalPurseLakh)} />
              <Stat label="Spent" value={money(budget.spentLakh)} hint="Workspace squad cost is not reconstructed in demo mode" />
              <Stat label="Remaining" value={money(budget.remainingLakh)} tone="green" />
              <Stat label="Vacant slots" value={budget.vacantSlots} tone="gold" />
              <Stat label="Overseas slots" value={budget.overseasSlots} />
              <Stat label="Average per slot" value={money(budget.averagePerSlotLakh)} hint="A ceiling guide, not a target" />
            </div>
          )}
          {market.data && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2" title="Estimated fair values & bid ceilings" subtitle="Quality percentile × scarcity × team need × competition × age headroom, shrunk by sample reliability">
                <div className="overflow-auto">
                  <table className="table-base">
                    <thead><tr><th>Player</th><th>Role</th><th>Age</th><th>Quality</th><th>Scarcity</th><th>Fair value</th><th>Band</th><th>Ceilings (cons/bala/aggr)</th></tr></thead>
                    <tbody>
                      {market.data.valuations.slice(0, 25).map((v) => (
                        <tr key={v.playerId}>
                          <td className="text-[12px] text-slate-100">{v.name}</td>
                          <td className="text-[11px] text-slateink-300">{v.role}</td>
                          <td className="font-mono text-[11.5px]">{v.age ?? '—'}</td>
                          <td className="font-mono text-[11.5px]">{nf(v.qualityScore, 0)}</td>
                          <td><Badge tone={v.scarcityIndex > 0.6 ? 'red' : v.scarcityIndex > 0.4 ? 'amber' : 'slate'}>{(v.scarcityIndex * 100).toFixed(0)}%</Badge></td>
                          <td className="font-mono text-[11.5px] text-gold-300">{money(v.fairValueLakh)}</td>
                          <td className="font-mono text-[10.5px] text-slateink-400">{money(v.rangeLakh.low)}–{money(v.rangeLakh.high)}</td>
                          <td className="font-mono text-[10.5px]">{money(v.maxBid.conservative)} / <span className="text-turf-400">{money(v.maxBid.balanced)}</span> / <span className="text-ember-400">{money(v.maxBid.aggressive)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <div className="space-y-4">
                <Card title="Per-lot planning" subtitle="Set your own purse and aggression before simulating">
                  <Field label={`Purse (₹ lakh): ${purse}`}><Slider value={purse} min={2000} max={20000} step={500} onChange={setPurse} /></Field>
                  <div className="mt-2"><Field label={`Aggression multiplier: ${aggression}`}><Slider value={aggression} min={0.7} max={1.4} step={0.05} onChange={setAggression} /></Field></div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Field label="Seed"><input className="input" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></Field>
                    <Field label="Lots"><input className="input" type="number" min={10} max={60} value={maxLots} onChange={(e) => setMaxLots(Number(e.target.value))} /></Field>
                  </div>
                  <Button className="mt-2 w-full" onClick={runSim} disabled={busy}>Simulate with these settings</Button>
                  <div className="disclaimer mt-2">{market.data.caveat}</div>
                </Card>
                <Card title="Role scarcity" subtitle="Share of strong options in each role (higher = scarcer)">
                  <div className="space-y-1">
                    {Object.entries(market.data.roleShortage).slice(0, 8).map(([role, v]) => (
                      <div key={role} className="flex items-center gap-2 text-[10.5px]">
                        <span className="w-32 truncate text-slateink-300">{role}</span>
                        <div className="flex-1"><ProgressBar value={v * 100} tone={v > 0.6 ? 'red' : v > 0.4 ? 'gold' : 'green'} /></div>
                        <span className="w-8 text-right font-mono text-slateink-400">{(v * 100).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'room' && (
        <>
          {!sim && <Empty title="No simulation yet">Run a simulation to populate the virtual auction room.</Empty>}
          {sim && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Stat label="Players signed" value={sim.userSummary.signed} />
                <Stat label="Spent" value={money(sim.userSummary.spent)} tone="gold" />
                <Stat label="Purse left" value={money(sim.userSummary.purseLeft)} tone="green" />
                <Stat label="Slots left" value={sim.userSummary.slotsLeft} />
                <Stat label="Role gaps" value={sim.userSummary.roleGaps.length} tone={sim.userSummary.roleGaps.length ? 'red' : 'green'} hint={sim.userSummary.roleGaps.slice(0, 2).join(', ') || 'No priority role left unfilled'} />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2" title="Lots & recommendations" subtitle={`Seed ${sim.seed} — reproducible. Recommendation compares the live price against your ceiling and the fair value.`}>
                  <div className="max-h-[540px] overflow-auto">
                    <table className="table-base">
                      <thead><tr><th>Player</th><th>Role</th><th>Base</th><th>Result</th><th>Price</th><th>Bids</th><th>Your call</th></tr></thead>
                      <tbody>
                        {sim.lots.map((l) => (
                          <tr key={l.playerId}>
                            <td className="text-[11.5px] text-slate-100">{l.playerName}</td>
                            <td className="text-[10.5px] text-slateink-400">{l.role}</td>
                            <td className="font-mono text-[10.5px]">{money(l.basePriceLakh)}</td>
                            <td>{l.status === 'sold' ? <Badge tone="green">{l.soldToName}</Badge> : <Badge tone="slate">unsold</Badge>}</td>
                            <td className="font-mono text-[11px] text-gold-300">{l.priceLakh ? money(l.priceLakh) : '—'}</td>
                            <td className="font-mono text-[10px] text-slateink-500">{l.biddingWar.length}</td>
                            <td>
                              <Badge tone={l.userRecommendation.action === 'bid' ? 'green' : l.userRecommendation.action === 'hold' ? 'amber' : 'red'}>{l.userRecommendation.action}</Badge>
                              <div className="mt-0.5 max-w-[220px] text-[9.5px] leading-snug text-slateink-500">{l.userRecommendation.reason}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <div className="space-y-4">
                  <Card title="Franchise purses after the room" subtitle="Simulated rivals">
                    <div className="space-y-1.5">
                      {sim.teams.map((t) => (
                        <div key={t.teamId} className="rounded-lg border border-line/60 px-2 py-1.5">
                          <div className="flex items-center justify-between text-[11px]"><span className={t.isUserTeam ? 'text-turf-400' : 'text-slate-200'}>{t.shortName}{t.isUserTeam && ' (you)'}</span><span className="font-mono text-slateink-400">{money(t.purseLakh)}</span></div>
                          <div className="text-[9.5px] text-slateink-500">spent {money(t.spentLakh)} · slots {t.slots} · overseas {t.overseasLeft}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card title="Simulation assumptions">
                    <ul className="space-y-1 text-[10px] leading-relaxed text-slateink-400">{sim.assumptions.map((a, i) => <li key={i}>• {a}</li>)}</ul>
                    <div className="danger-note mt-2">{sim.disclaimer}</div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'market' && market.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Historical multiples by base tier" subtitle="Demo auction history — synthetic, used only to calibrate the band width">
            <BarCompare data={market.data.tierStats.map((t) => ({ name: `₹${t.baseTier}L`, value: t.medianMultiple ?? 0 }))} colour="#E8C15C" height={200} label="Median multiple" />
            <div className="mt-2 space-y-1 text-[10.5px] text-slateink-400">{market.data.tierStats.map((t) => <div key={t.baseTier}>₹{t.baseTier}L base: {t.n} sold · median ×{t.medianMultiple ?? '—'}</div>)}</div>
          </Card>
          <Card title="Pricing anomalies" subtitle="Relative to the median fair value in this pool">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] text-ember-400"><TrendingUp size={12} /> Above median ×1.5</div>
                {market.data.valueBuckets.overpriced.slice(0, 5).map((v) => <div key={v.playerId} className="flex justify-between text-[10.5px] text-slateink-300"><span>{v.name}</span><span className="font-mono text-ember-400">{money(v.fairValueLakh)}</span></div>)}
                {!market.data.valueBuckets.overpriced.length && <div className="text-[10.5px] text-slateink-500">None</div>}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] text-turf-400"><TrendingDown size={12} /> Below median ×0.6</div>
                {market.data.valueBuckets.undervalued.slice(0, 5).map((v) => <div key={v.playerId} className="flex justify-between text-[10.5px] text-slateink-300"><span>{v.name}</span><span className="font-mono text-turf-400">{money(v.fairValueLakh)}</span></div>)}
                {!market.data.valueBuckets.undervalued.length && <div className="text-[10.5px] text-slateink-500">None</div>}
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-line bg-ink-900/50 p-2.5">
              <div className="card-title mb-1">Valuation method</div>
              <div className="space-y-0.5 font-mono text-[9.5px] leading-relaxed text-slateink-400">{market.data.method.map((m, i) => <div key={i}>{m}</div>)}</div>
            </div>
          </Card>
          <Card className="lg:col-span-2" title="Auction market digital twin" subtitle="Change demand, budgets and aggression, then re-run the room to see how outcomes shift">
            <KV items={[
              { k: 'Scenario knobs', v: 'Purse, aggression, seed, lot count' },
              { k: 'Rival model', v: 'Needs + purse + scarcity + alternatives, with σ≈14% noise' },
              { k: 'Deterministic', v: 'Same seed ⇒ identical room outcome' },
              { k: 'Not modelled', v: 'Pre-auction agreements, RTM cards, agent tactics, private information' },
            ]} />
          </Card>
        </div>
      )}
    </div>
  );
}
