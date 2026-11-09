/**
 * Reset the workspace store to a fresh deterministic demo seed.
 *   npm run seed            # reseed with the default reference date
 *   REFERENCE_DATE=2027-04-01 npm run seed
 */
import fs from 'node:fs';
import path from 'node:path';
import { resetStore, storeFile, getStore } from '../lib/core/db/store';

const dir = path.dirname(storeFile);
if (fs.existsSync(storeFile)) {
  const backup = path.join(dir, `store.backup.${Date.now()}.json`);
  fs.copyFileSync(storeFile, backup);
  console.log(`[seed] existing store backed up to ${backup}`);
}

resetStore();
const store = getStore();
console.log('[seed] workspace reseeded');
console.log(`[seed] store file : ${storeFile}`);
console.log(`[seed] reference  : ${store.settings.referenceDate}`);
console.log('[seed] contents   :', {
  players: store.players.length,
  datasets: store.datasets.length,
  records: store.records.length,
  matches: store.matches.length,
  venues: store.venues.length,
  teams: store.teams.length,
  knowledge: store.knowledge.length,
  users: store.users.length,
});
console.log('[seed] demo logins: owner@demo.local / Demo#12345 · analyst@demo.local / Analyst#12345 · scout@demo.local / Scout#12345 · viewer@demo.local / Viewer#12345');
