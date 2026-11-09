import { beforeEach, describe, expect, it } from 'vitest';
import { resetStore, getStore } from '@/lib/core/db/store';
import {
  sanitiseText, normaliseEmail, validateContact, rateLimit, resetRateLimits, verifyCaptcha,
  ipHint, referenceCode, submissionFingerprint, looksLikeLinkSpam, FORM_LIMITS,
} from '@/lib/core/growth/forms';
import { submitFeedback, resetFeedbackState, listFeedback, setFeedbackStatus } from '@/lib/core/growth/feedback';
import {
  createTestimonial, deleteTestimonial, listAllTestimonials, listPublishedTestimonials,
  purgeSampleTestimonials, testimonialStats, updateTestimonial, validateTestimonial,
} from '@/lib/core/growth/testimonials';
import {
  canonicalHostTarget, isProtectedPath, requiresSession, securityHeaders, shouldRedirectToHttps,
} from '@/lib/core/security/edge';
import { PUBLIC_PAGES, PRIVATE_ROUTES, PRIVATE_PREFIXES, SITE, absoluteUrl } from '@/lib/site';
import { FAQ_ITEMS, FAQ_CATEGORIES } from '@/lib/content/faq';
import { TOUR_MODULES } from '@/lib/content/tour';
import { ALLOWED_PARAMS, bucket, getConsent, trackEvent } from '@/lib/client/analytics';

beforeEach(() => {
  resetStore();
  resetRateLimits();
  resetFeedbackState();
  delete process.env.TURNSTILE_SECRET_KEY;
});

const headers = (ip = '203.0.113.7') => new Headers({ 'x-forwarded-for': ip, 'user-agent': 'vitest/1.0' });

const validBody = (over: Record<string, unknown> = {}) => ({
  name: 'Asha Patel', email: 'asha@example.com', organisation: 'Example CC',
  kind: 'question', message: 'Does the platform support ball-by-ball CSV imports with a custom column map?',
  pageUrl: '/contact', consent: true, honeypot: '', elapsedMs: 9000, captchaToken: '',
  ...over,
});

describe('input sanitisation', () => {
  it('strips angle brackets, control characters and zero-width characters', () => {
    const dirty = '<script>alert(1)</script>\u0000\u200B ok';
    const clean = sanitiseText(dirty, { maxLength: 200, singleLine: true });
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
    expect(clean).not.toContain('\u0000');
    expect(clean).not.toContain('\u200B');
    expect(clean).toContain('ok');
  });

  it('enforces the maximum length and collapses single-line whitespace', () => {
    expect(sanitiseText('a'.repeat(500), { maxLength: 40 })).toHaveLength(40);
    expect(sanitiseText('  a \n\n  b  ', { maxLength: 50, singleLine: true })).toBe('a b');
  });

  it('accepts only well-formed email addresses', () => {
    expect(normaliseEmail(' User@Example.COM ')).toBe('user@example.com');
    expect(normaliseEmail('not-an-email')).toBe('');
    expect(normaliseEmail('a@b')).toBe('');
    expect(normaliseEmail(42)).toBe('');
  });

  it('flags link-spam patterns in messages', () => {
    expect(looksLikeLinkSpam('buy now at http://a.com http://b.com http://c.com')).toBe(true);
    expect(looksLikeLinkSpam('please review our dataset for the 2027 season')).toBe(false);
  });

  it('hashes IP addresses instead of storing them', () => {
    const hint = ipHint('203.0.113.7');
    expect(hint.startsWith('hash:')).toBe(true);
    expect(hint).not.toContain('203.0.113.7');
    expect(ipHint('203.0.113.8')).not.toBe(hint);
  });

  it('creates references in the documented format', () => {
    for (let i = 0; i < 25; i += 1) expect(referenceCode('FB')).toMatch(/^FB-[A-Z0-9]{6}$/);
  });

  it('fingerprints submissions deterministically', () => {
    expect(submissionFingerprint('a@b.com', 'Hello there')).toBe(submissionFingerprint('a@b.com', 'hello there '));
  });
});

describe('contact form validation (server side)', () => {
  it('returns a field-level error for every invalid field', () => {
    const result = validateContact({ name: 'A', email: 'nope', message: 'short', consent: false, kind: 'question' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['consent', 'email', 'message', 'name']);
  });

  it('falls back to the safe default category for unknown kinds', () => {
    const result = validateContact({ ...validBody(), kind: 'DROP TABLE' } as never);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.kind).toBe('question');
  });

  it('accepts a well-formed submission and normalises the email', () => {
    const result = validateContact(validBody({ email: 'ASHA@Example.com' }) as never);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('asha@example.com');
      expect(result.value.consent).toBe(true);
      expect(result.value.organisation).toBe('Example CC');
    }
  });

  it('rejects a page reference that is not site-relative', () => {
    const result = validateContact(validBody({ pageUrl: 'https://evil.example/x' }) as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.pageUrl).toBeTruthy();
  });
});

