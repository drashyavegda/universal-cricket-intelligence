/** Deterministic descriptive statistics. No AI, no randomness, fully unit-testable. */

export const clean = (xs: (number | null | undefined)[]): number[] =>
  xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));

export const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function mode(xs: number[]): number | null {
  if (!xs.length) return null;
  const counts = new Map<number, number>();
  xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  let best: number | null = null; let bestCount = -1; let tie = false;
  counts.forEach((c, v) => {
    if (c > bestCount) { best = v; bestCount = c; tie = false; }
    else if (c === bestCount) tie = true;
  });
  return tie ? null : best;
}

export function variance(xs: number[], sample = true): number | null {
  if (xs.length < (sample ? 2 : 1)) return null;
  const m = mean(xs)!;
  const ss = xs.reduce((acc, x) => acc + (x - m) ** 2, 0);
  return ss / (xs.length - (sample ? 1 : 0));
}

export const sd = (xs: number[], sample = true): number | null => {
  const v = variance(xs, sample);
  return v === null ? null : Math.sqrt(v);
};

export const range = (xs: number[]): number | null => (xs.length ? Math.max(...xs) - Math.min(...xs) : null);

/** Coefficient of variation — only valid for ratio data with a meaningful zero. */
export function coefficientOfVariation(xs: number[]): number | null {
  const m = mean(xs); const s = sd(xs);
  if (m === null || s === null || m === 0) return null;
  return s / m;
}

export function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const clamped = Math.min(100, Math.max(0, p));
  const idx = (clamped / 100) * (s.length - 1);
  const lo = Math.floor(idx); const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function zScores(xs: number[]): number[] {
  const m = mean(xs); const s = sd(xs);
  if (m === null || s === null || s === 0) return xs.map(() => 0);
  return xs.map((x) => (x - m) / s);
}

export function skewness(xs: number[]): number | null {
  const n = xs.length; const m = mean(xs); const s = sd(xs);
  if (n < 3 || m === null || !s) return null;
  return (n / ((n - 1) * (n - 2))) * xs.reduce((acc, x) => acc + ((x - m) / s) ** 3, 0);
}

export function kurtosis(xs: number[]): number | null {
  const n = xs.length; const m = mean(xs); const s = sd(xs);
  if (n < 4 || m === null || !s) return null;
  const k = xs.reduce((acc, x) => acc + ((x - m) / s) ** 4, 0);
  return (n * (n + 1) * k) / ((n - 1) * (n - 2) * (n - 3)) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

/** 95% CI for a mean using the normal approximation; wide samples only get z-based bounds. */
export function confidenceIntervalMean(xs: number[], z = 1.959964): { lower: number; upper: number; margin: number; n: number; method: string } | null {
  const n = xs.length; const m = mean(xs); const s = sd(xs);
  if (m === null || s === null || n < 2) return null;
  const se = s / Math.sqrt(n);
  const margin = z * se;
  return { lower: m - margin, upper: m + margin, margin, n, method: 'normal approximation (z=1.96); prefer a t-interval when n<30' };
}

/** Wilson score interval — correct for proportions (win rates, dot-ball shares). */
export function wilsonInterval(successes: number, trials: number, z = 1.959964): { lower: number; upper: number; p: number } | null {
  if (trials <= 0) return null;
  const p = successes / trials;
  const denom = 1 + (z * z) / trials;
  const centre = p + (z * z) / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials));
  return { lower: Math.max(0, (centre - spread) / denom), upper: Math.min(1, (centre + spread) / denom), p };
}

export function movingAverage(xs: number[], window: number): (number | null)[] {
  if (window < 1) return xs.map(() => null);
  return xs.map((_, i) => {
    if (i < window - 1) return null;
    const slice = xs.slice(i - window + 1, i + 1);
    return mean(slice);
  });
}

