/** Metric catalogue + strategy presets shared by ranking, discovery and auction modules. */

export interface MetricDef {
  key: string;
  label: string;
  group: 'Batting' | 'Bowling' | 'Consistency' | 'Form' | 'All-round' | 'Fielding' | 'Potential' | 'Value';
  higherBetter: boolean;
  explain: string;
  unit?: string;
}

export const METRIC_DEFS: MetricDef[] = [
  { key: 'batting.average', label: 'Batting average', group: 'Batting', higherBetter: true, explain: 'Runs ÷ dismissals. Rewards surviving innings; says nothing about speed.' },
  { key: 'batting.strikeRate', label: 'Strike rate', group: 'Batting', higherBetter: true, explain: 'Runs per 100 balls. Measures scoring speed, not survival.' },
  { key: 'batting.boundaryPct', label: 'Boundary % of balls', group: 'Batting', higherBetter: true, explain: 'Share of balls hit for four or six. Proxy for power hitting.' },
  { key: 'batting.runsPerInnings', label: 'Runs per innings', group: 'Batting', higherBetter: true, explain: 'Total runs ÷ innings. Blends volume and opportunity.' },
  { key: 'batting.conversionRate', label: 'Conversion rate (50s+ per innings)', group: 'Batting', higherBetter: true, explain: 'How often a start becomes a fifty or hundred.' },
  { key: 'phase.powerplaySR', label: 'Powerplay strike rate', group: 'Batting', higherBetter: true, explain: 'Strike rate in overs 1–6. Fielding restrictions reward intent.' },
  { key: 'phase.deathSR', label: 'Death-overs strike rate', group: 'Batting', higherBetter: true, explain: 'Strike rate in overs 16–20 from phase-split data.' },
  { key: 'bowling.economy', label: 'Economy', group: 'Bowling', higherBetter: false, explain: 'Runs conceded per over. Lower is better.' },
  { key: 'bowling.average', label: 'Bowling average', group: 'Bowling', higherBetter: false, explain: 'Runs conceded per wicket. Lower is better.' },
  { key: 'bowling.strikeRate', label: 'Bowling strike rate', group: 'Bowling', higherBetter: false, explain: 'Balls per wicket. Lower is better.' },
  { key: 'bowling.dotBallPct', label: 'Dot-ball %', group: 'Bowling', higherBetter: true, explain: 'Only computed when ball-by-ball data exists; null otherwise.' },
  { key: 'phase.deathEcon', label: 'Death-overs economy', group: 'Bowling', higherBetter: false, explain: 'Economy in overs 16–20.' },
  { key: 'phase.powerplayEcon', label: 'Powerplay economy', group: 'Bowling', higherBetter: false, explain: 'Economy in overs 1–6.' },
  { key: 'consistency.floorRate', label: 'Floor rate (% innings ≥ 20)', group: 'Consistency', higherBetter: true, explain: 'Share of recent innings reaching 20 runs. A floor, not a ceiling.' },
  { key: 'consistency.cv', label: 'Volatility (CV of runs)', group: 'Consistency', higherBetter: false, explain: 'Standard deviation ÷ mean of recent innings scores. Lower is steadier.' },
  { key: 'form.formIndex', label: 'Recent form index', group: 'Form', higherBetter: true, explain: 'Blend of last-5 innings runs and strike rate, capped at 100.' },
  { key: 'allRounderIndex', label: 'All-rounder index', group: 'All-round', higherBetter: true, explain: 'Composite of batting impact and bowling wicket-taking + economy (0–100).' },
  { key: 'fielding.catchesPerMatch', label: 'Catches per match', group: 'Fielding', higherBetter: true, explain: 'Catches ÷ matches. Fielding data quality varies by source.' },
];

export const METRIC_BY_KEY: Record<string, MetricDef> = Object.fromEntries(METRIC_DEFS.map((m) => [m.key, m]));

