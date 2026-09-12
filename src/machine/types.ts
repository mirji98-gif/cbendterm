/**
 * Session state shape. One object, mirrored to localStorage on every change.
 *
 * change_spec_v4_final.md Part 2: each brand now shows TWO pop-ups (p1 at
 * checkout, p2 on the order-confirmation screen) instead of one, so the
 * behavioural measurement that used to live flat on BlockData is now split
 * into a PopupResult per pop-up. Self-report (ratings/downstream/open-ended)
 * stays once per brand — Part 4 moves the item STEMS to brand level, but the
 * measurement itself was already once per block.
 */
import type { Arm, BlockOrder, BrandPairing, Choice, PopupCondition } from '../data/conditions';
import type { BrandId } from '../data/brands';
import type { RatedItemId, DownstreamChoice } from '../data/items';
import type { AwarenessAnswer } from '../data/awareness';
import type { ComparativeRaw } from '../data/comparative';

/**
 * 'group_code' = arm decoded from ?g=. 'random' = the code was missing or
 * unrecognised, so the client picked an arm uniformly at random. 'debug' =
 * forced via ?debug=1. v4 drops the recruiter dimension entirely — see
 * change_spec_v4_final.md §1.
 */
export type AssignmentSource = 'group_code' | 'random' | 'debug';

export interface Assignment {
  source: AssignmentSource;
  arm: Arm;
  order: BlockOrder;
  pairing: BrandPairing;
}

/** Blocks are keyed by CONDITION, matching the CSV prefixes. */
export type BlockKey = 'neutral' | 'exp';

/** Which of the two pop-ups within a block: p1 = checkout, p2 = order confirmation. */
export type PopupKey = 'p1' | 'p2';

export interface PopupResult {
  choice: Choice | null;
  latencyMs: number | null;
  timeToFirstTouchMs: number | null;
  cancelledTaps: number;
  pointerCancels: number;
  pressDwellMs: number;
  /**
   * Time on the screen that followed this pop-up. For p1 that's the
   * order-confirmation screen (ends the instant p2 renders on it — there is
   * no participant action in between, so this is necessarily short); for p2
   * it's the real Continuation screen, with a "Continue" button and an 8s
   * auto-advance, exactly like the pre-v4 single pop-up per block.
   */
  postDismissDwellMs: number | null;
  /** Only ever meaningful for p2 — p1's "dwell" has no auto-advance concept. */
  continuationAutoAdvanced: boolean | null;
  scrollEvents: number;
  rageTaps: number;
  popupRenderGapMs: number | null;
  /**
   * TRUE when a reload interrupted THIS pop-up mid-measurement. The timing
   * fields above are then left NULL rather than re-measured: a re-rendered
   * pop-up would produce a clean-looking but entirely meaningless latency,
   * and a flagged null is worth more than a plausible lie.
   */
  timingInvalidated: boolean;
}

export function emptyPopupResult(): PopupResult {
  return {
    choice: null,
    latencyMs: null,
    timeToFirstTouchMs: null,
    cancelledTaps: 0,
    pointerCancels: 0,
    pressDwellMs: 0,
    postDismissDwellMs: null,
    continuationAutoAdvanced: null,
    scrollEvents: 0,
    rageTaps: 0,
    popupRenderGapMs: null,
    timingInvalidated: false,
  };
}

export interface BlockData {
  key: BlockKey;
  condition: PopupCondition;
  brandId: BrandId;
  /** 1 = seen first, 2 = seen second. */
  position: 1 | 2;
  /** The exact decline string rendered on BOTH of this block's pop-ups. */
  declineLabel: string;

  productViewed: string | null;
  timeOnStoreMs: number | null;

  p1: PopupResult;
  p2: PopupResult;

  // ── self-report v2: B1–B4 rated, B5 downstream choice, B6 open-ended.
  // Asked once per BRAND (Part 4), not once per pop-up.
  ratings: Record<RatedItemId, number | null>;
  downstreamChoice: DownstreamChoice | null;
  /** Optional, skippable immediately — no minimum length, no forced wait. */
  openEnded: string;
}

export interface EndMatter {
  // Awareness (screen 10), keyed by PRESENTATION POSITION, not condition —
  // see src/data/comparative.ts for why position and condition must not be
  // conflated.
  awareBrand1Raw: AwarenessAnswer | null;
  awareBrand2Raw: AwarenessAnswer | null;

