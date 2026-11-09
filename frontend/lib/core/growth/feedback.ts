/**
 * Public feedback / contact pipeline.
 *
 * The route layer owns HTTP concerns; this module owns the decision to accept or
 * reject a submission. A submission is only stored when every check passes, so the
 * UI can never claim success for a message that was dropped.
 */
import { getStore, newId, persist, audit, notify } from '../db/store';
import type { FeedbackSubmission } from '../types';
import {
  clientIp, ipHint, rateLimit, referenceCode, sanitiseText, submissionFingerprint,
  validateContact, verifyCaptcha, FORM_LIMITS, type ContactInput, type FieldErrors,
} from './forms';

export interface SubmitFeedbackResult {
  ok: boolean;
  /** Present only on success. */
  reference?: string;
  errors?: FieldErrors;
  /** Machine-readable reason for rejections (`rate_limited`, `spam`, `captcha`, ...). */
  reason?: 'validation' | 'rate_limited' | 'spam' | 'captcha' | 'duplicate';
  retryAfterSeconds?: number;
  /** Diagnostics surfaced in the response body so behaviour is always explainable. */
  checks: string[];
}

/** In-memory fingerprints of recent submissions to stop double-clicks/retries. */
const recentFingerprints = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

export function resetFeedbackState(): void {
  recentFingerprints.clear();
}

export async function submitFeedback(
  raw: Partial<ContactInput>,
  headers: Headers,
  actorHint = 'public-form',
): Promise<SubmitFeedbackResult> {
  const checks: string[] = [];
  const ip = clientIp(headers);

  // 1. Rate limit first so spam cannot consume validation work.
  const limited = rateLimit({ key: `contact:${ip}`, ...FORM_LIMITS.contact });
  checks.push(`rate_limit:${limited.allowed ? 'pass' : 'fail'}`);
  if (!limited.allowed) {
    return { ok: false, reason: 'rate_limited', retryAfterSeconds: limited.retryAfterSeconds, checks };
  }

  // 2. Honeypot — invisible to humans, irresistible to naive bots.
  const honeypot = sanitiseText(raw.honeypot, { maxLength: 200, singleLine: true });
  checks.push(`honeypot:${honeypot ? 'fail' : 'pass'}`);
  if (honeypot) return { ok: false, reason: 'spam', checks };

  // 3. Timing — real people need more than a second to write 20+ characters.
  const elapsed = Number(raw.elapsedMs);
  const tooFast = Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 1200;
  checks.push(`timing:${Number.isFinite(elapsed) ? (tooFast ? 'fail' : 'pass') : 'unknown'}`);
  if (tooFast) return { ok: false, reason: 'spam', checks };

  // 4. CAPTCHA (only when a secret is configured).
  const captcha = await verifyCaptcha(sanitiseText(raw.captchaToken, { maxLength: 4000, singleLine: true }), ip);
  checks.push(`captcha:${captcha.checked ? (captcha.passed ? 'pass' : 'fail') : `skipped(${captcha.note})`}`);
  if (captcha.checked && !captcha.passed) return { ok: false, reason: 'captcha', errors: { captcha: 'CAPTCHA verification failed. Please retry.' }, checks };

  // 5. Field validation + sanitisation.
  const parsed = validateContact(raw);
  checks.push(`validation:${parsed.ok ? 'pass' : 'fail'}`);
  if (!parsed.ok) return { ok: false, reason: 'validation', errors: parsed.errors, checks };

  // 6. Duplicate suppression (same email + body within 15 minutes).
  const fingerprint = submissionFingerprint(parsed.value.email, parsed.value.message);
  const seenAt = recentFingerprints.get(fingerprint);
  const now = Date.now();
  if (seenAt && now - seenAt < DUPLICATE_WINDOW_MS) {
    checks.push('duplicate:fail');
    return { ok: false, reason: 'duplicate', errors: { message: 'This message was already received. We will reply by email.' }, checks };
  }
  checks.push('duplicate:pass');
  recentFingerprints.set(fingerprint, now);
  if (recentFingerprints.size > 2000) {
    for (const [k, t] of recentFingerprints) if (now - t > DUPLICATE_WINDOW_MS) recentFingerprints.delete(k);
  }

  // 7. Persist.
  const store = getStore();
  const submission: FeedbackSubmission = {
    id: newId('fb'),
    reference: referenceCode('FB'),
    ...parsed.value,
    status: 'new',
    createdAt: new Date().toISOString(),
    ipHint: ipHint(ip),
    userAgentHint: sanitiseText(headers.get('user-agent') ?? '', { maxLength: 120, singleLine: true }),
    spamChecks: checks,
  };
  store.feedback.unshift(submission);
  if (store.feedback.length > 5000) store.feedback.length = 5000;
  persist(store);
  audit({ actor: actorHint, action: 'feedback_submitted', entity: 'feedback', entityId: submission.id, detail: `${submission.kind} · ${submission.reference}` });
  notify({
    level: 'info',
    title: `New ${submission.kind.replace('-', ' ')} message`,
    body: `${submission.reference}: ${submission.message.slice(0, 120)}${submission.message.length > 120 ? '…' : ''}`,
    href: '/settings?tab=growth',
  });
  return { ok: true, reference: submission.reference, checks };
}

export function listFeedback(limit = 100): FeedbackSubmission[] {
  return getStore().feedback.slice(0, limit);
}

export function setFeedbackStatus(id: string, status: FeedbackSubmission['status'], actor: string): { ok: boolean } {
  const store = getStore();
  const row = store.feedback.find((f) => f.id === id);
  if (!row) return { ok: false };
  row.status = status;
  persist(store);
  audit({ actor, action: 'feedback_status', entity: 'feedback', entityId: id, detail: status });
  return { ok: true };
}

export const feedbackStats = () => {
  const all = getStore().feedback;
  return { total: all.length, open: all.filter((f) => f.status === 'new').length };
};
