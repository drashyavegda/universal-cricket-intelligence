'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, useApi } from '@/lib/client/api';
import { Alert, Badge, Button, Card, Empty, KV, Loading, PageHeader, Select, Tabs, nf } from '@/components/ui';
import { BarCompare, LineTrend, ScatterPlot, DivergingBars } from '@/components/charts';

const OPS = [
  { key: 'describe', label: 'Descriptive statistics' },
  { key: 'histogram', label: 'Distribution' },
  { key: 'regression', label: 'Linear regression' },
  { key: 'correlation', label: 'Correlation' },
  { key: 'outliers', label: 'Outlier detection' },
  { key: 'moving-average', label: 'Moving average' },
  { key: 'z-scores', label: 'Z-scores' },
  { key: 'normalise', label: 'Min-max normalisation' },
  { key: 'confidence-interval', label: 'Confidence interval' },
] as const;

const METRICS = [
  { value: 'strikeRate', label: 'Batting strike rate' }, { value: 'average', label: 'Batting average' },
  { value: 'runs', label: 'Runs' }, { value: 'boundaryPct', label: 'Boundary %' },
  { value: 'economy', label: 'Bowling economy' }, { value: 'bowlingSR', label: 'Bowling strike rate' },
  { value: 'wickets', label: 'Wickets' }, { value: 'formIndex', label: 'Form index' },
  { value: 'floorRate', label: 'Floor rate' }, { value: 'cv', label: 'Volatility (CV)' }, { value: 'age', label: 'Age' },
];

