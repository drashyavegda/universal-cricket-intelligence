import crypto from 'node:crypto';

const KEYLEN = 64;

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = crypto.scryptSync(password, salt, KEYLEN, { N: 16384, r: 8, p: 1 }).toString('hex');
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const randomToken = (bytes = 32): string => crypto.randomBytes(bytes).toString('base64url');

export const sha256 = (input: string | Buffer): string => crypto.createHash('sha256').update(input).digest('hex');

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function generateTotpSecret(length = 20): string {
  const buf = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < buf.length; i++) out += B32[buf[i] % 32];
  return out;
}

function base32Decode(input: string): Buffer {
  let bits = 0; let value = 0; const out: number[] = [];
  for (const c of input.replace(/=+$/, '').toUpperCase()) {
    const idx = B32.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}

/** RFC 6238 TOTP (SHA-1, 6 digits, 30s step) — implemented locally, no external service. */
export function totp(secret: string, timestamp = Date.now(), step = 30, digits = 6): string {
  const counter = Math.floor(timestamp / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter % 2 ** 32, 4);
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 10 ** digits;
  return String(code).padStart(digits, '0');
}

export function verifyTotp(secret: string, token: string, window = 1): boolean {
  for (let w = -window; w <= window; w++) {
    if (totp(secret, Date.now() + w * 30000) === token) return true;
  }
  return false;
}

export function encryptField(plain: string, key = process.env.FIELD_ENCRYPTION_KEY || 'demo-field-encryption-key'): string {
  const iv = crypto.randomBytes(12);
  const k = crypto.createHash('sha256').update(key).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', k, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc.toString('hex')}`;
}

/** Constant-time string comparison (lengths are compared first, which leaks only length). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Decrypt a value produced by encryptField (AES-256-GCM).
 * Throws if the payload is malformed or the authentication tag does not verify,
 * which is what detects tampering.
 */
export function decryptField(payload: string, key = process.env.FIELD_ENCRYPTION_KEY || 'demo-field-encryption-key'): string {
  const parts = payload.split(':');
  if (parts.length !== 3) throw new Error('Malformed encrypted payload');
  const [ivHex, tagHex, dataHex] = parts;
  const k = crypto.createHash('sha256').update(key).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}
