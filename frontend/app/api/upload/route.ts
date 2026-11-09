import { getStore, update, newId, audit, notify } from '@/lib/core/db/store';
import { guard, json, fail, serverError } from '@/lib/api/helpers';
import { parseFile } from '@/lib/core/data/parse';
import { extractRecords } from '@/lib/core/data/extract';
import { classifyDocument } from '@/lib/core/data/synonyms';
import { analyseDatasetQuality } from '@/lib/core/data/quality';
import type { Dataset, DatasetFile } from '@/lib/core/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Universal data upload & ingestion (Feature 1). */
export async function POST(req: Request) {
  const g = guard('data:upload');
  if (!g.ok) return g.response;
  const store = getStore();
  const maxMb = store.settings.limits.maxUploadMb;
  try {
    const form = await req.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    if (!files.length) return fail('No files received. Attach at least one CSV, XLSX, JSON, PDF or text file.');
    const instructions = String(form.get('instructions') ?? '');
    const name = String(form.get('name') ?? '') || files[0].name;
    const competition = String(form.get('competition') ?? 'Uploaded competition');
    const season = String(form.get('season') ?? 'Uploaded season');

    const datasetId = newId('ds');
    const storedFiles: DatasetFile[] = [];
    const warnings: string[] = [];
    let allRecords: ReturnType<typeof extractRecords>['records'] = [];
    let mapping: ReturnType<typeof extractRecords>['mapping'] = [];
    let category: Dataset['category'] = 'other';
    let rowCount = 0;
    let startRow = 2;

    for (const file of files) {
      if (file.size > maxMb * 1024 * 1024) {
        warnings.push(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB, above the ${maxMb} MB limit — skipped.`);
        continue;
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = await parseFile(file.name, file.type || 'application/octet-stream', buffer);
      const duplicate = [...store.datasets.flatMap((d) => d.files), ...storedFiles].find((f) => f.sha256 === parsed.sha256);
      const classification = classifyDocument(file.name, parsed.columns.length ? parsed.columns : ['name']);
      if (parsed.rows.length) category = classification.category;
      const extraction = extractRecords(parsed.rows, parsed.columns, {
        datasetId, referenceDate: store.settings.referenceDate, sourceName: file.name, startRow,
      });
      startRow += parsed.rows.length;
      rowCount += parsed.rows.length;
      allRecords = allRecords.concat(extraction.records);
      mapping = [...mapping, ...extraction.mapping.map((m) => ({ ...m, sourceColumn: `${file.name} › ${m.sourceColumn}` }))];
      storedFiles.push({
        id: newId('file'), filename: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size,
        sha256: parsed.sha256, duplicateOf: duplicate ? duplicate.filename : undefined,
        extraction: parsed.extraction, extractedText: parsed.text ? parsed.text.slice(0, 6000) : undefined,
        warnings: parsed.warnings, pages: parsed.pages,
      });
      if (duplicate) warnings.push(`${file.name} is byte-identical to an already-uploaded file (${duplicate.filename}). Both are stored with provenance so you can decide which to keep.`);
      if (parsed.extraction === 'failed') warnings.push(`${file.name}: no rows extracted — the file is preserved and listed with its warnings.`);
    }

    const quality = analyseDatasetQuality(allRecords, { datasetId, ageReference: store.settings.referenceDate });
    const dataset: Dataset = {
      id: datasetId, name, description: instructions || `Uploaded ${files.length} file(s)`,
      category, format: 'T20', competition, season, kind: 'uploaded',
      status: quality.counts.errors > 0 || allRecords.some((r) => r.confidence < 0.5) ? 'needs_review' : 'approved',
      rowCount, recordCount: allRecords.length, qualityScore: quality.score,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      files: storedFiles,
      mappingSummary: [...new Map(mapping.map((m) => [m.canonical, m])).values()].map((m) => ({
        canonical: m.canonical, sourceColumn: m.sourceColumn,
        matched: allRecords.filter((r) => (r.mapped as Record<string, unknown>)[m.canonical] !== undefined && (r.mapped as Record<string, unknown>)[m.canonical] !== null).length,
        confidence: m.confidence,
      })),
      notes: instructions ? `User instruction: ${instructions}` : '',
    };

    update((s) => {
      s.datasets.unshift(dataset);
      s.records = [...allRecords, ...s.records];
    });
    audit({ actor: g.ctx.user!.email, action: 'dataset.upload', entity: 'dataset', entityId: datasetId, detail: `${files.length} file(s), ${allRecords.length} records, quality ${quality.score}` });
    notify({ level: quality.counts.errors ? 'warn' : 'success', title: `Dataset "${name}" ingested`, body: `${allRecords.length} records from ${files.length} file(s). Quality score ${quality.score}/100 with ${quality.counts.errors} error(s) and ${quality.counts.warnings} warning(s).`, href: `/data?dataset=${datasetId}` });

    return json({
      dataset, quality, warnings: [...warnings, ...storedFiles.flatMap((f) => f.warnings)],
      preview: allRecords.slice(0, 25),
      instructionInterpretation: instructions
        ? `Understood "${instructions}". Created a combined ${category} dataset named "${name}" with ${allRecords.length} records mapped onto ${dataset.mappingSummary.length} canonical fields. Review and approve in the preview table.`
        : `Created a ${category} dataset named "${name}". Review and approve the extracted records before analysis.`,
    });
  } catch (error) {
    return serverError(error);
  }
}
