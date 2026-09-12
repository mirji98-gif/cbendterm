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
 *
 * change_spec_v4_1_popup_copy.md: the ASK moved into the headline, at headline
 * weight, alongside the reward. Previously the cost of accepting sat in grey
 * subtext while the headline advertised only the discount, so a participant
 * skimming on a phone could accept before registering that anything was being
 * asked of them — which puts acceptance back at ceiling and leaves the decline
 * wording nothing to act on. Both headlines are now give-this/get-that and
 * structurally parallel; the only intended difference between the two pop-ups
 * is the nature of the ask.
 */
export const POPUP1_INVARIANT = {
  headline: 'Add your email, get 15% off this order',
  subcopy: 'The discount applies at checkout.',
  acceptLabel: 'Yes, apply 15% off',
  closeAriaLabel: 'Close',
} as const;

export const POPUP2_INVARIANT = {
  headline: 'Follow us, get 15% off your next order',
  subcopy: 'We’ll send the code to your feed.',
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

/**
 * Which brand carries the neutral pop-up.
 *
 * change_spec_v4_2 Part 1: this is no longer counterbalanced. Aurevella always
 * carries the neutral pop-ups and Maison Veloure always the experimental ones,
 * in every arm, for every participant. The type therefore has exactly one
 * value, so a stray re-introduction of the draw will not typecheck.
 *
 * The `pairing` COLUMN stays in the data on purpose: it writes this constant on
 * every row so the dataset documents its own design rather than leaving a
 * future reader to infer it from absence.
 *
 * The cost of this is that brand identity is now perfectly confounded with
 * condition — see src/data/brands.ts for the matching work that is the only
 * remaining defence, and README.md for the limitation as it must be written up.
 */
export type BrandPairing = 'locked_aurevella_neutral';

export const LOCKED_PAIRING: BrandPairing = 'locked_aurevella_neutral';

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
