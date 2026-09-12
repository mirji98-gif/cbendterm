/**
 * CONDITION DEFINITIONS.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ THE DECLINE-BUTTON LABEL IS THE ONLY THING THAT VARIES BY CONDITION. │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Headline, subcopy, offer value, accept-button label, close-"X" size and
 * position, backdrop-dismiss behaviour, tap-target size, contrast, animation
 * and timing are byte-identical across all four conditions (PRD §3, §6).
 *
 * If you are about to add a per-condition field to this file — anything other
 * than the decline string — stop. It confounds the manipulation with a second
 * difference and there is no statistical fix for that after the fact.
 *
 * src/screens/Popup.identical.test.tsx renders all four conditions, blanks the
 * decline label, and asserts the resulting DOM is byte-identical. That test is
 * the enforcement mechanism; keep it passing.
 */

/** Between-subjects factor: which experimental framing a participant gets. */
export type Arm = 'mild' | 'strong' | 'autonomy';

/** Within-subjects factor: which pop-up a given block showed. */
export type PopupCondition = 'neutral' | Arm;

export const ARMS: readonly Arm[] = ['mild', 'strong', 'autonomy'] as const;

/** Target completed-N per arm (PRD §3). Sums to 40. */
export const ARM_TARGETS: Record<Arm, number> = {
  mild: 13,
  strong: 13,
  autonomy: 14,
};

/** THE MANIPULATION. The only condition-dependent string in the application. */
export const DECLINE_COPY: Record<PopupCondition, string> = {
  neutral: 'No thanks',
  mild: 'No thanks, I’ll pay full price',
  strong: 'No thanks, I don’t need to save money',
  autonomy: 'Not now — I’ll decide later',
};

/**
 * Invariant pop-up copy — one set per POP-UP (change_spec_v4_final.md Part 2:
 * each brand now shows two pop-ups), shared by every ARM by construction: the
 * component reads these constants directly rather than receiving them as
 * props, so a per-arm override is not expressible. Both are worded to
 * describe collecting contact info, but neither pop-up actually renders an
 * input or stores anything typed — accepting just shows a confirmation.
 */
export const POPUP1_INVARIANT = {
  headline: 'Get 15% off this order',
  subcopy: "Add your email and we'll apply the discount at checkout.",
  acceptLabel: 'Yes, apply 15% off',
  closeAriaLabel: 'Close',
} as const;

export const POPUP2_INVARIANT = {
  headline: 'Get 15% off your next order',
  subcopy: "Follow us and we'll send the code to your feed.",
  acceptLabel: 'Yes, follow and save',
  closeAriaLabel: 'Close',
} as const;

/** Theoretical label for each arm, used only in the debrief and codebook. */
export const ARM_LABELS: Record<Arm, string> = {
  mild: 'Mild shame (behaviour-framed)',
  strong: 'Strong shame (trait-framed)',
  autonomy: 'Autonomy-preserving',
};

/** Order in which the two pop-ups are shown. */
export type BlockOrder = 'neutral_first' | 'exp_first';

export const BLOCK_ORDERS: readonly BlockOrder[] = ['neutral_first', 'exp_first'] as const;

/** Which brand carries the neutral pop-up. The other carries the experimental one. */
export type BrandPairing = 'aurevella_neutral' | 'veloure_neutral';

export const BRAND_PAIRINGS: readonly BrandPairing[] = [
  'aurevella_neutral',
  'veloure_neutral',
] as const;

/** One counterbalance slot from the pre-generated sequence. */
export interface Slot {
  /** 0-based index into ASSIGNMENT_SEQUENCE. */
  slot: number;
  arm: Arm;
  order: BlockOrder;
  pairing: BrandPairing;
}

/**
 * Response-type coding (PRD §5.2), derived at analysis time — never asked.
 * `latency_ms` and recognition are stored separately so the "Ignore"
 * threshold can be re-tuned without re-collecting.
 */
export type Choice =
  | 'accept'
  | 'decline_button'
  | 'close_x'
  | 'backdrop'
  | 'timeout';

export type ResponseCode = 'comply' | 'resist' | 'avoid' | 'ignore';

/** Fast-dismissal cutoff for the provisional "Ignore" code (PRD §5.2). */
export const IGNORE_LATENCY_MS = 1500;

export function responseCode(
  choice: Choice,
  latencyMs: number | null,
  recognitionCorrect: boolean | null,
): ResponseCode {
  if (choice === 'accept') return 'comply';
  if (
    latencyMs !== null &&
    latencyMs < IGNORE_LATENCY_MS &&
    recognitionCorrect === false
  ) {
    return 'ignore';
  }
  if (choice === 'decline_button') return 'resist';
  return 'avoid'; // close_x, backdrop, timeout
}
