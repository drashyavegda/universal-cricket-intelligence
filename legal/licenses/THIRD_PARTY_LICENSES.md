# Third-party licences

The application depends on npm packages and Python wheels. This table covers the licences that create
obligations; a full `npm ls --all` is the authoritative list for any legal review.

| Package | Licence | Obligation |
| --- | --- | --- |
| next, react, react-dom | MIT | none beyond attribution |
| recharts, lucide-react, clsx, tailwind-merge | MIT | none |
| zod, nanoid, papaparse, jszip | MIT | none |
| xlsx (SheetJS Community) | Apache-2.0 | include the licence text with any distribution |
| pdf-lib | MIT | none |
| pdf-parse | MIT | none |
| pptxgenjs | MIT | none |
| tailwindcss, postcss, autoprefixer, typescript, vitest, tsx | MIT | none |
| fastapi, uvicorn, pydantic, numpy, pytest, httpx (Python) | MIT / BSD-3-Clause / Apache-2.0 | attribution in distribution |

## Not used, deliberately

* No paid SDKs (no Stripe, no Auth0, no Mapbox) — the free-tier constraint is architectural, not
  temporary.
* No "source available" or non-commercial licensed libraries that would restrict this project's use.
* No bundled fonts (system stack), so no font licence file is needed.

## If you add a dependency

1. Check the licence is OSI-approved and compatible with your distribution model.
2. Add a row here in the same pull request.
3. Pin the version in `package.json`/`requirements.txt` — no floating ranges for production code.
