import { describe, expect, it } from 'vitest';
import {
  mean, median, sd, percentile, describe as describeStats, spearman, confidenceIntervalMean, movingAverage,
  outliersIQR, linearRegression, pearson, wilsonInterval, zScores, normalizeMinMax,
} from '@/lib/core/stats/descriptive';
import { normalCdf, poissonPmf, brierScore, logLoss, calibrationTable, summariseSample } from '@/lib/core/stats/probability';

describe('descriptive statistics', () => {
  it('computes mean, median and sample sd by hand-verified values', () => {
    const xs = [1, 2, 3, 4];
    expect(mean(xs)).toBeCloseTo(2.5, 10);
    expect(median(xs)).toBeCloseTo(2.5, 10);
    expect(sd(xs)).toBeCloseTo(Math.sqrt(5 / 3), 10);
  });

  it('returns null rather than inventing a value for single observations', () => {
    expect(sd([7])).toBeNull();
  });

  it('percentile interpolates and clamps', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBeCloseTo(3, 10);
    expect(percentile([1, 2, 3, 4, 5], 0)).toBeCloseTo(1, 10);
    expect(percentile([1, 2, 3, 4, 5], 100)).toBeCloseTo(5, 10);
  });

  it('confidence interval contains the mean and widens with spread', () => {
    const tight = confidenceIntervalMean([10, 10.1, 9.9, 10.05]);
    const wide = confidenceIntervalMean([2, 10, 18, 26]);
    expect(tight).not.toBeNull();
    expect(wide).not.toBeNull();
    expect(tight!.lower).toBeLessThan(10);
    expect(tight!.upper).toBeGreaterThan(10);
    expect(wide!.margin).toBeGreaterThan(tight!.margin);
  });

  it('wilson interval stays inside 0..1 for a small proportion', () => {
    const w = wilsonInterval(1, 2)!;
    expect(w.lower).toBeGreaterThanOrEqual(0);
    expect(w.upper).toBeLessThanOrEqual(1);
    expect(w.p).toBeCloseTo(0.5, 10);
  });

  it('spearman is 1 for a monotonic transform', () => {
    expect(spearman([1, 2, 3, 4, 5], [10, 100, 1000, 10000, 100000])).toBeCloseTo(1, 10);
  });

  it('pearson is null when either series has no variance', () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
  });

  it('moving average returns null until the window is full', () => {
    const ma = movingAverage([1, 2, 3, 4, 5], 3);
    expect(ma[0]).toBeNull();
    expect(ma[2]).toBeCloseTo(2, 10);
  });

  it('IQR outlier detection flags the injected extreme value', () => {
    const flags = outliersIQR([10, 11, 12, 11, 12, 10, 90]);
    expect(flags.length).toBeGreaterThanOrEqual(1);
    expect(flags[0].value).toBe(90);
  });

  it('linear regression recovers a known line', () => {
    const xs = Array.from({ length: 10 }, (_, i) => i);
    const reg = linearRegression(xs, xs.map((x) => 3 * x + 1))!;
    expect(reg.slope).toBeCloseTo(3, 8);
    expect(reg.intercept).toBeCloseTo(1, 8);
    expect(reg.r2).toBeCloseTo(1, 8);
    expect(reg.predict(2)).toBeCloseTo(7, 8);
  });

  it('z-scores and min-max normalisation behave as documented', () => {
    const z = zScores([1, 1, 1]);
    expect(z.every((v) => v === 0)).toBe(true);
    // a constant series has no information, so the library returns the neutral midpoint
    expect(normalizeMinMax([5, 5, 5])).toEqual([0.5, 0.5, 0.5]);
    expect(normalizeMinMax([0, 5, 10])).toEqual([0, 0.5, 1]);
  });

  it('describe reports sample size so small cohorts are visible', () => {
    const d = describeStats([1, 2, 3]);
    expect(d.n).toBe(3);
    expect(d.mean).toBeCloseTo(2, 10);
    expect(d.sd).toBeCloseTo(1, 10);
  });
});

describe('probability helpers', () => {
  it('normal CDF is 0.5 at the mean and monotone', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(-1)).toBeLessThan(normalCdf(0));
    expect(normalCdf(1)).toBeGreaterThan(normalCdf(0));
  });

  it('poisson pmf sums to ~1 over the support', () => {
    let total = 0;
    for (let k = 0; k < 40; k++) total += poissonPmf(k, 3);
    expect(total).toBeCloseTo(1, 4);
  });

  it('summariseSample produces ordered quantiles', () => {
    const s = summariseSample([5, 1, 9, 3, 7]);
    expect(s.p05).toBeLessThanOrEqual(s.p50);
    expect(s.p50).toBeLessThanOrEqual(s.p95);
    expect(s.n).toBe(5);
  });

  it('brier score matches a hand calculation and rejects empty input', () => {
    expect(brierScore([{ p: 1, outcome: 1 }, { p: 0, outcome: 0 }])).toBeCloseTo(0, 10);
    expect(brierScore([{ p: 0.5, outcome: 1 }])).toBeCloseTo(0.25, 10);
    expect(brierScore([])).toBeNull();
  });

  it('log loss and calibration table are defined for mixed outcomes', () => {
    const f = [{ p: 0.7, outcome: 1 as const }, { p: 0.3, outcome: 0 as const }];
    expect(logLoss(f)).not.toBeNull();
    const table = calibrationTable(f, 5);
    expect(table.length).toBeGreaterThan(0);
  });
});