export interface StrategyPreset {
  key: string;
  label: string;
  blurb: string;
  roles: string[];
  weights: Record<string, number>;
  ageWeight?: number;
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    key: 'young_talented_batter', label: 'Young talented batter', blurb: 'Rewards scoring speed and average with a youth headroom multiplier; penalises thin samples.',
    roles: ['Opener', 'Top-order Batter', 'Middle-order Batter', 'Finisher', 'Wicketkeeper-Batter'],
    weights: { 'batting.average': 1.3, 'batting.strikeRate': 1.5, 'batting.runsPerInnings': 1.1, 'consistency.floorRate': 1.0, 'form.formIndex': 0.6 },
    ageWeight: 0.9,
  },
  {
    key: 'high_strike_rate_batter', label: 'High strike-rate batter', blurb: 'Pure scoring speed, weighted by boundary share of balls.',
    roles: ['Opener', 'Top-order Batter', 'Middle-order Batter', 'Finisher', 'Wicketkeeper-Batter'],
    weights: { 'batting.strikeRate': 2.0, 'batting.boundaryPct': 1.4, 'phase.deathSR': 0.8, 'batting.runsPerInnings': 0.5 },
  },
  {
    key: 'consistent_batter', label: 'Consistent batter', blurb: 'Floor over ceiling: average, conversion and low volatility dominate.',
    roles: ['Opener', 'Top-order Batter', 'Middle-order Batter', 'Wicketkeeper-Batter'],
    weights: { 'batting.average': 2.0, 'batting.conversionRate': 1.2, 'consistency.floorRate': 1.5, 'consistency.cv': 0.8, 'batting.strikeRate': 0.5 },
  },
  {
    key: 'power_hitter', label: 'Power hitter / finisher', blurb: 'Death-overs impact and boundary frequency; tolerates a lower average.',
    roles: ['Finisher', 'Middle-order Batter', 'Pace All-rounder', 'All-rounder'],
    weights: { 'phase.deathSR': 2.0, 'batting.boundaryPct': 1.6, 'batting.strikeRate': 1.2, 'consistency.floorRate': 0.5 },
  },
  {
    key: 'economical_bowler', label: 'Economical bowler', blurb: 'Run suppression first, with phase-specific economy rewarded.',
    roles: ['Pace Bowler', 'Spin Bowler', 'Pace All-rounder', 'Spin All-rounder'],
    weights: { 'bowling.economy': 2.0, 'phase.deathEcon': 0.9, 'phase.powerplayEcon': 0.7, 'bowling.dotBallPct': 0.8, 'bowling.strikeRate': 0.4 },
  },
  {
    key: 'wicket_taking_bowler', label: 'Wicket-taking bowler', blurb: 'Strike rate and average carry the weight; economy used as a sanity check.',
    roles: ['Pace Bowler', 'Spin Bowler', 'Pace All-rounder', 'Spin All-rounder'],
    weights: { 'bowling.strikeRate': 2.0, 'bowling.average': 1.6, 'phase.deathEcon': 0.6, 'bowling.economy': 0.6 },
  },
  {
    key: 'death_specialist', label: 'Death-over specialist', blurb: 'Bowlers whose death-phase economy and wicket rate stand out.',
    roles: ['Pace Bowler', 'Spin Bowler'],
    weights: { 'phase.deathEcon': 2.2, 'bowling.economy': 1.0, 'bowling.strikeRate': 0.9, 'bowling.dotBallPct': 0.7 },
  },
  {
    key: 'all_rounder', label: 'All-rounder', blurb: 'Two-way contribution via the all-rounder index, then verified in raw components.',
    roles: ['All-rounder', 'Pace All-rounder', 'Spin All-rounder'],
    weights: { allRounderIndex: 2.0, 'batting.strikeRate': 0.8, 'bowling.economy': 0.8, 'bowling.strikeRate': 0.6, 'batting.average': 0.6 },
  },
  {
    key: 'balanced_t20', label: 'Balanced T20 profile', blurb: 'Default scouting blend: performance, phase impact, consistency and form.',
    roles: [],
    weights: { 'batting.strikeRate': 1.2, 'batting.average': 1.0, 'bowling.economy': 0.9, 'bowling.strikeRate': 0.8, 'consistency.floorRate': 0.7, 'form.formIndex': 0.5, allRounderIndex: 0.6 },
  },
];

/** Age headroom curve: peak value at 18 declining to 0 by 30. Explicit and adjustable. */
export function ageHeadroom(age: number | null): number {
  if (age === null) return 0.5;
  if (age <= 19) return 1;
  if (age >= 31) return 0;
  return Math.max(0, 1 - (age - 19) / 12);
}

export function presetByKey(key: string): StrategyPreset | undefined {
  return STRATEGY_PRESETS.find((p) => p.key === key);
}
