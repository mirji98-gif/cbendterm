/**
 * ENFORCEMENT TESTS for non-negotiables #2 (forced measurement order) and #5
 * (nothing hints at a study before the debrief), PLUS the three things
 * Instrument_v2.md explicitly flags as easy to get wrong:
 *   1. awareness is asked once per brand, only after BOTH blocks
 *   2. the brand-trust item is level-framed, not change-framed
 *   3. comparative answers are recoded relative to condition, not position
 * (3) is exercised in src/data/comparative.test.ts, against the recode
 * functions directly; the rest are here, against the step table and copy.
 */
import { describe, expect, it } from 'vitest';
import { RATED_ITEMS } from '../data/items';
import { AWARENESS_STEM } from '../data/awareness';
import { DECLINE_COPY } from '../data/conditions';
import { nextStep, showProgress, isShoppingStep, QUESTIONNAIRE_STEPS } from './steps';
import type { Step } from './types';

describe('measurement order (Instrument_v2.md)', () => {
  it('measures felt guilt and irritation before the manipulation item', () => {
    // The order of RATED_ITEMS IS the presentation order (no shuffling; see
    // QuestionnaireBlock.tsx). Feelings must come before the item that names
    // pressure or intent, or the mediator is contaminated by demand.
    const ids = RATED_ITEMS.map((i) => i.id);
    const manipulationIdx = ids.indexOf('b3_manipulation');
    expect(ids.indexOf('b1_guilt')).toBeLessThan(manipulationIdx);
    expect(ids.indexOf('b2_irritation')).toBeLessThan(manipulationIdx);
  });

  it('never mentions manipulation, pressure or intent in the guilt or irritation items', () => {
    const CONTAMINATING = /manipulat|pressure|intent/i;
    const feelings = RATED_ITEMS.filter((i) => i.id === 'b1_guilt' || i.id === 'b2_irritation');
    for (const item of feelings) {
      expect(item.text, `${item.id} names the manipulation before it should`).not.toMatch(CONTAMINATING);
    }
  });

  it('has no transition that moves backwards through the questionnaire', () => {
    for (const step of QUESTIONNAIRE_STEPS) {
      const next = nextStep(step);
      if (!next) continue;
      const from = QUESTIONNAIRE_STEPS.indexOf(step);
      const to = QUESTIONNAIRE_STEPS.indexOf(next);
      if (to >= 0) expect(to, `${step} -> ${next} goes backwards`).toBeGreaterThan(from);
    }
  });
});

describe('"easy to get wrong" #1 — awareness only after BOTH blocks', () => {
  it('is unreachable directly from block_1', () => {
    // If this ever becomes 'awareness', an immediate check after the first
    // pop-up would prime the participant for the second and destroy the
    // "Ignore" classification for that brand.
    expect(nextStep('block_1')).not.toBe('awareness');
    expect(nextStep('block_1')).toBe('store_2');
  });

  it('is reachable only from block_2, after both blocks have run', () => {
    expect(nextStep('block_2')).toBe('awareness');
    const idxAwareness = QUESTIONNAIRE_STEPS.indexOf('awareness');
    const idxBlock1 = QUESTIONNAIRE_STEPS.indexOf('block_1');
    const idxBlock2 = QUESTIONNAIRE_STEPS.indexOf('block_2');
    expect(idxAwareness).toBeGreaterThan(idxBlock1);
    expect(idxAwareness).toBeGreaterThan(idxBlock2);
  });

  it('leads into the comparative block next', () => {
    expect(nextStep('awareness')).toBe('comparative');
  });

  it('stem never quotes a literal decline wording, only describes it', () => {
    // The neutral condition's button literally reads "No thanks" — a stem
    // that quotes any condition verbatim would cue the answer.
    for (const wording of Object.values(DECLINE_COPY)) {
      expect(AWARENESS_STEM).not.toContain(wording);
    }
  });
});

describe('"easy to get wrong" #2 — brand trust is level-framed', () => {
  it('b4_trust has no comparison language', () => {
    const trust = RATED_ITEMS.find((i) => i.id === 'b4_trust')!;
    // A level item ("I would trust this brand") can register trust going UP
    // in the autonomy arm; a change-framed item ("...more than before") would
    // also nest with the difference score and become uninterpretable.
    expect(trust.text).toBe('I would trust this brand.');
    expect(trust.text.toLowerCase()).not.toMatch(/more|less|compar|than before|increase|decrease/);
  });
});

describe('nothing hints at a study before the debrief', () => {
  const ALL_STEPS: Step[] = [
    'consent', 'assigning', 'instructions',
    'store_1', 'product_1', 'popup_1', 'continuation_1', 'block_1',
    'store_2', 'product_2', 'popup_2', 'continuation_2', 'block_2',
    'awareness', 'comparative', 'covariates', 'demographics',
    'submitting', 'debrief', 'rescue',
  ];

  it('shows no progress bar on any shopping step', () => {
    const leaks = ALL_STEPS.filter((s) => isShoppingStep(s) && showProgress(s));
    expect(leaks, 'a progress bar during shopping announces a fixed-stage study').toEqual([]);
  });

  it('shows the progress bar on every questionnaire step', () => {
    for (const step of QUESTIONNAIRE_STEPS) {
      expect(showProgress(step), `${step} should show progress`).toBe(true);
    }
  });
});

describe('item bank integrity', () => {
  it('has exactly the four rated items, in the documented order', () => {
    expect(RATED_ITEMS.map((i) => i.id)).toEqual([
      'b1_guilt', 'b2_irritation', 'b3_manipulation', 'b4_trust',
    ]);
  });

  it('has unique item ids', () => {
    const ids = RATED_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
