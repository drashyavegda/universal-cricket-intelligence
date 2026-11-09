/**
 * Pitch, venue, weather & conditions intelligence (Feature 17).
 * Every number is labelled by evidence type: historical aggregate, current
 * observation, forecast, or model inference.
 */
import type { Match, Player, Venue, WeatherObservation } from '../types';
import { BOWLER_ROLES } from '../types';
import { buildCohort } from '../players/metrics';
import { pitchSuitability } from '../team/squad';

export type EvidenceType = 'historical' | 'observation' | 'forecast' | 'inference';

export interface LabelledValue { label: string; value: string; evidence: EvidenceType; note: string }

export function venueDNA(venue: Venue, weather?: WeatherObservation | null, matches: Match[] = []): {
  venue: Venue;
  values: LabelledValue[];
  dna: { trait: string; score: number; evidence: EvidenceType }[];
  summary: string;
} {
  const inVenue = matches.filter((m) => m.venueId === venue.id);
  const values: LabelledValue[] = [
    { label: 'Average 1st-innings score', value: `${venue.avgFirstInnings}`, evidence: 'historical', note: `Aggregate over ${venue.sampleMatches} demo fixtures.` },
    { label: 'Average 2nd-innings score', value: `${venue.avgSecondInnings}`, evidence: 'historical', note: 'Demo aggregate; chase outcomes depend on dew and target size.' },
    { label: 'Chase win share', value: `${(venue.chaseWinRate * 100).toFixed(0)}%`, evidence: 'historical', note: 'Share of matches won by the side batting second.' },
    { label: 'Pace wicket share', value: `${(venue.paceWicketShare * 100).toFixed(0)}%`, evidence: 'historical', note: 'Historical split of wickets by bowling type.' },
    { label: 'Spin wicket share', value: `${(venue.spinWicketShare * 100).toFixed(0)}%`, evidence: 'historical', note: 'Historical split of wickets by bowling type.' },
    { label: 'Boundary rate', value: `${(venue.boundaryRate * 100).toFixed(1)}% of balls`, evidence: 'historical', note: 'Fours plus sixes as a share of deliveries.' },
    { label: 'Pitch pace rating', value: `${venue.pitch.paceRating}/10`, evidence: 'observation', note: 'Current surface assessment (user-editable).' },
    { label: 'Bounce', value: `${venue.pitch.bounceRating}/10`, evidence: 'observation', note: 'Current surface assessment.' },
    { label: 'Seam movement', value: `${venue.pitch.seamRating}/10`, evidence: 'observation', note: 'Current surface assessment.' },
    { label: 'Spin assistance', value: `${venue.pitch.spinRating}/10`, evidence: 'observation', note: 'Current surface assessment.' },
    { label: 'Two-paced behaviour', value: `${venue.pitch.twoPaced}/10`, evidence: 'observation', note: 'Higher values reward hard lengths and cutters.' },
    { label: 'Deterioration', value: `${venue.pitch.deterioration}/10`, evidence: 'observation', note: 'How much the surface changes across 40 overs.' },
  ];
  if (weather) {
    values.push(
      { label: 'Temperature', value: `${weather.temperatureC}°C`, evidence: 'forecast', note: `Source: ${weather.source}` },
      { label: 'Humidity', value: `${weather.humidityPct}%`, evidence: 'forecast', note: 'High humidity raises dew probability.' },
      { label: 'Wind', value: `${weather.windKph} km/h`, evidence: 'forecast', note: 'Crosswinds affect swing and six-hitting.' },
      { label: 'Cloud cover', value: `${weather.cloudCoverPct}%`, evidence: 'forecast', note: 'Cloud cover can assist seam movement under lights.' },
      { label: 'Rain probability', value: `${weather.rainProbability}%`, evidence: 'forecast', note: 'Duckworth-Lewis-Stern may become relevant for the chasing side.' },
      { label: 'Dew expected', value: weather.dewExpected ? 'Yes' : 'No', evidence: 'forecast', note: 'Dew reduces spin grip in the second innings.' },
    );
  }
  const dna = [
    { trait: 'Pace-friendly', score: venue.pitch.paceRating * 10, evidence: 'observation' as EvidenceType },
    { trait: 'Spin-friendly', score: venue.pitch.spinRating * 10, evidence: 'observation' as EvidenceType },
    { trait: 'Batting-friendly', score: venue.pitch.battingFriendliness * 10, evidence: 'observation' as EvidenceType },
    { trait: 'Seam movement', score: venue.pitch.seamRating * 10, evidence: 'observation' as EvidenceType },
    { trait: 'Chase-favouring', score: venue.chaseWinRate * 100, evidence: 'historical' as EvidenceType },
    { trait: 'Dew influence', score: venue.dewRisk * 100, evidence: 'inference' as EvidenceType },
    { trait: 'Surface speed', score: venue.pitch.surfaceSpeed * 10, evidence: 'observation' as EvidenceType },
  ];
  const dominant = dna.slice(0, 4).sort((a, b) => b.score - a.score)[0];
  return {
    venue, values, dna,
    summary: `${venue.name}, ${venue.city}: ${dominant.trait.toLowerCase()} profile dominant. First-innings par ≈ ${venue.avgFirstInnings}; chasing sides win ${(venue.chaseWinRate * 100).toFixed(0)}% historically. Sampled fixtures in this workspace: ${inVenue.length}.`,
  };
}

