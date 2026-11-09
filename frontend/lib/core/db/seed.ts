/**
 * Synthetic DEMO dataset generator.
 *
 * IMPORTANT: every player, statistic, match and auction price produced here is
 * FABRICATED for demonstration. Names are generated from name pools and do not
 * represent real cricketers. Records carry `synthetic: true` and the UI labels
 * them DEMO DATA. Real competition data must be uploaded by the user.
 */
import { mulberry32, normal, randInt, pick, type Rand } from '../rng';
import type {
  AuctionRecord, BattingStats, BowlingStats, Dataset, DatasetRecord, KnowledgeDoc, Match, MatchPerf,
  Player, PlayerRole, SeasonStat, SourceRecord, Team, Venue, WeatherObservation, Format, PhaseSplit,
  Testimonial,
} from '../types';

const FIRST = ['Aarav','Vihaan','Ishaan','Kabir','Reyansh','Ayaan','Advik','Dhruv','Arjun','Krish','Nehan','Yuvraj','Rudra','Vedant','Om','Shaurya','Parth','Harsh','Nakul','Manav','Rishabh','Tanish','Devansh','Jatin','Kunal','Nikhil','Pranav','Rohan','Sarthak','Tanmay','Utkarsh','Varun','Yash','Zaid','Ansh','Bhavya','Chirag','Daksh','Eshan','Gaurav','Hitesh','Jignesh','Ketan','Lakshya','Mihir','Nirav','Parthiv','Rajveer','Sahil','Tejas','Uday','Vivaan','Yashwant','Abhinav','Bhargav','Chinmay','Darshan','Eklavya','Faisal','Girish'];
const LAST = ['Deshmukh','Iyer','Rathore','Chauhan','Patel','Sharma','Nair','Menon','Kulkarni','Joshi','Bhatt','Solanki','Vaghela','Chaudhary','Parmar','Gohil','Jadeja','Thakur','Yadav','Kumar','Reddy','Rao','Naik','Shetty','Pillai','Gupta','Agarwal','Bansal','Mishra','Tiwari','Dubey','Pandey','Shukla','Sethi','Kapoor','Malhotra','Sandhu','Gill','Sidhu','Bhatia','Desai','Mehta','Shah','Trivedi','Upadhyay','Varma','Wagh','Zope','Ahmed','Khan','Sheikh','Ansari','Das','Ghosh','Bose','Sen','Mukherjee','Chatterjee','Hegde','Kamath'];
const STATES = ['Gujarat','Mumbai','Delhi','Karnataka','Tamil Nadu','Bengal','Punjab','Rajasthan','Vidarbha','Saurashtra','Kerala','Hyderabad','Uttar Pradesh','Madhya Pradesh','Maharashtra','Baroda','Andhra','Odisha','Assam','Jharkhand'];
const OVERSEAS_NATIONS = ['Australia','England','South Africa','New Zealand','West Indies','Sri Lanka','Afghanistan','Bangladesh','Ireland','Netherlands'];

const ROLE_PLAN: { role: PlayerRole; weight: number }[] = [
  { role: 'Opener', weight: 16 }, { role: 'Top-order Batter', weight: 12 }, { role: 'Middle-order Batter', weight: 14 },
  { role: 'Finisher', weight: 10 }, { role: 'Wicketkeeper-Batter', weight: 8 }, { role: 'Pace Bowler', weight: 16 },
  { role: 'Spin Bowler', weight: 12 }, { role: 'Pace All-rounder', weight: 6 }, { role: 'Spin All-rounder', weight: 4 },
  { role: 'All-rounder', weight: 2 },
];

