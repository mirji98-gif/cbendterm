/**
 * ENFORCEMENT TESTS for non-negotiables #2 (forced measurement order) and
 * #5 (nothing hints at a study before the debrief).
 */
import { describe, expect, it } from 'vitest';
import { SECTION_ORDER, BLOCK_ITEMS, itemsInSection } from '../data/items';
import { nextStep, showProgress, isShoppingStep } from './steps';
import type { Step } from './types';

describe('measurement order', () => {
  it('measures felt emotions first in every block', () => {
    expect(SECTION_ORDER[0]).toBe('emotions');
  });

  it('never asks an emotion item after an item mentioning manipulation or intent', () => {
    // The demand-effect constraint from Campbell (1995) and Cotte et al.
    // (2005): if the mediator is measured after the outcome's own framing,
    // the correlation between them is partly manufactured by the instrument.
    const CONTAMINATING = /manipulat|persuade|control|intent|unfair|fair\b/i;
    const firstContaminating = SECTION_ORDER.findIndex((section) =>
      itemsInSection(section).some((item) => CONTAMINATING.test(item.text)),
    );
    const lastEmotion = SECTION_ORDER.lastIndexOf('emotions');
    expect(firstContaminating).toBeGreaterThan(-1);
    expect(
      lastEmotion,
      'an emotion section appears at or after the first manipulation-mentioning section',
    ).toBeLessThan(firstContaminating);
  });

  it('places attributions immediately after manipulative intent', () => {
    expect(SECTION_ORDER.indexOf('attributions')).toBe(SECTION_ORDER.indexOf('imi') + 1);
  });

  it('has no transition that moves backwards through the questionnaire', () => {
    const QUESTIONNAIRE: Step[] = [
      'block_1', 'block_2', 'recognition', 'open_ended', 'covariates', 'demographics',
    ];
    for (const step of QUESTIONNAIRE) {
      const next = nextStep(step);
      if (!next) continue;
      const from = QUESTIONNAIRE.indexOf(step);
      const to = QUESTIONNAIRE.indexOf(next);
      if (to >= 0) expect(to, `${step} -> ${next} goes backwards`).toBeGreaterThan(from);
    }
  });
});

describe('nothing hints at a study before the debrief', () => {
  const ALL_STEPS: Step[] = [
    'consent', 'assigning', 'instructions',
    'store_1', 'product_1', 'popup_1', 'continuation_1', 'block_1',
    'store_2', 'product_2', 'popup_2', 'continuation_2', 'block_2',
    'recognition', 'open_ended', 'covariates', 'demographics',
    'submitting', 'debrief', 'rescue',
  ];

  it('shows no progress bar on any shopping step', () => {
    const leaks = ALL_STEPS.filter((s) => isShoppingStep(s) && showProgress(s));
    expect(leaks, 'a progress bar during shopping announces a fixed-stage study').toEqual([]);
  });

  it('shows the progress bar on every questionnaire step', () => {
    for (const step of ['block_1', 'block_2', 'recognition', 'open_ended', 'covariates', 'demographics'] as Step[]) {
      expect(showProgress(step), `${step} should show progress`).toBe(true);
    }
  });
});

describe('item bank integrity', () => {
  it('has unique item ids', () => {
    const ids = BLOCK_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assigns every item to a section in SECTION_ORDER', () => {
    for (const item of BLOCK_ITEMS) {
      expect(SECTION_ORDER, `${item.id} has an unknown section`).toContain(item.section);
    }
  });

  it('reverse-codes imi_6, which the PRD leaves unmarked', () => {
    // "unfair / fair" with Fair at the high anchor runs opposite to the IMI
    // scale (high = more manipulative intent). Left unreversed it deflates
    // alpha and biases the scale score.
    expect(BLOCK_ITEMS.find((i) => i.id === 'imi_6')?.reverse).toBe(true);
  });

  it('keeps IMI and the anger factor out of every cut tier', () => {
    // PRD §5.3: "Do not cut IMI or the anger factor."
    const protectedItems = BLOCK_ITEMS.filter((i) => i.factor === 'imi' || i.factor === 'anger');
    expect(protectedItems.every((i) => i.cutTier === 0)).toBe(true);
  });
});
