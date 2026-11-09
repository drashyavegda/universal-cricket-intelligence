'use client';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Empty, KV, Loading, nf } from '@/components/ui';
import { apiGet, apiPost } from '@/lib/client/api';
import type { ServiceProbePayload, ServiceStatusPayload } from '@/lib/api/backend';
import { Activity, CheckCircle2, RefreshCw, ServerCog, TriangleAlert, WifiOff } from 'lucide-react';

/**
 * Live connection status for the standalone FastAPI service.
 *
 * Three explicit states, never a spinner that gives up silently:
 *  - loading  → skeleton with the endpoint being probed;
 *  - error    → the request to /api/service/status itself failed (session, network, server);
 *  - data     → configured / unreachable / unconfigured, all three rendered truthfully.
 *
 * The component never invents a latency or a version: everything shown comes from the payload.
 */
export function ServiceStatus({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const [data, setData] = useState<ServiceStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGet<ServiceStatusPayload>('/api/service/status'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const recheck = (
    <Button variant="ghost" size="xs" onClick={() => void load()} disabled={loading}>
      <RefreshCw size={12} className={loading ? 'animate-spin' : undefined} /> {loading ? 'Checking' : 'Recheck'}
    </Button>
  );

  if (loading && !data) {
    return (
      <Card title="Compute service" subtitle="FastAPI · backend/ on Render" actions={recheck}>
        <Loading label="Probing the compute service" />
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card title="Compute service" actions={recheck}>
        <Alert tone="error" title="Status check failed">
          {error}
        </Alert>
        <p className="mt-2 text-[11px] text-slateink-400">
          This is the Next.js API route failing, not necessarily FastAPI. The workspace keeps working on its
          local TypeScript engines either way.
        </p>
      </Card>
    );
  }

  if (!data) return <Empty title="No status available" />;

  const health = data.health;
  const ready = data.ready;
  const version = data.version;
  const connected = Boolean(health?.ok);
  const tone = !data.configured ? 'slate' : connected ? 'green' : 'amber';
  const label = !data.configured ? 'NOT CONFIGURED' : connected ? 'CONNECTED' : 'UNREACHABLE';

  if (variant === 'compact') {
    return (
      <Card
        title="Compute service"
        subtitle="FastAPI · backend/ on Render"
        actions={recheck}
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0">
            {!data.configured ? <WifiOff size={15} className="text-slateink-500" />
              : connected ? <CheckCircle2 size={15} className="text-turf-400" />
                : <TriangleAlert size={15} className="text-ember-400" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tone}>{label}</Badge>
              {data.endpoint && <code className="truncate text-[10.5px] text-slateink-400">{data.endpoint}</code>}
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-slateink-300">{data.summary}</p>
            <p className="mt-1 text-[10.5px] text-slateink-500">
              Analytics currently served by:{' '}
              <span className="text-slate-200">
                {data.serving === 'fastapi' ? 'FastAPI service' : 'local TypeScript engines'}
              </span>
              {data.latencyMs !== null && ` · ${nf(data.latencyMs, 0)} ms round trip`}
            </p>
            {!data.configured && (
              <p className="mt-1.5 text-[10.5px] text-slateink-500">
                Set <code className="text-slate-300">NEXT_PUBLIC_API_URL</code> in Vercel to connect the Render service.
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Compute service connection"
      subtitle="FastAPI (backend/) on Render · probed live from the Next.js server, never from the browser"
      actions={recheck}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{label}</Badge>
        <Badge tone="slate">serving: {data.serving === 'fastapi' ? 'FastAPI' : 'local TS engines'}</Badge>
        {health?.ok && <Badge tone="slate">{health.data.service ?? 'ucip-api'} · {health.data.env ?? 'env n/a'}</Badge>}
        {data.tokenConfigured && <Badge tone="slate">service token configured</Badge>}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-slateink-300">{data.summary}</p>

      <div className="mt-3 space-y-2">
        <Row
          title="GET /health"
          icon={<Activity size={13} />}
          result={health}
          render={(d) => `${d.status} · version ${d.version ?? 'n/a'} · uptime ${nf(d.uptimeSeconds ?? 0, 0)} s`}
        />
        <Row
          title="GET /ready"
          icon={<ServerCog size={13} />}
          result={ready}
          render={(d) => (d.ready ? 'ready' : 'not ready') + ` · ${Object.entries(d.checks ?? {}).filter(([, v]) => v).length}/${Object.keys(d.checks ?? {}).length} checks configured`}
        />
        <Row
          title="GET /version"
          icon={<ServerCog size={13} />}
          result={version}
          render={(d) => `api ${d.apiVersion ?? 'n/a'} · python ${d.python ?? 'n/a'}${d.features ? ` · ${Object.entries(d.features).map(([k, v]) => `${k}=${v}`).join(', ')}` : ''}`}
        />
      </div>

      {!connected && data.configured && health && !health.ok && (
        <Alert tone="warn" title={health.kind === 'timeout' ? 'Timed out' : 'Service did not answer'}>
          {health.message}
          <div className="mt-1 text-[11px] text-slateink-400">{health.hint}</div>
        </Alert>
      )}

      {!data.configured && (
        <Alert tone="info" title="How to connect it">
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>In Vercel → Project → Settings → Environment Variables add <code>NEXT_PUBLIC_API_URL</code> = your Render URL.</li>
            <li>Add the same value to <code>frontend/.env.local</code> for local development.</li>
            <li>Redeploy (public variables are inlined at build time).</li>
            <li>If your Render service sets <code>ANALYTICS_SERVICE_TOKEN</code>, add the identical value in Vercel.</li>
          </ol>
        </Alert>
      )}

      <div className="mt-3">
        <KV cols={2} items={[
          { k: 'Endpoint', v: data.endpoint ?? '— not configured —' },
          { k: 'Value source', v: data.source === 'none' ? 'none' : data.source },
          { k: 'Timeout', v: `${data.timeoutMs} ms` },
          { k: 'Checked at', v: new Date(data.checkedAt).toLocaleTimeString() },
        ]} />
      </div>
    </Card>
  );
}

function Row<T extends object>({
  title, icon, result, render,
}: {
  title: string;
  icon: React.ReactNode;
  result: { ok: true; data: T; latencyMs: number } | { ok: false; message: string; latencyMs: number } | null;
  render: (data: T) => string;
}) {
  if (!result) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-line/60 bg-ink-900/40 px-2.5 py-1.5 text-[11.5px]">
        <span className="text-slateink-400">{title}</span>
        <span className="text-slateink-500">not probed (endpoint not configured)</span>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-line/60 bg-ink-900/40 px-2.5 py-1.5 text-[11.5px]">
      <span className="flex shrink-0 items-center gap-1.5 text-slateink-400">
        {icon}<code className="text-slate-300">{title}</code>
      </span>
      <span className="min-w-0 flex-1 truncate text-right text-slate-200" title={result.ok ? render(result.data) : result.message}>
        {result.ok ? render(result.data) : result.message}
        <span className="ml-2 text-[10.5px] text-slateink-500">{nf(result.latencyMs, 0)} ms</span>
      </span>
    </div>
  );
}

/** Round-trip compute probe: shows which engine actually produced the statistics. */
export function ServiceProbe() {
  const [payload, setPayload] = useState<{
    source: 'fastapi' | 'local-fallback';
    label: string;
    values: number[];
    result: { count: number; mean: number | null; median: number | null; stdev: number | null; min: number | null; max: number | null; method: string; assumptions: string[] };
    latencyMs: number;
    backend: { ok: boolean; kind?: string; message?: string; hint?: string };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      setPayload(await apiPost<ServiceProbePayload>('/api/service/describe', {}));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Compute round-trip probe"
      subtitle="Sends a fixed synthetic sample to POST /stats/describe and reports which engine answered."
      actions={<Button size="xs" onClick={() => void run()} disabled={busy}>{busy ? 'Running' : 'Run probe'}</Button>}
    >
      {error && <Alert tone="error" title="Probe failed">{error}</Alert>}
      {!payload && !error && (
        <p className="text-[11.5px] text-slateink-400">
          Nothing is sent until you run the probe. The sample is ten labelled synthetic innings scores — not player data.
        </p>
      )}
      {payload && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={payload.source === 'fastapi' ? 'green' : 'amber'}>
              {payload.source === 'fastapi' ? 'ANSWERED BY FASTAPI' : 'ANSWERED LOCALLY (FALLBACK)'}
            </Badge>
            <span className="text-[10.5px] text-slateink-500">{nf(payload.latencyMs, 0)} ms · {payload.result.method}</span>
          </div>
          <KV cols={3} items={[
            { k: 'n', v: payload.result.count },
            { k: 'Mean', v: nf(payload.result.mean) },
            { k: 'Median', v: nf(payload.result.median) },
            { k: 'SD', v: nf(payload.result.stdev) },
            { k: 'Min', v: nf(payload.result.min, 0) },
            { k: 'Max', v: nf(payload.result.max, 0) },
          ]} />
          <p className="text-[10.5px] text-slateink-500">{payload.label}</p>
          {payload.result.assumptions.length > 0 && (
            <ul className="list-disc pl-4 text-[11px] text-slateink-400">
              {payload.result.assumptions.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
          {!payload.backend.ok && (
            <Alert tone="warn" title={`FastAPI not used (${payload.backend.kind})`}>
              {payload.backend.message}
              {payload.backend.hint && <div className="mt-1 text-[11px] text-slateink-400">{payload.backend.hint}</div>}
            </Alert>
          )}
        </div>
      )}
    </Card>
  );
}
