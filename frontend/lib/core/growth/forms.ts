/**
 * Public-form hardening: sanitisation, server-side validation, rate limiting,
 * honeypot + timing heuristics, duplicate detection and an optional CAPTCHA
 * (Cloudflare Turnstile is CAPTCHA-equivalent and accessible).
 *
 * Design rules:
 *  - Never trust the client. Every field is re-validated server-side.
 *  - Never block a legitimate slow user: limits are generous per-IP windows with
 *    a friendly, actionable error and a documented contact fallback.
 *  - Never silently "succeed": the caller only renders the thank-you page when
 *    `ok === true`.
 */
import crypto from 'node:crypto';

export type FieldErrors = Record<string, string>;

export interface SanitiseOptions {
  maxLength: number;
  /** Collapse newlines to spaces (single-line fields). */
  singleLine?: boolean;
}

/** Strip control characters, HTML-ish angle brackets and zero-width tricks. */
export function sanitiseText(input: unknown, opts: SanitiseOptions): string {
  if (typeof input !== 'string') return '';
  let value = input
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
    .replace(/[<>]/g, (m) => (m === '<' ? '‹' : '›'));
  if (opts.singleLine) value = value.replace(/\s+/g, ' ');
  else value = value.replace(/\r\n?/g, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  return value.trim().slice(0, opts.maxLength);
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export function normaliseEmail(input: unknown): string {
  const raw = sanitiseText(input, { maxLength: 160, singleLine: true }).toLowerCase();
  return EMAIL_RE.test(raw) ? raw : '';
}

/** Reject links / phone spam patterns that dominate junk submissions. */
export function looksLikeLinkSpam(message: string): boolean {
  const urls = message.match(/https?:\/\//gi)?.length ?? 0;
  const domains = message.match(/\b[a-z0-9-]+\.(?:ru|cn|top|xyz|loan|click|biz|info)\b/gi)?.length ?? 0;
  return urls > 2 || domains > 1;
}

export interface ContactInput {
  name: string;
  email: string;
  organisation: string;
  kind: string;
  message: string;
  pageUrl: string;
  consent: boolean;
  /** Honeypot: must stay empty. Real users never see this field. */
  honeypot: string;
  /** Milliseconds the user spent on the form before submitting. */
  elapsedMs: number;
  captchaToken: string;
}

export const FEEDBACK_KINDS = ['question', 'feedback', 'bug', 'data-issue', 'deletion-request'] as const;

export interface ValidatedContact {
  name: string;
  email: string;
  organisation: string | null;
  kind: (typeof FEEDBACK_KINDS)[number];
  message: string;
  pageUrl: string | null;
  consent: true;
}

export type ValidationResult =
  | { ok: true; value: ValidatedContact }
  | { ok: false; errors: FieldErrors };

export function validateContact(raw: Partial<ContactInput>): ValidationResult {
  const errors: FieldErrors = {};
  const name = sanitiseText(raw.name, { maxLength: 80, singleLine: true });
  const email = normaliseEmail(raw.email);
  const organisation = sanitiseText(raw.organisation, { maxLength: 120, singleLine: true });
  const message = sanitiseText(raw.message, { maxLength: 2000 });
  const pageUrl = sanitiseText(raw.pageUrl, { maxLength: 300, singleLine: true });
  const kind = (FEEDBACK_KINDS as readonly string[]).includes(String(raw.kind)) ? (raw.kind as ValidatedContact['kind']) : 'question';

  if (name.length < 2) errors.name = 'Please enter your name (at least 2 characters).';
  if (name.length > 80) errors.name = 'Name must be 80 characters or fewer.';
  if (!email) errors.email = 'Enter a valid email address so we can reply.';
  if (organisation && organisation.length > 120) errors.organisation = 'Organisation must be 120 characters or fewer.';
  if (message.length < 20) errors.message = 'Please add a little more detail (at least 20 characters).';
  if (looksLikeLinkSpam(message)) errors.message = 'Too many links. Remove the URLs and describe the issue in words.';
  if (!raw.consent) errors.consent = 'Please confirm you agree to the privacy policy so we can store your message.';
  if (pageUrl && !pageUrl.startsWith('/')) errors.pageUrl = 'Invalid page reference.';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      email,
      organisation: organisation || null,
      kind,
      message,
      pageUrl: pageUrl || null,
      consent: true,
    },
  };
}

/* ----------------------------- rate limiting ----------------------------- */

interface Bucket { hits: number[]; }
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export interface RateLimitOptions {
  /** Stable key such as `contact:203.0.113.7`. */
  key: string;
  /** Allowed submissions inside the window. */
  limit: number;
  windowMs: number;
  now?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit({ key, limit, windowMs, now = Date.now() }: RateLimitOptions): RateLimitResult {
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) if (!b.hits.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: Math.max(0, limit - bucket.hits.length), retryAfterSeconds: 0 };
}

/** Test helper — clears in-memory rate-limit state. */
export function resetRateLimits(): void {
  buckets.clear();
}

/* ------------------------------- CAPTCHA -------------------------------- */

export interface CaptchaResult { checked: boolean; passed: boolean; note: string }

/**
 * Cloudflare Turnstile verification. When `TURNSTILE_SECRET_KEY` is not set the
 * check is skipped (and reported as skipped) rather than pretending to pass a
 * CAPTCHA. Honeypot + timing + rate limiting remain active either way.
 */
export async function verifyCaptcha(token: string, remoteIp?: string): Promise<CaptchaResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { checked: false, passed: true, note: 'captcha-not-configured' };
  if (!token) return { checked: true, passed: false, note: 'captcha-token-missing' };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(6000),
    });
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    return { checked: true, passed: Boolean(data.success), note: data.success ? 'captcha-ok' : `captcha-failed:${(data['error-codes'] ?? []).join(',') || 'unknown'}` };
  } catch {
    // Fail open only for infrastructure errors, and say so in the audit trail.
    return { checked: false, passed: true, note: 'captcha-verification-unreachable' };
  }
}

/* ------------------------------- helpers -------------------------------- */

/** Truncate + hash an address so the store never holds raw IPs. */
export function ipHint(ip: string): string {
  const digest = crypto.createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 12);
  return `hash:${digest}`;
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip') || 'unknown';
}

/** Human-friendly reference used on the thank-you page. */
export function referenceCode(prefix: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `${prefix}-${code}`;
}

export const FORM_LIMITS = {
  contact: { limit: 5, windowMs: 10 * 60 * 1000 },
  testimonials: { limit: 20, windowMs: 10 * 60 * 1000 },
} as const;

/** Content hash used for duplicate-submission detection. */
export function submissionFingerprint(email: string, message: string): string {
  return crypto.createHash('sha256').update(`${email}:${message.trim().toLowerCase()}`).digest('hex');
}