export default function StatsLabPage() {
  const [op, setOp] = useState<string>('describe');
  const [metric, setMetric] = useState('strikeRate');
  const [metricY, setMetricY] = useState('average');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = useApi<{ metricDefinitions: { key: string; label: string; group: string; explain: string; higherBetter: boolean }[] }>('/api/stats');
  const players = useApi<{ players: { id: string; name: string }[] }>('/api/players?pageSize=60');

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const res = await apiPost<Record<string, unknown>>('/api/stats', { operation: op, metric, metricY, window: 3, playerIds: op === 'moving-average' ? [players.data?.players[0]?.id] : undefined });
      setResult(res);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  useEffect(() => { void run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [op]);

  const r = result as Record<string, unknown> | null;
  const describeRes = r?.result as Record<string, number | null> | undefined;

  return (
    <div className="space-y-4">
      <PageHeader title="Statistical Lab" description="Deterministic statistics with the formula, sample size and suitability note shown beside every result. Nothing here is AI-generated.">
        <Button onClick={run} disabled={busy}>{busy ? 'Computing…' : 'Run operation'}</Button>
      </PageHeader>

      <Card title="Operation" subtitle="Choose an operation and metric; results recompute on change">
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={op} onChange={(v) => { setOp(v); }} options={OPS.map((o) => ({ value: o.key, label: o.label }))} />
          <Select value={metric} onChange={(v) => { setMetric(v); void run(); }} options={METRICS} />
          <Select value={metricY} onChange={setMetricY} options={METRICS} />
        </div>
        {error && <div className="mt-2"><Alert tone="error">{error}</Alert></div>}
      </Card>

      {busy && <Loading label="Running statistics" />}
      {r && !busy && (
        <div className="grid gap-4 lg:grid-cols-2">
          {op === 'describe' && describeRes && (
            <>
              <Card title={`Describe: ${metric}`} subtitle={`n = ${describeRes.n} observations`}>
                <KV cols={2} items={[
                  { k: 'Mean', v: nf(describeRes.mean, 2) }, { k: 'Median', v: nf(describeRes.median, 2) },
                  { k: 'Mode', v: describeRes.mode ?? 'none / tied' }, { k: 'Std deviation', v: nf(describeRes.sd, 2) },
                  { k: 'Variance', v: nf(describeRes.variance, 2) }, { k: 'Range', v: nf(describeRes.range, 2) },
                  { k: 'CV', v: nf(describeRes.cv, 3) }, { k: 'Skewness', v: nf(describeRes.skewness, 2) },
                  { k: 'P25 / P75', v: `${nf(describeRes.p25, 1)} / ${nf(describeRes.p75, 1)}` },
                  { k: '95% CI of mean', v: describeRes.ci ? `${nf((describeRes.ci as unknown as { lower: number }).lower, 2)} – ${nf((describeRes.ci as unknown as { upper: number }).upper, 2)}` : '—' },
                ]} />
                <div className="mt-2 text-[10.5px] text-slateink-500">{String(r.formula)}</div>
                <div className="disclaimer mt-2">{String(r.suitability)}</div>
              </Card>
              <Card title="Distribution" subtitle="Histogram of the selected metric">
                <BarCompare data={(r.histogram as { bin: string; count: number }[]).map((b) => ({ name: b.bin, value: b.count }))} colour="#34D399" height={260} label="Count" />
              </Card>
            </>
          )}

          {op === 'histogram' && (
            <Card className="lg:col-span-2" title="Distribution" subtitle={`${r.n} observations across 12 bins`}>
              <BarCompare data={(r.bins as { bin: string; count: number }[]).map((b) => ({ name: b.bin, value: b.count }))} colour="#34D399" height={300} label="Count" />
            </Card>
          )}

          {op === 'regression' && (
            <>
              <Card title="Regression result" subtitle={`n = ${r.n} paired observations`}>
                {r.result ? (
                  <KV cols={2} items={[
                    { k: 'Slope', v: nf((r.result as { slope: number }).slope, 4) },
                    { k: 'Intercept', v: nf((r.result as { intercept: number }).intercept, 3) },
                    { k: 'R²', v: nf((r.result as { r2: number }).r2, 4) },
                    { k: 'r', v: nf((r.result as { r: number }).r, 4) },
                    { k: 'Std error', v: nf((r.result as { standardError: number }).standardError, 3) },
                  ]} />
                ) : <Empty title="Not enough paired observations" />}
                <div className="mt-2 text-[11px] leading-relaxed text-slateink-300">{String(r.interpretation)}</div>
                <div className="disclaimer mt-2">Ordinary least squares. Association is not causation; check the scatter for non-linearity.</div>
              </Card>
              <Card title="Scatter" subtitle={`${metric} vs ${metricY}`}>
                <ScatterPlot data={(r.points as { x: number; y: number }[]).map((p) => ({ x: p.x, y: p.y }))} xKey="x" yKey="y" xLabel={metric} yLabel={metricY} height={300} />
              </Card>
            </>
          )}

          {op === 'correlation' && (
            <Card className="lg:col-span-2" title="Correlation" subtitle={`n = ${r.n}`}>
              <KV cols={3} items={[
                { k: 'Pearson (linear)', v: nf(r.pearson as number, 4) },
                { k: 'Spearman (monotonic)', v: nf(r.spearman as number, 4) },
                { k: 'Interpretation', v: Math.abs(Number(r.pearson)) > 0.6 ? 'strong' : Math.abs(Number(r.pearson)) > 0.3 ? 'moderate' : 'weak' },
              ]} />
              <div className="mt-2 text-[11px] text-slateink-400">{String(r.note)}</div>
            </Card>
          )}

          {op === 'outliers' && (
            <Card className="lg:col-span-2" title="Outlier detection" subtitle={String(r.method)}>
              {(r.outliers as { player?: string; value: number; reason: string }[]).length === 0 ? <Empty title="No outliers beyond the Tukey fences" /> : (
                <table className="table-base"><thead><tr><th>Player</th><th>Value</th><th>Reason</th></tr></thead>
                  <tbody>{(r.outliers as { player?: string; value: number; reason: string }[]).map((o, i) => <tr key={i}><td>{o.player ?? `#${i}`}</td><td className="font-mono">{nf(o.value, 2)}</td><td className="text-[11px] text-slateink-400">{o.reason}</td></tr>)}</tbody>
                </table>
              )}
            </Card>
          )}

          {op === 'moving-average' && (
            <Card className="lg:col-span-2" title={`Moving average — ${String(r.player)}`} subtitle={String(r.formula)}>
              <LineTrend data={(r.series as { label: string; value: number; movingAverage: number | null }[]).map((s) => ({ name: s.label, runs: s.value, ma: s.movingAverage }))} series={[{ key: 'runs', label: 'Innings runs' }, { key: 'ma', label: '3-innings moving average', colour: '#E8C15C' }]} height={280} />
            </Card>
          )}

          {(op === 'z-scores' || op === 'normalise') && (
            <Card className="lg:col-span-2" title={op === 'z-scores' ? 'Z-scores' : 'Min-max normalisation'} subtitle={String(r.formula)}>
              <table className="table-base">
                <thead><tr><th>Player</th><th>Raw value</th><th>{op === 'z-scores' ? 'z' : 'normalised'}</th></tr></thead>
                <tbody>
                  {(r.players as { player: string; value: number; z?: number; normalised?: number }[]).slice(0, 25).map((p, i) => (
                    <tr key={i}><td>{p.player}</td><td className="font-mono">{nf(p.value, 2)}</td><td className="font-mono text-turf-400">{nf(op === 'z-scores' ? p.z : p.normalised, 3)}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {op === 'confidence-interval' && (
            <Card className="lg:col-span-2" title="Confidence interval" subtitle={String(r.formula)}>
              <KV cols={4} items={[
                { k: 'n', v: String(r.n) },
                { k: 'Lower bound', v: nf((r.ci as { lower: number } | null)?.lower, 3) },
                { k: 'Upper bound', v: nf((r.ci as { upper: number } | null)?.upper, 3) },
                { k: 'CV', v: nf(r.cv as number, 3) },
              ]} />
              <div className="disclaimer mt-2">With n &lt; 30 a t-interval is more appropriate; the z-based approximation here is conservative for small samples.</div>
            </Card>
          )}
        </div>
      )}

      <Card title="Metric definitions used across the platform" subtitle="Every metric exposes its definition, direction and interpretation">
        <div className="max-h-[380px] overflow-auto">
          <table className="table-base">
            <thead><tr><th>Metric</th><th>Group</th><th>Direction</th><th>Definition</th></tr></thead>
            <tbody>
              {(meta.data?.metricDefinitions ?? []).map((m) => (
                <tr key={m.key}><td className="text-[11.5px] text-slate-200">{m.label}<div className="font-mono text-[10px] text-slateink-500">{m.key}</div></td><td><Badge tone="slate">{m.group}</Badge></td><td className="text-[11px]">{m.higherBetter ? 'higher better' : 'lower better'}</td><td className="text-[11px] text-slateink-400">{m.explain}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
