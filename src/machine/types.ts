/**
 * Session state shape. One object, mirrored to localStorage on every change.
 */
import type { Arm, BlockOrder, BrandPairing, Choice, PopupCondition } from '../data/conditions';
import type { BrandId } from '../data/brands';
import type { RatedItemId, DownstreamChoice } from '../data/items';
import type { AwarenessAnswer } from '../data/awareness';
import type { ComparativeRaw } from '../data/comparative';

export type AssignmentSource = 'server' | 'fallback' | 'debug';

export interface Assignment {
  source: AssignmentSource;
  /** Index into the pre-generated sequence; -1 for fallback/debug. */
  slot: number;
  arm: Arm;
  order: BlockOrder;
  pairing: BrandPairing;
}

/** Blocks are keyed by CONDITION, matching the CSV prefixes. */
export type BlockKey = 'neutral' | 'exp';

export interface BlockData {
  key: BlockKey;
  condition: PopupCondition;
  brandId: BrandId;
  /** 1 = seen first, 2 = seen second. */
  position: 1 | 2;
  /** The exact decline string rendered. Stored as a provenance check. */
  declineLabel: string;

  // ── behavioural (all times from performance.now(), never Date.now) ──
  choice: Choice | null;
  latencyMs: number | null;
  timeToFirstTouchMs: number | null;
  cancelledTaps: number;
  pointerCancels: number;
  pressDwellMs: number;
  postDismissDwellMs: number | null;
  continuationAutoAdvanced: boolean | null;
  scrollEvents: number;
  rageTaps: number;
  popupRenderGapMs: number | null;
  productViewed: string | null;
  timeOnStoreMs: number | null;

  /**
   * TRUE when a reload interrupted this block mid-measurement. The timing
   * fields above are then left NULL rather than re-measured: a re-rendered
   * pop-up would produce a clean-looking but entirely meaningless latency,
   * and a flagged null is worth more than a plausible lie.
   */
  timingInvalidated: boolean;

  // ── self-report v2: B1–B4 rated, B5 downstream choice, B6 open-ended ──
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
  | 'assigning'
  | 'instructions'
  | 'store_1'
  | 'product_1'
  | 'popup_1'
  | 'continuation_1'
  | 'block_1'
  | 'store_2'
  | 'product_2'
  | 'popup_2'
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
  recruiterId: string;
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

/** Which brand carries which condition, given the pairing counterbalance. */
export function brandForBlock(pairing: BrandPairing, key: BlockKey): BrandId {
  const neutralBrand: BrandId = pairing === 'aurevella_neutral' ? 'aurevella' : 'veloure';
  if (key === 'neutral') return neutralBrand;
  return neutralBrand === 'aurevella' ? 'veloure' : 'aurevella';
}
