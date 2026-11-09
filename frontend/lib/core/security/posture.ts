/** Security posture & digital twin (Feature 30). Honest: scores control coverage, not certification. */
import { getStore } from '../db/store';

export interface Control { id: string; name: string; category: string; implemented: boolean; detail: string; riskIfMissing: 'high' | 'medium' | 'low' }

export function securityControls(): Control[] {
  const store = getStore();
  const has2fa = store.settings.security.require2faForAdmins;
  const users2fa = store.users.filter((u) => u.twoFactorEnabled).length;
  return [
    { id: 'auth', name: 'Authentication with scrypt hashing + salting', category: 'Identity', implemented: true, detail: 'Passwords hashed with scrypt (N=16384) and per-user salt; constant-time comparison.', riskIfMissing: 'high' },
    { id: 'session', name: 'Server-side session tokens with expiry', category: 'Identity', implemented: true, detail: `Opaque 256-bit tokens, ${store.settings.security.sessionMinutes}-minute expiry, HttpOnly cookie.`, riskIfMissing: 'high' },
    { id: '2fa', name: 'TOTP two-factor authentication', category: 'Identity', implemented: true, detail: `RFC 6238 TOTP implemented locally. ${users2fa} user(s) enrolled; admin enforcement ${has2fa ? 'on' : 'off'}.`, riskIfMissing: 'medium' },
    { id: 'rbac', name: 'Role-based access control', category: 'Authorisation', implemented: true, detail: 'Owner / analyst / scout / viewer permissions enforced in every API route.', riskIfMissing: 'high' },
    { id: 'agent-iso', name: 'AI agent permission isolation', category: 'Authorisation', implemented: true, detail: 'Agents run with a read-only permission set and cannot mutate data or settings.', riskIfMissing: 'medium' },
    { id: 'ratelimit', name: 'Rate limiting on auth & AI endpoints', category: 'Abuse', implemented: true, detail: 'In-process sliding window (per instance). Behind multiple instances use a shared store.', riskIfMissing: 'medium' },
    { id: 'lockout', name: 'Account lockout after failed logins', category: 'Identity', implemented: true, detail: '5 failed attempts → 10-minute lock.', riskIfMissing: 'medium' },
    { id: 'injection', name: 'Prompt-injection guard on uploaded/external text', category: 'AI', implemented: true, detail: 'Known instruction-override patterns and key formats are neutralised before any model call.', riskIfMissing: 'high' },
    { id: 'audit', name: 'Audit log of consequential actions', category: 'Governance', implemented: true, detail: `${store.audit.length} entries retained (in-memory store, capped at 2,000).`, riskIfMissing: 'high' },
    { id: 'upload', name: 'Upload size/type limits and safe parsing', category: 'Data', implemented: true, detail: `Max ${store.settings.limits.maxUploadMb} MB, ${store.settings.limits.maxRowsPerDataset} rows, encrypted-PDF detection, no shell execution.`, riskIfMissing: 'high' },
    { id: 'tenant', name: 'Multi-tenant isolation', category: 'Data', implemented: true, detail: 'Workspace scoping is enforced by organisation_id in the PostgreSQL schema with row-level security policies.', riskIfMissing: 'high' },
    { id: 'rls', name: 'Database row-level security policies', category: 'Data', implemented: true, detail: 'db/migrations/0001_init.sql defines RLS policies; demo JSON store is single-tenant.', riskIfMissing: 'high' },
    { id: 'encryption', name: 'Encryption at rest for secrets', category: 'Crypto', implemented: true, detail: 'AES-256-GCM helper for field encryption; TLS required in deployment (see DEPLOYMENT.md).', riskIfMissing: 'medium' },
    { id: 'backup', name: 'Backup & restore runbook', category: 'Resilience', implemented: true, detail: 'Documented in DEPLOYMENT.md (pg_dump schedule + restore drills). Automation itself is deployment-specific.', riskIfMissing: 'medium' },
    { id: 'vuln', name: 'Dependency vulnerability scanning', category: 'Supply chain', implemented: false, detail: 'Run npm audit / pip-audit in CI. Not executed in this build environment.', riskIfMissing: 'medium' },
    { id: 'sso', name: 'Google OAuth login', category: 'Identity', implemented: false, detail: 'Adapter stub only. Requires GOOGLE_CLIENT_ID/SECRET to be configured.', riskIfMissing: 'low' },
    { id: 'pentest', name: 'Independent penetration test', category: 'Assurance', implemented: false, detail: 'NOT performed. No security certification is claimed by this project.', riskIfMissing: 'high' },
  ];
}

export function securityScore() {
  const controls = securityControls();
  const weight = (r: Control['riskIfMissing']) => (r === 'high' ? 3 : r === 'medium' ? 2 : 1);
  const total = controls.reduce((a, c) => a + weight(c.riskIfMissing), 0);
  const earned = controls.filter((c) => c.implemented).reduce((a, c) => a + weight(c.riskIfMissing), 0);
  const score = Math.round((earned / total) * 100);
  return {
    score,
    grade: score >= 85 ? 'Strong (self-assessed)' : score >= 70 ? 'Reasonable (self-assessed)' : 'Needs work',
    controls,
    gaps: controls.filter((c) => !c.implemented),
    recommendation: controls.filter((c) => !c.implemented && c.riskIfMissing === 'high').map((c) => `Close gap: ${c.name} — ${c.detail}`),
    disclaimer: 'This is an engineering self-assessment of implemented controls. It is not a certification, audit or penetration-test result, and must not be presented as compliance with ISO 27001, SOC 2 or any other standard.',
  };
}

/** Threat simulation: what would break if a control were missing (Feature 30 digital twin). */
export function simulateThreat(controlId: string) {
  const control = securityControls().find((c) => c.id === controlId);
  if (!control) return null;
  const scenarios: Record<string, { impact: string; likelihood: string; mitigation: string }> = {
    rbac: { impact: 'A viewer could alter rankings and approve datasets, corrupting every downstream recommendation.', likelihood: 'High if exposed to a shared team workspace.', mitigation: 'Keep permission checks in every route handler and test them (tests/api.permissions.test.ts).' },
    injection: { impact: 'Uploaded text containing instructions could steer the model into fabricating statistics or leaking prompt content.', likelihood: 'High for any user-supplied PDF.', mitigation: 'Guard patterns plus the rule that the model only narrates pre-computed numbers.' },
    '2fa': { impact: 'Credential stuffing leads to account takeover of an analyst account.', likelihood: 'Medium.', mitigation: 'Enforce TOTP for owner/analyst roles and monitor login audit logs.' },
    auth: { impact: 'Password database exposure enables offline cracking.', likelihood: 'Low with scrypt, but catastrophic.', mitigation: 'scrypt hashing, unique salts, no password reuse policies.' },
  };
  const s = scenarios[controlId] ?? { impact: 'Loss of the control weakens defence in depth for this category.', likelihood: 'Depends on deployment exposure.', mitigation: control.detail };
  return { control, ...s };
}
