import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backendConfig, backendRequest, backendStatus } from '@/lib/api/backend';

/**
 * The FastAPI seam is the one place where the frontend depends on a network host.
 * These tests pin the behaviour that matters in production:
 *  - the endpoint comes from configuration only (no literal URL anywhere in the code);
 *  - every failure mode is a value, not a throw, so a page can always render;
 *  - the failure is classified usefully (timeout vs unreachable vs HTTP error);
 *  - the service token is sent server-side and never exposed in the status payload.
 */

const ENV_KEYS = ['NEXT_PUBLIC_API_URL', 'ANALYTICS_SERVICE_URL', 'ANALYTICS_SERVICE_TOKEN', 'BACKEND_TIMEOUT_MS'] as const;
const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  vi.unstubAllGlobals();
});

describe('backend configuration', () => {
  it('reports not-configured when no endpoint is set', () => {
    const config = backendConfig();
    expect(config.configured).toBe(false);
    expect(config.url).toBe('');
    expect(config.host).toBeNull();
    expect(config.source).toBe('none');
    expect(config.timeoutMs).toBe(4000);
  });

  it('reads NEXT_PUBLIC_API_URL and strips trailing slashes', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://ucip-analytics.onrender.com/';
    const config = backendConfig();
    expect(config.configured).toBe(true);
    expect(config.url).toBe('https://ucip-analytics.onrender.com');
    expect(config.host).toBe('ucip-analytics.onrender.com');
    expect(config.source).toBe('NEXT_PUBLIC_API_URL');
  });

  it('falls back to the server-only ANALYTICS_SERVICE_URL alias', () => {
    process.env.ANALYTICS_SERVICE_URL = 'http://api:8000';
    expect(backendConfig().source).toBe('ANALYTICS_SERVICE_URL');
    expect(backendConfig().url).toBe('http://api:8000');
  });

  it('prefers the public variable when both are present', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://public.example.com';
    process.env.ANALYTICS_SERVICE_URL = 'http://api:8000';
    expect(backendConfig().url).toBe('https://public.example.com');
  });

  it('rejects a value without a scheme instead of guessing a hostname', () => {
    process.env.NEXT_PUBLIC_API_URL = 'ucip-analytics.onrender.com';
    const config = backendConfig();
    expect(config.configured).toBe(false);
    expect(config.source).toBe('none');
  });

  it('clamps the timeout into a sane range', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://example.com';
    process.env.BACKEND_TIMEOUT_MS = '10';
    expect(backendConfig().timeoutMs).toBe(4000);
    process.env.BACKEND_TIMEOUT_MS = '8000';
    expect(backendConfig().timeoutMs).toBe(8000);
  });

  it('never exposes the token value, only that one exists', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://example.com';
    process.env.ANALYTICS_SERVICE_TOKEN = 'super-secret-token';
    const config = backendConfig();
    expect(config.tokenConfigured).toBe(true);
    expect(JSON.stringify(config)).not.toContain('super-secret-token');
  });
});

describe('backend requests', () => {
  it('short-circuits without a fetch when unconfigured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await backendRequest('/health');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('not_configured');
      expect(result.hint).toContain('NEXT_PUBLIC_API_URL');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns data and latency on success', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.test';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'ok', version: '1.0.0' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })));
    const result = await backendRequest<{ status: string }>('/health');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('ok');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('sends the bearer token server-side when configured', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.test';
    process.env.ANALYTICS_SERVICE_TOKEN = 'token-abc';
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{"status":"ok"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await backendRequest('/health');
    const init = fetchMock.mock.calls[0]?.[1];
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer token-abc');
  });

  it('classifies an HTTP error and surfaces the service message', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.test';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })));
    const result = await backendRequest('/stats/describe', { method: 'POST', body: { values: [1] } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('http_error');
      expect(result.status).toBe(401);
      expect(result.message).toBe('Unauthorized');
    }
  });

  it('classifies a timeout rather than hanging a page render', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.test';
    vi.stubGlobal('fetch', vi.fn(async () => {
      const error = new Error('The operation was aborted due to timeout');
      error.name = 'TimeoutError';
      throw error;
    }));
    const result = await backendRequest('/health');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('timeout');
  });

  it('classifies a network failure as unreachable', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.test';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    const result = await backendRequest('/health');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('unreachable');
  });

  it('classifies a non-JSON body as an invalid response', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.test';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>docs</html>', { status: 200 })));
    const result = await backendRequest('/health');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('invalid_response');
  });
});

describe('aggregated status', () => {
  it('reports the local engine as the serving tier when unconfigured', async () => {
    const status = await backendStatus();
    expect(status.configured).toBe(false);
    expect(status.serving).toBe('local-typescript');
    expect(status.health).toBeNull();
    expect(status.endpoint).toBeNull();
  });

  it('reports fastapi as the serving tier when health responds', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.test';
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).endsWith('/health')) return new Response(JSON.stringify({ status: 'ok', service: 'ucip-api', env: 'production', uptimeSeconds: 12 }), { status: 200 });
      if (String(url).endsWith('/ready')) return new Response(JSON.stringify({ ready: true, checks: { tokenConfigured: true } }), { status: 200 });
      return new Response(JSON.stringify({ service: 'ucip-api', apiVersion: '1.0.0', python: '3.12' }), { status: 200 });
    }));
    const status = await backendStatus();
    expect(status.configured).toBe(true);
    expect(status.serving).toBe('fastapi');
    expect(status.health?.ok).toBe(true);
    expect(status.summary).toContain('ucip-api');
    expect(JSON.stringify(status)).not.toContain('token-');
  });

  it('falls back without throwing when the service is down', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://backend.test';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    const status = await backendStatus();
    expect(status.serving).toBe('local-typescript');
    expect(status.summary).toContain('unreachable');
  });
});
