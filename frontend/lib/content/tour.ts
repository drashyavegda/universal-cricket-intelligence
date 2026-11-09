/** The 30 platform capabilities, with the honest status of each in this build. */
export type ModuleStatus = 'Live' | 'Live — needs your data' | 'Live — needs an AI key';

export interface TourModule {
  n: number;
  name: string;
  group: string;
  what: string;
  status: ModuleStatus;
}

export const TOUR_MODULES: TourModule[] = [
  { n: 1, name: 'Data ingestion', group: 'Data foundation', what: 'CSV, XLSX, JSON, PDF and text imports with type detection and a preview before anything is committed.', status: 'Live' },
  { n: 2, name: 'Column mapping', group: 'Data foundation', what: 'Map any source header to a platform field; the mapping is saved with the dataset and reused on the next import.', status: 'Live' },
  { n: 3, name: 'Validation & anomaly checks', group: 'Data foundation', what: 'Row-level errors and warnings (impossible strike rates, missing dismissals, duplicate keys) before approval.', status: 'Live' },
  { n: 4, name: 'Entity matching & merge', group: 'Data foundation', what: 'Detects likely duplicate player records and proposes merges with an audit trail rather than silently overwriting.', status: 'Live' },
  { n: 5, name: 'Data-quality scoring', group: 'Data foundation', what: 'A dataset score built from completeness, consistency and source reliability, shown wherever the data is used.', status: 'Live' },
  { n: 6, name: 'Player profiles', group: 'Player intelligence', what: 'One card per player: phase splits, rate metrics, risk, valuation bands, workload flags and provenance.', status: 'Live' },
  { n: 7, name: 'Talent discovery', group: 'Player intelligence', what: 'Age-banded searches with role filters, headroom weighting and a sensitivity check on the ranking.', status: 'Live' },
  { n: 8, name: 'Player comparison', group: 'Player intelligence', what: 'Two to eight players side by side: radar overlays, percentile tables and a replacement simulator.', status: 'Live' },
  { n: 9, name: 'Rankings', group: 'Player intelligence', what: 'Percentile-based positional rankings computed inside your workspace — explicitly not official league rankings.', status: 'Live' },
  { n: 10, name: 'Statistical workbench', group: 'Player intelligence', what: 'Descriptive statistics, regression, correlation, outlier detection, normalisation and confidence intervals.', status: 'Live' },
  { n: 11, name: 'AI narrative', group: 'Narration & reporting', what: 'Explains computed results in prose, citing the facts it was given. Never computes or invents a number.', status: 'Live — needs an AI key' },
  { n: 12, name: 'Reports', group: 'Narration & reporting', what: 'Multi-section reports with a quality gate and an explicit open-issues list.', status: 'Live' },
  { n: 13, name: 'Exports', group: 'Narration & reporting', what: 'PDF, DOCX, XLSX, PPTX, Markdown and HTML generated locally from the same saved report.', status: 'Live' },
  { n: 14, name: 'Presentation decks', group: 'Narration & reporting', what: 'A PPTX deck with a title slide, evidence slides and an appendix generated from the report sections.', status: 'Live' },
  { n: 15, name: 'Automated reports', group: 'Narration & reporting', what: 'Workflow runs that assemble report packs and record each step for review.', status: 'Live' },
  { n: 16, name: 'Auction valuation', group: 'Team & auction', what: 'Role-adjusted value ranges and bid ceilings with the assumptions printed next to the number.', status: 'Live' },
  { n: 17, name: 'Virtual auction room', group: 'Team & auction', what: 'Seeded, repeatable bidding simulations with purse scenarios and squad outcomes.', status: 'Live' },
  { n: 18, name: 'Purse planning', group: 'Team & auction', what: 'Budget allocation by role, reserve analysis and the cost of each scenario.', status: 'Live' },
  { n: 19, name: 'Team intelligence', group: 'Team & auction', what: 'Squad balance, phase coverage, structural weaknesses and priority gaps (P1–P3).', status: 'Live' },
  { n: 20, name: 'Best XI optimiser', group: 'Team & auction', what: 'Constraint-satisfying line-ups: overseas limits, keeper requirement and a 20-over bowling plan.', status: 'Live' },
  { n: 21, name: 'Match prediction', group: 'Match & conditions', what: 'Seeded Monte Carlo simulation with win probability, score bands and a forecast-quality score.', status: 'Live' },
  { n: 22, name: 'Opposition intelligence', group: 'Match & conditions', what: 'Form, key threats, dependency indicators, phase plans and head-to-head match-ups.', status: 'Live' },
  { n: 23, name: 'Pitch & venue intelligence', group: 'Match & conditions', what: 'Evidence-tagged venue DNA, toss strategy and surface what-ifs from ball-by-ball events.', status: 'Live' },
  { n: 24, name: 'Workload management', group: 'Match & conditions', what: 'Rolling load windows and acute-to-chronic ratios with rotation guidance — not medical advice.', status: 'Live' },
  { n: 25, name: 'Forecasting', group: 'Player intelligence', what: 'Career trajectory projections that return “insufficient history” rather than a fabricated curve.', status: 'Live' },
  { n: 26, name: 'Knowledge base', group: 'Operations', what: 'Chunked document library with BM25 retrieval, citations and knowledge-gap detection.', status: 'Live' },
  { n: 27, name: 'Scouting network', group: 'Operations', what: 'Region, role and age missions with a verification status on every discovery hit.', status: 'Live' },
  { n: 28, name: 'AI assistant', group: 'Operations', what: 'Natural-language questions routed to deterministic engines; write actions require explicit confirmation.', status: 'Live — needs an AI key' },
  { n: 29, name: 'Multi-agent automation', group: 'Operations', what: 'Workflow orchestration with least-privilege scopes and human approval gates.', status: 'Live' },
  { n: 30, name: 'Security & governance', group: 'Operations', what: 'Role-based permissions, audit trail, session controls, prompt-injection guard and a security posture score.', status: 'Live' },
];

export const TOUR_GROUPS = [...new Set(TOUR_MODULES.map((m) => m.group))];
