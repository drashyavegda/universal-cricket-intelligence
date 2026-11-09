'use client';
import { useState } from 'react';
import { apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, KV, Loading, PageHeader, Select, Stat } from '@/components/ui';
import { Bot, Play } from 'lucide-react';

interface Agent { id: string; name: string; role: string; description: string; permissions: string[]; model: string; guardrails: string[] }
interface Run { id: string; workflowId: string; name: string; status: string; startedAt: string; steps: { name: string; status: string; detail: string; output?: string }[]; approvals: { step: string; required: boolean; granted: boolean }[]; actor: string }
interface Resp { agents: Agent[]; workflows: { id: string; name: string; description: string; steps: string[]; approvalGate: string }[]; runs: Run[]; governance: { note: string; isolation: { agent: string; permissions: string[] }[] } }

export default function AutomationPage() {
  const data = useApi<Resp>('/api/workflows');
  const [workflowId, setWorkflowId] = useState('');
  const [maxAge, setMaxAge] = useState(23);
  const [goal, setGoal] = useState('Identify the 10 most promising uncapped Indian players for IPL 2027');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Run | null>(null);

  const start = async () => {
    setBusy(true); setError(null);
    try {
      const res = await apiPost<{ run: Run }>('/api/workflows', { workflowId: workflowId || data.data?.workflows[0].id, maxAge, goal });
      setLastRun(res.run); await data.reload();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="AI Automation & Agents" description="Multi-agent workflows with scoped permissions. Every agent is read-only unless a human approves the write step; each run is audited.">
        <Button onClick={start} disabled={busy}><Play size={14} />{busy ? 'Running…' : 'Start workflow'}</Button>
      </PageHeader>

      {data.loading && <Loading />}
      {error && <Alert tone="error">{error}</Alert>}

      {data.data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Agents" value={data.data.agents.length} />
            <Stat label="Workflows" value={data.data.workflows.length} />
            <Stat label="Runs (recent)" value={data.data.runs.length} />
            <Stat label="Last status" value={(lastRun ?? data.data.runs[0])?.status ?? '—'} tone="gold" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Launch a workflow" subtitle="Read-only analysis, then a human approval gate">
              <div className="space-y-2">
                <Select value={workflowId || data.data.workflows[0].id} onChange={setWorkflowId} options={data.data.workflows.map((w) => ({ value: w.id, label: w.name }))} />
                <div className="text-[10.5px] leading-relaxed text-slateink-400">{data.data.workflows.find((w) => w.id === (workflowId || data.data!.workflows[0].id))?.description}</div>
                <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal" />
                <label className="text-[10.5px] text-slateink-400">Age ceiling: {maxAge}</label>
                <input className="input" type="number" min={16} max={35} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} />
                <Button className="w-full" onClick={start} disabled={busy}>Run</Button>
                <div className="danger-note">Steps that would create a shortlist or save a report stop at an approval gate. Nothing is written without you clicking approve on the artefact itself.</div>
              </div>
            </Card>

            <Card className="lg:col-span-2" title="Agent registry" subtitle="Least-privilege scopes, named tools and guardrails">
              <div className="grid gap-2 sm:grid-cols-2">
                {data.data.agents.map((a) => (
                  <div key={a.id} className="rounded-lg border border-line/60 p-2.5">
                    <div className="flex items-center justify-between"><div className="text-[11.5px] text-slate-100">{a.name}</div><Badge tone="slate">{a.model}</Badge></div>
                    <div className="mt-0.5 text-[10px] text-slateink-400">{a.description}</div>
                    <div className="mt-1 flex flex-wrap gap-1">{a.permissions.map((p) => <span key={p} className="rounded bg-turf-500/10 px-1.5 py-0.5 font-mono text-[9px] text-turf-300">{p}</span>)}</div>
                    <ul className="mt-1 space-y-0.5 text-[9.5px] text-slateink-500">{a.guardrails.slice(0, 2).map((g, i) => <li key={i}>• {g}</li>)}</ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Workflow catalogue">
              {data.data.workflows.map((w) => (
                <div key={w.id} className="mb-2 rounded-lg border border-line/60 p-2">
                  <div className="text-[11.5px] text-slate-100">{w.name}</div>
                  <div className="text-[10px] text-slateink-400">{w.description}</div>
                  <ol className="mt-1 space-y-0.5 text-[10px] text-slateink-500">{w.steps.map((s, i) => <li key={i}>{i + 1}. {s}</li>)}</ol>
                  <div className="mt-1 text-[9.5px] text-gold-300">Approval gate: {w.approvalGate}</div>
                </div>
              ))}
            </Card>
            <Card title="Run history" subtitle="Latest first, with per-step status">
              {(lastRun ? [lastRun, ...data.data.runs.filter((r) => r.id !== lastRun.id)] : data.data.runs).length === 0 ? <Empty title="No runs yet" /> : (lastRun ? [lastRun, ...data.data.runs.filter((r) => r.id !== lastRun.id)] : data.data.runs).slice(0, 4).map((r) => (
                <div key={r.id} className="mb-2 rounded-lg border border-line/60 p-2">
                  <div className="flex items-center justify-between text-[11px]"><span className="text-slate-100">{r.name}</span><Badge tone={r.status === 'completed' ? 'green' : r.status === 'awaiting_approval' ? 'amber' : 'slate'}>{r.status}</Badge></div>
                  <div className="text-[9.5px] text-slateink-500">{new Date(r.startedAt).toLocaleString()} · {r.actor}</div>
                  <div className="mt-1 space-y-0.5">{r.steps.map((s, i) => <div key={i} className="text-[9.5px] text-slateink-400">→ {s.name}: <span className={s.status === 'done' ? 'text-turf-400' : 'text-gold-300'}>{s.status}</span></div>)}</div>
                </div>
              ))}
            </Card>
          </div>
          <Card title="Governance"><div className="text-[10.5px] text-slateink-400">{data.data.governance.note}</div></Card>
        </>
      )}
    </div>
  );
}
