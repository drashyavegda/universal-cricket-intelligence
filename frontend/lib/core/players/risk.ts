/**
 * Risk & investment intelligence (Feature 13). Risk is scored separately from
 * quality so a user can see "good player, risky buy" explicitly.
 */
import type { CohortRow } from './metrics';
import type { Player } from '../types';

export interface RiskResult {
  playerId: string;
  name: string;
  riskScore: number;
  riskBand: 'Low' | 'Moderate' | 'Elevated' | 'High';
  qualityScore: number;
  potentialScore: number;
  valueScore: number | null;
  decision: 'Strong Investment' | 'Calculated Risk' | 'High-Risk Opportunity' | 'Avoid at Current Price' | 'Insufficient Evidence';
  components: { name: string; risk: number; weight: number; detail: string }[];
  evidenceGaps: string[];
  notes: string[];
}

export function assessRisk(row: CohortRow, opts: { estValueLakh?: number | null; priceLakh?: number | null; potential?: number | null } = {}): RiskResult {
  const p: Player = row.player;
  const m = row.metrics;
  const cv = m.consistency.cv;
  const sample = Math.max(p.batting.balls, p.bowling.balls);

  const consistencyRisk = cv === null ? 60 : Math.min(100, Math.max(0, cv * 190));
  const sampleRisk = Math.min(100, Math.max(0, 100 - (sample / 420) * 100));
  const dataRisk = Math.min(100, Math.max(0, 100 - p.confidence * 100));
  const formRisk = m.form.trendSlope === null ? 45 : Math.min(100, Math.max(0, 50 - m.form.trendSlope * 8));
  const adaptabilityRisk = p.format === 'T20' ? (m.phase.phaseVersatility === null ? 50 : Math.min(100, Math.max(0, 100 - m.phase.phaseVersatility))) : 55;
  const competitionRisk = p.competition.includes('DEMO') ? 55 : 35;
  const availabilityRisk = 50; // unknown until verified availability data is supplied

  const components = [
    { name: 'Performance consistency', risk: consistencyRisk, weight: 0.22, detail: cv === null ? 'CV unavailable (too few innings)' : `CV of recent innings = ${cv.toFixed(2)}` },
    { name: 'Sample size', risk: sampleRisk, weight: 0.2, detail: `${sample} balls of evidence (bat + bowl)` },
    { name: 'Data reliability', risk: dataRisk, weight: 0.14, detail: `Record confidence ${(p.confidence * 100).toFixed(0)}%` },
    { name: 'Recent form trajectory', risk: formRisk, weight: 0.14, detail: m.form.trendSlope === null ? 'Not enough innings' : `Runs trend ${m.form.trendSlope.toFixed(2)} per innings` },
    { name: 'Format adaptability', risk: adaptabilityRisk, weight: 0.12, detail: m.phase.phaseVersatility === null ? 'Phase splits incomplete' : `Phase versatility ${m.phase.phaseVersatility.toFixed(0)}/100` },
    { name: 'Competition strength', risk: competitionRisk, weight: 0.1, detail: p.competition.includes('DEMO') ? 'Demo competition — strength not calibrated' : p.competition },
    { name: 'Availability (verified)', risk: availabilityRisk, weight: 0.08, detail: 'No verified availability data supplied — neutral 50 applied' },
  ];
  const riskScore = components.reduce((a, c) => a + c.risk * c.weight, 0);

  const qualityKeys = ['batting.average', 'batting.strikeRate', 'bowling.economy', 'bowling.strikeRate', 'phase.deathSR', 'phase.deathEcon'];
  const qVals = qualityKeys.map((k) => row.percentiles[k]).filter((v): v is number => v !== null);
  const qualityScore = qVals.length ? qVals.reduce((a, b) => a + b, 0) / qVals.length : 40;

  const evidenceGaps: string[] = [];
  if (sample < 180) evidenceGaps.push('Fewer than 180 balls of evidence — rate metrics have wide confidence intervals.');
  if (!p.dob) evidenceGaps.push('Date of birth missing, so age-based headroom is neutral.');
  if (m.bowling.dotBallPct === null) evidenceGaps.push('No ball-by-ball data: dot-ball and matchup metrics unavailable.');
  if (availabilityRisk === 50) evidenceGaps.push('No verified fitness/availability source connected.');
  if (p.competition.includes('DEMO')) evidenceGaps.push('Competition strength unverified in demo mode.');

  const est = opts.estValueLakh ?? null;
  const price = opts.priceLakh ?? null;
  const valueScore = est !== null && price !== null && price > 0 ? (est / price) * 100 : null;
  const potential = opts.potential ?? null;

  let decision: RiskResult['decision'];
  if (sample < 120) decision = 'Insufficient Evidence';
  else if (valueScore !== null && valueScore < 62 && riskScore > 55) decision = 'Avoid at Current Price';
  else if (qualityScore >= 62 && riskScore <= 42) decision = 'Strong Investment';
  else if (qualityScore >= 55 && riskScore > 45) decision = 'Calculated Risk';
  else if ((potential ?? 0) >= 62) decision = 'High-Risk Opportunity';
  else decision = qualityScore >= 45 ? 'Calculated Risk' : 'Insufficient Evidence';

  const riskBand: RiskResult['riskBand'] = riskScore <= 35 ? 'Low' : riskScore <= 50 ? 'Moderate' : riskScore <= 65 ? 'Elevated' : 'High';

  return {
    playerId: p.id, name: p.name,
    riskScore: Number(riskScore.toFixed(1)), riskBand,
    qualityScore: Number(qualityScore.toFixed(1)),
    potentialScore: potential === null ? 0 : potential,
    valueScore: valueScore === null ? null : Number(valueScore.toFixed(1)),
    decision, components, evidenceGaps,
    notes: [
      'Risk measures uncertainty and fragility, not quality. A high-risk player can still be the right buy at the right price.',
      'Weights are visible and can be adjusted in the UI; the score is a weighted mean of component risks.',
      'Availability risk stays neutral without a verified source — this platform never infers fitness.',
    ],
  };
}
