# backend/reporting/ — Report generation (planned)

Report **generation** currently happens in the Next.js application
(`lib/core/reporting/build.ts` + `export.ts`, six formats: md/html/pdf/docx/xlsx/pptx).

If large decks move here, the contract is: the builder receives a fully-resolved evidence block and
returns bytes plus a quality score — no re-computation of metrics, no independent sourcing of data.
The PDF writer must remain Latin-1 safe (the current exporter falls back to `?` for unsupported glyphs)
until a Unicode font is embedded.
