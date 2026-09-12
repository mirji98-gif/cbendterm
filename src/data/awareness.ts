/**
 * Awareness check — screen 10, asked TWICE, once per brand (Instrument_v2.md
 * §"Screen 10").
 *
 * Asked at the END of the session, never immediately after a pop-up: an
 * immediate check on pop-up A would prime the participant for pop-up B and
 * destroy the "Ignore" classification for the second brand.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ THE STEM MUST NEVER NAME THE LITERAL DECLINE WORDING.                │
 * └──────────────────────────────────────────────────────────────────────┘
 * The neutral condition's button literally reads "No thanks" — a stem or
 * option that quotes any condition's wording verbatim would cue the answer
 * for whichever participant saw that exact condition. Options are phrased as
 * DESCRIPTIONS of what the wording implied, never as quotes.
 * src/screens/Awareness.test.tsx enforces this: it fails if any option text
 * or the stem contains a literal decline string from src/data/conditions.ts.
 */
import { ARMS, type PopupCondition } from './conditions';

export type AwarenessAnswer = PopupCondition | 'dont_remember';

export const AWARENESS_STEM =
  'Which statement best describes the decline option that {BRAND} showed you?';

/**
 * Descriptive statement per condition. Order here is the CANONICAL order;
 * presentation order is shuffled per participant per question (first four
 * only — "I don't remember" is always pinned last, per instrument spec).
 */
export const AWARENESS_STATEMENTS: Record<PopupCondition, string> = {
  neutral: 'It was a neutral way to decline the offer',
  mild: 'It suggested that declining meant missing out financially',
  strong: 'It suggested that declining reflected something negative about me',
  autonomy: 'It encouraged me to decide later',
};

export const AWARENESS_DONT_REMEMBER = "I don't remember / didn't notice the wording";

export const AWARENESS_CONDITIONS: readonly PopupCondition[] = ['neutral', ...ARMS] as const;

export interface AwarenessOption {
  value: AwarenessAnswer;
  label: string;
}

/** The four statement options, unshuffled, plus "don't remember" as a sentinel. */
export function awarenessOptions(): AwarenessOption[] {
  return AWARENESS_CONDITIONS.map((c) => ({ value: c, label: AWARENESS_STATEMENTS[c] }));
}

/**
 * Correctness. `null` when not yet answered (a checkpoint row) — distinct
 * from a wrong answer and must not be collapsed into FALSE. "Don't remember"
 * counts as incorrect, matching the Ignore classification below.
 */
export function isAwarenessCorrect(
  raw: AwarenessAnswer | null,
  actualCondition: PopupCondition,
): boolean | null {
  if (raw === null) return null;
  return raw === actualCondition;
}