const VENUE_SEED: Omit<Venue, 'id'>[] = [
  { name: 'Narendra Modi Stadium', city: 'Ahmedabad', country: 'India', avgFirstInnings: 172, avgSecondInnings: 158, paceWicketShare: 0.56, spinWicketShare: 0.44, boundaryRate: 0.152, paceBias: 0.12, dewRisk: 0.55, chaseWinRate: 0.48, sampleMatches: 42, pitch: { paceRating: 6.2, bounceRating: 5.8, seamRating: 5.1, spinRating: 6.4, battingFriendliness: 7.1, surfaceSpeed: 6.3, twoPaced: 3.4, deterioration: 4.2 } },
  { name: 'Wankhede Stadium', city: 'Mumbai', country: 'India', avgFirstInnings: 178, avgSecondInnings: 168, paceWicketShare: 0.58, spinWicketShare: 0.42, boundaryRate: 0.164, paceBias: 0.22, dewRisk: 0.72, chaseWinRate: 0.55, sampleMatches: 51, pitch: { paceRating: 7.1, bounceRating: 7.0, seamRating: 5.6, spinRating: 5.2, battingFriendliness: 7.8, surfaceSpeed: 7.4, twoPaced: 2.8, deterioration: 3.5 } },
  { name: 'M. A. Chidambaram Stadium', city: 'Chennai', country: 'India', avgFirstInnings: 164, avgSecondInnings: 151, paceWicketShare: 0.38, spinWicketShare: 0.62, boundaryRate: 0.132, paceBias: -0.42, dewRisk: 0.61, chaseWinRate: 0.52, sampleMatches: 48, pitch: { paceRating: 4.4, bounceRating: 4.8, seamRating: 4.2, spinRating: 8.4, battingFriendliness: 5.4, surfaceSpeed: 4.6, twoPaced: 6.1, deterioration: 7.2 } },
  { name: 'Arun Jaitley Stadium', city: 'Delhi', country: 'India', avgFirstInnings: 176, avgSecondInnings: 163, paceWicketShare: 0.61, spinWicketShare: 0.39, boundaryRate: 0.158, paceBias: 0.18, dewRisk: 0.66, chaseWinRate: 0.51, sampleMatches: 39, pitch: { paceRating: 6.8, bounceRating: 6.5, seamRating: 5.9, spinRating: 4.9, battingFriendliness: 7.3, surfaceSpeed: 6.9, twoPaced: 3.1, deterioration: 4.0 } },
  { name: 'M. Chinnaswamy Stadium', city: 'Bengaluru', country: 'India', avgFirstInnings: 186, avgSecondInnings: 172, paceWicketShare: 0.63, spinWicketShare: 0.37, boundaryRate: 0.181, paceBias: 0.28, dewRisk: 0.58, chaseWinRate: 0.57, sampleMatches: 46, pitch: { paceRating: 7.4, bounceRating: 7.2, seamRating: 5.4, spinRating: 4.2, battingFriendliness: 8.6, surfaceSpeed: 7.8, twoPaced: 2.2, deterioration: 3.0 } },
  { name: 'Eden Gardens', city: 'Kolkata', country: 'India', avgFirstInnings: 175, avgSecondInnings: 165, paceWicketShare: 0.55, spinWicketShare: 0.45, boundaryRate: 0.155, paceBias: 0.05, dewRisk: 0.78, chaseWinRate: 0.56, sampleMatches: 45, pitch: { paceRating: 6.4, bounceRating: 6.0, seamRating: 5.7, spinRating: 5.9, battingFriendliness: 7.0, surfaceSpeed: 6.5, twoPaced: 3.6, deterioration: 5.1 } },
  { name: 'Rajiv Gandhi International Stadium', city: 'Hyderabad', country: 'India', avgFirstInnings: 183, avgSecondInnings: 170, paceWicketShare: 0.52, spinWicketShare: 0.48, boundaryRate: 0.168, paceBias: 0.02, dewRisk: 0.63, chaseWinRate: 0.53, sampleMatches: 33, pitch: { paceRating: 6.6, bounceRating: 6.7, seamRating: 4.8, spinRating: 5.6, battingFriendliness: 7.9, surfaceSpeed: 7.0, twoPaced: 2.9, deterioration: 3.9 } },
  { name: 'Maharaja Yadavindra Singh Stadium', city: 'Mohali', country: 'India', avgFirstInnings: 179, avgSecondInnings: 166, paceWicketShare: 0.6, spinWicketShare: 0.4, boundaryRate: 0.162, paceBias: 0.2, dewRisk: 0.5, chaseWinRate: 0.49, sampleMatches: 28, pitch: { paceRating: 7.0, bounceRating: 7.1, seamRating: 5.2, spinRating: 4.8, battingFriendliness: 7.6, surfaceSpeed: 7.2, twoPaced: 2.6, deterioration: 3.4 } },
  { name: 'Sawai Mansingh Stadium', city: 'Jaipur', country: 'India', avgFirstInnings: 170, avgSecondInnings: 157, paceWicketShare: 0.49, spinWicketShare: 0.51, boundaryRate: 0.146, paceBias: -0.08, dewRisk: 0.44, chaseWinRate: 0.5, sampleMatches: 36, pitch: { paceRating: 5.6, bounceRating: 5.4, seamRating: 4.6, spinRating: 6.6, battingFriendliness: 6.6, surfaceSpeed: 5.9, twoPaced: 4.4, deterioration: 5.7 } },
  { name: 'Ekana Cricket Stadium', city: 'Lucknow', country: 'India', avgFirstInnings: 166, avgSecondInnings: 154, paceWicketShare: 0.53, spinWicketShare: 0.47, boundaryRate: 0.139, paceBias: 0.0, dewRisk: 0.47, chaseWinRate: 0.47, sampleMatches: 22, pitch: { paceRating: 5.9, bounceRating: 5.3, seamRating: 5.4, spinRating: 6.2, battingFriendliness: 6.1, surfaceSpeed: 5.7, twoPaced: 5.0, deterioration: 6.0 } },
  { name: 'PCA Stadium, Mullanpur', city: 'New Chandigarh', country: 'India', avgFirstInnings: 168, avgSecondInnings: 156, paceWicketShare: 0.57, spinWicketShare: 0.43, boundaryRate: 0.148, paceBias: 0.1, dewRisk: 0.42, chaseWinRate: 0.5, sampleMatches: 18, pitch: { paceRating: 6.5, bounceRating: 6.2, seamRating: 5.5, spinRating: 5.4, battingFriendliness: 6.8, surfaceSpeed: 6.4, twoPaced: 3.8, deterioration: 4.8 } },
  { name: 'ACA-VDCA Stadium', city: 'Visakhapatnam', country: 'India', avgFirstInnings: 173, avgSecondInnings: 161, paceWicketShare: 0.5, spinWicketShare: 0.5, boundaryRate: 0.151, paceBias: 0.04, dewRisk: 0.69, chaseWinRate: 0.54, sampleMatches: 26, pitch: { paceRating: 6.0, bounceRating: 5.9, seamRating: 4.9, spinRating: 6.0, battingFriendliness: 7.2, surfaceSpeed: 6.1, twoPaced: 3.3, deterioration: 4.6 } },
];

