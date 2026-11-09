'use client';
import { useEffect, useState } from 'react';
import { apiPost, useApi } from '@/lib/client/api';
import { trackEvent } from '@/lib/client/analytics';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, Select, Stat } from '@/components/ui';
import { Download, FileText, Sparkles } from 'lucide-react';

interface ReportRow { id: string; title: string; type: string; language: string; createdAt: string; quality: number; sections: number; createdBy: string }
interface ListResp { reports: ReportRow[]; builders: { type: string; label: string; description: string; requires: string[] }[]; players: { id: string; name: string; role: string; age: number | null }[]; teams: { id: string; name: string; isUserTeam: boolean }[]; venues: { id: string; name: string }[] }
interface FullReport { report: { id: string; title: string; type: string; quality: { score: number; issues: string[]; checks: { name: string; passed: boolean; detail: string }[] }; sections: { heading: string; body: string; evidence?: { label: string; value: string; source: string }[]; chart?: { caption: string } }[]; sources: string[]; language: string }; narration: { mode: string; text: string; note?: string } | null }

export default function ReportsPage() {
  const list = useApi<ListResp>('/api/reports');
  const [type, setType] = useState('talent');
  const [playerId, setPlayerId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [maxAge, setMaxAge] = useState(23);
  const [narrate, setNarrate] = useState(false);
  const [result, setResult] = useState<FullReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (list.data && !playerId) setPlayerId(list.data.players[0]?.id ?? '');
    if (list.data && !teamId) setTeamId(list.data.teams.find((t) => t.isUserTeam)?.id ?? list.data.teams[0]?.id ?? '');
    if (list.data && !venueId) setVenueId(list.data.venues[0]?.id ?? '');
  }, [list.data, playerId, teamId, venueId]);

  const generate = async () => {
    setBusy(true); setError(null);
    try {
      const res = await apiPost<FullReport>('/api/reports', { type, playerId, teamId, venueId, maxAge, size: 10, narrate });
      trackEvent('report_generated', { module: 'reports', kind: type, result: 'success' });
      setResult(res); await list.reload();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Report Generator" description="Board-ready documents built from the deterministic engine with a quality score, source list and caveats on every section. Export to PDF, Word, Excel or PowerPoint.">
        <Button onClick={generate} disabled={busy}><Sparkles size={14} />{busy ? 'Generating…' : 'Generate report'}</Button>
      </PageHeader>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Build a report">
          <div className="space-y-2">
            <Field label="Type"><Select value={type} onChange={setType} options={(list.data?.builders ?? []).map((b) => ({ value: b.type, label: b.label }))} /></Field>
            <div className="text-[10px] leading-snug text-slateink-500">{list.data?.builders.find((b) => b.type === type)?.description}</div>
            {type === 'player' && <Field label="Player"><Select value={playerId} onChange={setPlayerId} options={(list.data?.players ?? []).map((p) => ({ value: p.id, label: p.name }))} /></Field>}
            {(type === 'team' || type === 'auction') && <Field label="Team"><Select value={teamId} onChange={setTeamId} options={(list.data?.teams ?? []).map((t) => ({ value: t.id, label: t.name }))} /></Field>}
            {type === 'pitch' && <Field label="Venue"><Select value={venueId} onChange={setVenueId} options={(list.data?.venues ?? []).map((v) => ({ value: v.id, label: v.name }))} /></Field>}
            {type === 'talent' && <Field label="Age ceiling"><input className="input" type="number" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} /></Field>}
            <label className="flex items-center gap-2 text-[11px] text-slateink-300"><input type="checkbox" checked={narrate} onChange={(e) => setNarrate(e.target.checked)} /> Add AI narration (optional; demo narrator if no key)</label>
            <Button className="w-full" onClick={generate} disabled={busy}>Generate</Button>
            <div className="disclaimer">The quality score checks evidence coverage, caveat presence, stale data and unsupported claims before a report is allowed to be exported.</div>
          </div>
        </Card>

        <Card className="lg:col-span-2" title="Report archive" subtitle={`${list.data?.reports.length ?? 0} saved reports`}>
          {list.loading && <Loading />}
          {list.data && list.data.reports.length === 0 && <Empty title="No reports yet">Generate your first report.</Empty>}
          <div className="max-h-[260px] space-y-1.5 overflow-auto">
            {(list.data?.reports ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-line/60 px-2.5 py-2">
                <div>
                  <div className="text-[11.5px] text-slate-100">{r.title}</div>
                  <div className="text-[9.5px] text-slateink-500">{r.type} · {r.sections} sections · {new Date(r.createdAt).toLocaleString()} · {r.createdBy}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.quality >= 80 ? 'green' : r.quality >= 60 ? 'amber' : 'red'}>{r.quality}/100</Badge>
                  {['pdf', 'docx', 'xlsx', 'pptx'].map((f) => (
                    <a key={f} href={`/api/reports/${r.id}/export?format=${f}`} className="rounded border border-line px-1.5 py-0.5 text-[9.5px] text-slateink-300 hover:border-turf-500/40 hover:text-white">{f}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Report" value={result.report.title} />
            <Stat label="Quality score" value={`${result.report.quality.score}/100`} tone={result.report.quality.score >= 80 ? 'green' : 'amber'} />
            <Stat label="Sections" value={result.report.sections.length} />
            <Stat label="Exports" value="PDF · DOCX · XLSX · PPTX" tone="gold" />
          </div>

          <div className="flex flex-wrap gap-2">
            {['pdf', 'docx', 'xlsx', 'pptx'].map((f) => (
              <a key={f} href={`/api/reports/${result.report.id}/export?format=${f}`} onClick={() => trackEvent('report_exported', { module: 'reports', format: f })} className="btn btn-ghost"><Download size={13} />{f.toUpperCase()}</a>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {result.narration && (
                <Card title="AI executive summary" subtitle={`mode: ${result.narration.mode}`}>
                  <p className="text-[11.5px] leading-relaxed text-slate-200">{result.narration.text}</p>
                  {result.narration.note && <div className="disclaimer mt-2">{result.narration.note}</div>}
                </Card>
              )}
              {result.report.sections.map((s, i) => (
                <Card key={i} title={s.heading}>
                  <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-slateink-300">{s.body}</p>
                  {s.evidence && s.evidence.length > 0 && <div className="mt-2"><KV cols={2} items={s.evidence.map((m) => ({ k: m.label, v: `${m.value} · ${m.source}` }))} /></div>}
                </Card>
              ))}
            </div>
            <div className="space-y-3">
              <Card title="Quality checks">
                {result.report.quality.checks.map((c) => (
                  <div key={c.name} className="mb-1 flex items-start justify-between gap-2 text-[10.5px]">
                    <div><span className="text-slate-200">{c.name}</span><div className="text-[9.5px] text-slateink-500">{c.detail}</div></div>
                    <Badge tone={c.passed ? 'green' : 'red'}>{c.passed ? 'pass' : 'fail'}</Badge>
                  </div>
                ))}
              </Card>
              {result.report.quality.issues.length > 0 && <Card title="Open issues"><ul className="space-y-1 text-[10.5px] text-ember-400">{result.report.quality.issues.map((i, k) => <li key={k}>• {i}</li>)}</ul></Card>}
              <Card title="Sources"><ul className="space-y-1 text-[10px] text-slateink-400">{result.report.sources.map((s, i) => <li key={i}>• {s}</li>)}</ul></Card>
            </div>
          </div>
        </>
      )}
      {!result && !busy && <Card title="Tip"><div className="flex items-center gap-2 text-[11px] text-slateink-400"><FileText size={13} /> The Rajasthan Royals talent brief is available as the “talent” builder — it produces a 10-player shortlist with policy caveats.</div></Card>}
    </div>
  );
}
