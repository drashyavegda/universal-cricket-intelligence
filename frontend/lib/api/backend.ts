/**
 * Server-side client for the standalone FastAPI service (backend/, deployed on Render).
 *
 * Why a BFF hop instead of calling Render from the browser:
 *  - the service token is a server-only secret and must never reach the client bundle;
 *  - CORS on the FastAPI host only needs to allow the Next.js server, not every origin;
 *  - a Render free instance can cold-start for ~30 s, so the timeout and the fallback must be
 *    decided server-side, where the page render can still succeed.
 *
 * The endpoint is configuration, never a literal: `NEXT_PUBLIC_API_URL` (set in Vercel and in
 * frontend/.env.local) is the single source. `ANALYTICS_SERVICE_URL` is accepted as a fallback
 * name for container-to-container setups. Nothing here throws — every failure is a value, so a
 * page can always render a truthful state instead of a stack trace.
 */

export type BackendFailureKind =
  | 'not_configured'
  | 'timeout'
  | 'unreachable'
  | 'http_error'
  | 'invalid_response';

export interface BackendConfig {
  /** True when a usable http(s) endpoint is configured. */
  configured: boolean;
  /** Normalised base URL without a trailing slash ('' when not configured). */
  url: string;
  /** Host only — safe to show in the UI; never includes credentials or paths with tokens. */
  host: string | null;
  /** Which environment variable supplied the value. */
  source: 'NEXT_PUBLIC_API_URL' | 'ANALYTICS_SERVICE_URL' | 'none';
  /** Server-only: whether the shared service token is present. The value is never exposed. */
  tokenConfigured: boolean;
  timeoutMs: number;
}

export type BackendResult<T> =
  | { ok: true; data: T; status: number; latencyMs: number }
  | {
      ok: false;
      kind: BackendFailureKind;
      message: string;
      /** Operator-facing next step, shown in the UI so a failure is actionable. */
      hint: string;
      status?: number;
      latencyMs: number;
    };

export interface BackendHealth {
  status: string;
  service?: string;
  env?: string;
  uptimeSeconds?: number;
  version?: string;
}

export interface BackendReady {
  ready: boolean;
  checks: Record<string, boolean>;
}

export interface BackendVersion {
  service?: string;
  apiVersion?: string;
  env?: string;
  python?: string;
  features?: Record<string, boolean>;
}

export interface ServiceProbePayload {
  source: 'fastapi' | 'local-fallback';
  label: string;
  values: number[];
  result: {
    count: number;
    mean: number | null;
    median: number | null;
    stdev: number | null;
    min: number | null;
    max: number | null;
    method: string;
    assumptions: string[];
  };
  latencyMs: number;
  backend: { ok: boolean; kind?: string; message?: string; hint?: string };
}

/** What `/api/service/status` returns to the browser. */
export interface ServiceStatusPayload {
  configured: boolean;
  endpoint: string | null;
  source: BackendConfig['source'];
  timeoutMs: number;
  tokenConfigured: boolean;
  checkedAt: string;
  latencyMs: number | null;
  health: BackendResult<BackendHealth> | null;
  ready: BackendResult<BackendReady> | null;
  version: BackendResult<BackendVersion> | null;
  /** One-line, user-safe summary of the overall state. */
  summary: string;
  /** Which engine is currently serving the analytics UI. */
  serving: 'fastapi' | 'local-typescript';
}

const DEFAULT_TIMEOUT_MS = 4000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 30_000;

