import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE, publicEntry, ogFor, twitterFor } from '@/lib/site';

const entry = publicEntry('/privacy')!;
export const metadata: Metadata = {
  title: entry.title,
  description: entry.description,
  alternates: { canonical: '/privacy' },
  openGraph: ogFor(entry, 'article'),
  twitter: twitterFor(entry),
};

const SECTIONS = [
  {
    id: 'who',
    title: 'Who we are and what this policy covers',
    body: [
      `This policy explains how the ${SITE.legalName} deployment you are visiting handles information. It covers the public pages (home, tour, FAQ, testimonials, contact, privacy) and the signed-in analytics workspace.`,
      'If you are evaluating a self-hosted or on-premise copy of the platform, the organisation operating that deployment is the controller of the data inside it — including any cricket datasets uploaded to it. The sections below describe what the software does and where it stores data; the operator decides retention and access.',
    ],
  },
  {
    id: 'collect',
    title: 'What we collect and why',
    body: [
      'Account data: name, email address, role and a password hash. Used to sign you in and to decide what you are allowed to change.',
      'Workspace data: the cricket datasets, players, matches, reports, shortlists and notes you or your colleagues upload or create. Used to compute the analytics you asked for.',
      'Contact and feedback messages: the name, email, optional organisation, message and the page you filed from. Used to answer you and, where relevant, to fix a defect.',
      'Technical data: a hashed hint of the request IP address, a truncated user agent, and audit records of actions such as sign-in, upload, approval and export. Used for security, abuse prevention and traceability.',
      'Optional analytics: only if you accept the consent banner and a measurement ID is configured — see the analytics section below.',
    ],
  },
  {
    id: 'lawful',
    title: 'Why we are allowed to process it',
    body: [
      'We process account and workspace data because it is necessary to provide the service you asked for, contact messages because you chose to send them, security logs because we have a legitimate interest in protecting the service, and optional analytics because you consented. You can withdraw analytics consent at any time by clearing the site’s local storage entry named “ucip.analytics.consent” or by using your browser’s site-data controls.',
    ],
  },
  {
    id: 'storage',
    title: 'Where data is stored and for how long',
    body: [
      'In this build, workspace data is stored on the hosting filesystem as a JSON document (path configured by the DATA_DIR environment variable), or in PostgreSQL when the database profile is enabled. Session records, audit entries and AI usage counters live alongside it.',
      'Retention: messages submitted through the contact form are kept until the request is resolved and are capped at the most recent 5,000 entries; audit entries are capped at the most recent 2,000. Uploaded datasets remain until you delete them or the operator removes them. Session records expire after the configured session lifetime (12 hours by default).',
      'Backups are taken by the hosting provider or operator, not by this application. Backup retention is governed by that provider’s policy.',
    ],
  },
  {
    id: 'protection',
    title: 'How it is protected',
    body: [
      'Passwords are hashed with scrypt and a per-user salt and are never stored or logged in plain text. Sessions use an HttpOnly, SameSite cookie validated server-side, with account lockout after repeated failures and optional TOTP two-factor authentication. Every write action is checked against a role permission, and security-relevant actions are written to an audit trail.',
      'Public forms are protected by server-side validation, sanitisation, per-IP rate limiting, a honeypot field, submission-timing checks and duplicate suppression. An optional CAPTCHA (Cloudflare Turnstile) can be enabled with a key pair. Responses carry security headers (HSTS, nosniff, referrer policy, permissions policy) and private workspace routes are excluded from search indexing.',
      'No system is perfectly secure. This build makes no certification claims (such as ISO 27001, SOC 2 or PCI DSS) and does not describe itself as “GDPR certified”.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    body: [
      'One essential cookie (ucip_session) holds your signed-in session. It is HttpOnly, SameSite=Lax, Secure when served over HTTPS, and expires after the session lifetime.',
      'One local-storage entry (ucip.analytics.consent) remembers whether you allowed optional analytics. If Google Analytics is configured and you allow it, Google sets its own first-party cookies for measurement.',
      'No advertising, retargeting or cross-site tracking cookies are used by this application.',
    ],
  },
  {
    id: 'analytics',
    title: 'Optional analytics',
    body: [
      'Analytics is disabled unless the operator sets a Google Analytics 4 measurement ID and you accept the consent banner. Declining, or sending the Do Not Track browser signal, leaves analytics switched off and does not restrict any feature.',
      'The events we send are coarse and non-identifying: page path, page group, whether a dataset upload completed, whether a report was generated, which export format was used, and which contact-form category was chosen. We never send player names, email addresses, file names, dataset contents or free-text messages. IP anonymisation is enabled.',
    ],
  },
  {
    id: 'uploads',
    title: 'Uploaded datasets and player information',
    body: [
      'Datasets you upload stay inside your deployment’s storage. They are parsed on the server; the demo build sends no dataset content to any third party. If you enable an external AI provider, only the computed facts needed for narration (for example a short list of metrics and labels) are sent to that provider — never the raw file.',
      'If your dataset contains personal information about real people (for example player names and dates of birth), you are responsible for having a lawful basis to process it. Uploaded player records are never published by this application: workspace pages are marked noindex, and dynamic share images are restricted to synthetic demo records unless the operator explicitly enables them.',
    ],
  },
  {
    id: 'third-parties',
    title: 'Third parties',
    body: [
      'By default there are none: with no keys configured, the platform runs entirely on its own infrastructure. Optionally, the operator can configure Google Analytics 4 (measurement), Cloudflare Turnstile (CAPTCHA) and an OpenAI-compatible AI provider (narration). Each is off unless a key is supplied, and each is listed with its environment variable in the deployment documentation.',
    ],
  },
  {
    id: 'rights',
    title: 'Your choices and deletion',
    body: [
      'You can ask for a copy of your account data, correction of inaccurate details, deletion of your account, dataset deletion, or withdrawal of analytics consent. Use the contact form and choose the matching category, or email the address below.',
      'Deletion requests are actioned against the application store; copies inside provider backups follow the provider’s retention schedule. Workspace owners can delete datasets and reports themselves, immediately.',
      'Where local law grants additional rights (for example access, portability or objection), those rights are handled through the same contact route. This policy does not claim rights that the operator cannot honour.',
    ],
  },
  {
    id: 'children',
    title: 'Children',
    body: [
      'The platform is a professional analytics tool and is not directed at children. It is not designed to collect information from children, and accounts should not be created for them.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    body: [
      `When this policy changes materially we update this page and its “last reviewed” date. Questions, objections and deletion requests: ${SITE.contactEmail} or the contact form.`,
      'This document is a plain-language description of how the software behaves. It is not legal advice, and the operator of a production deployment should review it against the rules that apply to them.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-[11.5px] text-slateink-500">
        <Link href="/" className="hover:text-white">Home</Link> <span aria-hidden>/</span> <span className="text-slateink-300">Privacy</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Privacy policy</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-slateink-300">
        What this platform collects, why, where it is stored, how it is protected, and how to have it deleted. Last reviewed: 9 November 2026.
      </p>
      <div className="disclaimer mt-4">
        Plain-language description of the software’s real behaviour. No compliance certification is claimed or implied.
      </div>

      <nav aria-label="Contents" className="card card-pad mt-5">
        <h2 className="card-title">On this page</h2>
        <ol className="mt-2 grid gap-1 text-[12px] sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}><a className="link" href={`#${s.id}`}>{i + 1}. {s.title}</a></li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 space-y-6">
        {SECTIONS.map((section, index) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-[15px] font-semibold text-white">{index + 1}. {section.title}</h2>
            <div className="mt-2 space-y-2">
              {section.body.map((p) => (
                <p key={p.slice(0, 40)} className="text-[12.5px] leading-relaxed text-slateink-300">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="card card-pad mt-8">
        <h2 className="card-title">Related pages</h2>
        <ul className="mt-2 space-y-1.5 text-[12.5px]">
          <li><Link href="/faq#cookies" className="link">FAQ: cookies and trackers</Link></li>
          <li><Link href="/faq#deletion" className="link">FAQ: how to delete your data</Link></li>
          <li><Link href="/contact?kind=deletion-request" className="link">Submit a deletion request</Link></li>
          <li><Link href="/faq#limits" className="link">FAQ: honest limitations of this build</Link></li>
        </ul>
      </div>
    </div>
  );
}
