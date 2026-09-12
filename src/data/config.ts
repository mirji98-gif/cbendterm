/**
 * Runtime configuration. Everything a non-developer might need to change
 * during fieldwork lives here.
 */

/**
 * Apps Script Web App /exec URL. Paste the deployment URL here (or set
 * VITE_ENDPOINT_URL in the environment and leave this empty).
 * See README.md → "Deploy the Apps Script".
 */
export const ENDPOINT_URL: string =
  (import.meta.env?.VITE_ENDPOINT_URL as string | undefined) ?? '';

/**
 * Instrument v2 (Instrument_v2.md) has no burden cut tier — the whole point of
 * v2 was cutting the instrument down to five single-item measures per pop-up,
 * so there is nothing left to trim. If v2 still runs long in piloting, cut a
 * question by editing src/data/items.ts / comparative.ts directly and running
 * `npm run gen`, rather than reintroducing a tiered system for ~20 items.
 */

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
} as const;

/** Submit retry policy (PRD §7 "Resilience"). */
export const SUBMIT = {
  maxAttempts: 3,
  backoffMs: [1_000, 3_000],
} as const;

export const STORAGE_KEY = 'sf_session_v1';
