/**
 * Workload & availability intelligence (Feature 24).
 * This module never diagnoses injury or declares fitness. It quantifies load
 * patterns from match logs and flags them for human (medical) review.
 */
import type { Player } from '../types';

export interface WorkloadProfile {
  playerId: string; name: string;
  matchesLast21: number; matchesLast90: number;
  ballsBowledLast21: number; ballsBowledLast90: number;
  ballsFacedLast21: number;
  consecutiveMatches: number;
  restDaysBetweenLast: number | null;
  acuteChronicRatio: number | null;
  workloadIndex: number;
  riskIndicator: 'low' | 'watch' | 'elevated';
  flags: { label: string; detail: string; action: string }[];
  scheduleCongestion: { windowDays: number; matches: number; note: string }[];
  rotationSuggestion: string;
  availability: { status: 'unknown' | 'available' | 'managed' | 'unavailable'; note: string };
  disclaimer: string;
}

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

export function analyseWorkload(p: Player, referenceDate: string, opts: { availability?: WorkloadProfile['availability'] } = {}): WorkloadProfile {
  const ref = new Date(referenceDate);
  const sorted = [...p.matchLog].map((m) => ({ ...m, date: new Date(m.date) })).sort((a, b) => a.date.getTime() - b.date.getTime());
  const within = (days: number) => sorted.filter((m) => daysBetween(m.date, ref) <= days && daysBetween(m.date, ref) >= 0);
  const last21 = within(21); const last90 = within(90);
  const balls21 = last21.reduce((a, m) => a + m.ballsBowled, 0);
  const balls90 = last90.reduce((a, m) => a + m.ballsBowled, 0);
  const chronicWeekly = balls90 / Math.max(1, 12.86); // 90/7
  const acuteChronicRatio = chronicWeekly > 0 ? balls21 / Math.max(1, chronicWeekly * 3) : null;

  let consecutive = 0;
  for (let i = sorted.length - 1; i > 0; i--) {
    const gap = daysBetween(sorted[i - 1].date, sorted[i].date);
    if (gap <= 3) consecutive++; else break;
  }
  const restDaysBetweenLast = sorted.length >= 2 ? daysBetween(sorted[sorted.length - 2].date, sorted[sorted.length - 1].date) : null;

  const flags: WorkloadProfile['flags'] = [];
  if (acuteChronicRatio !== null && acuteChronicRatio > 1.5) flags.push({ label: 'Acute load spike', detail: `21-day bowling load is ${acuteChronicRatio.toFixed(2)}× the chronic weekly baseline — a commonly used spike threshold is 1.5.`, action: 'Discuss training and match load with the medical staff; consider resting a non-critical fixture.' });
  if (consecutive >= 5) flags.push({ label: 'Congested fixture run', detail: `${consecutive + 1} matches in short succession (<4 days apart).`, action: 'Plan a rotation window; verify with the official schedule.' });
  if (last21.length >= 7) flags.push({ label: 'High match frequency', detail: `${last21.length} matches inside 21 days.`, action: 'Check travel and recovery logistics before selection.' });
  if (balls21 > 120) flags.push({ label: 'Heavy bowling block', detail: `${balls21} balls bowled in 21 days (${(balls21 / 6).toFixed(0)} overs).`, action: 'Cap overs in the next fixture if the match situation allows.' });

  const workloadIndex = Math.min(100, Math.round(
    last21.length * 6 + balls21 * 0.18 + Math.max(0, consecutive) * 5 + (acuteChronicRatio !== null ? Math.max(0, acuteChronicRatio - 1) * 30 : 0),
  ));
  const riskIndicator: WorkloadProfile['riskIndicator'] = workloadIndex >= 70 ? 'elevated' : workloadIndex >= 45 ? 'watch' : 'low';

  const windows = [14, 21, 30].map((w) => ({ windowDays: w, matches: within(w).length, note: `Matches inside ${w} days of the reference date (${referenceDate}).` }));

  return {
    playerId: p.id, name: p.name,
    matchesLast21: last21.length, matchesLast90: last90.length,
    ballsBowledLast21: balls21, ballsBowledLast90: balls90,
    ballsFacedLast21: last21.reduce((a, m) => a + m.ballsFaced, 0),
    consecutiveMatches: consecutive,
    restDaysBetweenLast,
    acuteChronicRatio: acuteChronicRatio === null ? null : Number(acuteChronicRatio.toFixed(2)),
    workloadIndex, riskIndicator, flags,
    scheduleCongestion: windows,
    rotationSuggestion: riskIndicator === 'elevated'
      ? 'Rotate out of the next low-stakes fixture and re-assess; load indicators are a conversation starter with medical staff, not a selection verdict.'
      : riskIndicator === 'watch'
        ? 'Monitor: keep bowling volume steady and avoid adding an extra format in the same week.'
        : 'No load flag. Maintain current pattern and keep availability data current.',
    availability: opts.availability ?? { status: 'unknown', note: 'No verified availability source is connected. Status is unknown by design — this platform never infers fitness.' },
    disclaimer: 'Workload metrics are proxies from match logs in this workspace. They are not medical assessments, do not diagnose injury, and must not be used to declare a player fit or unfit.',
  };
}

export function workloadWhatIf(base: WorkloadProfile, extraMatches: number, extraOvers: number) {
  const addedBalls = Math.round(extraOvers * 6);
  const projectedIndex = Math.min(100, base.workloadIndex + extraMatches * 6 + addedBalls * 0.18);
  return {
    projectedIndex,
    delta: Number((projectedIndex - base.workloadIndex).toFixed(1)),
    projectedRisk: projectedIndex >= 70 ? 'elevated' : projectedIndex >= 45 ? 'watch' : 'low',
    note: `Adding ${extraMatches} match(es) and ${extraOvers} over(s) would move the workload index from ${base.workloadIndex} to ${projectedIndex}.`,
  };
}
