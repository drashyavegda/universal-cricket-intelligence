'use client';
import Link from 'next/link';
import { Button, Card, KV, PageHeader, Alert, Badge } from '@/components/ui';
import { ServiceProbe, ServiceStatus } from '@/components/service-status';
import { ExternalLink, Terminal } from 'lucide-react';

/**
 * Service connection page.
 *
 * Purpose: make the Next.js ↔ FastAPI seam observable. A deployment that cannot see whether its
 * dependency is reachable produces invented confidence; this page shows the real answer, including
 * the honest case where the Python service is asleep on a free Render instance.
 *
 * No cricket figures are produced here — the probe uses a labelled synthetic sample.
 */
export default function SystemPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Service connection"
        badge={<Badge tone="slate">DEPLOYMENT</Badge>}
        description="The workspace runs on its own deterministic TypeScript engines. The FastAPI service in backend/ is an optional compute tier — this page reports whether it is reachable right now, and which engine is answering."
      >
        <Link href="/settings"><Button variant="ghost" size="xs">Settings</Button></Link>
        <Link href="/reports"><Button variant="ghost" size="xs">Reports</Button></Link>
      </PageHeader>

      <ServiceStatus variant="full" />

      <div className="grid gap-4 lg:grid-cols-2">
        <ServiceProbe />

        <Card title="How the integration works" subtitle="One seam, four states, zero hardcoded hosts">
          <ol className="space-y-2 text-[11.5px] leading-relaxed text-slateink-300">
            <li>
              <span className="text-slate-200">1. Browser → Next.js.</span> This page calls{' '}
              <code className="text-gold-300">/api/service/status</code> on the same origin. No cross-origin
              request is ever made from the browser, so FastAPI CORS only has to allow the Next.js server.
            </li>
            <li>
              <span className="text-slate-200">2. Next.js → FastAPI.</span> The route reads{' '}
              <code className="text-gold-300">NEXT_PUBLIC_API_URL</code> (set in Vercel), applies a timeout and,
              when configured, a bearer <code className="text-gold-300">ANALYTICS_SERVICE_TOKEN</code>.
            </li>
            <li>
              <span className="text-slate-200">3. Four truthful states.</span> not configured · unreachable ·
              reachable but not ready · connected. Each renders its own message and next step.
            </li>
            <li>
              <span className="text-slate-200">4. Fallback is labelled.</span> If the service cannot answer, the
              probe says <em>answered locally</em> and prints the failure. It never shows a remote-looking result
              that was computed locally.
            </li>
          </ol>
          <div className="mt-3 rounded-lg border border-line/60 bg-ink-900/50 p-2.5">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slateink-500">
              <Terminal size={12} /> Local check
            </div>
            <pre className="mt-1.5 overflow-x-auto text-[11px] leading-relaxed text-slateink-300">{`# terminal A — the Next.js app
cd frontend && npm run dev

# terminal B — the FastAPI service
cd backend && uvicorn main:app --port 8000 --reload

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000`}</pre>
          </div>
        </Card>
      </div>

      <Card title="Environment variables" subtitle="Names only — values are never rendered in the UI">
        <KV
          cols={2}
          items={[
            { k: 'NEXT_PUBLIC_API_URL', v: 'Render service origin, e.g. https://ucip-analytics.onrender.com (required to connect)' },
            { k: 'ANALYTICS_SERVICE_URL', v: 'Server-only alias for container-to-container setups (fallback if the public variable is unset)' },
            { k: 'ANALYTICS_SERVICE_TOKEN', v: 'Optional shared bearer token; must match the value set on Render' },
            { k: 'BACKEND_TIMEOUT_MS', v: 'Probe timeout, default 4000 ms (a sleeping free instance needs a retry, not a longer page load)' },
            { k: 'NEXT_PUBLIC_SITE_URL', v: 'Canonical origin for metadata, sitemap and share cards' },
            { k: 'DATA_DIR', v: 'Workspace JSON store (ephemeral on Vercel — use Postgres for durable data)' },
          ]}
        />
        <Alert tone="info" title="Public vs secret">
          <code>NEXT_PUBLIC_*</code> values are inlined into the browser bundle — never put a secret there.
          The service token has no <code>NEXT_PUBLIC_</code> prefix precisely because the browser must never see it.
        </Alert>
      </Card>

      <Card title="If the service is unreachable" subtitle="Ordered by how often it is the cause">
        <div className="space-y-2 text-[11.5px] leading-relaxed text-slateink-300">
          <p><span className="text-slate-200">Free Render instances sleep.</span> The first request after idle can take 30–60 s; the probe times out at 4 s, so press Recheck after waking the service.</p>
          <p><span className="text-slate-200">Public variables are build-time.</span> Setting <code>NEXT_PUBLIC_API_URL</code> after a build has no effect until you redeploy.</p>
          <p><span className="text-slate-200">Trailing slash or path.</span> The value must be the origin only (<code>https://host</code>), not <code>https://host/</code> or <code>https://host/docs</code>.</p>
          <p><span className="text-slate-200">CORS.</span> Only needed if you call FastAPI from the browser. This integration does not, so a wrong <code>BACKEND_CORS_ORIGINS</code> cannot break it.</p>
          <p>
            Full runbook: <Link className="link" href="/settings">Settings → diagnostics</Link>, or the repository files{' '}
            <code>docs/deployment/VERCEL.md</code> and <code>docs/deployment/RENDER.md</code>.
            <ExternalLink size={11} className="ml-1 inline" />
          </p>
        </div>
      </Card>
    </div>
  );
}
