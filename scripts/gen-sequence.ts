/**
 * Generates the pre-generated balanced assignment sequence.
 *
 * Run: npm run gen:sequence   →  writes src/data/sequence.ts
 *
 * WHY A FIXED SEQUENCE AND NOT RANDOM ASSIGNMENT
 * At N=40, random assignment gives you approximately 13/13/14 and
 * approximately-crossed counterbalancing. A pre-generated sequence served one
 * slot at a time gives you exactly 13/13/14 with exactly balanced
 * counterbalance cells. That difference is worth more than it sounds when the
 * primary outcome is a within-person difference score.
 *
 * THE 13-ISN'T-DIVISIBLE-BY-4 PROBLEM
 * PRD §3 crosses order (2) × brand-pairing (2) = 4 cells per arm, but the arms
 * are n=13/13/14. 13/4 is not an integer, so per-arm cells cannot all be equal.
 * The extra participants are placed so that the MARGINAL cell counts come out
 * exactly equal (10/10/10/10 across the whole design) — the best achievable
 * allocation. Per-arm cell counts are printed in codebook.md so the residual
 * imbalance is a documented design fact rather than an emergent surprise.
 *
 * SHUFFLING
 * The 40 slots are shuffled with a fixed seed. Unshuffled, slot order would
 * hand every early participant the same arm, confounding arm with recruitment
 * date and recruiter. The seed is fixed so the sequence is reproducible and
 * printable in the codebook.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARMS,
  ARM_TARGETS,
  BLOCK_ORDERS,
  BRAND_PAIRINGS,
  type Arm,
  type BlockOrder,
  type BrandPairing,
} from '../src/data/conditions';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Fixed seed. Changing it changes the sequence; don't, mid-fieldwork. */
const SEED = 20260910;

/** Extra slots beyond N=40, as insurance against consent-then-drop. */
const TOPUP_SLOTS = 12;

interface Cell {
  order: BlockOrder;
  pairing: BrandPairing;
}

/** c0..c3 in a fixed order; index is meaningful and referenced below. */
const CELLS: Cell[] = BLOCK_ORDERS.flatMap((order) =>
  BRAND_PAIRINGS.map((pairing) => ({ order, pairing })),
).sort((a, b) => {
  const oa = BLOCK_ORDERS.indexOf(a.order) * 2 + BRAND_PAIRINGS.indexOf(a.pairing);
  const ob = BLOCK_ORDERS.indexOf(b.order) * 2 + BRAND_PAIRINGS.indexOf(b.pairing);
  return oa - ob;
});

/**
 * Per-arm allocation across the four cells. Hand-chosen (not derived) so the
 * marginal totals land on 10/10/10/10:
 *   mild     13 → 4,3,3,3   (extra in c0)
 *   strong   13 → 3,4,3,3   (extra in c1)
 *   autonomy 14 → 3,3,4,4   (extras in c2, c3)
 *   marginal    → 10,10,10,10
 */
const ALLOCATION: Record<Arm, [number, number, number, number]> = {
  mild: [4, 3, 3, 3],
  strong: [3, 4, 3, 3],
  autonomy: [3, 3, 4, 4],
};

/** Deterministic PRNG so the sequence is reproducible from the seed alone. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

interface RawSlot {
  arm: Arm;
  order: BlockOrder;
  pairing: BrandPairing;
}

function buildBase(): RawSlot[] {
  const slots: RawSlot[] = [];
  for (const arm of ARMS) {
    const alloc = ALLOCATION[arm];
    alloc.forEach((count, cellIndex) => {
      const cell = CELLS[cellIndex]!;
      for (let k = 0; k < count; k++) {
        slots.push({ arm, order: cell.order, pairing: cell.pairing });
      }
    });
  }
  return slots;
}

/** Insurance slots: one per (arm × cell) until TOPUP_SLOTS is filled. */
function buildTopup(): RawSlot[] {
  const slots: RawSlot[] = [];
  outer: for (let round = 0; round < 4; round++) {
    for (const arm of ARMS) {
      const cell = CELLS[round]!;
      slots.push({ arm, order: cell.order, pairing: cell.pairing });
      if (slots.length >= TOPUP_SLOTS) break outer;
    }
  }
  return slots;
}

const rng = mulberry32(SEED);
const base = shuffled(buildBase(), rng);
const topup = shuffled(buildTopup(), rng);
const all: RawSlot[] = [...base, ...topup];

// ── Verification. A silently-wrong sequence is the worst possible bug here,
// so the generator refuses to emit one.
const armCounts = Object.fromEntries(ARMS.map((a) => [a, 0])) as Record<Arm, number>;
const cellCounts = [0, 0, 0, 0];
const perArmCell: Record<Arm, number[]> = {
  mild: [0, 0, 0, 0],
  strong: [0, 0, 0, 0],
  autonomy: [0, 0, 0, 0],
};
for (const s of base) {
  armCounts[s.arm]++;
  const idx = CELLS.findIndex((c) => c.order === s.order && c.pairing === s.pairing);
  cellCounts[idx]!++;
  perArmCell[s.arm]![idx]!++;
}
for (const arm of ARMS) {
  if (armCounts[arm] !== ARM_TARGETS[arm]) {
    throw new Error(`Arm ${arm}: got ${armCounts[arm]}, expected ${ARM_TARGETS[arm]}`);
  }
}
if (!cellCounts.every((c) => c === 10)) {
  throw new Error(`Marginal cell counts not balanced: ${cellCounts.join(',')}`);
}
if (base.length !== 40) throw new Error(`Base is ${base.length}, expected 40`);

const cellLabels = CELLS.map((c) => `${c.order}/${c.pairing}`);

const body = all
  .map(
    (s, i) =>
      `  { slot: ${i}, arm: '${s.arm}', order: '${s.order}', pairing: '${s.pairing}' },`,
  )
  .join('\n');

const out = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: scripts/gen-sequence.ts (seed ${SEED}). Regenerate: npm run gen:sequence
 *
 * Pre-generated balanced assignment sequence. Slots 0-39 are the N=40 design;
 * slots 40-${all.length - 1} are insurance against consent-then-drop.
 *
 * Marginal counterbalance cell counts over slots 0-39: ${cellCounts.join(' / ')}
 *   ${cellLabels.join('\\n *   ')}
 *
 * Per-arm cell counts (see codebook.md):
${ARMS.map((a) => ` *   ${a.padEnd(9)} ${perArmCell[a]!.join(' / ')}  (n=${armCounts[a]})`).join('\n')}
 */
import type { Slot } from './conditions';

export const SEQUENCE_SEED = ${SEED};
export const DESIGN_N = 40;

export const ASSIGNMENT_SEQUENCE: readonly Slot[] = [
${body}
] as const;

/** Counterbalance cell index (0-3) for a slot, for the admin view. */
export const CELL_LABELS: readonly string[] = [
${cellLabels.map((l) => `  '${l}',`).join('\n')}
] as const;
`;

writeFileSync(resolve(HERE, '../src/data/sequence.ts'), out);

console.log(`Wrote src/data/sequence.ts — ${all.length} slots (${base.length} design + ${topup.length} insurance)`);
console.log(`  arms:     ${ARMS.map((a) => `${a}=${armCounts[a]}`).join('  ')}`);
console.log(`  marginal: ${cellCounts.join(' / ')}  (${cellLabels.join(', ')})`);
for (const a of ARMS) console.log(`  ${a.padEnd(9)} ${perArmCell[a]!.join(' / ')}`);
