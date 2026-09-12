/**
 * Generates analysis/synthetic_sample.csv — 40 fake participants following the
 * real assignment sequence, with a plausible effect built in.
 *
 * Run: npx tsx scripts/make-synthetic-csv.ts
 *
 * This exists so you can run analysis_starter.R end to end, see what the output
 * looks like, and build your slide templates BEFORE collecting a single real
 * response. It is also how the R script is regression-tested.
 *
 * The simulated effect follows the PRD's own predictions: strong shame raises
 * irritation and perceived manipulation most, mild sits in between, and the
 * autonomy framing is close to neutral. Comparative and awareness answers are
 * simulated with the SAME recode functions the app uses (imported, not
 * reimplemented), so this file doubles as another exerciser of that logic.
 * Do not read anything into the numbers — they are invented.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RATED_ITEMS, type DownstreamChoice } from '../src/data/items';
import { COLUMN_NAMES } from '../src/data/columns';
import { ASSIGNMENT_SEQUENCE, DESIGN_N } from '../src/data/sequence';
import { DECLINE_COPY, type Arm, type Choice } from '../src/data/conditions';
import type { AwarenessAnswer } from '../src/data/awareness';
import type { ComparativeRaw } from '../src/data/comparative';
import { serializeSession } from '../src/net/serialize';
import { blockAtPosition, brandForBlock, type BlockData, type BlockKey, type Session } from '../src/machine/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

let seed = 424242;
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
/** Box-Muller, for believable-looking item noise. */
function gauss(mean = 0, sd = 1): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp7 = (x: number) => Math.max(1, Math.min(7, Math.round(x)));
function pick<T>(items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))]!;
}

/** Simulated experimental-minus-neutral shift per rated item, by arm. */
const EFFECT: Record<Arm, Record<string, number>> = {
  mild:     { b1_guilt: 0.6, b2_irritation: 0.5, b3_manipulation: 0.9, b4_trust: -0.3 },
  strong:   { b1_guilt: 0.5, b2_irritation: 1.4, b3_manipulation: 1.7, b4_trust: -0.8 },
  autonomy: { b1_guilt: 0.1, b2_irritation: 0.1, b3_manipulation: 0.2, b4_trust: 0.0 },
};

/** Simulated latency inflation (ms) on the experimental pop-up, by arm. */
const LATENCY_SHIFT: Record<Arm, number> = { mild: 350, strong: 900, autonomy: 60 };

/** Probability the downstream choice skews toward avoid/competitor, by arm. */
const AVOIDANCE_SHIFT: Record<Arm, number> = { mild: 0.15, strong: 0.35, autonomy: 0.05 };

function pickChoice(condition: 'neutral' | Arm): Choice {
  const r = rand();
  if (condition === 'neutral') return r < 0.22 ? 'accept' : r < 0.72 ? 'decline_button' : r < 0.94 ? 'close_x' : 'backdrop';
  if (condition === 'strong') return r < 0.13 ? 'accept' : r < 0.5 ? 'decline_button' : r < 0.9 ? 'close_x' : r < 0.98 ? 'backdrop' : 'timeout';
  if (condition === 'mild') return r < 0.19 ? 'accept' : r < 0.62 ? 'decline_button' : r < 0.93 ? 'close_x' : 'backdrop';
  return r < 0.26 ? 'accept' : r < 0.75 ? 'decline_button' : r < 0.95 ? 'close_x' : 'backdrop';
}

function pickDownstream(condition: 'neutral' | Arm): DownstreamChoice {
  const shift = condition === 'neutral' ? 0 : AVOIDANCE_SHIFT[condition];
  const r = rand();
  if (r < 0.3 - shift * 0.5) return 'buy';
  if (r < 0.55) return 'compare';
  if (r < 0.55 + shift) return 'competitor';
  if (r < 0.85 + shift * 0.3) return 'avoid';
  return 'not_sure';
}

