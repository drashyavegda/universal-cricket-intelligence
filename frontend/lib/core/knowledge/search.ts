/** Knowledge base retrieval with citations (Feature 29). */
import type { KnowledgeDoc } from '../types';

const stop = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'is', 'are', 'for', 'on', 'with', 'how', 'what', 'why', 'do', 'does', 'should', 'i', 'we']);

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2 && !stop.has(t));
}

/** BM25-lite scoring over chunks — deterministic, no embeddings required. */
export function searchKnowledge(docs: KnowledgeDoc[], query: string, limit = 6) {
  const terms = tokenize(query);
  if (!terms.length) return [];
  const chunks = docs.flatMap((d) => d.chunks.map((c) => ({ doc: d, chunk: c, tokens: tokenize(`${d.title} ${d.tags.join(' ')} ${c.text}`) })));
  const avgLen = chunks.reduce((a, c) => a + c.tokens.length, 0) / Math.max(1, chunks.length);
  const df = new Map<string, number>();
  terms.forEach((t) => df.set(t, chunks.filter((c) => c.tokens.includes(t)).length));
  const k1 = 1.4; const b = 0.72;
  const scored = chunks.map((c) => {
    let score = 0;
    for (const t of terms) {
      const tf = c.tokens.filter((x) => x === t).length;
      if (!tf) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (chunks.length - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (c.tokens.length / avgLen))));
    }
    return { ...c, score };
  }).filter((c) => c.score > 0).sort((a, b2) => b2.score - a.score).slice(0, limit);

  return scored.map((s) => ({
    docId: s.doc.id, title: s.doc.title, kind: s.doc.kind, chunkId: s.chunk.id,
    snippet: s.chunk.text.length > 320 ? `${s.chunk.text.slice(0, 320)}…` : s.chunk.text,
    score: Number(s.score.toFixed(3)),
    citation: `${s.doc.title} (${s.doc.id}) › ${s.chunk.id}`,
  }));
}

export function knowledgeGaps(docs: KnowledgeDoc[], playersInWorkspace: number): { gap: string; severity: 'high' | 'medium' | 'low'; suggestion: string }[] {
  const gaps: { gap: string; severity: 'high' | 'medium' | 'low'; suggestion: string }[] = [];
  const kinds = new Set(docs.map((d) => d.kind));
  if (!kinds.has('auction')) gaps.push({ gap: 'No auction methodology note', severity: 'high', suggestion: 'Document how your valuation was calibrated before trusting max-bid advice.' });
  if (!kinds.has('venue')) gaps.push({ gap: 'No venue notes', severity: 'medium', suggestion: 'Add pitch reports per venue so recommendations cite local evidence.' });
  if (!kinds.has('prediction')) gaps.push({ gap: 'No prediction evaluation note', severity: 'medium', suggestion: 'Record Brier-score results per model version.' });
  if (docs.length < 8) gaps.push({ gap: `Only ${docs.length} knowledge documents`, severity: 'medium', suggestion: 'Import research PDFs into the library so answers can cite sources.' });
  if (playersInWorkspace > 100 && !kinds.has('player')) gaps.push({ gap: 'No player-level knowledge notes', severity: 'low', suggestion: 'Add scouting notes for shortlisted players to preserve context.' });
  return gaps;
}
