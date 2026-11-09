/** Probability helpers used by simulations and prediction evaluation. */

export function normalPdf(x: number, mu = 0, sigma = 1): number {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}

/** Zelen & Severo approximation of the standard normal CDF (|error| < 7.5e-8). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export const normalInv = (p: number, mu = 0, sigma = 1): number => {
  // Acklam's algorithm
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let q: number; let r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) * sigma + mu;
  }
  if (p > 1 - pl) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) * sigma + mu;
  }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1) * sigma + mu;
};

export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || lambda <= 0) return 0;
  let logp = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logp -= Math.log(i);
  return Math.exp(logp);
}

/** Empirical quantile from a sample (used for simulation output bands). */
export function quantileSorted(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

export function summariseSample(sample: number[]) {
  const sorted = [...sample].sort((a, b) => a - b);
  const mean = sample.reduce((a, b) => a + b, 0) / Math.max(1, sample.length);
  const sd = Math.sqrt(sample.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, sample.length - 1));
  return {
    n: sample.length,
    mean,
    sd,
    p05: quantileSorted(sorted, 5),
    p25: quantileSorted(sorted, 25),
    p50: quantileSorted(sorted, 50),
    p75: quantileSorted(sorted, 75),
    p95: quantileSorted(sorted, 95),
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
    se: sd / Math.sqrt(Math.max(1, sample.length)),
  };
}

/** Brier score — mean squared error of probabilistic forecasts (lower is better). */
export function brierScore(forecasts: { p: number; outcome: 0 | 1 }[]): number | null {
  if (!forecasts.length) return null;
  return forecasts.reduce((acc, f) => acc + (f.p - f.outcome) ** 2, 0) / forecasts.length;
}

export function logLoss(forecasts: { p: number; outcome: 0 | 1 }[]): number | null {
  if (!forecasts.length) return null;
  const eps = 1e-12;
  return -forecasts.reduce((acc, f) => {
    const p = Math.min(1 - eps, Math.max(eps, f.p));
    return acc + (f.outcome === 1 ? Math.log(p) : Math.log(1 - p));
  }, 0) / forecasts.length;
}

export function calibrationTable(forecasts: { p: number; outcome: 0 | 1 }[], bins = 5) {
  return Array.from({ length: bins }, (_, i) => {
    const lo = i / bins; const hi = (i + 1) / bins;
    const inBin = forecasts.filter((f) => f.p >= lo && (i === bins - 1 ? f.p <= hi : f.p < hi));
    const meanP = inBin.length ? inBin.reduce((a, f) => a + f.p, 0) / inBin.length : null;
    const obs = inBin.length ? inBin.reduce((a, f) => a + f.outcome, 0) / inBin.length : null;
    return { bin: `${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%`, n: inBin.length, meanPredicted: meanP, observed: obs };
  });
}
