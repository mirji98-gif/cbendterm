/**
 * Group-code arm assignment (change_spec_group_codes.md, v3).
 *
 * Assignment used to come from the app itself (a pre-generated sequence
 * served by the Apps Script `assign` endpoint). It now comes from the
 * recruiting LINK: each participant's `?g=` code is opaque and encodes both
 * their arm and their recruiter. This is how the study gets an exact
 * 15/15/15 split with each arm drawing from all four recruiters' circles —
 * a pre-generated sequence couldn't guarantee the second part, and moving
 * control into the links is the only lever left once the sequence is gone.
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
import { ARMS, BLOCK_ORDERS, BRAND_PAIRINGS, type Arm, type BlockOrder, type BrandPairing } from './conditions';

export interface GroupAssignment {
  recruiter: 1 | 2 | 3 | 4;
  arm: Arm;
}

export const GROUP_CODES: Record<string, GroupAssignment> = {
  k7m2: { recruiter: 1, arm: 'mild' },
  r4xn: { recruiter: 1, arm: 'strong' },
  b9qt: { recruiter: 1, arm: 'autonomy' },
  w3fe: { recruiter: 2, arm: 'mild' },
  p6hd: { recruiter: 2, arm: 'strong' },
  z2vc: { recruiter: 2, arm: 'autonomy' },
  m8ju: { recruiter: 3, arm: 'mild' },
  t5ya: { recruiter: 3, arm: 'strong' },
  n1ls: { recruiter: 3, arm: 'autonomy' },
  d7or: { recruiter: 4, arm: 'mild' },
  h4gw: { recruiter: 4, arm: 'strong' },
  c9ib: { recruiter: 4, arm: 'autonomy' },
};

/** Case-insensitive, whitespace-trimmed, matching how a person might type or paste it. */
export function normalizeGroupCode(raw: string): string {
  return raw.trim().toLowerCase();
}

/** `null` for a missing or unrecognised code — never a default arm. */
export function lookupGroupCode(raw: string | null): GroupAssignment | null {
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
 * Order and brand pairing are nuisance factors being counterbalanced, not
 * the allocation the group codes control, so per-participant randomisation
 * is sufficient — exact balance isn't required (change_spec_group_codes.md
 * §2). Drawn fresh for every participant, valid code or not.
 */
export function randomOrderAndPairing(): { order: BlockOrder; pairing: BrandPairing } {
  return { order: pick(BLOCK_ORDERS), pairing: pick(BRAND_PAIRINGS) };
}