  // Comparative block (screen 11). Raw values only; recoding relative to the
  // experimental brand happens at serialization time (src/net/serialize.ts),
  // where the true assignment is available.
  c1Raw: ComparativeRaw | null;
  c2Raw: ComparativeRaw | null;
  c3Raw: number | null;
  c4Raw: ComparativeRaw | null;
  c5Raw: number | null;
  c6Open: string;

  popupFreq: string | null;
  dpAwareness: string | null;
  shoppingFreq: string | null;
  ageBand: string | null;
  gender: string | null;
  occupation: string | null;
}

export interface LoggedEvent {
  /** performance.now() at the moment the event occurred. Never null. */
  t: number;
  type: string;
  /** Which block the event belongs to, when applicable. */
  block?: BlockKey;
  /** Which pop-up within the block, when applicable. */
  popup?: PopupKey;
  payload?: Record<string, unknown>;
}

export interface SessionMeta {
  startedAtIso: string;
  /** performance.now() at consent — the origin for every duration. */
  startedAtPerf: number;
  submittedAtIso: string | null;
  device: string;
  viewport: string;
  dpr: number;
  touch: boolean;
  appVersion: string;
}

export type Step =
  | 'consent'
  | 'instructions'
  | 'store_1'
  | 'product_1'
  /** Product page + pop-up 1 overlay. Fires on checkout intent (add-to-bag). */
  | 'checkout_1'
  /** Order-confirmation screen + pop-up 2 overlay. */
  | 'confirm_1'
  | 'continuation_1'
  | 'block_1'
  | 'store_2'
  | 'product_2'
  | 'checkout_2'
  | 'confirm_2'
  | 'continuation_2'
  | 'block_2'
  | 'awareness'
  | 'comparative'
  | 'covariates'
  | 'demographics'
  | 'submitting'
  | 'debrief'
  | 'rescue';

export interface Session {
  /** Bumped when the shape changes, so stale localStorage is discarded. */
  schema: number;
  step: Step;
  participantId: string;
  /**
   * The raw `?g=` value exactly as received, or '' when absent or
   * unrecognised (change_spec_v4_2 Part 2). Recorded in the dataset so a row
   * documents which link produced it; still never rendered in participant-
   * facing UI, which is what the "never show the code" rule was protecting.
   */
  groupCode: string;
  isDebug: boolean;
  assignment: Assignment | null;
  /** Null until assignment resolves. Keyed by condition. */
  blocks: Record<BlockKey, BlockData> | null;
  endMatter: EndMatter;
  eventLog: LoggedEvent[];
  meta: SessionMeta;
  resumedAfterReload: boolean;
  /** Set on restore so the CSV can flag which step a dropout stalled at. */
  lastStepReached: Step;
  submitAttempts: number;
  submitError: string | null;
}

/** Position → block key, given the counterbalanced order. */
export function blockAtPosition(order: BlockOrder, position: 1 | 2): BlockKey {
  if (order === 'neutral_first') return position === 1 ? 'neutral' : 'exp';
  return position === 1 ? 'exp' : 'neutral';
}

/**
 * Which brand carries which condition. Fixed as of change_spec_v4_2 Part 1:
 * Aurevella is always neutral, Maison Veloure is always experimental. The
 * `pairing` argument is retained so every call site still reads as
 * pairing-derived, but it has one possible value.
 */
export function brandForBlock(_pairing: BrandPairing, key: BlockKey): BrandId {
  return key === 'neutral' ? 'aurevella' : 'veloure';
}

/** Which of the four pop-ups this one is, in the order the session showed them. */
export function popupPosition(order: BlockOrder, key: BlockKey, popup: PopupKey): 1 | 2 | 3 | 4 {
  const first = blockAtPosition(order, 1);
  const blockOffset = key === first ? 0 : 2;
  return (blockOffset + (popup === 'p1' ? 1 : 2)) as 1 | 2 | 3 | 4;
}

/** What each pop-up asks for. p1 = email at checkout, p2 = a follow after purchase. */
export const POPUP_ASK: Record<PopupKey, 'email' | 'social_follow'> = {
  p1: 'email',
  p2: 'social_follow',
};
