'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

export async function apiPost<T>(url: string, body: unknown, method: 'POST' | 'PATCH' | 'DELETE' = 'POST'): Promise<T> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

export function useApi<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true); setError(null);
    try {
      const result = await apiGet<T>(url);
      if (mounted.current) setData(result);
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => { mounted.current = false; };
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>, successMessage?: string): Promise<T | null> => {
    setBusy(true); setError(null); setResult(null);
    try {
      const value = await fn();
      if (successMessage) setResult(successMessage);
      return value;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, result, run, setResult, setError };
}

export const download = (url: string) => { window.location.href = url; };