const TEAM_SEED = [
  { name: 'Rajasthan Royals', shortName: 'RR', isUserTeam: true, colours: '#E8C15C' },
  { name: 'Mumbai Indians', shortName: 'MI', isUserTeam: false, colours: '#3B82F6' },
  { name: 'Chennai Super Kings', shortName: 'CSK', isUserTeam: false, colours: '#FACC15' },
  { name: 'Royal Challengers Bengaluru', shortName: 'RCB', isUserTeam: false, colours: '#EF4444' },
  { name: 'Kolkata Knight Riders', shortName: 'KKR', isUserTeam: false, colours: '#8B5CF6' },
  { name: 'Delhi Capitals', shortName: 'DC', isUserTeam: false, colours: '#0EA5E9' },
  { name: 'Punjab Kings', shortName: 'PBKS', isUserTeam: false, colours: '#F43F5E' },
  { name: 'Sunrisers Hyderabad', shortName: 'SRH', isUserTeam: false, colours: '#FB923C' },
  { name: 'Gujarat Titans', shortName: 'GT', isUserTeam: false, colours: '#14B8A6' },
  { name: 'Lucknow Super Giants', shortName: 'LSG', isUserTeam: false, colours: '#22D3EE' },
];

const COMPETITION = 'IPL 2027 (DEMO)';
const REFERENCE_SEASON = '2026/27';

function makeId(prefix: string, n: number) {
  return `${prefix}_${String(n).padStart(4, '0')}`;
}

function dobFromAge(rand: Rand, age: number, referenceDate: string): string {
  const ref = new Date(referenceDate);
  const year = ref.getUTCFullYear() - age;
  const month = randInt(rand, 0, 11);
  const day = randInt(rand, 1, 28);
  const d = new Date(Date.UTC(year, month, day));
  // keep player strictly older than "age" at reference date
  if (d > new Date(Date.UTC(ref.getUTCFullYear() - age, ref.getUTCMonth(), ref.getUTCDate()))) {
    d.setUTCFullYear(d.getUTCFullYear() - 1);
  }
  return d.toISOString().slice(0, 10);
}

function phaseFor(rand: Rand, style: 'anchor' | 'aggressor' | 'balanced', balls: number, sr: number, dismissals: number): PhaseSplit {
  const weights = style === 'aggressor' ? [0.24, 0.4, 0.36] : style === 'anchor' ? [0.36, 0.46, 0.18] : [0.3, 0.44, 0.26];
  const mult = style === 'aggressor' ? [0.92, 1.0, 1.28] : style === 'anchor' ? [0.95, 1.02, 0.98] : [1, 1, 1.05];
  const mk = (i: number): { balls: number; runs: number; wickets: number; dismissals: number } => {
    const b = Math.max(0, Math.round(balls * weights[i] * (0.9 + rand() * 0.2)));
    return {
      balls: b,
      runs: Math.round((b * sr / 100) * mult[i] * (0.92 + rand() * 0.16)),
      wickets: 0,
      dismissals: Math.max(0, Math.round(dismissals * weights[i])),
    };
  };
  return { powerplay: mk(0), middle: mk(1), death: mk(2) };
}

function bowlingPhaseFor(rand: Rand, balls: number, econ: number, wickets: number, type: 'Pace' | 'Spin'): PhaseSplit {
  const weights = type === 'Pace' ? [0.3, 0.35, 0.35] : [0.14, 0.66, 0.2];
  const mult = type === 'Pace' ? [0.95, 1.0, 1.06] : [0.92, 0.94, 1.16];
  const mk = (i: number) => {
    const b = Math.max(0, Math.round(balls * weights[i] * (0.92 + rand() * 0.16)));
    const runs = Math.round((b / 6) * econ * mult[i] * (0.92 + rand() * 0.16));
    return { balls: b, runs, wickets: Math.round(wickets * weights[i]), dismissals: 0 };
  };
  return { powerplay: mk(0), middle: mk(1), death: mk(2) };
}

