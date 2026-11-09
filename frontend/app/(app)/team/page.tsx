'use client';
import { useEffect, useState } from 'react';
import { apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, KV, Loading, PageHeader, ProgressBar, Select, Stat, Tabs, nf } from '@/components/ui';
import { BarCompare } from '@/components/charts';
import { ShieldCheck } from 'lucide-react';

interface TeamAnalysis {
  team: { id: string; name: string; purseLakh: number; maxSquadSize: number; overseasLimit: number };
  analysis: {
    squadSize: number; overseasCount: number; overseasLimit: number; battingDepth: number; bowlingDepth: number; paceOptions: number; spinOptions: number;
    allRounders: number; keepers: number; balanceScore: number; avgAge: number | null; trust: number;
    roleBreakdown: { role: string; count: number; qualityAvg: number }[];
    phaseCoverage: { phase: string; batting: number; bowling: number; note: string }[];
    weaknesses: { title: string; severity: string; evidence: string; suggestion: string }[];
    strengths: { title: string; evidence: string }[];
    recommendations: { action: string; rationale: string; priority: string }[];
    ageProfile: { bucket: string; count: number }[];
  };
  form: { played: number; wins: number; losses: number; winRate: number | null; recent: string[] };
  squad: { id: string; name: string; age: number | null; role: string; bowlingType: string; overseas: boolean; capped: boolean; runs: number; wicketkeeper: boolean; strikeRate: number | null; economy: number | null; wickets: number; confidence: number; synthetic: boolean; pitchFit: number }[];
  purse: { totalLakh: number; spentLakh: number; slots: number; overseasLimit: number };
  venues: { id: string; name: string }[];
  activeVenue: { id: string; name: string };
  alternatives: { id: string; name: string }[];
}

