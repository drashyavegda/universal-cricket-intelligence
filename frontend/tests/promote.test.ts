import { beforeEach, describe, expect, it } from 'vitest';
import { getStore, resetStore, update } from '@/lib/core/db/store';
import { promoteDataset, normaliseRole } from '@/lib/core/data/promote';
import type { Dataset, DatasetRecord } from '@/lib/core/types';

function makeDataset(id: string): Dataset {
  return {
    id, name: 'Test sheet', description: '', category: 'combined', format: 'T20',
    competition: 'Test Cup', season: '2026/27', kind: 'uploaded', status: 'needs_review',
    rowCount: 3, recordCount: 3, qualityScore: 80, createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z', files: [], mappingSummary: [], notes: '',
  };
}

function makeRecord(id: string, datasetId: string, name: string, status: DatasetRecord['status'], mapped: Record<string, unknown>): DatasetRecord {
  return {
    id, datasetId, playerName: name, fields: {}, mapped: mapped as DatasetRecord['mapped'],
    confidence: 0.9, issues: [], status, sourceRow: Number(id.split('_').pop()),
    unknownFields: {}, updatedAt: '2026-01-01T00:00:00.000Z', version: 1,
  };
}

beforeEach(() => { resetStore(); });

describe('dataset record → player promotion', () => {
  it('promotes approved rows only, leaving pending and rejected rows out', () => {
    const before = getStore().players.length;
    update((s) => {
      s.datasets.push(makeDataset('ds_t'));
      s.records.push(
        makeRecord('r_1', 'ds_t', 'Promo One', 'approved', { name: 'Promo One', dob: '2006-05-05', runs: 400, balls: 300, innings: 14, matches: 16, role: 'Top-order Batter', team: 'Test XI', state: 'Gujarat' }),
        makeRecord('r_2', 'ds_t', 'Promo Two', 'pending', { name: 'Promo Two', runs: 200, balls: 200 }),
        makeRecord('r_3', 'ds_t', 'Promo Three', 'rejected', { name: 'Promo Three', runs: 100, balls: 100 }),
      );
    });
    const result = promoteDataset('ds_t', 'tester@demo.local');
    expect(result.considered).toBe(1);
    expect(result.added).toBe(1);
    const store = getStore();
    expect(store.players.length).toBe(before + 1);
    const promoted = store.players.find((p) => p.name === 'Promo One')!;
    expect(promoted.synthetic).toBe(false);
    expect(promoted.batting.runs).toBe(400);
    expect(promoted.batting.balls).toBe(300);
    expect(promoted.age).toBe(20);            // derived at the 2027-04-01 reference date
    expect(promoted.sources.some((s) => s.kind === 'uploaded')).toBe(true);
  });

  it('gives every promoted player a unique id', () => {
    update((s) => {
      s.datasets.push(makeDataset('ds_u'));
      for (let i = 1; i <= 3; i++) {
        s.records.push(makeRecord(`r_${i}`, 'ds_u', `Unique ${i}`, 'approved', { name: `Unique ${i}`, runs: 100 + i, balls: 100 }));
      }
    });
    const result = promoteDataset('ds_u');
    expect(result.added).toBe(3);
    expect(new Set(result.playerIds).size).toBe(3);
    const ids = getStore().players.filter((p) => p.name.startsWith('Unique ')).map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('skips rows with no name or no figures instead of inventing a player', () => {
    update((s) => {
      s.datasets.push(makeDataset('ds_s'));
      s.records.push(
        makeRecord('r_1', 'ds_s', 'Row 2', 'approved', { name: '' }),
        makeRecord('r_2', 'ds_s', 'Empty Stats', 'approved', { name: 'Empty Stats' }),
      );
    });
    const result = promoteDataset('ds_s');
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(2);
    expect(result.reasons.join(' ')).toMatch(/no usable player name|no batting or bowling/i);
  });

  it('replaces a DEMO placeholder with the same name rather than duplicating it', () => {
    const demoPlayer = getStore().players[0];
    const before = getStore().players.length;
    update((s) => {
      s.datasets.push(makeDataset('ds_d'));
      s.records.push(makeRecord('r_9', 'ds_d', demoPlayer.name, 'approved', { name: demoPlayer.name, runs: 555, balls: 400, innings: 20, matches: 20 }));
    });
    const result = promoteDataset('ds_d');
    expect(result.updated).toBe(1);
    expect(result.added).toBe(0);
    expect(getStore().players.length).toBe(before);
    const replaced = getStore().players.find((p) => p.name === demoPlayer.name)!;
    expect(replaced.synthetic).toBe(false);
    expect(replaced.batting.runs).toBe(555);
  });

  it('is idempotent: promoting twice does not duplicate players', () => {
    update((s) => {
      s.datasets.push(makeDataset('ds_i'));
      s.records.push(makeRecord('r_1', 'ds_i', 'Idem Player', 'approved', { name: 'Idem Player', runs: 321, balls: 250, innings: 12, matches: 12 }));
    });
    promoteDataset('ds_i');
    const afterFirst = getStore().players.length;
    promoteDataset('ds_i');
    expect(getStore().players.length).toBe(afterFirst);
    expect(getStore().players.filter((p) => p.name === 'Idem Player').length).toBe(1);
  });

  it('explains itself when a dataset has no approved rows', () => {
    update((s) => s.datasets.push(makeDataset('ds_empty')));
    const result = promoteDataset('ds_empty');
    expect(result.added).toBe(0);
    expect(result.reasons[0]).toMatch(/approve records/i);
  });

  it('normalises free-text roles onto the canonical enum', () => {
    expect(normaliseRole('Wicket Keeper Batter')).toBe('Wicketkeeper-Batter');
    expect(normaliseRole('right arm fast medium')).toBe('Pace Bowler');
    expect(normaliseRole('off spin all rounder')).toBe('Spin All-rounder');
    expect(normaliseRole('middle order batsman')).toBe('Middle-order Batter');
    expect(normaliseRole('')).toBe('Middle-order Batter');
  });
});