export function generatePlayers(count = 190, seed = 20270401, referenceDate = '2027-04-01'): Player[] {
  const rand = mulberry32(seed);
  const players: Player[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < count; i++) {
    let name = '';
    let guard = 0;
    do {
      const first = pick(rand, FIRST);
      const last = pick(rand, LAST);
      const initial = rand() < 0.18 ? ` ${String.fromCharCode(65 + randInt(rand, 0, 25))}.` : '';
      name = `${first}${initial} ${last}`;
      guard++;
    } while (usedNames.has(name) && guard < 60);
    usedNames.add(name);

    const overseas = i >= count - 38;
    const capped = !overseas && i >= count - 60 && i < count - 38;
    const age = overseas ? randInt(rand, 21, 34) : capped ? randInt(rand, 23, 34) : randInt(rand, 16, 27);
    const missingDob = !capped && !overseas && rand() < 0.06;
    const dob = missingDob ? null : dobFromAge(rand, age, referenceDate);

    const roleWeights = ROLE_PLAN.map((r) => r.weight);
    let role: PlayerRole;
    const roll = rand();
    let acc = 0;
    role = 'Middle-order Batter';
    const total = roleWeights.reduce((a, b) => a + b, 0);
    for (let k = 0; k < ROLE_PLAN.length; k++) {
      acc += roleWeights[k] / total;
      if (roll <= acc) { role = ROLE_PLAN[k].role; break; }
    }
    const isBowler = role.includes('Bowler');
    const isAllRounder = role.includes('All-rounder');
    const bowlingType: 'Pace' | 'Spin' | 'None' = isBowler || isAllRounder
      ? role.includes('Spin') ? 'Spin' : role.includes('Pace') ? 'Pace' : rand() < 0.5 ? 'Pace' : 'Spin'
      : rand() < 0.12 ? (rand() < 0.5 ? 'Pace' : 'Spin') : 'None';

    const batSkill = isBowler ? 0.18 + rand() * 0.34 : isAllRounder ? 0.45 + rand() * 0.4 : 0.4 + rand() * 0.6;
    const bowlSkill = isBowler ? 0.42 + rand() * 0.58 : isAllRounder ? 0.45 + rand() * 0.45 : bowlingType === 'None' ? rand() * 0.2 : rand() * 0.35;
    const experience = Math.max(1, Math.round((age - 16) * (1.2 + rand() * 1.6)));
    const matches = Math.max(4, Math.round(experience * (0.6 + rand() * 0.9)));
    const innings = Math.max(2, Math.round(matches * (isBowler ? 0.45 : 0.88)));
    const notOuts = Math.round(innings * (isBowler ? 0.3 : 0.16));
    const dismissals = Math.max(1, innings - notOuts);
    const style = role === 'Finisher' ? 'aggressor' : role === 'Opener' || role === 'Top-order Batter' ? 'anchor' : 'balanced';
    const sr = Math.max(72, Math.min(190, (style === 'aggressor' ? 118 : style === 'anchor' ? 112 : 114) + batSkill * 46 + normal(rand, 0, 8)));
    const avg = Math.max(6, Math.min(58, 11 + batSkill * 30 + normal(rand, 0, 4)));
    const runs = Math.round(dismissals * avg + notOuts * 3);
    const balls = Math.max(1, Math.round(runs / (sr / 100)));
    const fours = Math.round(balls * (0.09 + batSkill * 0.07));
    const sixes = Math.round(balls * (0.03 + batSkill * 0.055));
    const fifties = Math.max(0, Math.floor((runs / Math.max(1, innings)) / 28));
    const hundreds = innings > 25 && batSkill > 0.78 ? randInt(rand, 0, 2) : 0;
    const highScore = Math.min(140, Math.round(avg * 1.6 + randInt(rand, 12, 55)));

    const bowlingStats: BowlingStats = {
      matches: Math.round(matches * (bowlSkill > 0.25 ? 0.9 : 0.4)),
      innings: Math.round(matches * (bowlSkill > 0.25 ? 0.85 : 0.3)),
      balls: 0, runsConceded: 0, wickets: 0,
      maidens: 0,
      bestWickets: Math.min(6, 2 + Math.round(bowlSkill * 3)),
      bestRuns: randInt(rand, 8, 34),
    };
    bowlingStats.innings = Math.max(1, bowlingStats.innings);
    bowlingStats.balls = Math.round(bowlingStats.innings * (bowlSkill > 0.4 ? 21 : 13) * (0.85 + rand() * 0.3));
    const econ = Math.max(5.4, Math.min(12.5, 10.8 - bowlSkill * 4.3 + normal(rand, 0, 0.6)));
    bowlingStats.runsConceded = Math.round((bowlingStats.balls / 6) * econ);
    const bowlSr = Math.max(9, 42 - bowlSkill * 26 + normal(rand, 0, 3));
    bowlingStats.wickets = Math.max(0, Math.round(bowlingStats.balls / bowlSr));
    bowlingStats.maidens = bowlingType === 'Pace' ? Math.round(bowlingStats.innings * 0.05) : Math.round(bowlingStats.innings * 0.03);
    if (bowlSkill < 0.15) { bowlingStats.balls = 0; bowlingStats.wickets = 0; bowlingStats.runsConceded = 0; bowlingStats.innings = 0; bowlingStats.matches = 0; }

    const batting: BattingStats = {
      matches, innings, notOuts, runs, balls, fours, sixes, fifties, hundreds, highScore, dismissals,
    };
    const fielding = {
      catches: Math.round(matches * (0.12 + rand() * 0.4)),
      runOuts: Math.round(matches * (0.03 + rand() * 0.12)),
      stumpings: role === 'Wicketkeeper-Batter' ? Math.round(matches * (0.25 + rand() * 0.5)) : 0,
    };

    const matchLog: MatchPerf[] = [];
    const logCount = Math.min(12, Math.max(4, innings));
    for (let m = 0; m < logCount; m++) {
      const bf = Math.max(0, Math.round(normal(rand, balls / Math.max(1, innings), 10)));
      const r = Math.max(0, Math.round(bf * (sr / 100) * (0.7 + rand() * 0.7)));
      const bw = bowlSkill > 0.3 ? randInt(rand, 12, 24) : 0;
      matchLog.push({
        matchId: `${REFERENCE_SEASON}-M${m + 1}`,
        date: new Date(Date.UTC(2026, 0 + m, 4 + randInt(rand, 0, 20))).toISOString().slice(0, 10),
        opponent: pick(rand, STATES),
        venue: pick(rand, VENUE_SEED).city,
        format: 'T20' as Format,
        runs: r,
        ballsFaced: bf,
        notOut: rand() < 0.2,
        wickets: bw ? Math.round(rand() * 2.4) : 0,
        ballsBowled: bw,
        runsConceded: bw ? Math.round((bw / 6) * econ * (0.7 + rand() * 0.7)) : 0,
        catches: rand() < 0.25 ? 1 : 0,
      });
    }

    const career: SeasonStat[] = [];
    const seasonsCount = Math.max(1, Math.min(5, Math.round((age - 16) / 2)));
    for (let s = 0; s < seasonsCount; s++) {
      const seasonAge = Math.max(16, age - (seasonsCount - 1 - s));
      const growth = 0.82 + (s / Math.max(1, seasonsCount - 1)) * 0.36 + (26 - Math.min(26, seasonAge)) * 0.004;
      const sm = Math.max(3, Math.round(matches / seasonsCount * (0.85 + rand() * 0.3)));
      const si = Math.max(2, Math.round(sm * 0.85));
      const sRuns = Math.round((runs / seasonsCount) * growth * (0.85 + rand() * 0.3));
      const sBalls = Math.max(1, Math.round(sRuns / (sr / 100)));
      const sBowlBalls = bowlingStats.balls ? Math.round((bowlingStats.balls / seasonsCount) * growth * (0.85 + rand() * 0.3)) : 0;
      const sRunsConc = sBowlBalls ? Math.round((sBowlBalls / 6) * econ * (0.9 + rand() * 0.2)) : 0;
      career.push({
        season: `${2022 + s}/${String((2023 + s) % 100).padStart(2, '0')}`,
        competition: overseas ? 'Global T20 League (DEMO)' : 'Domestic T20 Cup (DEMO)',
        age: seasonAge,
        matches: sm,
        runs: sRuns,
        balls: sBalls,
        innings: si,
        notOuts: Math.max(0, Math.round(notOuts / seasonsCount)),
        wickets: sBowlBalls ? Math.round(bowlingStats.wickets / seasonsCount) : 0,
        ballsBowled: sBowlBalls,
        runsConceded: sRunsConc,
        economy: sBowlBalls ? Number(((sRunsConc / sBowlBalls) * 6).toFixed(2)) : 0,
        strikeRate: Number(((sRuns / Math.max(1, sBalls)) * 100).toFixed(1)),
      });
    }

    const confidence = Math.min(0.98, 0.42 + Math.min(0.4, innings / 70) + (dob ? 0.1 : 0) + (bowlingStats.innings > 12 ? 0.06 : 0));

    players.push({
      id: makeId(overseas ? 'plo' : capped ? 'plc' : 'pl', i + 1),
      name,
      dob,
      age: dob ? age : null,
      team: overseas ? pick(rand, OVERSEAS_NATIONS) : pick(rand, STATES),
      state: overseas ? pick(rand, OVERSEAS_NATIONS) : pick(rand, STATES),
      competition: overseas ? 'Global T20 League (DEMO)' : COMPETITION,
      season: REFERENCE_SEASON,
      format: 'T20',
      role,
      battingStyle: rand() < 0.27 ? 'Left-hand bat' : 'Right-hand bat',
      bowlingType,
      capped,
      overseas,
      wicketkeeper: role === 'Wicketkeeper-Batter',
      batting,
      bowling: bowlingStats,
      fielding,
      phaseBatting: phaseFor(rand, style as 'anchor' | 'aggressor' | 'balanced', balls, sr, dismissals),
      phaseBowling: bowlSkill > 0.2 ? bowlingPhaseFor(rand, bowlingStats.balls, econ, bowlingStats.wickets, bowlingType === 'Spin' ? 'Spin' : 'Pace') : bowlingPhaseFor(rand, 0, econ, 0, 'Pace'),
      matchLog,
      career,
      confidence,
      synthetic: true,
      sources: [{
        sourceId: 'src_demo',
        sourceName: 'Synthetic demo generator',
        field: '*',
        value: 'generated',
        kind: 'demo',
        fetchedAt: new Date(referenceDate).toISOString(),
        reliability: 1,
      }],
    });
  }
  return players;
}