describe('rate limiting', () => {
  it('allows the configured burst then blocks with a retry hint', () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) {
      expect(rateLimit({ key: 'contact:1.2.3.4', limit: 5, windowMs: 60_000, now }).allowed).toBe(true);
    }
    const blocked = rateLimit({ key: 'contact:1.2.3.4', limit: 5, windowMs: 60_000, now });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    // Window expiry restores access — legitimate users are never permanently blocked.
    expect(rateLimit({ key: 'contact:1.2.3.4', limit: 5, windowMs: 60_000, now: now + 61_000 }).allowed).toBe(true);
  });

  it('isolates limits per key', () => {
    const now = 1_000_000;
    rateLimit({ key: 'contact:a', limit: 1, windowMs: 60_000, now });
    expect(rateLimit({ key: 'contact:a', limit: 1, windowMs: 60_000, now }).allowed).toBe(false);
    expect(rateLimit({ key: 'contact:b', limit: 1, windowMs: 60_000, now }).allowed).toBe(true);
  });

  it('reports the form window configuration', () => {
    expect(FORM_LIMITS.contact.limit).toBe(5);
    expect(FORM_LIMITS.contact.windowMs).toBe(600_000);
  });
});

describe('captcha handling', () => {
  it('skips verification when no secret is configured and says so', async () => {
    const result = await verifyCaptcha('', '203.0.113.7');
    expect(result).toEqual({ checked: false, passed: true, note: 'captcha-not-configured' });
  });

  it('fails closed when a secret is configured but the token is missing', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const result = await verifyCaptcha('');
    expect(result.checked).toBe(true);
    expect(result.passed).toBe(false);
  });
});

