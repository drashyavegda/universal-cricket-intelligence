import { describe, expect, it } from 'vitest';
import { matchColumn, parseDate, parseNumber, parseBool, computeAge, normaliseName } from '@/lib/core/data/synonyms';
import { extractRecords } from '@/lib/core/data/extract';
import { mergeDatasets } from '@/lib/core/data/merge';
import type { DatasetRecord } from '@/lib/core/types';

describe('column mapping', () => {
  it('maps messy real-world headers onto canonical fields', () => {
    expect(matchColumn('Player Name').field).toBe('name');
    expect(matchColumn('Balls Faced').field).toBe('balls');
    expect(matchColumn('Bat Style').field).toBe('battingStyle');
    expect(matchColumn('Runs Given').field).toBe('runsConceded');
    expect(matchColumn('Wkts').field).toBe('wickets');
    expect(matchColumn('4s').field).toBe('fours');
    expect(matchColumn('Age (yrs)').field).toBe('age');
    expect(matchColumn('State Association').field).toBe('state');
  });

  it('refuses to guess for an unrelated header and reports low confidence', () => {
    const m = matchColumn('trial notes');
    expect(m.field === null || m.confidence < 1).toBe(true);
  });
});

describe('value parsing', () => {
  it('parses numbers with separators, percentages and dashes', () => {
    expect(parseNumber('1,234')).toBe(1234);
    expect(parseNumber('12.50%')).toBe(12.5);
    expect(parseNumber('-')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });

  it('parses dates without silently shifting the year', () => {
    expect(parseDate('2003-11-18').iso).toBe('2003-11-18');
    expect(parseDate('18/11/2003').iso).toBe('2003-11-18');
    // 10/02/2006 is ambiguous; month-first is chosen and flagged, never turned into 2011
    const amb = parseDate('10/02/2006');
    expect(amb.iso).toBe('2006-10-02');
    expect(amb.ambiguous).toBe(true);
  });

  it('rejects impossible calendar dates instead of rolling them over', () => {
    expect(parseDate('31/02/2005').iso).toBeNull();
    expect(parseDate('2005-13-40').iso).toBeNull();
    expect(parseDate('not a date').iso).toBeNull();
  });

  it('handles two-digit years and excel serials', () => {
    expect(parseDate('05/06/07').iso).toBe('2007-05-06');
    expect(parseDate(45000).iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('derives age at the workspace reference date', () => {
    expect(computeAge('2005-04-01', '2027-04-01')).toBe(22);
    expect(computeAge('2005-04-02', '2027-04-01')).toBe(21);
    expect(computeAge(null, '2027-04-01')).toBeNull();
  });

  it('parses booleans conservatively', () => {
    expect(parseBool('yes')).toBe(true);
    expect(parseBool('No')).toBe(false);
    expect(parseBool('maybe')).toBeNull();
  });

  it('normalises names for identity matching only', () => {
    expect(normaliseName('  A.  Sharma ')).toBe('a sharma');
  });
});

describe('record extraction', () => {
  const columns = ['Player', 'DOB', 'Runs', 'Balls Faced', 'Wickets', 'Trial notes'];
  const rows = [
    { Player: 'Test One', DOB: '2004-02-02', 'Runs': 320, 'Balls Faced': 250, Wickets: '', 'Trial notes': 'good' },
    { Player: '', DOB: '2005-03-03', 'Runs': 100, 'Balls Faced': 90, Wickets: 4, 'Trial notes': '' },
    { Player: 'Test Two', DOB: '2005-05-05', 'Runs': 99999, 'Balls Faced': 10, Wickets: 2, 'Trial notes': '' },
  ];
  const out = extractRecords(rows, columns, { datasetId: 'ds_test', referenceDate: '2027-04-01', sourceName: 'test.csv' });

  it('keeps every unrecognised column as an unknown field instead of dropping it', () => {
    expect(out.unknownColumns).toContain('Trial notes');
    expect(out.records[0].unknownFields['Trial notes']).toBe('good');
  });

  it('flags a row with no name as an error', () => {
    expect(out.records[1].issues.some((i) => i.field === 'name' && i.severity === 'error')).toBe(true);
  });

  it('flags implausible values and implausible strike rates', () => {
    const third = out.records[2];
    expect(third.issues.some((i) => /plausible/i.test(i.message))).toBe(true);
  });

  it('never invents a DOB and derives age only when one exists', () => {
    expect(out.records[0].mapped.age).toBe(23);
    expect(out.records[1].mapped.dob).toBe('2005-03-03');
  });

  it('gives complete rows a higher confidence than broken ones', () => {
    expect(out.records[0].confidence).toBeGreaterThan(out.records[2].confidence);
  });
});

describe('multi-dataset merge', () => {
  const mk = (id: string, datasetId: string, name: string, runs: number, wickets: number): DatasetRecord => ({
    id, datasetId, playerName: name, fields: {}, confidence: 0.8, issues: [], status: 'approved', sourceRow: 1,
    unknownFields: {}, updatedAt: '2026-01-01T00:00:00.000Z', version: 1,
    mapped: { name, runs, wickets } as DatasetRecord['mapped'],
  });
  const a = [mk('a1', 'ds1', 'Arjun Rao', 400, 2), mk('a2', 'ds1', 'Bilal Khan', 300, 0)];
  const b = [mk('b1', 'ds2', 'Arjun Rao', 412, 2), mk('b2', 'ds2', 'Chetan Iyer', 250, 5)];

  it('matches players by normalised name across datasets', () => {
    const { candidates } = mergeDatasets([{ datasetId: 'ds1', records: a }, { datasetId: 'ds2', records: b }], { ageReference: '2027-04-01' });
    expect(candidates.length).toBe(3);
    const arjun = candidates.find((c) => c.displayName.includes('Arjun'))!;
    expect(arjun.datasetIds.length).toBe(2);
    expect(arjun.recordIds.length).toBe(2);
  });

  it('flags a conflict beyond tolerance rather than silently picking a side', () => {
    const aggressive = [mk('b1', 'ds2', 'Arjun Rao', 700, 2)];
    const { candidates, stats } = mergeDatasets([{ datasetId: 'ds1', records: a }, { datasetId: 'ds2', records: aggressive }], { ageReference: '2027-04-01' });
    const arjun = candidates.find((c) => c.displayName.includes('Arjun'))!;
    expect(arjun.conflicts.length).toBeGreaterThan(0);
    expect(stats.conflicts).toBeGreaterThan(0);
  });
});