export function generateVenues(): Venue[] {
  return VENUE_SEED.map((v, i) => ({ ...v, id: `ven_${String(i + 1).padStart(2, '0')}` }));
}

export function generateTeams(players: Player[]): Team[] {
  const rand = mulberry32(777);
  const domestic = players.filter((p) => !p.overseas);
  const overseas = players.filter((p) => p.overseas);
  return TEAM_SEED.map((t, i) => {
    const squadSize = i === 0 ? 18 : 20;
    const osmall = Math.min(8, Math.round(squadSize * 0.4));
    const squad: string[] = [];
    for (let k = 0; k < squadSize - osmall; k++) {
      const candidate = domestic[(i * 13 + k * 7) % domestic.length];
      if (candidate && !squad.includes(candidate.id)) squad.push(candidate.id);
    }
    for (let k = 0; k < osmall; k++) {
      const candidate = overseas[(i * 3 + k) % overseas.length];
      if (candidate && !squad.includes(candidate.id)) squad.push(candidate.id);
    }
    return {
      id: `tm_${String(i + 1).padStart(2, '0')}`,
      name: t.name,
      shortName: t.shortName,
      competition: COMPETITION,
      isUserTeam: t.isUserTeam,
      purseLakh: 12000,
      squadIds: squad,
      overseasLimit: 8,
      maxSquadSize: 25,
      colours: t.colours,
    };
  });
}

