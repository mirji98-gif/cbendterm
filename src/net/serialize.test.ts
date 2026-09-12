import { describe, expect, it } from 'vitest';
import { COLUMN_NAMES, COLUMNS } from '../data/columns';
import { RATED_ITEMS } from '../data/items';

describe('CSV contract', () => {
  it('has unique column names', () => {
    expect(new Set(COLUMN_NAMES).size).toBe(COLUMN_NAMES.length);
  });

  it('carries every rated item twice, once per block prefix', () => {
    for (const item of RATED_ITEMS) {
      expect(COLUMN_NAMES).toContain(`neutral_${item.id}`);
      expect(COLUMN_NAMES).toContain(`exp_${item.id}`);
    }
  });

  it('carries a difference-score column for every rated item plus b5', () => {
    for (const item of RATED_ITEMS) {
      expect(COLUMN_NAMES).toContain(`diff_${item.id}`);
    }
    expect(COLUMN_NAMES).toContain('diff_b5');
  });

  it('carries both raw and recoded comparative columns', () => {
    for (const raw of ['c1_raw', 'c2_raw', 'c3_raw', 'c4_raw', 'c5_raw', 'c6_open']) {
      expect(COLUMN_NAMES).toContain(raw);
    }
    for (const recoded of [
      'c1_exp_more_manipulative', 'c2_trust_exp_more', 'c3_recoded',
      'c4_choose_exp', 'c5_recoded',
    ]) {
      expect(COLUMN_NAMES).toContain(recoded);
    }
  });

  it('carries awareness columns keyed by condition, not position', () => {
    // aware_brand1_raw / aware_brand2_raw are position-keyed (raw); the
    // correctness columns must be condition-keyed, or "which brand was
    // neutral" gets baked into a fixed column and silently wrong half the time.
    expect(COLUMN_NAMES).toContain('aware_brand1_raw');
    expect(COLUMN_NAMES).toContain('aware_brand2_raw');
    expect(COLUMN_NAMES).toContain('aware_neutral_correct');
    expect(COLUMN_NAMES).toContain('aware_exp_correct');
  });

  it('has no top-level open_ended or recognition columns left over from v1', () => {
    expect(COLUMN_NAMES).not.toContain('open_ended');
    expect(COLUMN_NAMES).not.toContain('recognition_neutral');
    expect(COLUMN_NAMES).not.toContain('recognition_exp');
  });

  it('documents every column', () => {
    const undocumented = COLUMNS.filter((c) => !c.description?.trim());
    expect(undocumented.map((c) => c.name)).toEqual([]);
  });

  it('gives every rated item column a scale description', () => {
    const incomplete = COLUMNS.filter((c) => c.type === 'likert7' && !c.scale);
    expect(incomplete.map((c) => c.name)).toEqual([]);
  });

  it('explains every non-item column in a full sentence', () => {
    const thin = COLUMNS.filter((c) => c.type !== 'likert7' && c.description.length < 20);
    expect(thin.map((c) => c.name)).toEqual([]);
  });

  it('gives every enum column its permitted values', () => {
    const missing = COLUMNS.filter((c) => c.type === 'enum' && !c.values?.length);
    expect(missing.map((c) => c.name)).toEqual([]);
  });
});
