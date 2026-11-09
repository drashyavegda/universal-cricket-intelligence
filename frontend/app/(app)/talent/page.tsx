'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, ProgressBar, Select, Slider, Stat, Tabs, nf } from '@/components/ui';
import { BarCompare } from '@/components/charts';
import { Sparkles, Target, Users } from 'lucide-react';

interface TalentRow {
  rank: number; score: number; rawScore: number; evidenceAdjustment: number; ageBonus: number; positives: string[]; negatives: string[]; explanation: string; coverage: number;
  potential?: { potential: number; band: string; scenarios: { label: string; score: number }[]; drivers: { label: string; value: string; effect: string }[]; confidence: number; caveats: string[] };
  player: { id: string; name: string; age: number | null; dob: string | null; role: string; team: string; state: string; capped: boolean; overseas: boolean; synthetic: boolean; strikeRate: number | null; average: number | null; economy: number | null; bowlingSR: number | null; runs: number; balls: number; wickets: number; confidence: number; sampleLabel: string };
}
interface TalentResp {
  filters: { maxAge: number; minAge: number; uncappedOnly: boolean; domesticOnly: boolean; preset: string };
  counts: { poolSize: number; excludedNoDob: number };
  rows: TalentRow[];
  ageDistribution: { bucket: string; count: number }[];
  sensitivity: { key: string; label: string; spearman: number | null; maxRankShift: number }[];
  assumptions: string[];
  roleGaps: { batters: number; bowlers: number; allRounders: number };
  rrWorkspace: { brief: string; referenceDate: string; warnings: string[]; presets: { key: string; label: string; blurb: string }[]; weightsUsed: Record<string, number> };
}
interface ShortlistSummary { id: string; name: string; status: string; createdAt: string; entries: { playerId: string; rank: number; priority: string; score: number; note: string }[] }

