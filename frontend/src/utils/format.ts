/**
 * Presentation helpers.
 *
 * The engine returns raw numbers and `null` for unknowns. These helpers make sure a null never
 * renders as "0" and that units are never lost. They are pure and unit-testable.
 */

/** Cricket-friendly number: 2 dp, thousands separators, `—` for null/NaN. */
export function num(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Percentage from a 0–100 value (already-scaled input). */
export function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

/** Percentage from a 0–1 probability. Always states the probability, never a certainty. */
export function probability(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

/** Auction money. Input is lakh (₹1 lakh = 100,000) because that is how IPL purses are quoted. */
export function lakh(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`;
}

/** Overs from balls, e.g. 87 → "14.3". */
export function overs(balls: number | null | undefined): string {
  if (balls === null || balls === undefined || !Number.isFinite(balls) || balls < 0) return '—';
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

/** Rates that require a denominator: if the denominator is zero the value is unknown, not zero. */
export function rate(value: number | null | undefined, denominator: number | null | undefined, digits = 2): string {
  if (!denominator) return '—';
  return num(value, digits);
}

/** ISO date → readable, locale-stable date. */
export function date(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toISOString().slice(0, 10);
}

/** Relative age label used on player cards. */
export function ageLabel(age: number | null | undefined): string {
  return age === null || age === undefined ? 'age n/a' : `${age}y`;
}

/** Truncate free text for table cells without cutting mid-word. */
export function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
