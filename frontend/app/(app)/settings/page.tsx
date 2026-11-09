'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, useAction, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, ProgressBar, Select, Stat, Tabs } from '@/components/ui';
import { GrowthAdmin } from '@/components/growth-admin';
import { CheckCircle2, KeyRound, ShieldCheck, XCircle } from 'lucide-react';

interface SettingsResp {
  settings: { referenceDate: string; demoMode: boolean; language: 'en' | 'hi' | 'gu'; ai: { provider: string; baseUrl: string; model: string; temperature: number; maxTokens: number; monthlyBudgetUsd: number; rateLimitPerMinute: number; hasApiKey: boolean }; limits: { maxUploadMb: number; maxRowsPerDataset: number; pageSize: number }; security: { require2faForAdmins: boolean; sessionMinutes: number; passwordMinLength: number; promptInjectionGuard: boolean } };
  aiStatus: { provider: string; model: string; baseUrl: string; configured: boolean; keyPresent: boolean; note: string; budget: { spentUsd: number; budgetUsd: number; remainingUsd: number; calls: number; demoCalls: number } };
  usage: { at: string; provider: string; model: string; purpose: string; usd: number; status: string }[];
  users: { id: string; email: string; name: string; role: string; twoFactorEnabled: boolean; lastLoginAt: string | null }[];
  sessions: { createdAt: string; expiresAt: string; ip: string; userId: string }[];
  envHints: { key: string; set: boolean; note: string }[];
}
interface Security { score: number; grade: string; controls: { id: string; name: string; category: string; implemented: boolean; detail: string; riskIfMissing: string }[]; gaps: { id: string; name: string; detail: string }[]; recommendation: string[]; disclaimer: string }
interface Threat { control: { name: string }; impact: string; likelihood: string; mitigation: string }
interface AuditEntry { id: string; at: string; actor: string; action: string; entity: string; detail: string }

