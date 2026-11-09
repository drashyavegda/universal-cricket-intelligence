import { json, readBody, serverError } from '@/lib/api/helpers';
import { submitFeedback } from '@/lib/core/growth/feedback';
import type { ContactInput } from '@/lib/core/growth/forms';

export const dynamic = 'force-dynamic';

/**
 * Public contact/feedback endpoint — deliberately NOT behind `guard()`: visitors
 * without an account must be able to ask a question or request deletion.
 * Abuse is handled by the checks inside submitFeedback (rate limit, honeypot,
 * timing, CAPTCHA, validation, duplicate suppression) rather than by authentication.
 */
export async function POST(req: Request) {
  try {
    const body = await readBody<Partial<ContactInput>>(req);
    const result = await submitFeedback(body, req.headers, 'public-form');

    if (result.ok) {
      return json({ ok: true, reference: result.reference, checks: result.checks }, { status: 201 });
    }

    const statusByReason = { validation: 422, rate_limited: 429, spam: 400, captcha: 400, duplicate: 409 } as const;
    const status = statusByReason[result.reason ?? 'validation'] ?? 400;
    return json(
      {
        ok: false,
        error:
          result.reason === 'rate_limited'
            ? 'Too many messages from this network. Please wait and try again.'
            : result.reason === 'spam'
              ? 'This submission was rejected by the spam filter. If you are a real person, email us directly.'
              : result.reason === 'captcha'
                ? 'CAPTCHA verification failed. Please retry.'
                : result.reason === 'duplicate'
                  ? 'This message was already received.'
                  : 'Please correct the highlighted fields.',
        reason: result.reason,
        errors: result.errors ?? {},
        retryAfterSeconds: result.retryAfterSeconds,
        checks: result.checks,
      },
      { status, headers: result.retryAfterSeconds ? { 'Retry-After': String(result.retryAfterSeconds) } : undefined },
    );
  } catch (error) {
    return serverError(error);
  }
}
