/**
 * ENFORCEMENT TESTS for change_spec_group_codes.md §1 and §7's verification
 * checklist: a valid code decodes to its exact arm/recruiter, an unrecognised
 * or missing code NEVER falls back to a fixed arm, and lookup is
 * case-insensitive and whitespace-tolerant.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  GROUP_CODES, lookupGroupCode, normalizeGroupCode, randomArm, randomOrderAndPairing,
} from './groupCodes';
import { ARMS } from './conditions';

describe('GROUP_CODES table', () => {
  it('has exactly twelve codes: four recruiters times three arms', () => {
    expect(Object.keys(GROUP_CODES).length).toBe(12);
  });

  it('covers every recruiter × arm combination exactly once', () => {
    const seen = new Set<string>();
    for (const { recruiter, arm } of Object.values(GROUP_CODES)) {
      const key = `${recruiter}:${arm}`;
      expect(seen.has(key), `duplicate recruiter/arm combination: ${key}`).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(12);
  });

  it('every code is already lower-case (so normalization is a no-op on the table itself)', () => {
    for (const code of Object.keys(GROUP_CODES)) {
      expect(code).toBe(code.toLowerCase());
    }
  });
});

describe('lookupGroupCode — the verification checklist cases', () => {
  it('k7m2 -> arm mild, recruiter 1', () => {
    expect(lookupGroupCode('k7m2')).toEqual({ recruiter: 1, arm: 'mild' });
  });

  it('c9ib -> arm autonomy, recruiter 4', () => {
    expect(lookupGroupCode('c9ib')).toEqual({ recruiter: 4, arm: 'autonomy' });
  });

  it('an unrecognised code returns null, never a default arm', () => {
    expect(lookupGroupCode('ZZZZ')).toBeNull();
  });

  it('a missing code (null) returns null', () => {
    expect(lookupGroupCode(null)).toBeNull();
  });

  it('an empty string returns null', () => {
    expect(lookupGroupCode('')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(lookupGroupCode('K7M2')).toEqual({ recruiter: 1, arm: 'mild' });
    expect(lookupGroupCode('K7m2')).toEqual({ recruiter: 1, arm: 'mild' });
  });

  it('trims surrounding whitespace', () => {
    expect(lookupGroupCode('  k7m2  ')).toEqual({ recruiter: 1, arm: 'mild' });
    expect(lookupGroupCode('\tc9ib\n')).toEqual({ recruiter: 4, arm: 'autonomy' });
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
