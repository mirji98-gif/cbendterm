import { describe, expect, it } from 'vitest';
import { COLUMN_NAMES, COLUMNS, REVERSE_CODED_COLUMNS } from '../data/columns';
import { BLOCK_ITEMS } from '../data/items';

describe('CSV contract', () => {
  it('has unique column names', () => {
    expect(new Set(COLUMN_NAMES).size).toBe(COLUMN_NAMES.length);
  });

  it('carries every item twice, once per block prefix', () => {
    for (const item of BLOCK_ITEMS) {
      expect(COLUMN_NAMES).toContain(`neutral_${item.id}`);
      expect(COLUMN_NAMES).toContain(`exp_${item.id}`);
    }
  });

  it('propagates reverse flags from the item bank without drift', () => {
    const expected = BLOCK_ITEMS.filter((i) => i.reverse).flatMap((i) => [
      `neutral_${i.id}`,
      `exp_${i.id}`,
    ]);
    expect([...REVERSE_CODED_COLUMNS].sort()).toEqual([...expected].sort());
  });

  it('documents every column', () => {
    // Item columns are described by their own (sometimes one-word) item text,
    // so length is not the test — presence is.
    const undocumented = COLUMNS.filter((c) => !c.description?.trim());
    expect(undocumented.map((c) => c.name)).toEqual([]);
  });

  it('gives every rated item column a scale and a factor', () => {
    const incomplete = COLUMNS.filter(
      (c) => c.type === 'likert7' && (!c.scale || !c.factor || c.reverse === undefined),
    );
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
