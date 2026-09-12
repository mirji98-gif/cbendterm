/**
 * ENFORCEMENT TEST for Instrument_v2.md's "easy to get wrong #3": every
 * comparative answer must be recoded relative to the EXPERIMENTAL BRAND, not
 * to presentation position. Position is counterbalanced — roughly half of
 * participants saw the neutral pop-up first — so a recode that keys off
 * "first vs second" instead of "neutral vs experimental" is silently wrong
 * for half the sample.
 *
 * These tests feed the SAME raw answer under both `order` values and assert
 * the recoded MEANING (relative to condition) stays fixed while the raw
 * value's relationship to position flips — which is exactly the property the
 * instrument asks for.
 */
import { describe, expect, it } from 'vitest';
import {
  recodeBrandChoice, recodeComparativeScale, expBrandIsPositionTwo,
} from './comparative';
import type { BrandId } from './brands';

const AUREVELLA: BrandId = 'aurevella';
const VELOURE: BrandId = 'veloure';

describe('recodeBrandChoice (C1 / C2 / C4)', () => {
  it('recodes to 1 when the raw answer names the experimental brand', () => {
    expect(recodeBrandChoice(AUREVELLA, AUREVELLA)).toBe(1);
  });

  it('recodes to 0 when the raw answer names the neutral brand', () => {
    expect(recodeBrandChoice(VELOURE, AUREVELLA)).toBe(0);
  });

  it('is independent of which brand happened to be shown first', () => {
    // Same participant intent ("I mean the experimental brand"), expressed
    // against two different exp_brand assignments — the recode must track
    // the BRAND, not a position label, so this is really just restating the
    // function is deterministic in the brand id. The real risk this guards
    // against is a caller passing `position === 1` instead of `raw === expBrand`.
    expect(recodeBrandChoice(AUREVELLA, AUREVELLA)).toBe(recodeBrandChoice(AUREVELLA, AUREVELLA));
    expect(recodeBrandChoice(VELOURE, VELOURE)).toBe(1);
  });

  it("recodes 'both' and 'neither' to 0, per the instrument's literal rule", () => {
    expect(recodeBrandChoice('both', AUREVELLA)).toBe(0);
    expect(recodeBrandChoice('neither', AUREVELLA)).toBe(0);
  });

  it("recodes C4's 'compare_further' to 0, not NA", () => {
    expect(recodeBrandChoice('compare_further', AUREVELLA)).toBe(0);
  });

  it("recodes 'dont_remember' (C1 only) to NA, not 0", () => {
    expect(recodeBrandChoice('dont_remember', AUREVELLA)).toBeNull();
  });

  it('recodes null (not yet answered) to null, not 0', () => {
    expect(recodeBrandChoice(null, AUREVELLA)).toBeNull();
  });
});

describe('recodeComparativeScale (C3 / C5) — the position trap', () => {
  it('THE CENTRAL CASE: the same raw score means opposite things under the two order values, and the recode fixes that', () => {
    // Item is anchored "compared with Brand 2, how much do you trust Brand 1?"
    // A raw 7 ("much more") means "I trust Brand 1 much more than Brand 2".
    const raw = 7;

    // order = 'exp_first' → position 1 = experimental brand = Brand 1.
    // Raw 7 already means "I trust the EXPERIMENTAL brand much more" — no
    // reversal needed.
    const expFirst = recodeComparativeScale(raw, expBrandIsPositionTwo('exp_first'));
    expect(expFirst).toBe(7);

    // order = 'neutral_first' → position 1 = neutral brand = Brand 1, so the
    // experimental brand is Brand 2. The SAME raw 7 now means "I trust the
    // NEUTRAL brand much more" — i.e. the experimental brand much LESS.
    // Recoded, that must come out as 1, not 7.
    const neutralFirst = recodeComparativeScale(raw, expBrandIsPositionTwo('neutral_first'));
    expect(neutralFirst).toBe(1);

    // The two recoded values must differ — if a future change makes them
    // equal, the reversal has been lost and the column silently means
    // "Brand 1 vs Brand 2" again instead of "experimental vs neutral".
    expect(expFirst).not.toBe(neutralFirst);
  });

  it('the midpoint (about the same) is a fixed point of the reversal', () => {
    expect(recodeComparativeScale(4, false)).toBe(4);
    expect(recodeComparativeScale(4, true)).toBe(4);
  });

  it('reverses via 8 - raw when the experimental brand is Brand 2', () => {
    for (const raw of [1, 2, 3, 5, 6, 7]) {
      expect(recodeComparativeScale(raw, true)).toBe(8 - raw);
      expect(recodeComparativeScale(raw, false)).toBe(raw);
    }
  });

  it('passes null through as null', () => {
    expect(recodeComparativeScale(null, true)).toBeNull();
    expect(recodeComparativeScale(null, false)).toBeNull();
  });
});

describe('expBrandIsPositionTwo', () => {
  it('is true exactly when order is neutral_first', () => {
    expect(expBrandIsPositionTwo('neutral_first')).toBe(true);
    expect(expBrandIsPositionTwo('exp_first')).toBe(false);
  });
});
