/**
 * Step transitions.
 *
 * There is exactly one transition table and no screen computes its own
 * successor. That is what makes the forced questionnaire order (PRD §2.2 /
 * non-negotiable 2) a structural property rather than a convention: to show
 * feelings after a manipulation item you would have to edit this table, not
 * merely make a mistake in a component.
 *
 * change_spec_v4_final.md Part 3: each brand block now has two pop-ups.
 * 'checkout_N' (was 'popup_N') is the product page with pop-up 1 overlaid,
 * firing on checkout intent (add-to-bag). 'confirm_N' is the new
 * order-confirmation screen with pop-up 2 overlaid. 'continuation_N' follows
 * pop-up 2 only, exactly like the old single continuation screen.
 */
import type { Session, Step, BlockKey } from './types';
import { blockAtPosition } from './types';

/** Linear successor for every step. Branching steps are handled below. */
const NEXT: Record<Step, Step | null> = {
  consent: 'instructions',
  instructions: 'store_1',
  store_1: 'product_1',
  product_1: 'checkout_1',
  checkout_1: 'confirm_1',
  confirm_1: 'continuation_1',
  continuation_1: 'block_1',
  block_1: 'store_2',
  store_2: 'product_2',
  product_2: 'checkout_2',
  checkout_2: 'confirm_2',
  confirm_2: 'continuation_2',
  // Awareness is reachable ONLY from here — never from block_1 — which is
  // what makes "asked once per brand, after BOTH blocks" a structural
  // property rather than a screen-ordering convention.
  continuation_2: 'block_2',
  block_2: 'awareness',
  awareness: 'comparative',
  comparative: 'covariates',
  covariates: 'demographics',
  demographics: 'submitting',
  submitting: 'debrief', // failure branches to 'rescue' explicitly
  debrief: null,
  rescue: null,
};

export function nextStep(step: Step): Step | null {
  return NEXT[step];
}

/** Steps that belong to the shopping task. */
const SHOPPING_STEPS: ReadonlySet<Step> = new Set<Step>([
  'instructions',
  'store_1', 'product_1', 'checkout_1', 'confirm_1', 'continuation_1',
  'store_2', 'product_2', 'checkout_2', 'confirm_2', 'continuation_2',
]);

/** Steps that are part of the instrument, in forced order. */
export const QUESTIONNAIRE_STEPS: readonly Step[] = [
  'block_1', 'block_2', 'awareness', 'comparative', 'covariates', 'demographics',
];

const QUESTIONNAIRE_STEP_SET: ReadonlySet<Step> = new Set(QUESTIONNAIRE_STEPS);

export function isQuestionnaireStep(step: Step): boolean {
  return QUESTIONNAIRE_STEP_SET.has(step);
}

/**
 * Progress indicator visibility.
 *
 * NEVER true during the shopping steps (PRD §6 / non-negotiable 5): a progress
 * bar while browsing announces "this is a study with a fixed number of stages"
 * and destroys the cover task. It appears only once the questionnaire starts,
 * where it is honest and reduces drop-out.
 */
export function showProgress(step: Step): boolean {
  return isQuestionnaireStep(step);
}

export function isShoppingStep(step: Step): boolean {
  return SHOPPING_STEPS.has(step);
}

/** Which block a step belongs to, or null for session-level steps. */
export function blockKeyForStep(session: Session, step: Step): BlockKey | null {
  if (!session.assignment) return null;
  const { order } = session.assignment;
  if (/_1$/.test(step)) return blockAtPosition(order, 1);
  if (/_2$/.test(step)) return blockAtPosition(order, 2);
  return null;
}

export function currentBlockKey(session: Session): BlockKey | null {
  return blockKeyForStep(session, session.step);
}

/** 1 or 2 — which of the two blocks the current step sits in. */
export function positionForStep(step: Step): 1 | 2 | null {
  if (/_1$/.test(step)) return 1;
  if (/_2$/.test(step)) return 2;
  return null;
}

/**
 * Progress through the questionnaire, 0..1. Each questionnaire step is a
 * single screen in v2 (no sub-sections), so progress is just position in
 * QUESTIONNAIRE_STEPS.
 */
export function progressFraction(session: Session): number {
  const idx = QUESTIONNAIRE_STEPS.indexOf(session.step);
  if (idx < 0) return 0;
  return (idx + 1) / QUESTIONNAIRE_STEPS.length;
}

/**
 * Steps where an interrupting reload destroys a measurement that cannot be
 * honestly retaken. Restoring into one of these invalidates the relevant
 * pop-up's timing fields rather than silently re-measuring them.
 */
const TIMING_CRITICAL: ReadonlySet<Step> = new Set<Step>([
  'checkout_1', 'confirm_1', 'continuation_1',
  'checkout_2', 'confirm_2', 'continuation_2',
]);

export function isTimingCritical(step: Step): boolean {
  return TIMING_CRITICAL.has(step);
}

/** Which pop-up a timing-critical step's reload would have interrupted. */
export function popupKeyForStep(step: Step): 'p1' | 'p2' | null {
  if (/^checkout_/.test(step)) return 'p1';
  if (/^confirm_/.test(step) || /^continuation_/.test(step)) return 'p2';
  return null;
}