function makeBlock(
  key: BlockKey,
  arm: Arm,
  order: (typeof ASSIGNMENT_SEQUENCE)[number]['order'],
  pairing: (typeof ASSIGNMENT_SEQUENCE)[number]['pairing'],
  personIntercept: number,
): BlockData {
  const condition = key === 'neutral' ? ('neutral' as const) : arm;
  const shift = key === 'neutral' ? {} : EFFECT[arm];

  const ratings: BlockData['ratings'] = {
    b1_guilt: null, b2_irritation: null, b3_manipulation: null, b4_trust: null,
  };
  for (const item of RATED_ITEMS) {
    const base = item.id === 'b4_trust' ? 4.6 : 2.6;
    const delta = shift[item.id] ?? 0;
    ratings[item.id] = clamp7(base + delta + personIntercept + gauss(0, 0.6));
  }

  const choice = pickChoice(condition);
  const latency = Math.max(300, gauss(2100 + (key === 'neutral' ? 0 : LATENCY_SHIFT[arm]), 900));

  return {
    key, condition,
    brandId: brandForBlock(pairing, key),
    position: blockAtPosition(order, 1) === key ? 1 : 2,
    declineLabel: DECLINE_COPY[condition],
    choice,
    latencyMs: Math.round(latency * 10) / 10,
    timeToFirstTouchMs: Math.round(Math.max(150, latency * 0.45) * 10) / 10,
    cancelledTaps: rand() < (key === 'neutral' ? 0.12 : arm === 'strong' ? 0.34 : 0.2) ? 1 : 0,
    pointerCancels: Math.floor(rand() * 4),
    pressDwellMs: Math.round(gauss(140, 45)),
    postDismissDwellMs: Math.round(Math.max(400, gauss(3200, 1600))),
    continuationAutoAdvanced: rand() < 0.15,
    scrollEvents: Math.floor(rand() * 18) + 2,
    rageTaps: rand() < (arm === 'strong' && key === 'exp' ? 0.14 : 0.04) ? 1 : 0,
    popupRenderGapMs: Math.round(Math.max(40, gauss(180, 90))),
    productViewed: 'bottle_tall',
    timeOnStoreMs: Math.round(Math.max(4000, gauss(24000, 9000))),
    timingInvalidated: false,
    ratings,
    downstreamChoice: pickDownstream(condition),
    openEnded: rand() < 0.5 ? 'Felt a bit pushy, so I closed it.' : '',
  };
}

const rows: Record<string, string | number>[] = [];

