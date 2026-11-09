import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, generateTotpSecret, totp, verifyTotp, encryptField, decryptField, sha256, safeEqual } from '@/lib/core/auth/crypto';
import { can, permissionsForRole, rateLimit } from '@/lib/core/auth/service';
import { securityControls, securityScore, simulateThreat } from '@/lib/core/security/posture';

describe('password & token cryptography', () => {
  it('hashes with a unique salt and verifies correctly', () => {
    const a = hashPassword('Correct#Horse1');
    const b = hashPassword('Correct#Horse1');
    expect(a.hash).not.toBe(b.hash);           // different salts
    expect(verifyPassword('Correct#Horse1', a.hash, a.salt)).toBe(true);
    expect(verifyPassword('correct#horse1', a.hash, a.salt)).toBe(false);
  });

  it('never stores the password in the hash record', () => {
    const { hash } = hashPassword('Secret#12345');
    expect(hash.includes('Secret#12345')).toBe(false);
  });

  it('TOTP codes verify inside the window and reject outside it', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const code = totp(secret, now);
    expect(verifyTotp(secret, code, 1)).toBe(true);
    expect(verifyTotp(secret, '000000', 0)).toBe(false);
    expect(verifyTotp(secret, totp(secret, now - 10 * 60 * 1000), 0)).toBe(false);
  });

  it('field encryption round-trips and is non-deterministic (IV per call)', () => {
    const key = 'unit-test-key-32-bytes-long-abcde';
    const a = encryptField('two-factor-secret-value', key);
    const b = encryptField('two-factor-secret-value', key);
    expect(a).not.toBe(b);
    expect(decryptField(a, key)).toBe('two-factor-secret-value');
    expect(() => decryptField(a, 'another-key-entirely-000000000000')).toThrow();
  });

  it('constant-time comparison and hashing behave', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(sha256('abc')).toHaveLength(64);
  });
});

describe('role-based access control', () => {
  it('owners can approve data; analysts cannot; viewers can only read', () => {
    expect(can('owner', 'data:approve')).toBe(true);
    expect(can('analyst', 'data:approve')).toBe(false);
    expect(can('analyst', 'data:edit')).toBe(true);
    expect(can('viewer', 'view')).toBe(true);
    expect(can('viewer', 'data:upload')).toBe(false);
    expect(can('scout', 'settings:ai')).toBe(false);
  });

  it('no role other than owner can change AI or security settings', () => {
    for (const role of ['analyst', 'scout', 'viewer'] as const) {
      expect(can(role, 'settings:ai')).toBe(false);
      expect(can(role, 'settings:security')).toBe(false);
    }
  });

  it('permission sets are narrow and explicit', () => {
    expect(permissionsForRole('viewer')).toEqual(['view']);
    expect(permissionsForRole('owner').length).toBeGreaterThan(permissionsForRole('analyst').length);
  });

  it('rate limiter blocks after the configured number of hits in a minute', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3).allowed).toBe(true);
    const blocked = rateLimit(key, 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});

describe('security posture', () => {
  it('scores implemented controls and lists the gaps honestly', () => {
    const s = securityScore();
    expect(s.score).toBeGreaterThan(0);
    expect(s.score).toBeLessThan(100);            // a pen test has not been done
    expect(s.gaps.length).toBeGreaterThan(0);
    expect(s.disclaimer.toLowerCase()).toContain('not a certification');
  });

  it('marks the unimplemented controls as unimplemented', () => {
    const controls = securityControls();
    expect(controls.find((c) => c.id === 'pentest')!.implemented).toBe(false);
    expect(controls.find((c) => c.id === 'vuln')!.implemented).toBe(false);
  });

  it('threat simulation explains impact and mitigation', () => {
    const t = simulateThreat('rbac')!;
    expect(t.impact.length).toBeGreaterThan(10);
    expect(t.mitigation.length).toBeGreaterThan(10);
    expect(simulateThreat('does-not-exist')).toBeNull();
  });
});