export function generateMatches(players: Player[], venues: Venue[], teams: Team[]): Match[] {
  const rand = mulberry32(4242);
  const matches: Match[] = [];
  for (let i = 0; i < 12; i++) {
    const home = teams[i % teams.length];
    const away = teams[(i + 3) % teams.length];
    const venue = venues[i % venues.length];
    const homeSquad = home.squadIds.slice(0, 11).map((id) => players.find((p) => p.id === id)!).filter(Boolean);
    const awaySquad = away.squadIds.slice(0, 11).map((id) => players.find((p) => p.id === id)!).filter(Boolean);
    if (homeSquad.length < 8 || awaySquad.length < 8) continue;
    const events: Match['events'] = [];
    const scorecard: Match['scorecard'] = [];
    const buildInnings = (batting: Player[], bowling: Player[], innings: 1 | 2) => {
      let runs = 0; let wickets = 0;
      const batTotals = new Map<string, { runs: number; balls: number }>();
      const bowlTotals = new Map<string, { wickets: number; balls: number; runs: number }>();
      batting.forEach((p) => batTotals.set(p.id, { runs: 0, balls: 0 }));
      bowling.forEach((p) => bowlTotals.set(p.id, { wickets: 0, balls: 0, runs: 0 }));
      const bowlers = bowling.slice(0, 6);
      for (let ball = 0; ball < 120; ball++) {
        if (wickets >= 10) break;
        const over = Math.floor(ball / 6);
        const bowler = bowlers[over % bowlers.length];
        const batIdx = Math.min(batting.length - 1, Math.floor(ball / 18));
        const batter = batting[batIdx];
        if (!batter) break;
        const phase = over < 6 ? 'pp' : over < 15 ? 'mid' : 'death';
        const aggression = phase === 'pp' ? 1.08 : phase === 'mid' ? 0.92 : 1.42;
        const batSkill = batter.batting.balls ? batter.batting.runs / batter.batting.balls : 1;
        const roll = rand();
        const wicketP = (0.045 + (phase === 'death' ? 0.02 : 0)) * (bowler.bowling.wickets && bowler.bowling.balls ? Math.min(1.6, 0.7 + bowler.bowling.wickets / Math.max(1, bowler.bowling.balls) * 12) : 1);
        let r = 0;
        if (roll < wicketP) {
          wickets++;
          const bt = batTotals.get(batter.id)!; bt.balls++;
          const wt = bowlTotals.get(bowler.id)!; wt.wickets++; wt.balls++;
          events.push({ matchId: '', innings, over, ball: ball % 6, batterId: batter.id, bowlerId: bowler.id, runs: 0, isWicket: true, isBoundary: false });
          continue;
        }
        const rRoll = rand();
        r = rRoll < 0.36 ? 0 : rRoll < 0.62 ? 1 : rRoll < 0.74 ? 2 : rRoll < 0.8 ? 3 : rRoll < 0.94 ? 4 : 6;
        r = Math.round(r * aggression * Math.min(1.5, 0.6 + batSkill));
        runs += r;
        batTotals.get(batter.id)!.runs += r;
        batTotals.get(batter.id)!.balls++;
        const wt = bowlTotals.get(bowler.id)!; wt.runs += r; wt.balls++;
        events.push({ matchId: '', innings, over, ball: ball % 6, batterId: batter.id, bowlerId: bowler.id, runs: r, isWicket: false, isBoundary: r === 4 || r === 6 });
      }
      batTotals.forEach((v, k) => scorecard.push({ playerId: k, runs: v.runs, balls: v.balls, wickets: 0, ballsBowled: 0, runsConceded: 0 }));
      bowlTotals.forEach((v, k) => {
        const existing = scorecard.find((s) => s.playerId === k);
        if (existing) { existing.wickets = v.wickets; existing.ballsBowled = v.balls; existing.runsConceded = v.runs; }
      });
      return { runs, wickets };
    };
    const first = buildInnings(homeSquad, awaySquad, 1);
    const second = buildInnings(awaySquad, homeSquad, 2);
    const matchId = `mt_${String(i + 1).padStart(3, '0')}`;
    events.forEach((e) => (e.matchId = matchId));
    const winnerId = second.runs > first.runs ? away.id : second.runs === first.runs ? null : home.id;
    matches.push({
      id: matchId,
      date: new Date(Date.UTC(2026, 3 + Math.floor(i / 4), 2 + i * 2)).toISOString().slice(0, 10),
      format: 'T20',
      competition: COMPETITION,
      venueId: venue.id,
      homeId: home.id,
      awayId: away.id,
      homeScore: first.runs,
      awayScore: second.runs,
      homeWickets: first.wickets,
      awayWickets: second.wickets,
      winnerId,
      tossWinnerId: rand() < 0.5 ? home.id : away.id,
      tossDecision: rand() < 0.6 ? 'bowl' : 'bat',
      scorecard,
      events,
    });
  }
  return matches;
}

export function generateAuction(players: Player[]): AuctionRecord[] {
  const rand = mulberry32(9999);
  return players.slice(0, 110).map((p, i) => {
    const base = [20, 30, 40, 50, 75, 100][i % 6];
    const quality = p.batting.balls ? p.batting.runs / p.batting.balls : 0.9;
    const sold = rand() < 0.78;
    const multiplier = 1 + (quality - 0.9) * 3 + rand() * 2.6;
    return {
      id: `auc_${String(i + 1).padStart(3, '0')}`,
      playerId: p.id,
      season: 'IPL 2026 (DEMO)',
      basePriceLakh: base,
      soldPriceLakh: sold ? Math.round(base * Math.max(1, multiplier)) : null,
      status: sold ? 'sold' : 'unsold',
      buyerTeamId: sold ? `tm_${String((i % 10) + 1).padStart(2, '0')}` : null,
      synthetic: true,
    } as AuctionRecord;
  });
}

export function generateWeather(venues: Venue[]): WeatherObservation[] {
  const rand = mulberry32(31337);
  return venues.map((v) => ({
    venueId: v.id,
    date: '2027-04-01',
    temperatureC: Math.round(28 + rand() * 8),
    humidityPct: Math.round(45 + rand() * 40),
    windKph: Math.round(6 + rand() * 22),
    cloudCoverPct: Math.round(rand() * 60),
    rainProbability: Math.round(rand() * 35),
    dewExpected: v.dewRisk > 0.5,
    source: 'demo',
  }));
}

