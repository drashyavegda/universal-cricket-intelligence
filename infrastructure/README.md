# infrastructure/ — deployment templates

Copy-only templates for the **target monorepo**. Nothing here is active configuration: the running
deployment reads the files at the repository root (`vercel.json`, `render.yaml`, `Dockerfile`,
`docker-compose.yml`, `.env.example`). Overwriting a root file with a copy from this folder would
break the current deployment — see `../MIGRATION_MAP.md` §1.

```
infrastructure/
├── vercel/vercel.json              frontend project config (phase 5 paths)
├── vercel/README.md               what to change when frontend/ becomes real
├── render/web-service.yaml        Next.js service (root path today)
├── render/analytics-service.yaml  FastAPI service (backend/)
├── render/worker.yaml             background worker (phase 4, idle by design)
└── render/README.md               Render specifics: health checks, env, free-tier caveats
```

## Copy rules
1. Read the target file at the root first; diff it against the template.
2. Change only what the phase actually requires (paths, root dir, health check).
3. Never introduce a paid service into a default config.
4. Keep the templates valid: `python -c "import json;json.load(open(...))"` for JSON, and a YAML
   parse for `*.yaml`, before committing.
