'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, useApi } from '@/lib/client/api';
import { bucket, trackEvent } from '@/lib/client/analytics';
import { Alert, Badge, Button, Card, Empty, Field, KV, Loading, PageHeader, ProgressBar, Select, Stat, Tabs, nf } from '@/components/ui';
import { CheckCircle2, FileSpreadsheet, GitMerge, ShieldAlert, Trash2, Upload, XCircle } from 'lucide-react';

interface DatasetRow {
  id: string; name: string; category: string; kind: string; status: string; rowCount: number; recordCount: number;
  qualityScore: number; createdAt: string; files: { filename: string; extraction: string; sizeBytes: number; warnings: string[]; sha256: string; duplicateOf?: string }[];
  mappingSummary: { canonical: string; sourceColumn: string; matched: number; confidence: number }[];
  counts?: { errors: number; warnings: number; info: number }; pending?: number; duplicateGroups?: number;
}
interface RecordRow {
  id: string; playerName: string; fields: Record<string, string | number | null>; confidence: number;
  issues: { field: string; severity: string; message: string }[]; status: string; sourceRow: number; unknownFields: Record<string, string>; version: number;
  mapped: Record<string, unknown>;
}
interface DatasetsResponse { datasets: DatasetRow[]; sources: { id: string; name: string; kind: string; reliability: number; licence: string; notes: string }[]; limits: { maxUploadMb: number; maxRowsPerDataset: number; pageSize: number } }
interface UploadResult { dataset: DatasetRow; quality: { score: number; counts: { errors: number; warnings: number } }; warnings: string[]; instructionInterpretation: string; preview: RecordRow[] }

