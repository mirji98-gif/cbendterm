/**
 * ENFORCEMENT TESTS for change_spec_v4_final.md §1 and §9's verification
 * checklist: each of the three links decodes to its exact arm, an
 * unrecognised or missing code NEVER falls back to a fixed arm, and lookup
 * is case-insensitive and whitespace-tolerant.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  GROUP_CODES, lookupGroupCode, normalizeGroupCode, randomArm, randomOrderAndPairing,
} from './groupCodes';
import { ARMS } from './conditions';

describe('GROUP_CODES table', () => {
  it('has exactly three codes: one per arm', () => {
    expect(Object.keys(GROUP_CODES).length).toBe(3);
  });

  it('covers every arm exactly once', () => {
    const seen = new Set(Object.values(GROUP_CODES));
    expect(seen.size).toBe(3);
    for (const arm of ARMS) expect(seen.has(arm)).toBe(true);
  });

  it('every code is already lower-case (so normalization is a no-op on the table itself)', () => {
    for (const code of Object.keys(GROUP_CODES)) {
      expect(code).toBe(code.toLowerCase());
    }
  });
});

describe('lookupGroupCode — the verification checklist cases', () => {
  it('k7m2 -> mild', () => {
    expect(lookupGroupCode('k7m2')).toBe('mild');
  });

  it('p6hd -> strong', () => {
    expect(lookupGroupCode('p6hd')).toBe('strong');
  });

  it('n1ls -> autonomy', () => {
    expect(lookupGroupCode('n1ls')).toBe('autonomy');
  });

  it('an unrecognised code returns null, never a default arm', () => {
    expect(lookupGroupCode('zzzz')).toBeNull();
  });

  it('a missing code (null) returns null', () => {
    expect(lookupGroupCode(null)).toBeNull();
  });

  it('an empty string returns null', () => {
    expect(lookupGroupCode('')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(lookupGroupCode('K7M2')).toBe('mild');
    expect(lookupGroupCode('K7m2')).toBe('mild');
  });

  it('trims surrounding whitespace', () => {
    expect(lookupGroupCode('  k7m2  ')).toBe('mild');
    expect(lookupGroupCode('\tn1ls\n')).toBe('autonomy');
  });
});

describe('normalizeGroupCode', () => {
  it('lower-cases and trims', () => {
    expect(normalizeGroupCode(' K7M2 ')).toBe('k7m2');
  });
});

describe('random fallback never stacks on one condition', () => {
  const originalRandom = Math.random;
  afterEach(() => {
    Math.random = originalRandom;
  });

  it('randomArm can return every arm depending on the random draw', () => {
    // ARMS is ['mild', 'strong', 'autonomy']; pick() does
    // Math.floor(Math.random() * 3). Drive it to each boundary.
    Math.random = () => 0;
    expect(randomArm()).toBe(ARMS[0]);
    Math.random = () => 0.4;
    expect(randomArm()).toBe(ARMS[1]);
    Math.random = () => 0.99;
    expect(randomArm()).toBe(ARMS[2]);
  });

  it('order and pairing are also drawn per participant, not fixed', () => {
    Math.random = () => 0;
    const low = randomOrderAndPairing();
    Math.random = () => 0.99;
    const high = randomOrderAndPairing();
    expect(low).not.toEqual(high);
  });
});
