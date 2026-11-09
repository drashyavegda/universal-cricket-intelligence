'use client';
import { useState } from 'react';
import { apiGet, apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, Select, Stat } from '@/components/ui';
import { BookOpen, Search } from 'lucide-react';

interface Doc { id: string; title: string; kind: string; tags: string[]; updatedAt: string; chunks: number; words: number; source: string }
interface SearchResult { docId: string; title: string; kind: string; chunkId: string; snippet: string; score: number; citation: string }

export default function ResearchPage() {
  const [q, setQ] = useState('valuation scarcity');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const docs = useApi<{ documents: Doc[]; gaps: { gap: string; severity: string; suggestion: string }[]; sources: { id: string; name: string; kind: string; reliability: number; licence: string }[] }>('/api/knowledge');
  const [newDoc, setNewDoc] = useState({ title: '', kind: 'research', tags: '', body: '' });
  const [msg, setMsg] = useState<string | null>(null);

  const search = async () => {
    setBusy(true);
    try { const res = await apiGet<{ results: SearchResult[] }>(`/api/knowledge?q=${encodeURIComponent(q)}`); setResults(res.results); }
    finally { setBusy(false); }
  };

  const add = async () => {
    setMsg(null);
    try {
      await apiPost('/api/knowledge', { title: newDoc.title, kind: newDoc.kind, tags: newDoc.tags.split(',').map((t) => t.trim()).filter(Boolean), body: newDoc.body });
      setMsg('Document added to the library with chunk-level citations.');
      setNewDoc({ title: '', kind: 'research', tags: '', body: '' });
      await docs.reload();
    } catch (e) { setMsg((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="AI Research Library" description="Curated methodology notes plus your own research documents. Retrieval is deterministic (BM25-lite) so every answer can cite a chunk — no embeddings service required.">
        <Button onClick={search} disabled={busy}><Search size={14} />{busy ? 'Searching…' : 'Semantic-style search'}</Button>
      </PageHeader>

      <Card title="Search the library" subtitle="Ranked chunk retrieval with citations">
        <div className="flex gap-2">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="e.g. how should I value a death bowler?" />
          <Button onClick={search}>Search</Button>
        </div>
        {results && (
          <div className="mt-3 space-y-1.5">
            {results.length === 0 && <Empty title="No matching passages" />}
            {results.map((r) => (
              <div key={r.chunkId} className="rounded-lg border border-line/60 bg-ink-900/40 p-2.5">
                <div className="flex items-center justify-between"><div className="text-[12px] text-slate-100">{r.title}</div><Badge tone="slate">{r.kind}</Badge></div>
                <p className="mt-1 text-[11px] leading-relaxed text-slateink-300">{r.snippet}</p>
                <div className="mt-1 font-mono text-[9.5px] text-slateink-500">citation: {r.citation} · score {r.score}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Document library" subtitle={`${docs.data?.documents.length ?? 0} documents · chunked for retrieval`}>
          {docs.loading && <Loading />}
          <div className="max-h-[420px] overflow-auto">
            <table className="table-base">
              <thead><tr><th>Title</th><th>Kind</th><th>Chunks</th><th>Words</th><th>Source</th></tr></thead>
              <tbody>
                {docs.data?.documents.map((d) => (
                  <tr key={d.id}>
                    <td className="text-[11.5px] text-slate-100">{d.title}</td>
                    <td><Badge tone="slate">{d.kind}</Badge></td>
                    <td className="font-mono text-[11px]">{d.chunks}</td>
                    <td className="font-mono text-[11px]">{d.words}</td>
                    <td className="text-[10.5px] text-slateink-400">{d.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Add research">
            <div className="space-y-2">
              <Field label="Title"><input className="input" value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} /></Field>
              <Field label="Kind"><Select value={newDoc.kind} onChange={(v) => setNewDoc({ ...newDoc, kind: v })} options={['research', 'strategy', 'venue', 'talent', 'auction', 'player', 'team'].map((k) => ({ value: k, label: k }))} /></Field>
              <Field label="Tags (comma separated)"><input className="input" value={newDoc.tags} onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })} /></Field>
              <Field label="Body"><textarea className="input min-h-[90px]" value={newDoc.body} onChange={(e) => setNewDoc({ ...newDoc, body: e.target.value })} /></Field>
              <Button className="w-full" onClick={add} disabled={!newDoc.title || !newDoc.body}>Add to library</Button>
              {msg && <Alert tone={/added/i.test(msg) ? 'success' : 'warn'}>{msg}</Alert>}
            </div>
          </Card>
          <Card title="Knowledge gaps" subtitle="Detected by coverage analysis">
            {(docs.data?.gaps ?? []).map((g) => (
              <div key={g.gap} className="mb-1.5 rounded border border-line/60 px-2 py-1.5 text-[10.5px]">
                <div className="flex items-center justify-between"><span className="text-slate-200">{g.gap}</span><Badge tone={g.severity === 'high' ? 'red' : 'amber'}>{g.severity}</Badge></div>
                <div className="text-slateink-500">{g.suggestion}</div>
              </div>
            ))}
          </Card>
          <Card title="Sources & licensing">
            {(docs.data?.sources ?? []).slice(0, 6).map((s) => (
              <div key={s.id} className="mb-1 text-[10px]"><span className="text-slate-300">{s.name}</span> <span className="text-slateink-500">· {s.kind} · reliability {(s.reliability * 100).toFixed(0)}%</span><div className="text-slateink-600">{s.licence}</div></div>
            ))}
          </Card>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10.5px] text-slateink-500"><BookOpen size={12} /> Answers in the AI Assistant cite these documents when available. The platform never presents an unsourced claim as a citation.</div>
    </div>
  );
}