export function generateSources(): SourceRecord[] {
  const now = new Date().toISOString();
  return [
    { id: 'src_demo', name: 'Synthetic demo generator', kind: 'demo', reliability: 1, licence: 'Internal demo', lastSyncedAt: now, notes: 'Reference implementation data. Not real cricket records.' },
    { id: 'src_upload', name: 'User uploaded datasets', kind: 'upload', reliability: 0.8, licence: 'User supplied — verify rights before redistribution', lastSyncedAt: null, notes: 'Provenance stored per record.' },
    { id: 'src_api', name: 'Licensed cricket API (adapter, unconfigured)', kind: 'licensed-api', reliability: 0.9, licence: 'Requires subscription', lastSyncedAt: null, notes: 'Adapter exists; no key configured in demo mode.' },
    { id: 'src_board', name: 'Official cricket board releases', kind: 'official-board', reliability: 0.95, licence: 'Public releases; respect terms', lastSyncedAt: null, notes: 'Manual/ingest workflow only.' },
    { id: 'src_scorecard', name: 'Verified scorecards', kind: 'scorecard', reliability: 0.88, licence: 'Per-source terms', lastSyncedAt: null, notes: 'Upload or licensed feed.' },
    { id: 'src_kb', name: 'Platform knowledge base', kind: 'database', reliability: 0.7, licence: 'Internal', lastSyncedAt: now, notes: 'Curated methodology notes.' },
  ];
}

export function generateKnowledge(): KnowledgeDoc[] {
  const mk = (id: string, title: string, kind: KnowledgeDoc['kind'], tags: string[], body: string): KnowledgeDoc => ({
    id, title, kind, tags, body, sourceId: 'src_kb',
    createdAt: '2026-01-10T00:00:00.000Z', updatedAt: '2026-02-02T00:00:00.000Z',
    entities: tags,
    chunks: body.split(/\n\n+/).map((text, i) => ({ id: `${id}_c${i}`, text, tokens: Math.ceil(text.length / 4) })),
    duplicates: [],
  });
  return [
    mk('kb_1', 'T20 batting: separating average from impact', 'strategy', ['batting', 'strike-rate', 'methodology'],
      'Batting average rewards longevity between dismissals; strike rate rewards scoring speed. Neither alone describes T20 value because they trade off against each other.\n\nA defensible composite multiplies runs per ball by a survivability term, then normalises within role and phase. Always report both raw inputs alongside any composite so a reader can audit the trade-off.\n\nSample size dominates early-career noise: below roughly 150 balls faced, strike rate has a very wide confidence interval and should not drive a ranking on its own.'),
    mk('kb_2', 'Bowling economy is context dependent', 'strategy', ['bowling', 'economy', 'methodology'],
      'Economy in the powerplay and at the death is not comparable. Powerplay economy benefits from field restrictions but faces the best batters; death economy absorbs deliberate risk-taking.\n\nCompare bowlers inside their dominant phase, and when aggregating phases use ball-weighted economy rather than averaging per-phase economies.\n\nWicket-taking rate (balls per wicket) is noisier than economy because wickets are rare events; a Poisson or negative-binomial view is more honest than assuming normality.'),
    mk('kb_3', 'Auction valuation: scarcity and replacement value', 'auction', ['auction', 'valuation'],
      'Player value in an auction is driven by marginal contribution over the best available alternative in the same role, multiplied by scarcity. A good batter in a role flooded with options is worth less than a comparable batter in a scarce role.\n\nFair value should always be reported with an uncertainty band derived from historical dispersion of sold prices at that base-price tier, never as a single precise number.\n\nA maximum bid is a strategy decision, not a valuation: it embeds the cost of losing the player (fallback options in the same role).'),
    mk('kb_4', 'Reading a T20 surface', 'venue', ['pitch', 'venue'],
      'Surface evidence splits into (a) historical venue aggregates, (b) current pitch observation, (c) weather forecast, (d) inference. These must never be blended without labelling which is which.\n\nUseful historical signals: first-innings average, chase win share, boundary rate, pace versus spin wicket share. Useful current signals: grass cover, moisture, roll quality, and cracking pattern on the day.\n\nDew materially changes the second innings: it reduces spin grip and helps chasing sides. Where dew is likely, bat-first totals must be discounted when projecting chases.'),
    mk('kb_5', 'Young talent evaluation without over-fitting age', 'talent', ['talent', 'potential', 'methodology'],
      'Youth is a projection window, not an achievement. A ranking weighted too heavily on age simply sorts by birth date.\n\nA more defensible model combines demonstrated performance at the player\'s current level, rate of improvement across seasons, role scarcity, and the reliability of the underlying sample. Age then acts as a multiplier on headroom rather than the primary signal.\n\nPotential should be shown as a distribution (low / expected / high) with stated assumptions, not as a single promised outcome.'),
    mk('kb_6', 'Consistency metrics: coefficient of variation, not raw volatility', 'statistical', ['consistency', 'statistics'],
      'Coefficient of variation (standard deviation divided by mean) allows comparison of volatility between players with different scoring levels. It is only meaningful for ratio-scale data with a meaningful zero, which batting runs satisfy but strike rate does not.\n\nFor low-scoring samples, CV is unstable and should be shrunk toward a role prior. Report the sample size beside every consistency figure.'),
    mk('kb_7', 'Monte Carlo match simulation: assumptions first', 'prediction', ['simulation', 'prediction'],
      'A match simulation is only as good as its per-ball model. This platform uses phase-dependent scoring distributions calibrated to the selected XII\'s observed rate statistics, plus a wicket hazard that scales with bowler quality.\n\nOutputs are distributions, not guarantees. Report win probability with its simulation error (roughly sqrt(p(1-p)/N)) and never present a single scoreline as a prediction.\n\nUse Brier score and a calibration table to evaluate historical accuracy rather than judging single matches.'),
    mk('kb_8', 'Workload risk is accumulation, not one number', 'workload', ['workload', 'availability'],
      'Injury risk rises with acute load spikes relative to chronic load. A simple, transparent proxy is the ratio of recent 21-day bowling balls to the 90-day weekly average.\n\nThis platform never diagnoses injuries. It flags workload patterns that merit a conversation with medical staff, using only verified availability data that a user has entered.'),
    mk('kb_9', 'Data quality gates before modelling', 'data', ['data-quality', 'governance'],
      'Every model output inherits the defects of its input. Gate analysis behind checks: identity duplication, impossible values (wickets exceeding matches by a wide margin), inconsistent age against date of birth, and conflicting duplicates across sources.\n\nConflicts should be surfaced with both values and both sources, then resolved by a human. Silent overwriting destroys the audit trail and makes every downstream recommendation unfalsifiable.'),
    mk('kb_10', 'Explainability contract', 'strategy', ['explainability', 'governance'],
      'Every recommendation in this platform exposes: the metric inputs, the weights used, the normalisation method, the sample size, and the uncertainty. If a number cannot be traced to an input row, it should not be shown.\n\nAI-generated narrative is explicitly separated from deterministic calculations. Narration explains numbers; it never creates them.'),
  ];
}