export default function SettingsPage() {
  const data = useApi<SettingsResp>('/api/settings');
  const security = useApi<Security>('/api/settings/security');
  const audit = useApi<{ audit: AuditEntry[]; total: number }>('/api/audit?limit=60');
  const notifications = useApi<{ notifications: { id: string; level: string; title: string; body: string; at: string; read: boolean }[]; unread: number }>('/api/notifications');
  const { run, busy } = useAction();
  const [tab, setTab] = useState<'ai' | 'data' | 'security' | 'growth' | 'audit'>('ai');
  const [threat, setThreat] = useState<Threat | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ai, setAi] = useState({ provider: 'demo', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 700, monthlyBudgetUsd: 20, rateLimitPerMinute: 30 });
  const [limits, setLimits] = useState({ maxUploadMb: 25, maxRowsPerDataset: 50000, pageSize: 25 });
  const [sec, setSec] = useState({ require2faForAdmins: true, sessionMinutes: 720, passwordMinLength: 10, promptInjectionGuard: true });
  const [language, setLanguage] = useState<'en' | 'hi' | 'gu'>('en');

  useEffect(() => {
    if (data.data) {
      const s = data.data.settings;
      setAi({ provider: s.ai.provider, baseUrl: s.ai.baseUrl, model: s.ai.model, temperature: s.ai.temperature, maxTokens: s.ai.maxTokens, monthlyBudgetUsd: s.ai.monthlyBudgetUsd, rateLimitPerMinute: s.ai.rateLimitPerMinute });
      setLimits(s.limits); setSec(s.security); setLanguage(s.language);
    }
  }, [data.data]);

  const save = async () => {
    setMsg(null);
    await run(async () => {
      const res = await apiPost<{ note: string }>('/api/settings', { ai, limits, security: sec, language }, 'PATCH');
      setMsg(res.note); await data.reload();
    });
  };

  const simulate = async (controlId: string) => {
    const res = await apiPost<{ scenario: Threat | null }>('/api/settings/security', { controlId });
    setThreat(res.scenario);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings & Security" description="AI provider configuration, platform limits, governance controls and the audit trail. Secrets live only in server environment variables — never in this UI, never in the database.">
        <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
      </PageHeader>

      {msg && <Alert tone="success">{msg}</Alert>}
      {data.loading && <Loading />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="AI mode" value={data.data?.aiStatus.configured ? 'Live model' : 'Demo narration'} tone={data.data?.aiStatus.configured ? 'green' : 'gold'} hint={data.data?.aiStatus.model} />
        <Stat label="AI budget left" value={`$${data.data?.aiStatus.budget.remainingUsd ?? 0}`} hint={`${data.data?.aiStatus.budget.calls ?? 0} live calls · ${data.data?.aiStatus.budget.demoCalls ?? 0} demo`} />
        <Stat label="Security posture" value={`${security.data?.score ?? '—'}/100`} hint={security.data?.grade} tone="gold" />
        <Stat label="Unread notifications" value={notifications.data?.unread ?? 0} />
      </div>

      <Tabs tabs={[{ key: 'ai', label: 'AI provider' }, { key: 'data', label: 'Data & limits' }, { key: 'security', label: 'Security posture' },
        { key: 'growth', label: 'Growth & trust' }, { key: 'audit', label: 'Audit & activity' }]} active={tab} onChange={setTab} />

      {tab === 'ai' && data.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Provider & model" subtitle="Any OpenAI-compatible endpoint, Anthropic-compatible relay, or a local server (Ollama/vLLM)">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Provider"><Select value={ai.provider} onChange={(v) => setAi({ ...ai, provider: v })} options={[{ value: 'demo', label: 'demo (no calls)' }, { value: 'openai-compatible', label: 'openai-compatible' }, { value: 'anthropic', label: 'anthropic' }, { value: 'local', label: 'local' }]} /></Field>
              <Field label="Model"><input className="input" value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} /></Field>
              <Field label="Base URL"><input className="input" value={ai.baseUrl} onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })} /></Field>
              <Field label="Temperature"><input className="input" type="number" step="0.1" min="0" max="1" value={ai.temperature} onChange={(e) => setAi({ ...ai, temperature: Number(e.target.value) })} /></Field>
              <Field label="Max tokens"><input className="input" type="number" value={ai.maxTokens} onChange={(e) => setAi({ ...ai, maxTokens: Number(e.target.value) })} /></Field>
              <Field label="Monthly budget (USD)"><input className="input" type="number" value={ai.monthlyBudgetUsd} onChange={(e) => setAi({ ...ai, monthlyBudgetUsd: Number(e.target.value) })} /></Field>
            </div>
            <div className="mt-3"><KV items={[
              { k: 'API key in environment', v: data.data.aiStatus.keyPresent ? 'yes (server-side)' : 'no' },
              { k: 'Effective mode', v: data.data.aiStatus.configured ? 'live narration' : 'deterministic demo' },
              { k: 'Spent this month', v: `$${data.data.aiStatus.budget.spentUsd}` },
            ]} /></div>
            <div className="danger-note mt-2">{data.data.aiStatus.note} Set <code>AI_API_KEY</code> (and optionally <code>AI_BASE_URL</code>, <code>AI_MODEL</code>) in the server environment. Keys can never be entered or read through this interface, and the key value is never logged.</div>
          </Card>
          <div className="space-y-4">
            <Card title="Environment checklist">
              {data.data.envHints.map((e) => (
                <div key={e.key} className="mb-1.5 flex items-start gap-1.5">
                  {e.set ? <CheckCircle2 size={12} className="mt-0.5 text-turf-400" /> : <XCircle size={12} className="mt-0.5 text-slateink-600" />}
                  <div><div className="font-mono text-[10px] text-slate-200">{e.key}</div><div className="text-[9.5px] text-slateink-500">{e.note}</div></div>
                </div>
              ))}
            </Card>
            <Card title="AI usage log" subtitle="Last 25 calls with estimated cost">
              <div className="max-h-[220px] space-y-1 overflow-auto">
                {data.data.usage.map((u, i) => (
                  <div key={i} className="flex items-center justify-between text-[9.5px]">
                    <span className="truncate text-slateink-400">{u.purpose}</span>
                    <span className="ml-2 shrink-0"><Badge tone={u.status === 'demo' ? 'gold' : 'green'}>{u.status}</Badge> <span className="font-mono text-slateink-500">${u.usd.toFixed(4)}</span></span>
                  </div>
                ))}
                {data.data.usage.length === 0 && <Empty title="No AI calls yet" />}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'data' && data.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Platform limits">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Max upload (MB)"><input className="input" type="number" value={limits.maxUploadMb} onChange={(e) => setLimits({ ...limits, maxUploadMb: Number(e.target.value) })} /></Field>
              <Field label="Max rows per dataset"><input className="input" type="number" value={limits.maxRowsPerDataset} onChange={(e) => setLimits({ ...limits, maxRowsPerDataset: Number(e.target.value) })} /></Field>
              <Field label="Default page size"><input className="input" type="number" value={limits.pageSize} onChange={(e) => setLimits({ ...limits, pageSize: Number(e.target.value) })} /></Field>
              <Field label="Default language"><Select value={language} onChange={(v) => setLanguage(v as 'en' | 'hi' | 'gu')} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी' }, { value: 'gu', label: 'ગુજરાતી' }]} /></Field>
            </div>
            <Button className="mt-3" onClick={save} disabled={busy}>Save limits</Button>
          </Card>
          <Card title="Users & sessions" subtitle={`${data.data.users.length} users · ${data.data.sessions.length} active sessions`}>
            <div className="space-y-1">
              {data.data.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded border border-line/50 px-2 py-1.5 text-[10.5px]">
                  <div><div className="text-slate-200">{u.name}</div><div className="text-[9px] text-slateink-500">{u.email}</div></div>
                  <div className="flex items-center gap-1.5"><Badge tone="slate">{u.role}</Badge>{u.twoFactorEnabled ? <Badge tone="green">2FA</Badge> : <Badge tone="amber">no 2FA</Badge>}</div>
                </div>
              ))}
            </div>
            <div className="disclaimer mt-2">Demo accounts are seeded for local evaluation only. Remove or rotate them before any real deployment.</div>
          </Card>
        </div>
      )}

      {tab === 'security' && security.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Control coverage" subtitle={security.data.grade}>
            <div className="max-h-[420px] space-y-1.5 overflow-auto">
              {security.data.controls.map((c) => (
                <div key={c.id} className="rounded-lg border border-line/60 p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">{c.implemented ? <CheckCircle2 size={12} className="text-turf-400" /> : <XCircle size={12} className="text-ember-400" />}<span className="text-[11px] text-slate-100">{c.name}</span><Badge tone="slate">{c.category}</Badge></div>
                    <div className="flex items-center gap-1">
                      <Badge tone={c.riskIfMissing === 'high' ? 'red' : c.riskIfMissing === 'medium' ? 'amber' : 'slate'}>{c.riskIfMissing}</Badge>
                      <button onClick={() => simulate(c.id)} className="rounded border border-line px-1.5 py-0.5 text-[9px] text-slateink-300 hover:text-white">what if?</button>
                    </div>
                  </div>
                  <div className="mt-0.5 text-[9.5px] text-slateink-500">{c.detail}</div>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card title="Posture score">
              <div className="mb-2"><ProgressBar value={security.data.score} tone={security.data.score >= 85 ? 'green' : 'gold'} /></div>
              <div className="danger-note">{security.data.disclaimer}</div>
            </Card>
            {threat && (
              <Card title={`Threat simulation: ${threat.control.name}`}>
                <div className="space-y-1.5 text-[10.5px]"><div><span className="text-slateink-400">Impact:</span> <span className="text-slate-200">{threat.impact}</span></div><div><span className="text-slateink-400">Likelihood:</span> <span className="text-slate-200">{threat.likelihood}</span></div><div><span className="text-slateink-400">Mitigation:</span> <span className="text-turf-300">{threat.mitigation}</span></div></div>
              </Card>
            )}
            <Card title="Open recommendations">
              {security.data.recommendation.length === 0 ? <div className="text-[10.5px] text-turf-300">No high-risk gaps open.</div> : <ul className="space-y-1 text-[10px] text-ember-400">{security.data.recommendation.map((r, i) => <li key={i}>• {r}</li>)}</ul>}
              <div className="mt-2 flex items-center gap-1.5 text-[9.5px] text-slateink-500"><ShieldCheck size={11} /> No certification is claimed anywhere in this product.</div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'growth' && <GrowthAdmin />}

      {tab === 'audit' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Audit trail" subtitle={`${audit.data?.total ?? 0} entries retained`}>
            <div className="max-h-[460px] overflow-auto">
              <table className="table-base">
                <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
                <tbody>
                  {(audit.data?.audit ?? []).map((a) => (
                    <tr key={a.id}><td className="text-[9.5px] text-slateink-500">{new Date(a.at).toLocaleString()}</td><td className="text-[10px] text-slate-300">{a.actor}</td><td className="font-mono text-[9.5px] text-turf-400">{a.action}</td><td className="text-[9.5px] text-slateink-400">{a.entity}</td><td className="text-[9.5px] text-slateink-500">{a.detail}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Notifications" subtitle="System events for this workspace">
            <div className="space-y-1.5">
              {(notifications.data?.notifications ?? []).slice(0, 12).map((n) => (
                <div key={n.id} className="rounded border border-line/60 px-2 py-1.5">
                  <div className="flex items-center justify-between text-[10.5px]"><span className="text-slate-200">{n.title}</span><Badge tone={n.level === 'success' ? 'green' : n.level === 'warn' ? 'amber' : 'slate'}>{n.level}</Badge></div>
                  <div className="text-[9.5px] text-slateink-500">{n.body}</div>
                </div>
              ))}
              {(notifications.data?.notifications ?? []).length === 0 && <Empty title="Nothing yet" />}
            </div>
          </Card>
        </div>
      )}

      <div className="card p-3">
        <div className="flex items-center gap-2 text-[10.5px] text-slateink-400"><KeyRound size={12} /> Secrets policy: <code className="font-mono text-slate-300">AI_API_KEY</code>, <code className="font-mono text-slate-300">DATABASE_URL</code>, <code className="font-mono text-slate-300">FIELD_ENCRYPTION_KEY</code> are read from the server environment only. No key is ever written to the browser bundle, an API response or the audit log.</div>
      </div>
    </div>
  );
}
