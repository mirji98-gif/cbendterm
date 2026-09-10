/**
 * GENERATED FILE — do not edit by hand.
 * Source: scripts/gen-sequence.ts (seed 20260910). Regenerate: npm run gen:sequence
 *
 * Pre-generated balanced assignment sequence. Slots 0-39 are the N=40 design;
 * slots 40-51 are insurance against consent-then-drop.
 *
 * Marginal counterbalance cell counts over slots 0-39: 10 / 10 / 10 / 10
 *   neutral_first/aurevella_neutral\n *   neutral_first/veloure_neutral\n *   exp_first/aurevella_neutral\n *   exp_first/veloure_neutral
 *
 * Per-arm cell counts (see codebook.md):
 *   mild      4 / 3 / 3 / 3  (n=13)
 *   strong    3 / 4 / 3 / 3  (n=13)
 *   autonomy  3 / 3 / 4 / 4  (n=14)
 */
import type { Slot } from './conditions';

export const SEQUENCE_SEED = 20260910;
export const DESIGN_N = 40;

export const ASSIGNMENT_SEQUENCE: readonly Slot[] = [
  { slot: 0, arm: 'autonomy', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 1, arm: 'autonomy', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 2, arm: 'strong', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 3, arm: 'mild', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 4, arm: 'mild', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 5, arm: 'autonomy', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 6, arm: 'autonomy', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 7, arm: 'mild', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 8, arm: 'autonomy', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 9, arm: 'mild', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 10, arm: 'strong', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 11, arm: 'autonomy', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 12, arm: 'autonomy', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 13, arm: 'autonomy', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 14, arm: 'strong', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 15, arm: 'strong', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 16, arm: 'mild', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 17, arm: 'mild', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 18, arm: 'mild', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 19, arm: 'autonomy', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 20, arm: 'mild', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 21, arm: 'strong', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 22, arm: 'mild', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 23, arm: 'strong', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 24, arm: 'mild', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 25, arm: 'mild', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 26, arm: 'autonomy', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 27, arm: 'autonomy', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 28, arm: 'autonomy', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 29, arm: 'strong', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 30, arm: 'strong', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 31, arm: 'autonomy', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 32, arm: 'autonomy', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 33, arm: 'strong', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 34, arm: 'strong', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 35, arm: 'mild', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 36, arm: 'strong', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 37, arm: 'strong', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 38, arm: 'strong', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 39, arm: 'mild', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 40, arm: 'autonomy', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 41, arm: 'strong', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 42, arm: 'strong', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 43, arm: 'mild', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 44, arm: 'autonomy', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 45, arm: 'strong', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 46, arm: 'autonomy', order: 'exp_first', pairing: 'veloure_neutral' },
  { slot: 47, arm: 'mild', order: 'neutral_first', pairing: 'veloure_neutral' },
  { slot: 48, arm: 'autonomy', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 49, arm: 'mild', order: 'exp_first', pairing: 'aurevella_neutral' },
  { slot: 50, arm: 'strong', order: 'neutral_first', pairing: 'aurevella_neutral' },
  { slot: 51, arm: 'mild', order: 'neutral_first', pairing: 'aurevella_neutral' },
] as const;

/** Counterbalance cell index (0-3) for a slot, for the admin view. */
export const CELL_LABELS: readonly string[] = [
  'neutral_first/aurevella_neutral',
  'neutral_first/veloure_neutral',
  'exp_first/aurevella_neutral',
  'exp_first/veloure_neutral',
] as const;
