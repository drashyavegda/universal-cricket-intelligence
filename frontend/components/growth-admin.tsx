'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, Empty, Field, Loading, Stat } from '@/components/ui';
import { apiGet, apiPost } from '@/lib/client/api';

interface Testimonial {
  id: string; name: string; role: string; organisation: string; quote: string; imageUrl: string | null;
  rating: number | null; status: 'draft' | 'published' | 'hidden'; sample: boolean; source: string;
  createdAt: string; updatedAt: string; createdBy: string;
}
interface FeedbackRow {
  id: string; reference: string; kind: string; name: string; email: string; organisation: string | null;
  message: string; status: 'new' | 'acknowledged' | 'closed'; createdAt: string; pageUrl: string | null;
  spamChecks: string[];
}
interface Stats { total: number; published: number; sample: number; draft: number; hidden: number }

const EMPTY = { name: '', role: '', organisation: '', quote: '', imageUrl: '', rating: '', status: 'draft' as Testimonial['status'] };

/**
 * Growth & trust admin panel.
 * Testimonials are owner-only (public-facing content) and are never auto-created from
 * form submissions. Sample rows are labelled and can be purged in one click.
 */
export function GrowthAdmin() {
  const [rows, setRows] = useState<Testimonial[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const res = await apiGet<{ testimonials: Testimonial[]; stats: Stats }>('/api/testimonials?scope=all');
      setRows(res.testimonials);
      setStats(res.stats);
    } catch (err) {
      setFailure(`Testimonials require the owner role: ${(err as Error).message}`);
    }
    try {
      const fb = await apiGet<{ feedback: FeedbackRow[] }>('/api/feedback');
      setFeedback(fb.feedback);
    } catch {
      setFeedback([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true);
    setErrors({});
    setNotice(null);
    try {
      const res = await apiPost<{ ok: boolean; stats: Stats; testimonial: Testimonial }>('/api/testimonials', {
        ...form,
        rating: form.rating === '' ? null : Number(form.rating),
        imageUrl: form.imageUrl || null,
      });
      if (!res.ok) throw new Error('The server did not confirm the save.');
      setForm({ ...EMPTY });
      setNotice(`Saved “${res.testimonial.name}” as ${res.testimonial.status}.`);
      setStats(res.stats);
      await load();
    } catch (err) {
      const message = (err as Error).message;
      setErrors({ form: message });
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, patch: Partial<Testimonial>) => {
    setNotice(null);
    try {
      const res = await apiPost<{ ok: boolean; stats: Stats }>('/api/testimonials', { ...patch, id }, 'PATCH');
      if (!res.ok) throw new Error('Update was not confirmed by the server.');
      setNotice('Testimonial updated.');
      setStats(res.stats);
      await load();
    } catch (err) {
      setErrors({ form: (err as Error).message });
    }
  };

  const remove = async (id: string) => {
    setNotice(null);
    try {
      await apiPost(`/api/testimonials?id=${encodeURIComponent(id)}`, {}, 'DELETE');
      setNotice('Testimonial removed.');
      await load();
    } catch (err) {
      setErrors({ form: (err as Error).message });
    }
  };

  const purgeSamples = async () => {
    try {
      const res = await apiPost<{ ok: boolean; removed: number }>('/api/testimonials', { purgeSamples: true });
      setNotice(`${res.removed} sample testimonial(s) removed. Add real, permission-granted quotes instead.`);
      await load();
    } catch (err) {
      setErrors({ form: (err as Error).message });
    }
  };

  const setFeedbackStatus = async (id: string, status: FeedbackRow['status']) => {
    try {
      await apiPost('/api/feedback', { id, status }, 'PATCH');
      setFeedback((rows2) => rows2.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      setErrors({ form: (err as Error).message });
    }
  };

  if (loading && !rows.length && !stats) return <Loading label="Loading testimonials and feedback" />;

  return (
    <div className="space-y-4">
      {failure && <Alert tone="warn" title="Testimonials are restricted">{failure}</Alert>}
      {errors.form && <Alert tone="error" title="Action not completed">{errors.form}</Alert>}
      {notice && <Alert tone="success" title="Saved">{notice}</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Published (verified)" value={stats?.published ?? 0} tone={(stats?.published ?? 0) > 0 ? 'green' : 'amber'} hint="Real, permission-granted quotes" />
        <Stat label="Sample records" value={stats?.sample ?? 0} tone={(stats?.sample ?? 0) > 0 ? 'amber' : 'green'} hint="Labelled in the public page" />
        <Stat label="Drafts" value={stats?.draft ?? 0} hint="Not visible publicly" />
        <Stat label="Feedback inbox" value={feedback.filter((f) => f.status === 'new').length} hint={`${feedback.length} total submissions`} />
      </div>

      <Card title="Add a testimonial" subtitle="Only add quotes you have permission to publish — never invent one">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Role *"><input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Performance Analyst" /></Field>
          <Field label="Organisation *"><input className="input" value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} /></Field>
          <Field label="Image URL (optional)" hint="https URL or /path; leave blank to use initials"><input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></Field>
          <Field label="Rating (optional)" hint="1–5, only if the reviewer gave one"><input className="input" type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Testimonial['status'] })}>
              <option value="draft">Draft (not public)</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
            </select>
          </Field>
        </div>
        <Field label="Quote * (30–600 characters)">
          <textarea className="input min-h-[90px]" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
        </Field>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={create} disabled={busy}><Plus size={13} /> {busy ? 'Saving…' : 'Save testimonial'}</Button>
          <Button variant="ghost" onClick={() => void load()}><RefreshCw size={13} /> Refresh</Button>
          {(stats?.sample ?? 0) > 0 && (
            <Button variant="danger" onClick={purgeSamples}><Trash2 size={13} /> Remove all sample rows</Button>
          )}
          <Link href="/testimonials" target="_blank" className="link text-[11.5px]">View the public page ↗</Link>
        </div>
      </Card>

      <Card title={`Testimonials (${rows.length})`} subtitle="Edit inline; changes are audited">
        <div className="space-y-2">
          {rows.map((t) => (
            <div key={t.id} className="rounded-lg border border-line/70 bg-ink-900/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-medium text-white">{t.name}</span>
                <span className="text-[11px] text-slateink-400">{t.role} · {t.organisation}</span>
                <Badge tone={t.status === 'published' ? 'green' : t.status === 'draft' ? 'slate' : 'amber'}>{t.status}</Badge>
                {t.sample && <Badge tone="gold">SAMPLE</Badge>}
                {t.rating && <span className="inline-flex items-center gap-0.5 text-gold-300">{Array.from({ length: t.rating }, (_, i) => <Star key={i} size={10} fill="currentColor" />)}</span>}
                <span className="ml-auto flex gap-1">
                  {t.status !== 'published' && <Button variant="ghost" size="xs" onClick={() => update(t.id, { status: 'published' })}>Publish</Button>}
                  {t.status === 'published' && <Button variant="ghost" size="xs" onClick={() => update(t.id, { status: 'hidden' })}>Hide</Button>}
                  <Button variant="ghost" size="xs" onClick={() => update(t.id, { status: 'draft' })}>Draft</Button>
                  <Button variant="danger" size="xs" onClick={() => remove(t.id)}><Trash2 size={11} /></Button>
                </span>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-slateink-300">“{t.quote}”</p>
              <div className="mt-1 text-[10px] text-slateink-600">Updated {new Date(t.updatedAt).toLocaleString()} · source {t.source} · by {t.createdBy}</div>
            </div>
          ))}
          {!rows.length && <Empty title="No testimonials yet">Add the first verified quote above, or keep the page honest by publishing none.</Empty>}
        </div>
      </Card>

      <Card title={`Feedback inbox (${feedback.length})`} subtitle="Public submissions with the spam checks that were applied">
        <div className="space-y-2">
          {feedback.map((f) => (
            <div key={f.id} className="rounded-lg border border-line/70 bg-ink-900/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-turf-300">{f.reference}</span>
                <Badge tone="slate">{f.kind}</Badge>
                <span className="text-[11.5px] text-slateink-300">{f.name} · {f.email}</span>
                <Badge tone={f.status === 'new' ? 'amber' : f.status === 'acknowledged' ? 'green' : 'slate'}>{f.status}</Badge>
                <span className="ml-auto text-[10px] text-slateink-600">{new Date(f.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[11.5px] leading-relaxed text-slateink-300">{f.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {f.spamChecks.map((c) => <span key={c} className="badge badge-slate">{c}</span>)}
                <span className="ml-auto flex gap-1">
                  <Button variant="ghost" size="xs" onClick={() => setFeedbackStatus(f.id, 'acknowledged')}><CheckCircle2 size={11} /> Acknowledge</Button>
                  <Button variant="ghost" size="xs" onClick={() => setFeedbackStatus(f.id, 'closed')}><AlertTriangle size={11} /> Close</Button>
                </span>
              </div>
            </div>
          ))}
          {!feedback.length && <Empty title="No messages">Public contact submissions land here with their spam-check trace.</Empty>}
        </div>
      </Card>
    </div>
  );
}