export function weightedMean(xs: number[], weights: number[]): number | null {
  if (xs.length !== weights.length || !xs.length) return null;
  const wsum = weights.reduce((a, b) => a + b, 0);
  if (wsum === 0) return null;
  return xs.reduce((acc, x, i) => acc + x * weights[i], 0) / wsum;
}

export function normalizeMinMax(xs: number[]): number[] {
  if (!xs.length) return [];
  const lo = Math.min(...xs); const hi = Math.max(...xs);
  if (hi === lo) return xs.map(() => 0.5);
  return xs.map((x) => (x - lo) / (hi - lo));
}

export function normalizeRobust(xs: number[]): number[] {
  const med = median(xs); const q1 = percentile(xs, 25); const q3 = percentile(xs, 75);
  if (med === null || q1 === null || q3 === null || q3 - q1 === 0) return xs.map(() => 0.5);
  return xs.map((x) => Math.min(1, Math.max(0, (x - (med - 1.5 * (q3 - q1))) / (3 * (q3 - q1)))));
}

export function outliersIQR(xs: number[]): { index: number; value: number; reason: string }[] {
  const q1 = percentile(xs, 25); const q3 = percentile(xs, 75);
  if (q1 === null || q3 === null) return [];
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr; const hi = q3 + 1.5 * iqr;
  return xs.map((v, index) => ({ index, value: v, reason: '' }))
    .filter((o) => o.value < lo || o.value > hi)
    .map((o) => ({ ...o, reason: o.value < lo ? `below lower fence ${lo.toFixed(2)}` : `above upper fence ${hi.toFixed(2)}` }));
}

export function histogram(xs: number[], bins = 8): { bin: string; count: number; lo: number; hi: number }[] {
  if (!xs.length) return [];
  const lo = Math.min(...xs); const hi = Math.max(...xs);
  const width = (hi - lo) / bins || 1;
  const out = Array.from({ length: bins }, (_, i) => ({ lo: lo + i * width, hi: lo + (i + 1) * width, count: 0, bin: '' }));
  xs.forEach((x) => {
    const i = Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / width)));
    out[i].count++;
  });
  out.forEach((b) => (b.bin = `${b.lo.toFixed(1)}–${b.hi.toFixed(1)}`));
  return out;
}

export function linearRegression(xs: number[], ys: number[]): {
  slope: number; intercept: number; r2: number; r: number; n: number; predict: (x: number) => number;
  standardError: number;
} | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = mean(xs.slice(0, n))!; const my = mean(ys.slice(0, n))!;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  const residuals = xs.slice(0, n).map((x, i) => ys[i] - (slope * x + intercept));
  const se = n > 2 ? Math.sqrt(residuals.reduce((a, r2) => a + r2 * r2, 0) / (n - 2)) : 0;
  return { slope, intercept, r2: r * r, r, n, standardError: se, predict: (x: number) => slope * x + intercept };
}

export function pearson(xs: number[], ys: number[]): number | null {
  const lr = linearRegression(xs, ys);
  return lr ? lr.r : null;
}

function rank(xs: number[]): number[] {
  const sorted = [...xs].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(xs.length).fill(0);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].v === sorted[i].v) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[sorted[k].i] = avg;
    i = j + 1;
  }
  return ranks;
}

/** Spearman rank correlation — appropriate for monotonic, non-linear relationships. */
export function spearman(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  return pearson(rank(xs.slice(0, n)), rank(ys.slice(0, n)));
}

export function describe(xs: number[]) {
  return {
    n: xs.length,
    mean: mean(xs),
    median: median(xs),
    mode: mode(xs),
    variance: variance(xs),
    sd: sd(xs),
    range: range(xs),
    min: xs.length ? Math.min(...xs) : null,
    max: xs.length ? Math.max(...xs) : null,
    cv: coefficientOfVariation(xs),
    p10: percentile(xs, 10),
    p25: percentile(xs, 25),
    p75: percentile(xs, 75),
    p90: percentile(xs, 90),
    skewness: skewness(xs),
    kurtosis: kurtosis(xs),
    ci: confidenceIntervalMean(xs),
  };
}