for (let i = 0; i < DESIGN_N; i++) {
  const slot = ASSIGNMENT_SEQUENCE[i]!;
  const personIntercept = gauss(0, 0.5);
  const startedAt = new Date(Date.UTC(2026, 8, 14 + Math.floor(i / 7), 9 + (i % 7), (i * 7) % 60)).toISOString();

  const neutralKey = blockAtPosition(slot.order, 1) === 'neutral' ? 'neutral' : 'exp';
  const brand1Key: BlockKey = blockAtPosition(slot.order, 1);
  const brand2Key: BlockKey = blockAtPosition(slot.order, 2);

  // Awareness: more salient conditions are recognised more often.
  const awarenessAccuracy: Record<'neutral' | Arm, number> = {
    neutral: 0.55, mild: 0.6, strong: 0.8, autonomy: 0.5,
  };
  const awareFor = (key: BlockKey): AwarenessAnswer => {
    const condition = key === neutralKey ? 'neutral' : slot.arm;
    return rand() < awarenessAccuracy[condition] ? condition : 'dont_remember';
  };

  // Comparative: skewed toward "the experimental brand felt worse", more so
  // for stronger arms, but built from brand ids the same way the app does.
  const expBrandId = brandForBlock(slot.pairing, 'exp');
  const neutralBrandId = brandForBlock(slot.pairing, 'neutral');
  const manipulationSkew: Record<Arm, number> = { mild: 0.55, strong: 0.75, autonomy: 0.4 };
  const trustSkew: Record<Arm, number> = { mild: 0.45, strong: 0.65, autonomy: 0.35 };

  const c1Raw: ComparativeRaw =
    rand() < manipulationSkew[slot.arm] ? expBrandId : rand() < 0.7 ? neutralBrandId : 'both';
  const c2Raw: ComparativeRaw = rand() < trustSkew[slot.arm] ? neutralBrandId : expBrandId;
  const c4Raw: ComparativeRaw = rand() < trustSkew[slot.arm] * 0.8 ? neutralBrandId : pick([expBrandId, 'compare_further']);
  // Raw C3/C5 are anchored "Brand 1 vs Brand 2", not "neutral vs exp" — build
  // them from whichever brand is actually at position 1, mirroring a real
  // participant who has no notion of "experimental".
  const brand1IsNeutral = brand1Key === 'neutral';
  const trustInBrand1 = brand1IsNeutral
    ? 4 + manipulationSkew[slot.arm] * 2 + gauss(0, 0.8) // Brand 1 (neutral) trusted more
    : 4 - manipulationSkew[slot.arm] * 2 + gauss(0, 0.8);
  const c3Raw = clamp7(trustInBrand1);
  const c5Raw = clamp7(trustInBrand1 + gauss(0, 0.5));

  const session: Session = {
    schema: 2,
    step: 'debrief',
    participantId: `sim-${String(i + 1).padStart(3, '0')}`,
    recruiterId: String((i % 4) + 1),
    isDebug: false,
    assignment: { source: 'server', slot: slot.slot, arm: slot.arm, order: slot.order, pairing: slot.pairing },
    blocks: {
      neutral: makeBlock('neutral', slot.arm, slot.order, slot.pairing, personIntercept),
      exp: makeBlock('exp', slot.arm, slot.order, slot.pairing, personIntercept),
    },
    endMatter: {
      awareBrand1Raw: awareFor(brand1Key),
      awareBrand2Raw: awareFor(brand2Key),
      c1Raw,
      c2Raw,
      c3Raw,
      c4Raw,
      c5Raw,
      c6Open: rand() < 0.4 ? 'The second one felt more pushy than the first.' : '',
      popupFreq: String(Math.min(5, Math.max(1, Math.round(gauss(3.6, 1))))),
      dpAwareness: rand() < 0.3 ? 'yes' : rand() < 0.8 ? 'no' : 'not_sure',
      shoppingFreq: String(Math.min(5, Math.max(1, Math.round(gauss(3.4, 1))))),
      ageBand: ['18_24', '25_34', '25_34', '35_44'][Math.floor(rand() * 4)]!,
      gender: ['woman', 'man', 'man', 'prefer_not'][Math.floor(rand() * 4)]!,
      occupation: ['student', 'working', 'both'][Math.floor(rand() * 3)]!,
    },
    eventLog: [{ t: 0, type: 'consent_accepted' }],
    meta: {
      startedAtIso: startedAt,
      startedAtPerf: 0,
      submittedAtIso: startedAt,
      device: 'Mozilla/5.0 (Linux; Android 13; SM-G991B)',
      viewport: '360x780',
      dpr: 3,
      touch: true,
      appVersion: 'sim',
    },
    resumedAfterReload: false,
    lastStepReached: 'debrief',
    submitAttempts: 1,
    submitError: null,
  };

  rows.push(serializeSession(session, { status: 'complete', durationS: Math.max(200, gauss(340, 80)) }));
}

// Two dropouts and one debug row, so the exclusion logic in the R script is
// exercised by the synthetic data rather than only by real fieldwork.
for (const [pid, status, debug] of [['sim-041', 'partial', false], ['sim-042', 'partial', false], ['sim-999', 'complete', true]] as const) {
  const base = { ...rows[0]! };
  base['participant_id'] = pid;
  base['status'] = status;
  base['is_debug'] = debug ? 'TRUE' : 'FALSE';
  base['abandoned'] = status === 'partial' ? 'TRUE' : 'FALSE';
  base['abandoned_at_step'] = status === 'partial' ? 'block_1' : '';
  if (status === 'partial') {
    for (const name of COLUMN_NAMES) if (name.startsWith('exp_')) base[name] = '';
  }
  rows.push(base);
}

function cell(v: string | number): string {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const csv = [
  COLUMN_NAMES.join(','),
  ...rows.map((r) => COLUMN_NAMES.map((n) => cell(r[n] ?? '')).join(',')),
].join('\n');

mkdirSync(resolve(ROOT, 'analysis'), { recursive: true });
writeFileSync(resolve(ROOT, 'analysis/synthetic_sample.csv'), csv + '\n');
console.log(`Wrote analysis/synthetic_sample.csv — ${rows.length} rows, ${COLUMN_NAMES.length} columns`);
