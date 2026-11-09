# Deployment

Target architecture: **Next.js on Vercel · FastAPI on Render · PostgreSQL on Supabase ·
object storage on Supabase Storage (or any S3-compatible provider)**.

| Document | Use it for |
| --- | --- |
| [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) | Run the stack on a laptop in under 5 minutes |
| [PRODUCTION_BUILD.md](PRODUCTION_BUILD.md) | Build, verify and smoke-test a release before deploying |
| [VERCEL.md](VERCEL.md) | Next.js project, env vars, domains, post-deploy checklist |
| [RENDER.md](RENDER.md) | FastAPI service, worker, health checks, CORS, plan limits |
| [SUPABASE.md](SUPABASE.md) | Postgres schema, connection strings, RLS, storage buckets |
| [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) | Every variable, which are secrets, where to set them |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Symptom → cause → fix matrix |

**Cost reality:** the free/starter tiers of Vercel and Render are enough for a demo workspace,
but Render free instances sleep after inactivity and Supabase free projects pause after a week
of idleness. Production pilot traffic needs at least: Vercel Pro (or Hobby with limits
understood), one paid Render web service, one Render background worker (optional), and a
Supabase project on a paid tier or a self-managed Postgres. Nothing here obliges you to pay —
the app runs entirely on one machine if you prefer.
