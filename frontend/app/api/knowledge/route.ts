import { getStore, update, newId, audit } from '@/lib/core/db/store';
import { guard, json, readBody, serverError } from '@/lib/api/helpers';
import { searchKnowledge, knowledgeGaps } from '@/lib/core/knowledge/search';
import type { KnowledgeDoc } from '@/lib/core/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const store = getStore();
  const q = new URL(req.url).searchParams.get('q');
  const docs = store.knowledge;
  return json({
    documents: docs.map((d) => ({ id: d.id, title: d.title, kind: d.kind, tags: d.tags, updatedAt: d.updatedAt, chunks: d.chunks.length, words: d.body.split(/\s+/).length, source: store.sources.find((s) => s.id === d.sourceId)?.name ?? d.sourceId })),
    results: q ? searchKnowledge(docs, q) : [],
    gaps: knowledgeGaps(docs, store.players.length),
    sources: store.sources,
  });
}

export async function POST(req: Request) {
  const g = guard('report:write'); if (!g.ok) return g.response;
  try {
    const body = await readBody<{ title: string; kind: KnowledgeDoc['kind']; tags?: string[]; body: string }>(req);
    if (!body.title || !body.body) return json({ error: 'title and body required' }, { status: 400 });
    const doc: KnowledgeDoc = {
      id: newId('kb'), title: body.title, kind: body.kind ?? 'research', tags: body.tags ?? [],
      body: body.body, sourceId: 'src_upload', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      entities: body.tags ?? [],
      chunks: body.body.split(/\n\n+/).map((text, i) => ({ id: `chunk_${i}`, text, tokens: Math.ceil(text.length / 4) })),
      duplicates: store_knowledge_duplicates(body.title, body.body),
    };
    update((s) => { s.knowledge.unshift(doc); });
    audit({ actor: g.ctx.user!.email, action: 'knowledge.create', entity: 'knowledge', entityId: doc.id, detail: doc.title });
    return json({ document: doc });
  } catch (error) { return serverError(error); }
}

function store_knowledge_duplicates(title: string, body: string): string[] {
  const store = getStore();
  return store.knowledge.filter((d) => d.title.toLowerCase() === title.toLowerCase() || (body.length > 200 && d.body.includes(body.slice(0, 120)))).map((d) => d.id);
}
