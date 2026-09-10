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
 * anger and perceived manipulative intent most, mild sits in between, and the
 * autonomy framing is close to neutral. Do not read anything into the numbers —
 * they are invented.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCK_ITEMS } from '../src/data/items';
import { COLUMN_NAMES } from '../src/data/columns';
import { ASSIGNMENT_SEQUENCE, DESIGN_N } from '../src/data/sequence';
import { DECLINE_COPY, type Arm, type Choice } from '../src/data/conditions';
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

/** Simulated experimental-minus-neutral shift per factor, by arm. */
const EFFECT: Record<Arm, Record<string, number>> = {
  mild:     { anger: 0.5, guilt: 0.6, imi: 0.9,  attrib: 0.6, att_popup: -0.7, att_brand: -0.3, trust: -0.3, cred: -0.2, happy: -0.2, pi: -0.3, ri: -0.4, si: 0.3 },
  strong:   { anger: 1.4, guilt: 0.5, imi: 1.7,  attrib: 1.3, att_popup: -1.4, att_brand: -0.9, trust: -0.8, cred: -0.5, happy: -0.5, pi: -0.9, ri: -1.1, si: 0.8 },
  autonomy: { anger: 0.1, guilt: 0.1, imi: 0.2,  attrib: 0.1, att_popup: -0.1, att_brand: 0.0,  trust: 0.0,  cred: 0.0,  happy: 0.2,  pi: 0.0,  ri: -0.1, si: 0.0 },
};

/** Simulated latency inflation (ms) on the experimental pop-up, by arm. */
const LATENCY_SHIFT: Record<Arm, number> = { mild: 350, strong: 900, autonomy: 60 };

function pickChoice(condition: 'neutral' | Arm): Choice {
  const r = rand();
  if (condition === 'neutral') return r < 0.22 ? 'accept' : r < 0.72 ? 'decline_button' : r < 0.94 ? 'close_x' : 'backdrop';
  if (condition === 'strong') return r < 0.13 ? 'accept' : r < 0.5 ? 'decline_button' : r < 0.9 ? 'close_x' : r < 0.98 ? 'backdrop' : 'timeout';
  if (condition === 'mild') return r < 0.19 ? 'accept' : r < 0.62 ? 'decline_button' : r < 0.93 ? 'close_x' : 'backdrop';
  return r < 0.26 ? 'accept' : r < 0.75 ? 'decline_button' : r < 0.95 ? 'close_x' : 'backdrop';
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

  // One latent draw per factor per block. Without this, items within a scale
  // are independent and the synthetic Cronbach's alphas come out near zero —
  // which would make the dry run misleading about what real data looks like.
  const latent: Record<string, number> = {};
  for (const item of BLOCK_ITEMS) {
    if (latent[item.factor] === undefined) latent[item.factor] = gauss(0, 0.85);
  }

  const responses: Record<string, number | null> = {};
  for (const item of BLOCK_ITEMS) {
    const base =
      item.factor === 'anger' || item.factor === 'guilt' || item.factor === 'imi' || item.factor === 'attrib'
        ? 2.6
        : item.factor === 'distractor'
          ? 3.2
          : 4.6;
    const delta = shift[item.factor] ?? 0;

    // Simulate on the CONSTRUCT scale (high = more of the factor), then map to
    // the RAW scale the participant would have seen. A reverse-keyed item is
    // the mirror of its construct, so the effect, the person intercept and the
    // shared latent must ALL flip together — flipping only the effect leaves
    // reverse-keyed items anti-correlated with their own scale, which shows up
    // as a negative Cronbach's alpha once analysis_starter.R un-reverses them.
    const construct =
      base + delta + personIntercept + latent[item.factor]! + gauss(0, 0.55);
    responses[item.id] = clamp7(item.reverse ? 8 - construct : construct);
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
    responses,
    itemOrder: {},
  };
}

const rows: Record<string, string | number>[] = [];

for (let i = 0; i < DESIGN_N; i++) {
  const slot = ASSIGNMENT_SEQUENCE[i]!;
  const personIntercept = gauss(0, 0.55);
  const startedAt = new Date(Date.UTC(2026, 8, 14 + Math.floor(i / 7), 9 + (i % 7), (i * 7) % 60)).toISOString();

  const session: Session = {
    schema: 1,
    step: 'debrief',
    sectionIndex: 0,
    participantId: `sim-${String(i + 1).padStart(3, '0')}`,
    recruiterId: String((i % 4) + 1),
    isDebug: false,
    cutTier: 0,
    assignment: { source: 'server', slot: slot.slot, arm: slot.arm, order: slot.order, pairing: slot.pairing },
    blocks: {
      neutral: makeBlock('neutral', slot.arm, slot.order, slot.pairing, personIntercept),
      exp: makeBlock('exp', slot.arm, slot.order, slot.pairing, personIntercept),
    },
    endMatter: {
      recognitionNeutral: rand() < 0.62 ? 'neutral' : rand() < 0.5 ? 'dont_remember' : 'mild',
      recognitionExp: rand() < (slot.arm === 'strong' ? 0.78 : 0.6) ? slot.arm : 'dont_remember',
      openEnded: rand() < 0.8 ? 'The second one felt a bit pushy, so I closed it.' : '',
      openEndedSkipped: rand() >= 0.8,
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

  rows.push(serializeSession(session, { status: 'complete', durationS: Math.max(240, gauss(560, 120)) }));
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