export default function TalentPage() {
  const [tab, setTab] = useState<'discovery' | 'rr' | 'shortlists'>('discovery');
  const [maxAge, setMaxAge] = useState(23);
  const [minAge, setMinAge] = useState(16);
  const [preset, setPreset] = useState('young_talented_batter');
  const [size, setSize] = useState(15);
  const [ageWeight, setAgeWeight] = useState(0.9);
  const [uncappedOnly, setUncappedOnly] = useState(true);
  const [domesticOnly, setDomesticOnly] = useState(true);
  const [result, setResult] = useState<TalentResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortlistMsg, setShortlistMsg] = useState<string | null>(null);
  const shortlists = useApi<{ shortlists: ShortlistSummary[] }>('/api/shortlists');

  const run = async (overrides: Partial<{ maxAge: number; preset: string; size: number; ageWeight: number }> = {}) => {
    setBusy(true); setError(null);
    try {
      const res = await apiPost<TalentResp>('/api/talent', {
        maxAge: overrides.maxAge ?? maxAge, minAge, presetKey: overrides.preset ?? preset, size: overrides.size ?? size,
        ageWeight: overrides.ageWeight ?? ageWeight, uncappedOnly, domesticOnly,
      });
      setResult(res);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => { void run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const presets = result?.rrWorkspace.presets ?? [{ key: 'young_talented_batter', label: 'Young talented batter', blurb: '' }];

  const createShortlist = async () => {
    setShortlistMsg(null);
    try {
      const res = await apiPost<{ shortlist: ShortlistSummary; cohortSize: number }>('/api/shortlists', { name: `Talent shortlist — under ${maxAge}`, kind: preset, size: 10, presetKey: preset, maxAge });
      setShortlistMsg(`Created "${res.shortlist.name}" (draft, ${res.shortlist.entries.length} players from a cohort of ${res.cohortSize}). Approve it in the shortlists tab.`);
      await shortlists.reload();
    } catch (e) { setShortlistMsg((e as Error).message); }
  };

  const approve = async (id: string) => {
    try {
      await apiPost(`/api/shortlists/${id}`, { action: 'approve' }, 'PATCH');
      await shortlists.reload();
      setShortlistMsg('Shortlist approved and versioned. Export it as CSV from the link below.');
    } catch (e) { setShortlistMsg((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Talent Discovery" badge={<Badge tone="gold">RR WORKSPACE</Badge>}
        description="Age-filtered discovery with an explicit potential model. Age is a headroom multiplier — the engine does not simply sort by date of birth, and it separates potential from proven performance.">
        <Button onClick={() => run()} disabled={busy}><Sparkles size={14} />{busy ? 'Scanning…' : 'Run scan'}</Button>
        <Button variant="gold" onClick={createShortlist}><Target size={14} /> Build shortlist</Button>
      </PageHeader>

      <Tabs tabs={[{ key: 'discovery', label: 'Discovery engine' }, { key: 'rr', label: 'IPL 2027 RR brief' }, { key: 'shortlists', label: 'Shortlists' }]} active={tab} onChange={setTab} />

      {error && <Alert tone="error">{error}</Alert>}
      {shortlistMsg && <Alert tone={/approve|Created/i.test(shortlistMsg) ? 'success' : 'warn'}>{shortlistMsg}</Alert>}

      {tab === 'discovery' && (
        <>
          <Card title="Filters & weights" subtitle="Everything here is a parameter of a deterministic calculation — change it and the ranking recomputes.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={`Age bracket: under ${maxAge}`}>
                <Select value={maxAge} onChange={(v) => { setMaxAge(Number(v)); void run({ maxAge: Number(v) }); }} options={[19, 21, 23, 25, 27, 30].map((a) => ({ value: a, label: `Under ${a}` }))} />
              </Field>
              <Field label="Strategy preset">
                <Select value={preset} onChange={(v) => { setPreset(v); void run({ preset: v }); }} options={presets.map((p) => ({ value: p.key, label: p.label }))} />
              </Field>
              <Field label="Shortlist size"><input className="input" type="number" min={5} max={40} value={size} onChange={(e) => setSize(Number(e.target.value))} /></Field>
              <Field label={`Age headroom weight: ${ageWeight}`}><Slider value={ageWeight} min={0} max={2} step={0.1} onChange={setAgeWeight} /></Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-slateink-300"><input type="checkbox" checked={uncappedOnly} onChange={(e) => setUncappedOnly(e.target.checked)} className="accent-turf-500" />Uncapped only</label>
              <label className="flex items-center gap-1.5 text-[11px] text-slateink-300"><input type="checkbox" checked={domesticOnly} onChange={(e) => setDomesticOnly(e.target.checked)} className="accent-turf-500" />Domestic only</label>
              <span className="muted">Eligibility flags come from the dataset — verify against official competition rules.</span>
            </div>
          </Card>

          {busy && <Loading label="Ranking eligible players" />}
          {result && !busy && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Eligible cohort" value={result.counts.poolSize} hint={`Aged ${result.filters.minAge}–${result.filters.maxAge} after eligibility filters`} />
                <Stat label="Excluded (no DOB)" value={result.counts.excludedNoDob} tone="amber" hint="Age cannot be computed without a date of birth — these players are never assigned a guess" />
                <Stat label="Batters / bowlers / all-rounders" value={`${result.roleGaps.batters}/${result.roleGaps.bowlers}/${result.roleGaps.allRounders}`} hint="Composition of the returned shortlist" />
                <Stat label="Most sensitive weight" value={result.sensitivity[0]?.label ?? '—'} tone="gold" hint={result.sensitivity[0] ? `Spearman ${result.sensitivity[0].spearman} · max rank shift ${result.sensitivity[0].maxRankShift}` : ''} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2" title="Ranked talent" subtitle={`${result.rows.length} players · scores are weighted percentiles × evidence adjustment + age headroom`}>
                  <div className="max-h-[600px] space-y-1.5 overflow-auto pr-1">
                    {result.rows.map((r) => (
                      <div key={r.player.id} className="rounded-lg border border-line/60 bg-ink-900/40 p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="grid h-6 w-6 place-items-center rounded bg-ink-800 text-[10.5px] font-semibold text-gold-300">{r.rank}</div>
                          <Link href={`/players/${r.player.id}`} className="text-[12.5px] font-medium text-slate-100 hover:text-turf-400">{r.player.name}</Link>
                          <span className="text-[10.5px] text-slateink-500">{r.player.role} · {r.player.age} yrs · {r.player.team}</span>
                          {r.player.synthetic && <Badge tone="gold">DEMO</Badge>}
                          <div className="ml-auto text-right">
                            <div className="font-mono text-[12.5px] text-turf-400">{nf(r.score)}</div>
                            <div className="text-[9.5px] text-slateink-500">raw {nf(r.rawScore)} ×{nf(r.evidenceAdjustment, 2)} +{nf(r.ageBonus)}</div>
                          </div>
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10.5px] sm:grid-cols-4">
                          <div><span className="text-slateink-500">SR </span><span className="text-slate-200">{nf(r.player.strikeRate)}</span></div>
                          <div><span className="text-slateink-500">Avg </span><span className="text-slate-200">{nf(r.player.average)}</span></div>
                          <div><span className="text-slateink-500">Econ </span><span className="text-slate-200">{nf(r.player.economy, 2)}</span></div>
                          <div><span className="text-slateink-500">Balls </span><span className="text-slate-200">{r.player.balls}</span></div>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.positives.slice(0, 2).map((p, i) => <Badge key={i} tone="green">{p}</Badge>)}
                          {r.negatives.slice(0, 1).map((p, i) => <Badge key={i} tone="amber">{p}</Badge>)}
                          {r.potential && <Badge tone="gold">Potential {r.potential.potential} · {r.potential.band}</Badge>}
                        </div>
                        <div className="mt-1 text-[10px] leading-snug text-slateink-500">{r.explanation}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                <div className="space-y-4">
                  <Card title="Age distribution" subtitle="Cohort shape after filters">
                    <BarCompare data={result.ageDistribution.map((a) => ({ name: a.bucket, value: a.count }))} colour="#E8C15C" height={170} />
                  </Card>
                  <Card title="Weight sensitivity" subtitle="±20% perturbation of each weight; low Spearman = ranking is fragile">
                    <div className="space-y-1.5">
                      {result.sensitivity.slice(0, 6).map((s) => (
                        <div key={s.key}>
                          <div className="flex items-center justify-between text-[10.5px]"><span className="text-slateink-400">{s.label}</span><span className="font-mono text-slate-200">{s.spearman ?? '—'} · ±{s.maxRankShift}</span></div>
                          <ProgressBar value={(s.spearman ?? 0) * 100} tone={(s.spearman ?? 1) > 0.9 ? 'green' : (s.spearman ?? 1) > 0.75 ? 'gold' : 'red'} />
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card title="Assumptions">
                    <ul className="space-y-1 text-[10.5px] leading-relaxed text-slateink-400">{result.assumptions.map((a, i) => <li key={i}>• {a}</li>)}</ul>
                  </Card>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'rr' && result && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="IPL 2027 — uncapped domestic brief" subtitle="Rajasthan Royals SupeRR Selector Season 2 mode" actions={<Badge tone="gold">HACKATHON MODE</Badge>}>
            <p className="text-[12px] leading-relaxed text-slateink-300">{result.rrWorkspace.brief}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <KV items={[
                { k: 'Reference date for ages', v: result.rrWorkspace.referenceDate },
                { k: 'Eligible cohort', v: `${result.counts.poolSize} players` },
                { k: 'Age bracket', v: `Under ${result.filters.maxAge}` },
                { k: 'Preset', v: result.filters.preset },
              ]} />
              <div className="rounded-lg border border-line bg-ink-900/50 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-slateink-500">Weights in use</div>
                <div className="mt-1 space-y-0.5 font-mono text-[10.5px] text-slateink-300">{Object.entries(result.rrWorkspace.weightsUsed).map(([k, v]) => <div key={k}>{k} × {v}</div>)}</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="card-title mb-2">Top 10 — with reasons</div>
              <div className="space-y-1.5">
                {result.rows.slice(0, 10).map((r) => (
                  <div key={r.player.id} className="rounded-lg border border-gold-400/20 bg-gold-400/[0.04] p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[12.5px] font-medium text-slate-100">#{r.rank} {r.player.name} <span className="text-[10.5px] font-normal text-slateink-400">· {r.player.role} · {r.player.age} yrs</span></div>
                      <div className="font-mono text-[12px] text-gold-300">{nf(r.score)}</div>
                    </div>
                    <div className="mt-1 text-[10.5px] leading-relaxed text-slateink-400">{r.positives.slice(0, 2).join('; ')}{r.negatives.length ? ` · Watch: ${r.negatives[0]}` : ''}</div>
                    <div className="mt-1 text-[10px] text-slateink-500">Potential {r.potential?.potential} ({r.potential?.band}) · {r.player.sampleLabel} sample · data {r.player.synthetic ? 'DEMO' : 'UPLOADED'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-1.5">{result.rrWorkspace.warnings.map((w, i) => <Alert key={i} tone="warn">{w}</Alert>)}</div>
          </Card>
          <div className="space-y-4">
            <Card title="What the model balances">
              <ul className="space-y-1.5 text-[11px] leading-relaxed text-slateink-300">
                <li>• <strong className="text-slate-100">Age</strong> — headroom multiplier, full at ≤19 and zero at ≥31, weighted at {ageWeight}.</li>
                <li>• <strong className="text-slate-100">Performance</strong> — percentile ranks for the selected metrics inside the eligible cohort.</li>
                <li>• <strong className="text-slate-100">Role</strong> — preset restricts the metric set by role family.</li>
                <li>• <strong className="text-slate-100">Consistency</strong> — floor rate and volatility where the sample permits.</li>
                <li>• <strong className="text-slate-100">Potential</strong> — separate model using demonstrated level, season trend and reliability.</li>
                <li>• <strong className="text-slate-100">Data reliability</strong> — evidence adjustment shrinks thin samples instead of trusting them.</li>
              </ul>
            </Card>
            <Card title="Export this brief">
              <div className="flex flex-col gap-2">
                <a href="/api/export?type=rankings&format=csv&preset=young_talented_batter&maxAge=23"><Button variant="ghost">Rankings CSV</Button></a>
                <a href="/api/export?type=rankings&format=xlsx&preset=young_talented_batter&maxAge=23"><Button variant="ghost">Rankings Excel</Button></a>
                <Link href="/reports"><Button variant="gold">Generate PDF / deck</Button></Link>
              </div>
              <div className="disclaimer mt-2">Exports carry the DEMO/UPLOADED label per row so a synthetic record can never be mistaken for a real one.</div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'shortlists' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Create & approve" subtitle="Shortlists are versioned; approval requires the analyst or owner role">
            <Button className="w-full" onClick={createShortlist}><Users size={14} /> Generate from current filters</Button>
            <div className="mt-3 space-y-1.5 text-[10.5px] leading-relaxed text-slateink-400">
              <div>• Priority tiers P1/P2/P3 are assigned by rank band.</div>
              <div>• Diversity checks flag role concentration and missing keeper/bowler cover.</div>
              <div>• Backups are always suggested from the next five ranked players.</div>
            </div>
          </Card>
          <Card className="lg:col-span-2" title="Saved shortlists" subtitle="Draft → approved, with version history">
            {shortlists.loading && <Loading />}
            {!shortlists.data?.shortlists.length && <Empty title="No shortlists yet">Generate one from the discovery tab.</Empty>}
            <div className="space-y-2">
              {shortlists.data?.shortlists.map((s) => (
                <div key={s.id} className="rounded-lg border border-line/60 bg-ink-900/40 p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12.5px] font-medium text-slate-100">{s.name}</div>
                      <div className="text-[10px] text-slateink-500">{new Date(s.createdAt).toLocaleString()} · {s.entries.length} entries</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={s.status === 'approved' ? 'green' : 'amber'}>{s.status}</Badge>
                      {s.status !== 'approved' && <Button size="xs" variant="ghost" onClick={() => approve(s.id)}>Approve</Button>}
                      <a href={`/api/shortlists/${s.id}`}><Button size="xs" variant="ghost">Open</Button></a>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.entries.slice(0, 8).map((e) => <Badge key={e.playerId} tone="slate">{e.rank}. {e.priority}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