export default function TeamPage() {
  const teams = useApi<{ teams: { id: string; name: string; isUserTeam: boolean }[] }>('/api/teams');
  const [teamId, setTeamId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const [impact, setImpact] = useState<{ out: { name: string }; in: { name: string }; deltaBatting: number; deltaBowling: number; deltaBalance: number; verdict: string; caveats: string[] } | null>(null);
  const [tab, setTab] = useState<'overview' | 'squad' | 'replace'>('overview');

  useEffect(() => {
    if (teams.data && !teamId) setTeamId(teams.data.teams.find((t) => t.isUserTeam)?.id ?? teams.data.teams[0].id);
  }, [teams.data, teamId]);

  const url = teamId ? `/api/team/${teamId}${venueId ? `?venue=${venueId}` : ''}` : null;
  const { data, loading, error } = useApi<TeamAnalysis>(url, [teamId, venueId]);
  const allPlayers = useApi<{ players: { id: string; name: string; role: string }[] }>('/api/players?pageSize=100');

  const runReplacement = async () => {
    if (!teamId || !outId || !inId) return;
    const res = await apiPost<{ impact: typeof impact }>(`/api/team/${teamId}`, { outId, inId });
    setImpact(res.impact);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Team Intelligence" description="Squad structure, phase coverage, weakness detection and budget position — the same service that powers auction need scores and XI constraints.">
        <Select value={teamId} onChange={setTeamId} options={(teams.data?.teams ?? []).map((t) => ({ value: t.id, label: t.name + (t.isUserTeam ? ' (your team)' : '') }))} className="max-w-[220px]" />
        {data && <Select value={venueId || data.activeVenue.id} onChange={setVenueId} options={data.venues.map((v) => ({ value: v.id, label: v.name }))} className="max-w-[220px]" />}
      </PageHeader>

      {loading && <Loading label="Analysing squad" />}
      {error && <Alert tone="error">{error}</Alert>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Squad size" value={data.analysis.squadSize} hint={`${data.analysis.overseasCount}/${data.analysis.overseasLimit} overseas · ${data.purse.slots} slots open`} />
            <Stat label="Balance score" value={`${data.analysis.balanceScore}/100`} tone={data.analysis.balanceScore > 60 ? 'green' : 'amber'} hint="Depth, structure and phase coverage" />
            <Stat label="Pace / spin" value={`${data.analysis.paceOptions} / ${data.analysis.spinOptions}`} hint={`${data.analysis.allRounders} all-rounders · ${data.analysis.keepers} keeper(s)`} />
            <Stat label="Average age" value={data.analysis.avgAge ?? '—'} hint="DOB-derived at the reference date" />
            <Stat label="Record trust" value={`${nf(data.analysis.trust, 0)}%`} tone={data.analysis.trust > 70 ? 'green' : 'amber'} hint="Mean ingestion confidence of the squad" />
          </div>

          <Tabs tabs={[{ key: 'overview', label: 'Structure' }, { key: 'squad', label: 'Squad list' }, { key: 'replace', label: 'Replacement lab' }]} active={tab} onChange={setTab} />

          {tab === 'overview' && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2" title="Phase coverage" subtitle="Squad averages by phase — proxies that understate the best and worst individuals">
                <BarCompare data={data.analysis.phaseCoverage.map((p) => ({ name: p.phase, value: p.bowling }))} colour="#E8C15C" height={180} label="Phase economy proxy" />
                <div className="mt-2 space-y-1.5">
                  {data.analysis.phaseCoverage.map((p) => (
                    <div key={p.phase} className="rounded-lg border border-line/60 px-2.5 py-1.5">
                      <div className="flex items-center justify-between text-[11.5px]"><span className="capitalize text-slate-200">{p.phase}</span><span className="font-mono text-slateink-300">bat {p.batting} · bowl {p.bowling}</span></div>
                      <div className="text-[10px] text-slateink-500">{p.note}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Weaknesses" subtitle="Ranked by severity">
                {data.analysis.weaknesses.length === 0 ? <Empty title="No structural weakness detected" /> : data.analysis.weaknesses.map((w) => (
                  <div key={w.title} className="mb-2 rounded-lg border border-line/60 p-2.5">
                    <div className="flex items-center justify-between"><span className="text-[12px] font-medium text-slate-200">{w.title}</span><Badge tone={w.severity === 'high' ? 'red' : w.severity === 'medium' ? 'amber' : 'slate'}>{w.severity}</Badge></div>
                    <div className="text-[10.5px] text-slateink-400">{w.evidence}</div>
                    <div className="text-[10.5px] text-turf-400">→ {w.suggestion}</div>
                  </div>
                ))}
              </Card>
              <Card title="Role breakdown" subtitle="Count and average quality by role">
                <div className="space-y-1">
                  {data.analysis.roleBreakdown.map((r) => (
                    <div key={r.role} className="flex items-center gap-2 text-[11px]">
                      <span className="w-40 truncate text-slateink-300">{r.role}</span>
                      <div className="flex-1"><ProgressBar value={r.qualityAvg} /></div>
                      <span className="w-6 text-right font-mono text-slateink-400">{r.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Budget position" subtitle="Purse is a strategy constraint, not a valuation">
                <KV items={[
                  { k: 'Total purse', v: `₹${data.purse.totalLakh}L` },
                  { k: 'Vacant slots', v: data.purse.slots },
                  { k: 'Average per slot', v: `₹${Math.round(data.purse.totalLakh / Math.max(1, data.purse.slots))}L` },
                  { k: 'Overseas limit', v: data.purse.overseasLimit },
                ]} />
                <div className="mt-2 space-y-1.5">{data.analysis.recommendations.map((r) => <div key={r.action} className="rounded border border-line/60 px-2 py-1.5 text-[10.5px]"><span className="text-gold-300">{r.priority}</span> <span className="text-slate-200">{r.action}</span><div className="text-slateink-500">{r.rationale}</div></div>)}</div>
              </Card>
              <Card title="Form & age profile">
                <KV items={[{ k: 'Matches in workspace', v: data.form.played }, { k: 'Win rate', v: data.form.winRate === null ? '—' : `${(data.form.winRate * 100).toFixed(0)}%` }, { k: 'Recent', v: data.form.recent.join(' ') || '—' }]} />
                <div className="mt-2"><BarCompare data={data.analysis.ageProfile.map((a) => ({ name: a.bucket, value: a.count }))} colour="#34D399" height={140} label="Players" /></div>
              </Card>
            </div>
          )}

          {tab === 'squad' && (
            <Card title={`${data.team.name} squad`} subtitle={`Pitch fit shown against ${data.activeVenue.name}`}>
              <div className="overflow-auto">
                <table className="table-base">
                  <thead><tr><th>Player</th><th>Role</th><th>Age</th><th>SR</th><th>Econ</th><th>Wkts</th><th>Pitch fit</th><th>Conf.</th><th>Data</th></tr></thead>
                  <tbody>
                    {data.squad.map((p) => (
                      <tr key={p.id}>
                        <td className="text-[12px] text-slate-100">{p.name}{p.wicketkeeper && ' 🧤'}{p.overseas && <Badge tone="slate" className="ml-1">OS</Badge>}</td>
                        <td className="text-[11px] text-slateink-300">{p.role}</td>
                        <td className="font-mono text-[11.5px]">{p.age ?? '—'}</td>
                        <td className="font-mono text-[11.5px] text-turf-400">{nf(p.strikeRate)}</td>
                        <td className="font-mono text-[11.5px]">{nf(p.economy, 2)}</td>
                        <td className="font-mono text-[11.5px]">{p.wickets}</td>
                        <td><Badge tone={p.pitchFit > 60 ? 'green' : p.pitchFit > 45 ? 'gold' : 'slate'}>{nf(p.pitchFit, 0)}</Badge></td>
                        <td className="text-[11px] text-slateink-400">{(p.confidence * 100).toFixed(0)}%</td>
                        <td>{p.synthetic ? <Badge tone="gold">DEMO</Badge> : <Badge tone="green">UP</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {tab === 'replace' && (
            <Card title="Player replacement lab" subtitle="Squad-level deltas, not a match simulation">
              <div className="grid gap-2 sm:grid-cols-4">
                <Select value={outId} onChange={setOutId} options={[{ value: '', label: 'Replace out…' }, ...data.squad.map((p) => ({ value: p.id, label: p.name }))]} />
                <Select value={inId} onChange={setInId} options={[{ value: '', label: 'Replace in…' }, ...(allPlayers.data?.players ?? []).filter((p) => !data.squad.some((s) => s.id === p.id)).map((p) => ({ value: p.id, label: `${p.name} (${p.role})` }))]} />
                <Button onClick={runReplacement} disabled={!outId || !inId}>Simulate</Button>
              </div>
              {impact && (
                <div className="mt-3 rounded-lg border border-line bg-ink-900/50 p-3">
                  <div className="text-[12px] text-slate-200">{impact.out.name} → {impact.in.name}</div>
                  <div className="mt-1 flex gap-4 text-[11px]">
                    <span className={impact.deltaBatting >= 0 ? 'text-turf-400' : 'text-danger-400'}>Batting {impact.deltaBatting >= 0 ? '+' : ''}{impact.deltaBatting}</span>
                    <span className={impact.deltaBowling >= 0 ? 'text-turf-400' : 'text-danger-400'}>Bowling {impact.deltaBowling >= 0 ? '+' : ''}{impact.deltaBowling}</span>
                    <span className={impact.deltaBalance >= 0 ? 'text-turf-400' : 'text-danger-400'}>Balance {impact.deltaBalance >= 0 ? '+' : ''}{impact.deltaBalance}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slateink-300">{impact.verdict}</div>
                  <div className="mt-1 space-y-0.5 text-[10px] text-slateink-500">{impact.caveats.map((c, i) => <div key={i}>• {c}</div>)}</div>
                </div>
              )}
              <div className="disclaimer mt-3">Replacement impact ignores purse and overseas constraints — check the auction module before committing to a signing.</div>
            </Card>
          )}
        </>
      )}
      <div className="flex items-center gap-2 text-[10.5px] text-slateink-500"><ShieldCheck size={12} /> Squad data is workspace-scoped; no claim is made about real franchise squads.</div>
    </div>
  );
}
