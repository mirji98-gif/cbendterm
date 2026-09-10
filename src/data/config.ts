/**
 * Runtime configuration. Everything a non-developer might need to change
 * during fieldwork lives here.
 */
import type { CutTier } from './items';

/**
 * Apps Script Web App /exec URL. Paste the deployment URL here (or set
 * VITE_ENDPOINT_URL in the environment and leave this empty).
 * See README.md → "Deploy the Apps Script".
 */
export const ENDPOINT_URL: string =
  (import.meta.env?.VITE_ENDPOINT_URL as string | undefined) ?? '';

/**
 * Burden cut tier (PRD §5.3). 0 = full instrument. Raise ONLY after piloting
 * shows the session running over 7 minutes, and raise one step at a time:
 *   1 → drop credibility from the first block only
 *   2 → additionally drop the happy/amused emotion factor
 *   3 → additionally drop switching intention
 * Re-run `npm run gen` after changing this so codebook.md matches.
 */
export const CUT_TIER: CutTier = 0;

export const TIMING = {
  /**
   * Pop-up auto-advance. PRD defines an `abandon` response code but no
   * timeout; without one a participant who freezes loses the whole row.
   * Logged as choice='timeout' and kept distinct from session abandonment.
   */
  popupTimeoutMs: 45_000,
  /**
   * Continuation screen. Button is live from t=0 (no artificial floor) and
   * auto-advances at 8s. `continuation_auto_advanced` records which happened,
   * so ceiling-censored dwell values are flaggable rather than silently
   * indistinguishable from genuine 8s dwells.
   */
  continuationAutoAdvanceMs: 8_000,
  /** Idle threshold after which a session is treated as abandoned. */
  idleAbandonMs: 90_000,
  /** ≥3 pointerdowns inside this window and box count as a rage tap. */
  rageTapWindowMs: 500,
  rageTapRadiusPx: 48,
  /** Sessions with a render gap above this are excluded at analysis (PRD §11). */
  popupRenderGapExclusionMs: 2_000,
  /** Open-ended probe becomes skippable after this long. */
  openEndedSkipAfterMs: 10_000,
  openEndedMinChars: 15,
} as const;

/** Submit retry policy (PRD §7 "Resilience"). */
export const SUBMIT = {
  maxAttempts: 3,
  backoffMs: [1_000, 3_000],
} as const;

export const STORAGE_KEY = 'sf_session_v1';