export function tossStrategy(venue: Venue, weather?: WeatherObservation | null): { decision: 'bat' | 'bowl'; confidence: number; reasons: string[]; caveat: string } {
  const reasons: string[] = [];
  let bowlScore = 0; let batScore = 0;
  if (venue.chaseWinRate > 0.53) { bowlScore += 1.4; reasons.push(`Chasing sides win ${(venue.chaseWinRate * 100).toFixed(0)}% here historically.`); }
  else if (venue.chaseWinRate < 0.47) { batScore += 1.2; reasons.push(`Defending sides win ${(100 - venue.chaseWinRate * 100).toFixed(0)}% here historically.`); }
  if (weather?.dewExpected) { bowlScore += 1.6; reasons.push('Dew expected: the ball will grip less in the second innings, favouring the chase.'); }
  if (venue.pitch.deterioration > 6) { batScore += 1.3; reasons.push(`High deterioration (${venue.pitch.deterioration}/10): batting gets harder later.`); }
  if (venue.pitch.seamRating > 6 && (weather?.cloudCoverPct ?? 0) > 55) { bowlScore += 1.1; reasons.push('Seam movement plus cloud cover makes early bowling attractive.'); }
  if (venue.avgFirstInnings > 180) { bowlScore += 0.6; reasons.push('High-scoring venue: setting a target is less protective than chasing it.'); }
  const decision = bowlScore >= batScore ? 'bowl' : 'bat';
  const confidence = Math.min(0.85, 0.5 + Math.abs(bowlScore - batScore) * 0.1);
  return {
    decision, confidence: Number(confidence.toFixed(2)), reasons,
    caveat: 'Toss strategy uses historical venue aggregates plus a weather forecast. It cannot know the actual pitch report, team selection, or weather on the day.',
  };
}

export function pitchRankings(players: Player[], venue: Venue, limit = 12) {
  const cohort = buildCohort(players);
  const scored = cohort.map((r) => ({ player: r.player, ...pitchSuitability(r.player, venue), bat: r.metrics.batting.strikeRate, bowl: r.metrics.bowling.economy }))
    .sort((a, b) => b.score - a.score);
  const spinners = scored.filter((s) => s.player.bowlingType === 'Spin').slice(0, limit);
  const pacers = scored.filter((s) => s.player.bowlingType === 'Pace').slice(0, limit);
  const batters = scored.filter((s) => !BOWLER_ROLES.includes(s.player.role)).slice(0, limit);
  return { batters, spinners, pacers, venue };
}

export function compareVenues(venues: Venue[]) {
  const keys: { key: keyof Venue['pitch'] | 'chaseWinRate' | 'avgFirstInnings'; label: string }[] = [
    { key: 'avgFirstInnings', label: '1st inns avg' },
    { key: 'chaseWinRate', label: 'Chase win %' },
    { key: 'paceRating', label: 'Pace' },
    { key: 'spinRating', label: 'Spin' },
    { key: 'battingFriendliness', label: 'Batting' },
    { key: 'deterioration', label: 'Deterioration' },
    { key: 'twoPaced', label: 'Two-paced' },
  ];
  return {
    rows: venues.map((v) => ({
      venue: v.name, city: v.city,
      values: keys.map((k) => {
        const raw = k.key === 'avgFirstInnings' ? v.avgFirstInnings : k.key === 'chaseWinRate' ? v.chaseWinRate * 100 : v.pitch[k.key as keyof Venue['pitch']];
        return { key: k.key, label: k.label, value: Number(Number(raw).toFixed(1)) };
      }),
    })),
    keys: keys.map((k) => k.label),
  };
}

export function whatIfPitch(venue: Venue, adjustment: { battingFriendliness: number; paceRating: number; spinRating: number; dewRisk: number; weather?: WeatherObservation | null }) {
  const projectedFirst = Math.round(venue.avgFirstInnings + (adjustment.battingFriendliness - venue.pitch.battingFriendliness) * 4.2 + (adjustment.dewRisk - venue.dewRisk) * 1.5);
  const projectedSecond = Math.round(venue.avgSecondInnings + (adjustment.battingFriendliness - venue.pitch.battingFriendliness) * 4.0 + (adjustment.dewRisk - venue.dewRisk) * 8.5);
  const spinAdvantage = Number(((adjustment.spinRating - venue.pitch.spinRating) * 4).toFixed(1));
  const paceAdvantage = Number(((adjustment.paceRating - venue.pitch.paceRating) * 3.5).toFixed(1));
  return {
    projectedFirst, projectedSecond,
    chaseEdge: Number((projectedSecond - projectedFirst).toFixed(0)),
    spinAdvantage, paceAdvantage,
    selectionBias: spinAdvantage > paceAdvantage ? 'Add a spin-bowling option; consider an extra spinner over a fourth seamer.' : paceAdvantage > spinAdvantage ? 'Add pace cover; death-overs pace becomes more valuable.' : 'Neutral: no strong type bias from this adjustment.',
    note: 'Adjustments are a what-if model around the venue baseline, not a prediction of an actual surface.',
  };
}