export function generateDemoDatasets(players: Player[]): { dataset: Dataset; records: DatasetRecord[] } {
  const now = new Date('2027-04-01T00:00:00.000Z').toISOString();
  const dataset: Dataset = {
    id: 'ds_demo_combined',
    name: 'Demo combined domestic scouting set (synthetic)',
    description: 'Synthetic batting + bowling + biography records generated for demo mode. Replace with your official competition dataset.',
    category: 'combined',
    format: 'T20',
    competition: COMPETITION,
    season: REFERENCE_SEASON,
    kind: 'demo',
    status: 'approved',
    rowCount: players.length,
    recordCount: players.length,
    qualityScore: 0.86,
    createdAt: now,
    updatedAt: now,
    files: [{
      id: 'file_demo_1',
      filename: 'demo-domestic-scouting.csv',
      mimeType: 'text/csv',
      sizeBytes: 184320,
      sha256: 'demo-synthetic-checksum',
      extraction: 'csv',
      warnings: ['Synthetic demo data — not real cricket records.'],
    }],
    mappingSummary: [
      { canonical: 'runs', sourceColumn: 'Runs', matched: players.length, confidence: 1 },
      { canonical: 'balls', sourceColumn: 'Balls Faced', matched: players.length, confidence: 1 },
      { canonical: 'wickets', sourceColumn: 'Wickets', matched: players.length, confidence: 1 },
      { canonical: 'dob', sourceColumn: 'Date of Birth', matched: players.filter((p) => p.dob).length, confidence: 1 },
    ],
    notes: 'Demo dataset. Auto-generated and clearly labelled in every export.',
  };
  const records: DatasetRecord[] = players.map((p, i) => ({
    id: `rec_demo_${i + 1}`,
    datasetId: dataset.id,
    playerName: p.name,
    fields: {
      Name: p.name,
      'Date of Birth': p.dob ?? '',
      Team: p.team,
      Role: p.role,
      Matches: p.batting.matches,
      Innings: p.batting.innings,
      Runs: p.batting.runs,
      Balls: p.batting.balls,
      Fours: p.batting.fours,
      Sixes: p.batting.sixes,
      'Bowling Balls': p.bowling.balls,
      Wickets: p.bowling.wickets,
      'Runs Conceded': p.bowling.runsConceded,
      Catches: p.fielding.catches,
    },
    mapped: { name: p.name, dob: p.dob, team: p.team, role: p.role, batting: p.batting, bowling: p.bowling, fielding: p.fielding },
    confidence: p.confidence,
    issues: p.dob ? [] : [{ field: 'dob', severity: 'warn', message: 'Date of birth missing — age cannot be computed. Age-based views will exclude this player.' }],
    status: 'approved',
    sourceRow: i + 2,
    unknownFields: {},
    updatedAt: now,
    version: 1,
  }));
  return { dataset, records };
}

/**
 * Demo testimonials.
 *
 * IMPORTANT: these are illustrative placeholders written for the demo workspace.
 * They are flagged `sample: true` and rendered with a visible "Sample content"
 * badge, excluded from structured data, and must be replaced (or deleted) with real,
 * permission-granted testimonials before any production launch.
 */
export function seedTestimonials(): Testimonial[] {
  const at = '2027-03-18T09:00:00.000Z';
  const rows: Array<Pick<Testimonial, 'name' | 'role' | 'organisation' | 'quote'>> = [
    {
      name: 'Sample Persona A',
      role: 'Performance Analyst',
      organisation: 'Sample Franchise (placeholder)',
      quote:
        'Placeholder text showing the layout of a testimonial: a short sentence about shortlisting speed, a second sentence about the explainability of the numbers. Replace this record with a real, permission-granted quote from the admin panel.',
    },
    {
      name: 'Sample Persona B',
      role: 'Head of Scouting',
      organisation: 'Sample State Association (placeholder)',
      quote:
        'Placeholder text illustrating a scouting-focused testimonial. It is labelled as sample content everywhere it is displayed so it can never be mistaken for a real endorsement.',
    },
    {
      name: 'Sample Persona C',
      role: 'Auction Strategist',
      organisation: 'Sample League Team (placeholder)',
      quote:
        'Placeholder text illustrating an auction-planning testimonial, including how purse scenarios and bid ceilings appear to a planning team. Demo content only.',
    },
  ];
  return rows.map((r, i) => ({
    id: `tst_sample_${i + 1}`,
    name: r.name,
    role: r.role,
    organisation: r.organisation,
    quote: r.quote,
    imageUrl: null,
    rating: null,
    status: 'published' as const,
    sample: true,
    source: 'demo-seed' as const,
    createdAt: at,
    updatedAt: at,
    createdBy: 'system',
  }));
}