export default function DataCentrePage() {
  const [tab, setTab] = useState<'upload' | 'datasets' | 'merge' | 'quality' | 'sources'>('upload');
  const { data, loading, reload } = useApi<DatasetsResponse>('/api/datasets');
  const [files, setFiles] = useState<File[]>([]);
  const [instructions, setInstructions] = useState('Analyse these files and create a combined cricket player database.');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [quality, setQuality] = useState<{ score: number; trustScore: number; counts: { errors: number; warnings: number }; issues: { id: string; severity: string; category: string; message: string; suggestion: string }[]; completeness: { field: string; pct: number; present: number; total: number }[]; checks: { name: string; passed: boolean; detail: string }[] } | null>(null);
  const [merge, setMerge] = useState<{ stats: Record<string, number>; warnings: string[]; candidates: { key: string; displayName: string; status: string; conflicts: string[]; provenance: { datasetId: string; recordId: string; row: number }[]; fields: { field: string; conflict: boolean; resolvedValue: unknown; values: { value: unknown; sourceDataset: string }[] }[] }[]; method: string[] } | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);

  const doUpload = async () => {
    if (!files.length) { setUploadError('Choose at least one file.'); return; }
    setUploading(true); setUploadError(null); setUploadResult(null); setProgress(8);
    const tick = setInterval(() => setProgress((p) => Math.min(92, p + 7)), 220);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      form.append('instructions', instructions);
      form.append('name', files[0].name.replace(/\.[^.]+$/, ''));
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      setUploadResult(json as UploadResult);
      // Analytics: coarse, non-identifying facts only — never the file name or rows.
      trackEvent('dataset_uploaded', { module: 'data', result: 'success', count_bucket: bucket(Number((json as UploadResult).dataset?.rowCount ?? 0), 500) });
      setProgress(100);
      await reload();
      setTab('datasets');
      setSelectedDataset((json as UploadResult).dataset.id);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      clearInterval(tick); setUploading(false);
    }
  };

  const loadDataset = async (id: string, page = 1, q = search, sev = severity) => {
    setSelectedDataset(id);
    const [recRes, dsRes] = await Promise.all([
      apiGet<{ records: RecordRow[]; pagination: { page: number; pages: number; total: number } }>(`/api/datasets/${id}?page=${page}&q=${encodeURIComponent(q)}&severity=${sev}&pageSize=20`),
      apiGet<{ dataset: DatasetRow }>(`/api/datasets/${id}?page=1&pageSize=1`),
    ]);
    setRecords(recRes.records); setPagination(recRes.pagination);
    void dsRes;
    const qualityRes = await apiGet<{ quality: typeof quality }>(`/api/datasets/${id}/quality`).catch(() => null);
    if (qualityRes) setQuality(qualityRes.quality);
  };

  const patchRecord = async (id: string, action: 'approve' | 'reject' | 'reset', fields?: Record<string, string | number | null>) => {
    await apiPost(`/api/records/${id}`, { action, fields }, 'PATCH').catch((e) => setUploadError((e as Error).message));
    if (selectedDataset) await loadDataset(selectedDataset, pagination.page);
  };

  const runMerge = async () => {
    const ids = selectedForMerge.length ? selectedForMerge : (data?.datasets ?? []).map((d) => d.id);
    const res = await apiPost<typeof merge>('/api/merge', { datasetIds: ids }).catch((e) => { setUploadError((e as Error).message); return null; });
    setMerge(res);
  };

  const approveDataset = async (id: string, status: 'approved' | 'needs_review') => {
    await apiPost('/api/datasets', { datasetId: id, status }, 'PATCH').catch((e) => setUploadError((e as Error).message));
    await reload();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Data Centre" description="Universal ingestion engine: PDF, CSV, Excel, JSON and text. Every extracted value carries provenance, a confidence score and explicit warnings — nothing is silently imputed.">
        <Button variant="ghost" onClick={() => reload()}>Refresh</Button>
        <a href="/api/export?type=players&format=csv"><Button variant="ghost">Export players CSV</Button></a>
      </PageHeader>

      <Tabs tabs={[{ key: 'upload', label: 'Upload & ingest' }, { key: 'datasets', label: 'Datasets & correction' }, { key: 'merge', label: 'Multi-file merge' }, { key: 'quality', label: 'Quality & trust' }, { key: 'sources', label: 'Sources' }]} active={tab} onChange={setTab} />

      {tab === 'upload' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Universal upload assistant" subtitle={`CSV · XLSX · JSON · PDF · TXT · multiple files · max ${data?.limits.maxUploadMb ?? 25} MB each`}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); setFiles(Array.from(e.dataTransfer.files)); }}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${dragOver ? 'border-turf-500 bg-turf-500/5' : 'border-line hover:border-turf-500/40'}`}>
              <Upload size={22} className="mx-auto text-turf-400" />
              <div className="mt-2 text-sm font-medium text-slate-200">Drop files here or click to browse</div>
              <div className="mt-1 text-[11px] text-slateink-400">Batting PDFs, bowling CSVs, age sheets, team Excel files and match JSON can be uploaded together.</div>
              <input ref={inputRef} type="file" multiple accept=".csv,.tsv,.xlsx,.xls,.json,.pdf,.txt,.md" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {files.map((f) => (
                  <div key={f.name} className="flex items-center justify-between rounded-lg border border-line bg-ink-900/50 px-2.5 py-1.5 text-[11.5px]">
                    <span className="flex items-center gap-2 truncate"><FileSpreadsheet size={12} className="text-turf-400" />{f.name}</span>
                    <span className="flex items-center gap-3 text-slateink-400">{(f.size / 1024).toFixed(0)} KB<button onClick={(e) => { e.stopPropagation(); setFiles((x) => x.filter((y) => y.name !== f.name)); }}><Trash2 size={12} className="text-danger-400" /></button></span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Field label="Instruction for the ingestion assistant" hint="This is interpreted into a dataset plan and shown back to you before you approve the records.">
                <input className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button onClick={doUpload} disabled={uploading}><Upload size={14} />{uploading ? 'Processing…' : 'Ingest files'}</Button>
              {uploading && <div className="flex-1"><ProgressBar value={progress} /></div>}
            </div>
            {uploadError && <div className="mt-3"><Alert tone="error">{uploadError}</Alert></div>}
            {uploadResult && (
              <div className="mt-3 space-y-2">
                <Alert tone="success" title="Ingestion complete">{uploadResult.instructionInterpretation}</Alert>
                {uploadResult.warnings.map((w, i) => <Alert key={i} tone="warn">{w}</Alert>)}
              </div>
            )}
          </Card>
          <Card title="What the engine does" subtitle="Deterministic, auditable processing">
            <ol className="space-y-2 text-[11.5px] leading-relaxed text-slateink-300">
              {[
                'Detects file type from extension, MIME, magic bytes and delimiter sniffing.',
                'Blocks password-protected PDFs and flags scanned PDFs (no text layer) instead of pretending to read them.',
                'Hashes every file (SHA-256) to detect duplicate uploads while still preserving provenance.',
                'Maps columns onto 37 canonical cricket fields using a synonym dictionary with fuzzy matching.',
                'Preserves unrecognised columns per record so nothing is lost.',
                'Derives age from DOB at the workspace reference date and flags conflicts with a stated age.',
                'Scores confidence per row and raises error/warning/info issues.',
                'Queues background-style review: approve, reject or edit each record before analysis.',
              ].map((t, i) => <li key={i} className="flex gap-2"><span className="text-turf-400">{i + 1}.</span>{t}</li>)}
            </ol>
            <div className="disclaimer mt-3">OCR for scanned PDFs is an interface + configuration point in this build (OCR_PROVIDER). The platform tells you when OCR is required rather than inventing extracted text.</div>
          </Card>
        </div>
      )}

      {tab === 'datasets' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Datasets" subtitle={loading ? 'Loading…' : `${data?.datasets.length ?? 0} dataset(s) in the workspace`}>
            <div className="space-y-1.5">
              {data?.datasets.map((d) => (
                <button key={d.id} onClick={() => loadDataset(d.id)} className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${selectedDataset === d.id ? 'border-turf-500/50 bg-turf-500/[0.07]' : 'border-line/70 bg-ink-900/40 hover:border-turf-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate text-[12px] font-medium text-slate-200">{d.name}</span>
                    <Badge tone={d.status === 'approved' ? 'green' : d.status === 'needs_review' ? 'amber' : 'red'}>{d.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10.5px] text-slateink-500">
                    <span>{d.kind.toUpperCase()}</span><span>·</span><span>{d.category}</span><span>·</span><span>{d.recordCount} records</span>
                  </div>
                  <div className="mt-1.5"><ProgressBar value={d.qualityScore} tone={d.qualityScore > 75 ? 'green' : d.qualityScore > 50 ? 'gold' : 'red'} /></div>
                </button>
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-2" title="Extracted records — editable preview" subtitle={selectedDataset ? `Pagination ${pagination.page}/${pagination.pages} · ${pagination.total} rows` : 'Select a dataset to review its records'}>
            {!selectedDataset ? <Empty title="No dataset selected">Pick a dataset on the left. The demo dataset is pre-approved; new uploads start as needs-review.</Empty> : (
              <>
                <div className="mb-2 flex flex-wrap gap-2">
                  <input className="input max-w-xs" placeholder="Search records…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadDataset(selectedDataset, 1); }} />
                  <Select value={severity} onChange={(v) => { setSeverity(v); loadDataset(selectedDataset, 1, search, v); }} options={[{ value: 'all', label: 'All severities' }, { value: 'error', label: 'Errors only' }, { value: 'warn', label: 'Warnings only' }]} className="max-w-[160px]" />
                  <Button variant="ghost" size="xs" onClick={() => loadDataset(selectedDataset, 1)}>Apply</Button>
                  <Button variant="ghost" size="xs" onClick={() => approveDataset(selectedDataset, 'approved')}>Approve dataset</Button>
                  <Button variant="ghost" size="xs" onClick={() => approveDataset(selectedDataset, 'needs_review')}>Reopen review</Button>
                </div>
                <div className="max-h-[520px] overflow-auto rounded-lg border border-line">
                  <table className="table-base">
                    <thead><tr><th>Row</th><th>Player</th><th>Conf.</th><th>Issues</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id}>
                          <td className="font-mono text-[10.5px] text-slateink-500">{r.sourceRow}</td>
                          <td>
                            <div className="text-[12px] text-slate-200">{r.playerName}</div>
                            <div className="text-[10px] text-slateink-500">
                              {Object.entries(r.mapped).filter(([k, v]) => v !== null && v !== undefined && !['batting', 'bowling', 'fielding'].includes(k)).slice(0, 4).map(([k, v]) => `${k}: ${String(v).slice(0, 14)}`).join(' · ')}
                            </div>
                          </td>
                          <td><Badge tone={r.confidence > 0.75 ? 'green' : r.confidence > 0.5 ? 'amber' : 'red'}>{(r.confidence * 100).toFixed(0)}%</Badge></td>
                          <td className="max-w-[260px]">
                            {r.issues.length === 0 ? <span className="text-[10.5px] text-slateink-500">none</span> : r.issues.slice(0, 2).map((i, k) => (
                              <div key={k} className="flex items-start gap-1 text-[10px] leading-snug text-ember-400"><ShieldAlert size={10} className="mt-0.5 shrink-0" />{i.message}</div>
                            ))}
                          </td>
                          <td><Badge tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'slate'}>{r.status}</Badge></td>
                          <td>
                            <div className="flex gap-1">
                              <button onClick={() => patchRecord(r.id, 'approve')} className="rounded border border-turf-500/30 p-1 text-turf-400 hover:bg-turf-500/10" title="Approve"><CheckCircle2 size={12} /></button>
                              <button onClick={() => patchRecord(r.id, 'reject')} className="rounded border border-danger-500/30 p-1 text-danger-400 hover:bg-danger-500/10" title="Reject"><XCircle size={12} /></button>
                              <button onClick={() => patchRecord(r.id, 'reset')} className="rounded border border-line p-1 text-slateink-400 hover:bg-ink-800" title="Reset to pending"><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slateink-400">
                  <span>Edits are versioned and audited. Missing values are never filled by the platform.</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="xs" disabled={pagination.page <= 1} onClick={() => loadDataset(selectedDataset, pagination.page - 1)}>Prev</Button>
                    <Button variant="ghost" size="xs" disabled={pagination.page >= pagination.pages} onClick={() => loadDataset(selectedDataset, pagination.page + 1)}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'merge' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Select datasets to merge" subtitle="Choose at least two. Format and season mixing produce explicit warnings.">
            <div className="space-y-1.5">
              {data?.datasets.map((d) => (
                <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line/70 px-2.5 py-1.5 text-[11.5px] hover:border-turf-500/30">
                  <input type="checkbox" checked={selectedForMerge.includes(d.id)} onChange={(e) => setSelectedForMerge((s) => e.target.checked ? [...s, d.id] : s.filter((x) => x !== d.id))} className="accent-turf-500" />
                  <span className="flex-1 truncate text-slate-200">{d.name}</span><span className="text-[10px] text-slateink-500">{d.recordCount}</span>
                </label>
              ))}
            </div>
            <Button className="mt-3 w-full" onClick={runMerge}><GitMerge size={14} /> Run merge</Button>
            <div className="mt-3 space-y-1.5 text-[10.5px] leading-relaxed text-slateink-400">
              <div>• Identity matching uses a normalised name key; near-matches are surfaced for review, never auto-merged.</div>
              <div>• Numeric conflicts are flagged beyond a 2% tolerance.</div>
              <div>• Every field keeps its dataset + row provenance.</div>
            </div>
          </Card>
          <Card className="lg:col-span-2" title="Merge candidates" subtitle={merge ? `${merge.stats.groups} groups · ${merge.stats.conflicts} with conflicts · ${merge.stats.needsReview} awaiting review` : 'Run a merge to see matched candidates'}>
            {!merge ? <Empty title="No merge run yet">Select two or more datasets and run the merge.</Empty> : (
              <div className="space-y-2">
                {merge.warnings.map((w, i) => <Alert key={i} tone="warn">{w}</Alert>)}
                <div className="max-h-[480px] space-y-1.5 overflow-auto">
                  {merge.candidates.slice(0, 40).map((c) => (
                    <div key={c.key} className="rounded-lg border border-line/70 bg-ink-900/40 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-slate-200">{c.displayName}</span>
                        <Badge tone={c.status === 'conflict' ? 'red' : c.status === 'needs-review' ? 'amber' : 'green'}>{c.status}</Badge>
                      </div>
                      <div className="mt-1 text-[10.5px] text-slateink-500">Sources: {c.provenance.map((p) => `${p.datasetId}#${p.row}`).join(', ')}</div>
                      {c.conflicts.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {c.fields.filter((f) => f.conflict).map((f) => (
                            <div key={f.field} className="rounded border border-danger-500/20 bg-danger-500/[0.06] px-2 py-1 text-[10.5px] text-danger-400">
                              <span className="font-medium">{f.field}</span>: {f.values.map((v) => `${String(v.value)} (${v.sourceDataset})`).join(' vs ')} — unresolved, needs a human decision.
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 space-y-1 text-[10.5px] text-slateink-400">{merge.method.map((m, i) => <div key={i}>• {m}</div>)}</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'quality' && (
        <div className="space-y-4">
          <Card title="Quality report" subtitle="Cross-checks that gate every downstream recommendation">
            <div className="mb-3 flex flex-wrap gap-2">
              {data?.datasets.map((d) => (
                <Button key={d.id} variant={selectedDataset === d.id ? 'primary' : 'ghost'} size="xs" onClick={() => loadDataset(d.id)}>{d.name}</Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Dataset quality" value={`${data?.datasets.find((d) => d.id === selectedDataset)?.qualityScore ?? 0}/100`} tone="green" hint="Errors, warnings and completeness weighted" />
              <Stat label="Duplicate groups" value={data?.datasets.find((d) => d.id === selectedDataset)?.duplicateGroups ?? 0} tone="amber" hint="Identical identity keys — must be resolved by a human" />
              <Stat label="Pending review" value={data?.datasets.find((d) => d.id === selectedDataset)?.pending ?? 0} hint="Records not yet approved" />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(quality?.checks ?? []).map((c) => (
                <div key={c.name} className="flex items-start gap-2 rounded-lg border border-line/60 px-2.5 py-2 text-[11px]">
                  {c.passed ? <CheckCircle2 size={13} className="mt-0.5 text-turf-400" /> : <ShieldAlert size={13} className="mt-0.5 text-ember-400" />}
                  <div><div className="text-slate-200">{c.name}</div><div className="text-[10px] text-slateink-500">{c.detail}</div></div>
                </div>
              ))}
              {!quality && <Alert tone="info">Open a dataset in the previous tab, then return here — the quality engine runs on the selected dataset’s full record set.</Alert>}
            </div>
          </Card>
        </div>
      )}

      {tab === 'sources' && (
        <Card title="Data sources & provenance" subtitle="Uploaded, external and demo datasets are kept separate and always labelled">
          <table className="table-base">
            <thead><tr><th>Source</th><th>Kind</th><th>Reliability</th><th>Licence / terms</th><th>Notes</th></tr></thead>
            <tbody>
              {data?.sources.map((s) => (
                <tr key={s.id}>
                  <td className="text-slate-200">{s.name}</td>
                  <td><Badge tone={s.kind === 'demo' ? 'gold' : s.kind === 'upload' ? 'green' : 'slate'}>{s.kind}</Badge></td>
                  <td className="font-mono text-[11.5px]">{nf(s.reliability * 100, 0)}%</td>
                  <td className="text-[11px] text-slateink-400">{s.licence}</td>
                  <td className="text-[11px] text-slateink-400">{s.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3">
            <KV items={[
              { k: 'Upload limit', v: `${data?.limits.maxUploadMb ?? 25} MB per file` },
              { k: 'Row limit', v: `${data?.limits.maxRowsPerDataset ?? 25000} rows per dataset` },
              { k: 'Page size', v: String(data?.limits.pageSize ?? 25) },
              { k: 'Duplicate detection', v: 'SHA-256 of the file bytes' },
            ]} />
          </div>
          <div className="disclaimer mt-3">External feeds (licensed APIs, official boards) are adapter stubs until credentials are configured. The platform does not scrape sites in violation of their terms, and it never presents synthetic records as real data.</div>
          <div className="mt-3"><Link href="/reports" className="link text-[11.5px]">Generate a data-quality report →</Link></div>
        </Card>
      )}
    </div>
  );
}