describe('feedback pipeline', () => {
  it('stores a valid submission and returns a reference', async () => {
    const result = await submitFeedback(validBody() as never, headers());
    expect(result.ok).toBe(true);
    expect(result.reference).toMatch(/^FB-[A-Z0-9]{6}$/);
    expect(listFeedback()).toHaveLength(1);
    expect(getStore().feedback[0].email).toBe('asha@example.com');
  });

  it('silently drops honeypot submissions without storing them', async () => {
    const result = await submitFeedback(validBody({ honeypot: 'http://spam.example' }) as never, headers());
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('spam');
    expect(listFeedback()).toHaveLength(0);
  });

  it('rejects impossibly fast submissions', async () => {
    const result = await submitFeedback(validBody({ elapsedMs: 120 }) as never, headers());
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('spam');
    expect(listFeedback()).toHaveLength(0);
  });

  it('returns validation errors and stores nothing when fields are invalid', async () => {
    const result = await submitFeedback(validBody({ email: 'bad', message: 'too short' }) as never, headers());
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('validation');
    expect(result.errors?.email).toBeTruthy();
    expect(listFeedback()).toHaveLength(0);
  });

  it('suppresses the same message sent twice in quick succession', async () => {
    const first = await submitFeedback(validBody() as never, headers('198.51.100.9'));
    const second = await submitFeedback(validBody() as never, headers('198.51.100.9'));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('duplicate');
    expect(listFeedback()).toHaveLength(1);
  });

  it('rate limits the sixth message from one address', async () => {
    for (let i = 0; i < 5; i += 1) {
      const res = await submitFeedback(validBody({ message: `Message number ${i} about the auction module and its outputs.` }) as never, headers('192.0.2.55'));
      expect(res.ok).toBe(true);
    }
    const blocked = await submitFeedback(validBody({ message: 'A sixth message that should be throttled by the limiter.' }) as never, headers('192.0.2.55'));
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toBe('rate_limited');
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('records the spam-check trace and allows status changes', async () => {
    const res = await submitFeedback(validBody() as never, headers());
    expect(res.checks.some((c) => c.startsWith('rate_limit:pass'))).toBe(true);
    expect(res.checks.some((c) => c.startsWith('captcha:skipped'))).toBe(true);
    const row = listFeedback()[0];
    expect(row.spamChecks.length).toBeGreaterThan(3);
    expect(setFeedbackStatus(row.id, 'acknowledged', 'test').ok).toBe(true);
    expect(listFeedback()[0].status).toBe('acknowledged');
    expect(setFeedbackStatus('missing', 'closed', 'test').ok).toBe(false);
  });
});

describe('testimonials', () => {
  it('ships clearly labelled sample rows and publishes them as samples', () => {
    const published = listPublishedTestimonials();
    expect(published.length).toBeGreaterThan(0);
    expect(published.every((t) => t.sample)).toBe(true);
    expect(testimonialStats().sample).toBeGreaterThan(0);
    expect(testimonialStats().published).toBe(0); // no *verified* testimonials yet
  });

  it('rejects incomplete records', () => {
    const bad = validateTestimonial({ name: 'A', role: '', organisation: '', quote: 'too short' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['name', 'organisation', 'quote', 'role']);
  });

  it('rejects unsafe image URLs and out-of-range ratings', () => {
    const bad = validateTestimonial({ name: 'Real Person', role: 'Analyst', organisation: 'Club', quote: 'x'.repeat(40), imageUrl: 'javascript:alert(1)', rating: 9 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.imageUrl).toBeTruthy();
      expect(bad.errors.rating).toBeTruthy();
    }
  });

  it('creates verified testimonials that are never flagged as samples', () => {
    const created = createTestimonial({ name: 'Real Person', role: 'Head Analyst', organisation: 'Real Club', quote: 'The comparison lab replaced two spreadsheets we used to maintain by hand.', status: 'published' }, 'owner@demo.local');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.testimonial.sample).toBe(false);
    expect(created.testimonial.source).toBe('manual');
    expect(created.testimonial.createdBy).toBe('owner@demo.local');
    expect(testimonialStats().published).toBe(1);
  });

  it('refuses duplicate quotes', () => {
    const payload = { name: 'A Person', role: 'Analyst', organisation: 'Club', quote: 'A quote that is long enough to pass validation checks.' };
    expect(createTestimonial(payload, 'owner').ok).toBe(true);
    const dupe = createTestimonial(payload, 'owner');
    expect(dupe.ok).toBe(false);
    if (!dupe.ok) expect(dupe.errors.quote).toBeTruthy();
  });

  it('updates status and removes records', () => {
    const created = createTestimonial({ name: 'B Person', role: 'Scout', organisation: 'State side', quote: 'The scouting missions cut our regional review time considerably.', status: 'draft' }, 'owner');
    if (!created.ok) throw new Error('setup failed');
    const updated = updateTestimonial(created.testimonial.id, { status: 'published' }, 'owner');
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.testimonial.status).toBe('published');
    expect(listPublishedTestimonials().some((t) => t.id === created.testimonial.id)).toBe(true);
    expect(deleteTestimonial(created.testimonial.id, 'owner').ok).toBe(true);
    expect(deleteTestimonial(created.testimonial.id, 'owner').ok).toBe(false);
    expect(updateTestimonial('missing', { name: 'x' }, 'owner').ok).toBe(false);
  });

  it('purges every sample row on request', () => {
    const before = listAllTestimonials().filter((t) => t.sample).length;
    expect(before).toBeGreaterThan(0);
    const { removed } = purgeSampleTestimonials('owner');
    expect(removed).toBe(before);
    expect(listAllTestimonials().some((t) => t.sample)).toBe(false);
  });
});

describe('SEO registry', () => {
  it('has unique titles, descriptions and paths', () => {
    const titles = PUBLIC_PAGES.map((p) => p.title.toLowerCase());
    const descriptions = PUBLIC_PAGES.map((p) => p.description.toLowerCase());
    const paths = PUBLIC_PAGES.map((p) => p.path);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('keeps public titles and descriptions within search-display limits', () => {
    for (const page of PUBLIC_PAGES) {
      expect(page.title.length).toBeLessThanOrEqual(65);
      expect(page.description.length).toBeGreaterThanOrEqual(70);
      expect(page.description.length).toBeLessThanOrEqual(160);
    }
  });

  it('gives every private route a unique title and description', () => {
    const titles = PRIVATE_ROUTES.map((r) => r.title.toLowerCase());
    const descriptions = PRIVATE_ROUTES.map((r) => r.description.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(PRIVATE_ROUTES.every((r) => r.description.length > 40)).toBe(true);
  });

  it('marks only public pages indexable and never lists private routes in the sitemap', () => {
    const indexable = PUBLIC_PAGES.filter((p) => p.indexable).map((p) => p.path);
    expect(indexable).toContain('/');
    expect(indexable).toContain('/faq');
    expect(indexable).toContain('/privacy');
    expect(indexable).not.toContain('/thank-you');
    expect(indexable).not.toContain('/login');
    for (const prefix of PRIVATE_PREFIXES) {
      expect(indexable.some((path) => path === prefix || path.startsWith(`${prefix}/`))).toBe(false);
    }
  });

  it('builds absolute URLs from the configured origin', () => {
    expect(absoluteUrl('/')).toBe(SITE.url);
    expect(absoluteUrl('/faq')).toBe(`${SITE.url}/faq`);
    expect(absoluteUrl('faq')).toBe(`${SITE.url}/faq`);
  });

  it('keeps FAQ content unique, categorised and substantive', () => {
    const ids = FAQ_ITEMS.map((i) => i.id);
    const questions = FAQ_ITEMS.map((i) => i.question.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(questions).size).toBe(questions.length);
    for (const item of FAQ_ITEMS) {
      expect(FAQ_CATEGORIES).toContain(item.category);
      expect(item.answer.length).toBeGreaterThan(80);
    }
    // Every category the page advertises actually has content behind it.
    for (const category of FAQ_CATEGORIES) {
      expect(FAQ_ITEMS.some((i) => i.category === category)).toBe(true);
    }
  });

  it('documents all thirty tour modules exactly once', () => {
    expect(TOUR_MODULES).toHaveLength(30);
    expect(new Set(TOUR_MODULES.map((m) => m.n)).size).toBe(30);
    expect(TOUR_MODULES.every((m) => m.what.length > 30)).toBe(true);
  });
});

describe('edge security helpers', () => {
  it('classifies private paths', () => {
    expect(isProtectedPath('/players/in_abc123')).toBe(true);
    expect(isProtectedPath('/api/players')).toBe(true);
    expect(isProtectedPath('/faq')).toBe(false);
    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/login')).toBe(false);
  });

  it('requires a session for workspace pages but not for APIs (they return 401 JSON)', () => {
    expect(requiresSession('/dashboard')).toBe(true);
    expect(requiresSession('/api/overview')).toBe(false);
    expect(requiresSession('/faq')).toBe(false);
    // Share cards must stay reachable for link unfurls (no cookies available).
    expect(requiresSession('/players/pl_0122/opengraph-image-c2lodl')).toBe(false);
  });

  it('only redirects http traffic to https when explicitly enabled', () => {
    expect(shouldRedirectToHttps('http://', true, 'ucip.example.com')).toBe(true);
    expect(shouldRedirectToHttps('http', true, 'ucip.example.com')).toBe(true);
    expect(shouldRedirectToHttps('https', true, 'ucip.example.com')).toBe(false);
    expect(shouldRedirectToHttps('http', false, 'ucip.example.com')).toBe(false);
    expect(shouldRedirectToHttps('http', true, 'localhost:3000')).toBe(false);
    expect(shouldRedirectToHttps('http', true, null)).toBe(false);
  });

  it('redirects a non-canonical host to the canonical one', () => {
    expect(canonicalHostTarget('www.example.com', 'example.com', '/faq', '?a=1')).toBe('https://example.com/faq?a=1');
    expect(canonicalHostTarget('example.com', 'example.com', '/faq', '')).toBeNull();
    expect(canonicalHostTarget('localhost:3000', 'example.com', '/', '')).toBeNull();
    expect(canonicalHostTarget('www.example.com', '', '/', '')).toBeNull();
  });

  it('emits the expected security headers', () => {
    const plain = securityHeaders(false);
    expect(plain['X-Content-Type-Options']).toBe('nosniff');
    expect(plain['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(plain['Permissions-Policy']).toContain('camera=()');
    expect(plain['Strict-Transport-Security']).toBeUndefined();
    expect(securityHeaders(true)['Strict-Transport-Security']).toContain('max-age=63072000');
  });
});

describe('analytics privacy', () => {
  it('does nothing on the server and without consent', () => {
    expect(getConsent()).toBe('unset');
    expect(() => trackEvent('page_view', { page_path: '/' })).not.toThrow();
  });

  it('buckets counts instead of sending exact figures', () => {
    expect(bucket(0, 500)).toBe('0');
    expect(bucket(1234, 500)).toBe('1000-1499');
    expect(bucket(-3, 500)).toBe('0');
  });

  it('uses a small allowlist of non-identifying parameter names', () => {
    expect(ALLOWED_PARAMS).not.toContain('player_name' as never);
    expect(ALLOWED_PARAMS).not.toContain('email' as never);
    expect(ALLOWED_PARAMS).not.toContain('file_name' as never);
    expect(ALLOWED_PARAMS.length).toBeLessThanOrEqual(16);
  });
});