const normaliseUrl = (raw: string | undefined): string => {
  const value = (raw ?? '').trim();
  if (!value) return '';
  // A value with no scheme is a configuration mistake, not a hostname to guess at.
  if (!/^https?:\/\//i.test(value)) return '';
  return value.replace(/\/+$/, '');
};

export function backendConfig(): BackendConfig {
  const publicUrl = normaliseUrl(process.env.NEXT_PUBLIC_API_URL);
  const serverUrl = normaliseUrl(process.env.ANALYTICS_SERVICE_URL);
  const url = publicUrl || serverUrl;
  const source: BackendConfig['source'] = publicUrl
    ? 'NEXT_PUBLIC_API_URL'
    : serverUrl
      ? 'ANALYTICS_SERVICE_URL'
      : 'none';

  const parsedTimeout = Number(process.env.BACKEND_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout >= MIN_TIMEOUT_MS
    ? Math.min(parsedTimeout, MAX_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;

  let host: string | null = null;
  if (url) {
    try {
      host = new URL(url).host;
    } catch {
      host = null;
    }
  }

  return {
    configured: Boolean(url) && host !== null,
    url: host ? url : '',
    host,
    source: host ? source : 'none',
    tokenConfigured: Boolean((process.env.ANALYTICS_SERVICE_TOKEN ?? '').trim()),
    timeoutMs,
  };
}

const hintFor = (kind: BackendFailureKind, config: BackendConfig): string => {
  switch (kind) {
    case 'not_configured':
      return 'Set NEXT_PUBLIC_API_URL (for example https://your-service.onrender.com) in the Vercel project settings and redeploy. The workspace keeps working on its own deterministic TypeScript engines until then.';
    case 'timeout':
      return `No response within ${config.timeoutMs} ms. A free Render instance sleeps when idle and can take 30–60 s to wake: reload this page in a minute, or send a warm-up request to /health.`;
    case 'unreachable':
      return 'The host could not be reached at all. Check the service is running on Render and that the URL has no trailing slash or path.';
    case 'http_error':
      return 'The service answered with an error. If it returns 401, ANALYTICS_SERVICE_TOKEN must match on both sides (Vercel and Render).';
    case 'invalid_response':
      return 'The response was not JSON in the expected shape. Confirm the URL points at the FastAPI service root, not at /docs or a proxy.';
    default:
      return 'Unknown failure.';
  }
};

const failure = (
  kind: BackendFailureKind,
  message: string,
  config: BackendConfig,
  extra: { status?: number; latencyMs?: number } = {},
): BackendResult<never> => ({
  ok: false,
  kind,
  message,
  hint: hintFor(kind, config),
  ...extra,
  latencyMs: extra.latencyMs ?? 0,
});

/**
 * Perform one request against the FastAPI service.
 * `path` must start with '/' — it is appended to the configured base URL.
 */
export async function backendRequest<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {},
): Promise<BackendResult<T>> {
  const config = backendConfig();
  if (!config.configured) {
    return failure('not_configured', 'No backend endpoint is configured.', config);
  }

  const timeoutMs = init.timeoutMs ?? config.timeoutMs;
  const started = Date.now();
  const headers: Record<string, string> = { accept: 'application/json' };
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (config.tokenConfigured) headers.authorization = `Bearer ${(process.env.ANALYTICS_SERVICE_TOKEN ?? '').trim()}`;

  try {
    const response = await fetch(`${config.url}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      // Never cached: a connection status that reports yesterday's truth is worse than none.
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latencyMs = Date.now() - started;

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
      const detail = payload.error ?? payload.detail ?? `HTTP ${response.status}`;
      return failure('http_error', detail, config, { status: response.status, latencyMs });
    }

    try {
      const data = (await response.json()) as T;
      return { ok: true, data, status: response.status, latencyMs };
    } catch {
      return failure('invalid_response', 'Response body was not valid JSON.', config, {
        status: response.status,
        latencyMs,
      });
    }
  } catch (error) {
    const latencyMs = Date.now() - started;
    const name = (error as { name?: string }).name ?? '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      return failure('timeout', `Request timed out after ${timeoutMs} ms.`, config, { latencyMs });
    }
    return failure(
      'unreachable',
      error instanceof Error ? error.message : 'Network request failed.',
      config,
      { latencyMs },
    );
  }
}

/** Health, readiness and version in one round trip set (parallel, independently reported). */
export async function backendStatus(): Promise<ServiceStatusPayload> {
  const config = backendConfig();
  const checkedAt = new Date().toISOString();

  if (!config.configured) {
    return {
      configured: false,
      endpoint: null,
      source: 'none',
      timeoutMs: config.timeoutMs,
      tokenConfigured: config.tokenConfigured,
      checkedAt,
      latencyMs: null,
      health: null,
      ready: null,
      version: null,
      summary: 'No FastAPI endpoint configured — the workspace is running on its own deterministic TypeScript engines.',
      serving: 'local-typescript',
    };
  }

  const [health, ready, version] = await Promise.all([
    backendRequest<BackendHealth>('/health'),
    backendRequest<BackendReady>('/ready'),
    backendRequest<BackendVersion>('/version'),
  ]);

  const available = health.ok;
  const readyOk = ready.ok && ready.data.ready === true;
  const latencyMs = Math.max(
    health.ok || health.latencyMs ? health.latencyMs : 0,
    ready.ok || ready.latencyMs ? ready.latencyMs : 0,
  ) || null;

  const summary = !available
    ? `FastAPI endpoint unreachable (${health.kind}) — falling back to the local TypeScript engines.`
    : readyOk
      ? `Connected to ${health.data.service ?? 'the compute service'} (${health.data.env ?? 'env unknown'}) in ${health.latencyMs} ms.`
      : `Reachable in ${health.latencyMs} ms, but readiness reports a configuration gap.`;

  return {
    configured: true,
    endpoint: config.url,
    source: config.source,
    timeoutMs: config.timeoutMs,
    tokenConfigured: config.tokenConfigured,
    checkedAt,
    latencyMs,
    health,
    ready,
    version,
    summary,
    serving: available ? 'fastapi' : 'local-typescript',
  };
}
