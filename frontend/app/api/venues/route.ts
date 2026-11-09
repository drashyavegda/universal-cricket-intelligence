import { getStore } from '@/lib/core/db/store';
import { guard, json } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = guard('view'); if (!g.ok) return g.response;
  const store = getStore();
  return json({
    venues: store.venues,
    weather: store.weather,
    comparisons: store.venues.map((v) => ({ id: v.id, name: v.name, city: v.city, avgFirstInnings: v.avgFirstInnings, chaseWinRate: v.chaseWinRate, spinRating: v.pitch.spinRating, paceRating: v.pitch.paceRating, battingFriendliness: v.pitch.battingFriendliness, dewRisk: v.dewRisk, sampleMatches: v.sampleMatches })),
    note: 'Venue metrics in demo mode are synthetic. Pitch ratings are user-editable observations; weather is a forecast.',
  });
}
