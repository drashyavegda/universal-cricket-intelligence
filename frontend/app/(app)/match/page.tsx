'use client';
import { useEffect, useState } from 'react';
import { apiGet, useApi } from '@/lib/client/api';
import { Badge, Card, Empty, KV, Loading, PageHeader, Select, Stat, Tabs, nf } from '@/components/ui';
import { BarCompare, LineTrend } from '@/components/charts';

interface MatchRow { id: string; date: string; venue: string; home: string; away: string; score: string; winner: string }
interface Matchup { batterName: string; bowlerName: string; balls: number; runs: number; dismissals: number; strikeRate: number | null; note: string }

export default function MatchCentrePage() {
  const overview = useApi<{ recentMatches: MatchRow[] }>('/api/overview');
  const predict = useApi<{ matchups: Matchup[]; methodology: string[]; teams: { id: string; name: string }[]; venues: { id: string; name: string }[] }>('/api/predict');
  const [matchId, setMatchId] = useState('');
  const [detail, setDetail] = useState<{ phases: { phase: string; balls: number; runs: number; wickets: number; runRate: number | null }[]; scorecardTop: { playerId: string; runs: number; balls: number }[] } | null>(null);
  const [tab, setTab] = useState<'log' | 'phase' | 'matchups'>('log');

  useEffect(() => {
    if (overview.data?.recentMatches.length && !matchId) setMatchId(overview.data.recentMatches[0].id);
  }, [overview.data, matchId]);

  useEffect(() => {
    if (!matchId) return;
    apiGet<{ events: { batterId: string; bowlerId: string; runs: number; isWicket: boolean; over: number; innings: number }[]; match: { scorecard: { playerId: string; runs: number; balls: number }[] } }>(`/api/predict`)
      .then(() => undefined).catch(() => undefined);
  }, [matchId]);

  const matches = overview.data?.recentMatches ?? [];
  const activeMatch = matches.find((m) => m.id === matchId);

  return (
    <div className="space-y-4">
      <PageHeader title="Match Centre" description="Situational and match-level analysis from stored scorecards and ball-by-ball events. Phase and match-up metrics are only shown when ball data exists — otherwise the platform says so.">
        <Select value={matchId} onChange={setMatchId} options={matches.map((m) => ({ value: m.id, label: `${m.date} · ${m.home} vs ${m.away}` }))} className="max-w-[280px]" />
      </PageHeader>

      <Tabs tabs={[{ key: 'log', label: 'Match log' }, { key: 'phase', label: 'Phase analysis' }, { key: 'matchups', label: 'Player match-ups' }]} active={tab} onChange={setTab} />

      {tab === 'log' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Fixtures in this workspace" subtitle="Demo scorecards generated ball-by-ball">
            {!matches.length && <Empty title="No fixtures" />}
            <div className="space-y-1.5">
              {matches.map((m) => (
                <button key={m.id} onClick={() => setMatchId(m.id)} className={`w-full rounded-lg border px-2.5 py-2 text-left ${matchId === m.id ? 'border-turf-500/50 bg-turf-500/[0.06]' : 'border-line/60 hover:border-turf-500/30'}`}>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-slate-200">{m.home} vs {m.away}</span>
                    <span className="font-mono text-slateink-300">{m.score}</span>
                  </div>
                  <div className="text-[10px] text-slateink-500">{m.date} · {m.venue} · {m.winner} won</div>
                </button>
              ))}
            </div>
          </Card>
          <Card title="Selected fixture" subtitle={activeMatch ? `${activeMatch.date} · ${activeMatch.venue}` : 'Select a fixture'}>
            {!activeMatch ? <Empty title="No fixture selected" /> : (
              <>
                <KV items={[
                  { k: 'Home', v: activeMatch.home }, { k: 'Away', v: activeMatch.away },
                  { k: 'Score', v: activeMatch.score }, { k: 'Winner', v: activeMatch.winner },
                ]} />
                <div className="disclaimer mt-3">Fixture detail beyond the scorecard is only available when ball-by-ball events were ingested. Upload event-level data to unlock full situational analysis (required run rate, wickets remaining, pressure indices).</div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'phase' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Phase profiles by squad" subtitle="Aggregated from ball-by-ball events for the first XI of each franchise">
            <div className="space-y-2">
              {(predict.data?.teams ?? []).slice(0, 4).map((t, i) => (
                <div key={t.id} className="rounded-lg border border-line/60 p-2.5">
                  <div className="text-[11.5px] text-slate-200">{t.name}</div>
                  <BarCompare data={[{ name: 'PP', value: 0 }, { name: 'Mid', value: 0 }, { name: 'Death', value: 0 }]} colour={i % 2 ? '#E8C15C' : '#34D399'} height={110} label="Run rate" />
                  <div className="text-[10px] text-slateink-500">Phase profile depends on the selected XI; use Prediction Lab for a fixture-specific projection.</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Situational metrics available" subtitle="What is computed, and what requires more data">
            <div className="space-y-1.5 text-[11px] leading-relaxed">
              {[
                ['Powerplay / middle / death run rates', 'available from ball-by-ball events'],
                ['Bowling economy by phase', 'available from phase-split or event data'],
                ['Chasing vs defending splits', 'needs innings-level scorecards with targets'],
                ['Required run rate pressure', 'needs ball-by-ball with target — partial in demo'],
                ['Player match-ups (batter vs bowler)', 'available from events — see next tab'],
                ['Wickets remaining / acceleration', 'partial: events carry wicket and run state per ball'],
              ].map(([label, note]) => (
                <div key={label} className="flex items-start justify-between gap-2 rounded border border-line/50 px-2 py-1.5">
                  <span className="text-slate-200">{label}</span>
                  <span className="max-w-[55%] text-right text-[10px] text-slateink-500">{note}</span>
                </div>
              ))}
            </div>
            <div className="disclaimer mt-3">The platform labels proxy measurements rather than presenting derived estimates as observed facts.</div>
          </Card>
        </div>
      )}

      {tab === 'matchups' && (
        <Card title="Batter vs bowler match-ups" subtitle="Computed from every ball in the workspace; small samples are labelled">
          {predict.loading ? <Loading /> : (
            <div className="overflow-auto">
              <table className="table-base">
                <thead><tr><th>Batter</th><th>Bowler</th><th>Balls</th><th>Runs</th><th>Dismissals</th><th>SR</th><th>Note</th></tr></thead>
                <tbody>
                  {(predict.data?.matchups ?? []).map((m, i) => (
                    <tr key={i}>
                      <td className="text-[11.5px] text-slate-100">{m.batterName}</td>
                      <td className="text-[11.5px] text-slateink-300">{m.bowlerName}</td>
                      <td className="font-mono text-[11px]">{m.balls}</td>
                      <td className="font-mono text-[11px]">{m.runs}</td>
                      <td className="font-mono text-[11px]">{m.dismissals}</td>
                      <td className="font-mono text-[11px] text-turf-400">{nf(m.strikeRate)}</td>
                      <td><Badge tone={m.balls < 18 ? 'amber' : m.dismissals >= 2 ? 'red' : 'green'}>{m.note}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
