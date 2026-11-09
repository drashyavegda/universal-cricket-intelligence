/**
 * GA4 event helpers.
 *
 * Rules encoded here (audited in docs/SEO_AND_TRUST.md):
 *  - Nothing loads unless NEXT_PUBLIC_GA_MEASUREMENT_ID is configured.
 *  - Nothing loads unless the visitor granted consent (or set Do Not Track off).
 *  - Only allowlisted, non-identifying parameters are sent. Player names, emails,
 *    file names, dataset rows and free-text messages are never forwarded.
 */
export type AnalyticsConsent = 'granted' | 'denied' | 'unset';

export const CONSENT_KEY = 'ucip.analytics.consent';

/** Keep this list short: every key here is data you are willing to send to Google. */
export const ALLOWED_PARAMS = [
  'page_path', 'page_group', 'module', 'result', 'method', 'kind', 'format', 'role',
  'count_bucket', 'duration_bucket', 'is_demo', 'signed_in', 'surface',
] as const;

export type AllowedParam = (typeof ALLOWED_PARAMS)[number];
export type EventParams = Partial<Record<AllowedParam, string | number | boolean>>;

export type AnalyticsEvent =
  | 'page_view' | 'sign_in' | 'sign_out' | 'dataset_uploaded' | 'report_generated' | 'report_exported'
  | 'form_submitted' | 'form_failed' | 'faq_opened' | 'assistant_question' | 'cta_clicked'
  | 'testimonial_viewed' | 'consent_granted' | 'consent_denied';

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function getConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return 'unset';
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (stored === 'granted' || stored === 'denied') return stored;
  } catch {
    /* localStorage unavailable (private mode) — fall through */
  }
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return 'denied';
  return 'unset';
}

export function setConsent(value: 'granted' | 'denied'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* ignore */
  }
  window.gtag?.('consent', 'update', {
    analytics_storage: value === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}

export const analyticsEnabled = (): boolean => Boolean(GA_ID) && getConsent() === 'granted';

/** Bucket numbers so exact figures are not exported to a third party. */
export function bucket(value: number, step: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  const low = Math.floor(value / step) * step;
  return `${low}-${low + step - 1}`;
}

function scrub(params: EventParams = {}): EventParams {
  const clean: EventParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (!(ALLOWED_PARAMS as readonly string[]).includes(key)) continue;
    if (typeof value === 'boolean' || typeof value === 'number') clean[key as AllowedParam] = value;
    else if (typeof value === 'string') clean[key as AllowedParam] = value.slice(0, 64);
  }
  return clean;
}

/** Fire a GA4 event. Safe to call anywhere: no-ops when analytics is off. */
export function trackEvent(event: AnalyticsEvent, params: EventParams = {}): void {
  if (typeof window === 'undefined' || !analyticsEnabled()) return;
  window.gtag?.('event', event, scrub(params));
}

/** Page views are tracked manually so SPA navigation is counted exactly once. */
export function trackPageView(path: string): void {
  if (typeof window === 'undefined' || !analyticsEnabled()) return;
  const group = path === '/' ? 'public' : /^\/(dashboard|data|players|talent|compare|stats|team|xi|auction|match|pitch|opposition|prediction|scouting|workload|research|assistant|automation|reports|settings)/.test(path)
    ? 'workspace'
    : 'public';
  window.gtag?.('event', 'page_view', scrub({ page_path: path, page_group: group }));
}
