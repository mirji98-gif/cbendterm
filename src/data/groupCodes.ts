/**
 * Group-code arm assignment (change_spec_v4_final.md §1, replacing the
 * recruiter-carrying scheme from change_spec_group_codes.md v3).
 *
 * v4 drops the recruiter dimension entirely: three links, one per arm, no
 * recruiter attribution. Each `?g=` code decodes directly to an arm.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ THIS FILE IS THE ONE THING THAT MUST NEVER REACH A PARTICIPANT.       │
 * └──────────────────────────────────────────────────────────────────────┘
 * The codes are opaque specifically so a participant can't infer their
 * condition from the link. Never import this file into anything that
 * renders participant-facing UI beyond the lookup itself, never log the raw
 * code, and never put it in a URL a participant would see reflected back
 * (e.g. an error message that echoes `?g=`).
 */
import { ARMS, BLOCK_ORDERS, type Arm, type BlockOrder } from './conditions';

export const GROUP_CODES: Record<string, Arm> = {
  k7m2: 'mild',
  p6hd: 'strong',
  n1ls: 'autonomy',
};

/** Case-insensitive, whitespace-trimmed, matching how a person might type or paste it. */
export function normalizeGroupCode(raw: string): string {
  return raw.trim().toLowerCase();
}

/** `null` for a missing or unrecognised code — never a default arm. */
export function lookupGroupCode(raw: string | null): Arm | null {
  if (!raw) return null;
  return GROUP_CODES[normalizeGroupCode(raw)] ?? null;
}

function pick<T>(items: readonly T[]): T {
  const idx = Math.floor(Math.random() * items.length);
  return items[Math.min(idx, items.length - 1)]!;
}

/**
 * A mistyped or missing code must not silently stack participants into one
 * condition — this picks uniformly across all three arms, same as the order
 * and brand-pairing draws below.
 */
export function randomArm(): Arm {
  return pick(ARMS);
}

/**
 * Presentation order is a nuisance factor, not the allocation the group codes
 * control, so per-participant randomisation is sufficient — exact balance
 * isn't required. Drawn fresh for every participant, valid code or not.
 *
 * change_spec_v4_2 Part 1: brand pairing is NO LONGER drawn here. Aurevella is
 * always the neutral brand; only which store the participant visits first
 * still varies.
 */
export function randomOrder(): BlockOrder {
  return pick(BLOCK_ORDERS);
}
