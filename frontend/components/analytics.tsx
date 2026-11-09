'use client';
import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cookie, X } from 'lucide-react';
import { GA_ID, getConsent, setConsent, trackPageView, trackEvent, type AnalyticsConsent } from '@/lib/client/analytics';

/**
 * Consent-gated GA4 loader.
 *
 * - No measurement ID configured → renders nothing at all (analytics fully optional).
 * - No consent decision yet → shows a non-blocking banner; nothing is loaded before
 *   the visitor chooses, and the site is fully usable either way.
 * - Do Not Track respected as an implicit "denied".
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const [consent, setConsentState] = useState<AnalyticsConsent>('unset');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setConsentState(getConsent()); }, []);

  useEffect(() => {
    if (consent !== 'granted') return;
    // First page view is emitted by the gtag config call; later ones here.
    if (!loaded) { setLoaded(true); return; }
    trackPageView(pathname);
  }, [pathname, consent, loaded]);

  const decide = useCallback((value: 'granted' | 'denied') => {
    setConsent(value);
    setConsentState(value);
    trackEvent(value === 'granted' ? 'consent_granted' : 'consent_denied');
  }, []);

  if (!GA_ID) return null;

  return (
    <>
      {consent === 'granted' && (
        <>
          <Script id="ga4-src" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:true,anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consent === 'unset' && (
        <div role="dialog" aria-label="Analytics consent" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-xl border border-line bg-ink-850/95 p-3.5 shadow-card backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4">
          <div className="flex items-start gap-3">
            <Cookie size={16} className="mt-0.5 shrink-0 text-turf-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] leading-relaxed text-slateink-300">
                <span className="font-semibold text-white">Optional analytics.</span> With your permission we send anonymous usage events (page views, uploads completed, reports generated) to Google Analytics to improve the product. No player names, emails, file names or dataset contents are ever sent. Declining keeps the full platform working.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => decide('granted')} className="btn-primary btn-xs">Allow analytics</button>
                <button onClick={() => decide('denied')} className="btn-ghost btn-xs">Decline</button>
                <Link href="/privacy" className="link text-[11.5px]">Privacy policy</Link>
              </div>
            </div>
            <button onClick={() => decide('denied')} aria-label="Dismiss consent banner" className="text-slateink-500 hover:text-white"><X size={14} /></button>
          </div>
        </div>
      )}
    </>
  );
}
