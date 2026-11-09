/**
 * Provider-independent AI gateway (Section 12).
 *
 * - Keys live only in server env/encrypted store and never reach the browser.
 * - When no key is configured the gateway returns a deterministic, data-derived
 *   narration and marks the response as DEMO — it never pretends to be a live model.
 * - Statistics are computed in code; the model is only asked to explain them.
 */
import { getStore, update, newId } from '../db/store';
import { rateLimit } from '../auth/service';
import type { AiUsageEntry } from '../types';

export interface AiCallRequest {
  purpose: string;
  system?: string;
  prompt: string;
  /** Deterministic, data-derived text used when AI is unavailable. */
  fallback: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiCallResult {
  text: string;
  mode: 'live' | 'demo' | 'blocked' | 'error';
  provider: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; usd: number };
  note?: string;
}

const PRICE_PER_1K: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.00015, out: 0.0006 },
  'gpt-4o': { in: 0.0025, out: 0.01 },
  'gpt-4.1-mini': { in: 0.0004, out: 0.0016 },
  default: { in: 0.0005, out: 0.0015 },
};

const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (the )?(system|developer) prompt/i,
  /you are now (an? )?(different|unrestricted)/i,
  /reveal (your|the) (system prompt|api key|secrets)/i,
  /print (the )?(api[_-]?key|env(ironment)? variables)/i,
  /```\s*(system|assistant)\s*:/i,
];

export function guardPrompt(text: string): { safe: boolean; redactions: number; sanitized: string } {
  let redactions = 0;
  let sanitized = text;
  for (const re of INJECTION_PATTERNS) {
    if (re.test(sanitized)) { redactions++; sanitized = sanitized.replace(re, '[removed-instruction]'); }
  }
  // strip anything that looks like a leaked key
  sanitized = sanitized.replace(/(sk-[A-Za-z0-9]{16,}|AIza[0-9A-Za-z\-_]{20,}|ghp_[A-Za-z0-9]{20,})/g, () => { redactions++; return '[redacted-key]'; });
  return { safe: redactions === 0, redactions, sanitized };
}

const estTokens = (s: string) => Math.ceil(s.length / 4);

function recordUsage(entry: Omit<AiUsageEntry, 'id' | 'at'>): void {
  update((s) => {
    s.aiUsage.unshift({ id: newId('aiu'), at: new Date().toISOString(), ...entry });
    if (s.aiUsage.length > 500) s.aiUsage.length = 500;
  });
}

export function aiBudgetStatus(): { spentUsd: number; budgetUsd: number; remainingUsd: number; calls: number; demoCalls: number } {
  const store = getStore();
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthCalls = store.aiUsage.filter((u) => u.at.startsWith(monthPrefix));
  const spent = monthCalls.reduce((a, u) => a + u.usd, 0);
  return {
    spentUsd: Number(spent.toFixed(4)),
    budgetUsd: store.settings.ai.monthlyBudgetUsd,
    remainingUsd: Number(Math.max(0, store.settings.ai.monthlyBudgetUsd - spent).toFixed(4)),
    calls: monthCalls.filter((u) => u.status !== 'demo').length,
    demoCalls: monthCalls.filter((u) => u.status === 'demo').length,
  };
}

export async function aiCall(req: AiCallRequest): Promise<AiCallResult> {
  const store = getStore();
  const settings = store.settings.ai;
  const guard = guardPrompt(req.prompt);
  const prompt = settings.provider === 'demo' ? req.prompt : guard.sanitized;
  const model = settings.model || 'demo-model';
  const price = PRICE_PER_1K[model] ?? PRICE_PER_1K.default;
  const budget = aiBudgetStatus();

  const apiKey = process.env.AI_API_KEY;
  const live = Boolean(apiKey) && settings.provider !== 'demo';

  if (!live) {
    const usage = { promptTokens: estTokens(prompt), completionTokens: estTokens(req.fallback), usd: 0 };
    recordUsage({ provider: 'demo', model: 'deterministic-template', purpose: req.purpose, promptTokens: usage.promptTokens, completionTokens: usage.completionTokens, usd: 0, status: 'demo', detail: 'No AI key configured — deterministic narration returned' });
    return {
      text: req.fallback, mode: 'demo', provider: 'demo', model: 'deterministic-template', usage,
      note: 'DEMO narration generated deterministically from computed statistics. Configure an OpenAI-compatible key in Settings → AI Provider for live model narration.',
    };
  }

  if (budget.spentUsd >= budget.budgetUsd) {
    recordUsage({ provider: settings.provider, model, purpose: req.purpose, promptTokens: 0, completionTokens: 0, usd: 0, status: 'blocked', detail: 'Monthly budget exhausted' });
    return { text: req.fallback, mode: 'blocked', provider: settings.provider, model, usage: { promptTokens: 0, completionTokens: 0, usd: 0 }, note: 'Monthly AI budget exhausted — deterministic narration returned instead.' };
  }

  const limit = rateLimit(`ai:${req.purpose}`, settings.rateLimitPerMinute);
  if (!limit.allowed) {
    recordUsage({ provider: settings.provider, model, purpose: req.purpose, promptTokens: 0, completionTokens: 0, usd: 0, status: 'blocked', detail: 'Rate limit' });
    return { text: req.fallback, mode: 'blocked', provider: settings.provider, model, usage: { promptTokens: 0, completionTokens: 0, usd: 0 }, note: `Rate limit reached (${settings.rateLimitPerMinute}/min) — retry in ${limit.retryAfter}s.` };
  }

  try {
    const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: req.temperature ?? settings.temperature,
        max_tokens: req.maxTokens ?? settings.maxTokens,
        messages: [
          { role: 'system', content: req.system ?? 'You are a cricket analytics explainer. You may ONLY explain numbers supplied to you. Never invent statistics, players or sources. Be concise and factual.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      const detail = await response.text();
      recordUsage({ provider: settings.provider, model, purpose: req.purpose, promptTokens: estTokens(prompt), completionTokens: 0, usd: 0, status: 'error', detail: detail.slice(0, 300) });
      return { text: req.fallback, mode: 'error', provider: settings.provider, model, usage: { promptTokens: 0, completionTokens: 0, usd: 0 }, note: `Provider error ${response.status}. Deterministic narration returned.` };
    }
    const json = await response.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const text = json.choices?.[0]?.message?.content?.trim() ?? req.fallback;
    const promptTokens = json.usage?.prompt_tokens ?? estTokens(prompt);
    const completionTokens = json.usage?.completion_tokens ?? estTokens(text);
    const usd = (promptTokens / 1000) * price.in + (completionTokens / 1000) * price.out;
    recordUsage({ provider: settings.provider, model, purpose: req.purpose, promptTokens, completionTokens, usd: Number(usd.toFixed(6)), status: 'ok' });
    return { text, mode: 'live', provider: settings.provider, model, usage: { promptTokens, completionTokens, usd: Number(usd.toFixed(6)) } };
  } catch (error) {
    recordUsage({ provider: settings.provider, model, purpose: req.purpose, promptTokens: estTokens(prompt), completionTokens: 0, usd: 0, status: 'error', detail: (error as Error).message.slice(0, 200) });
    return { text: req.fallback, mode: 'error', provider: settings.provider, model, usage: { promptTokens: 0, completionTokens: 0, usd: 0 }, note: `Request failed (${(error as Error).message}). Deterministic narration returned.` };
  }
}

export function providerStatus() {
  const settings = getStore().settings.ai;
  return {
    provider: settings.provider,
    model: settings.model,
    baseUrl: settings.baseUrl,
    configured: Boolean(process.env.AI_API_KEY) && settings.provider !== 'demo',
    keyPresent: Boolean(process.env.AI_API_KEY),
    budget: aiBudgetStatus(),
    note: Boolean(process.env.AI_API_KEY)
      ? 'Key detected in server environment. It is never returned to the browser.'
      : 'No AI_API_KEY in the server environment: all AI surfaces use deterministic narration labelled DEMO.',
  };
}
