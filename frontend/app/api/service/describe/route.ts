import { guard, json, fail } from '@/lib/api/helpers';
import { backendRequest, backendConfig, type BackendResult, type ServiceProbePayload } from '@/lib/api/backend';
import { clean, mean, median, sd } from '@/lib/core/stats/descriptive';

/**
 * Round-trip probe: send a labelled numeric sample to the FastAPI `/stats/describe` endpoint and
 * report which engine produced the answer.
 *
 * The numbers are an explicitly synthetic sample of cricket-shaped magnitudes (runs per innings) —
 * they are NOT player data and the UI says so. If the service is unreachable the same sample is
 * described by the TypeScript engine, and the response says `source: 'local-fallback'` with the
 * failure attached, so nothing is ever presented as a remote result when it came from the fallback.
 */

interface DescribeOut {
  count: number;
  mean: number | null;
  median: number | null;
  stdev: number | null;
  min: number | null;
  max: number | null;
  total?: number;
  method?: { method?: string; assumptions?: string[]; sampleSize?: number };
}

const SAMPLE = [34, 12, 58, 27, 41, 9, 63, 22, 30, 45];
const SAMPLE_LABEL = 'Synthetic sample of 10 innings scores — illustrative magnitudes only, not player data.';

const localDescribe = () => {
  const values = clean(SAMPLE);
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    stdev: sd(values),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    method: 'TypeScript engine (lib/core/stats/descriptive.ts)',
    assumptions: ['Sample standard deviation (n-1 denominator).', 'Computed locally because the FastAPI service is not available.'],
  };
};

export const dynamic = 'force-dynamic';

export async function POST() {
  const g = guard('view');
  if (!g.ok) return g.response;

  const config = backendConfig();
  if (!config.configured) {
    const payload: ServiceProbePayload = {
      source: 'local-fallback',
      label: SAMPLE_LABEL,
      values: SAMPLE,
      result: localDescribe(),
      latencyMs: 0,
      backend: {
        ok: false,
        kind: 'not_configured',
        message: 'No FastAPI endpoint configured.',
        hint: 'Set NEXT_PUBLIC_API_URL to the Render service URL to route this probe through FastAPI.',
      },
    };
    return json(payload);
  }

  const remote: BackendResult<DescribeOut> = await backendRequest<DescribeOut>('/stats/describe', {
    method: 'POST',
    body: { values: SAMPLE, digits: 2 },
  });

  if (remote.ok) {
    const payload: ServiceProbePayload = {
      source: 'fastapi',
      label: SAMPLE_LABEL,
      values: SAMPLE,
      result: {
        count: remote.data.count,
        mean: remote.data.mean,
        median: remote.data.median,
        stdev: remote.data.stdev,
        min: remote.data.min,
        max: remote.data.max,
        method: `FastAPI ${remote.data.method?.method ?? 'descriptive'} (backend/services/statistics_service.py)`,
        assumptions: remote.data.method?.assumptions ?? [],
      },
      latencyMs: remote.latencyMs,
      backend: { ok: true },
    };
    return json(payload);
  }

  const payload: ServiceProbePayload = {
    source: 'local-fallback',
    label: SAMPLE_LABEL,
    values: SAMPLE,
    result: localDescribe(),
    latencyMs: remote.latencyMs,
    backend: { ok: false, kind: remote.kind, message: remote.message, hint: remote.hint },
  };
  return json(payload);
}

export async function GET() {
  const g = guard('view');
  if (!g.ok) return g.response;
  return fail('Use POST: this probe sends a fixed sample to the compute service.', 405);
}
