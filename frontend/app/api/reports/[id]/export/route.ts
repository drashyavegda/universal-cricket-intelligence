import { getStore, audit } from '@/lib/core/db/store';
import { guard, context, fail } from '@/lib/api/helpers';
import { reportToMarkdown, reportToHtml, reportToPdf, reportToPptx, reportToDocx, reportToXlsx } from '@/lib/core/reporting/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  const report = store.reports.find((r) => r.id === params.id);
  if (!report) return fail('Report not found', 404);
  const format = new URL(req.url).searchParams.get('format') ?? 'pdf';
  const base = report.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  audit({ actor: context().user?.email ?? 'guest', action: 'report.export', entity: 'report', entityId: report.id, detail: `format ${format}` });

  if (format === 'md') {
    return new Response(reportToMarkdown(report), { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="${base}.md"` } });
  }
  if (format === 'html') {
    return new Response(reportToHtml(report), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="${base}.html"` } });
  }
  if (format === 'pdf') {
    const buf = await reportToPdf(report);
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${base}.pdf"` } });
  }
  if (format === 'pptx') {
    const buf = await reportToPptx(report);
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'Content-Disposition': `attachment; filename="${base}.pptx"` } });
  }
  if (format === 'docx') {
    const buf = await reportToDocx(report);
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${base}.docx"` } });
  }
  if (format === 'xlsx') {
    const buf = await reportToXlsx(report);
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${base}.xlsx"` } });
  }
  return fail('Unsupported format. Use md, html, pdf, docx, xlsx or pptx.');
}
