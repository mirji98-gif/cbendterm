/**
 * Builds a plausible fake Session for round-trip testing, so the transport and
 * the sheet schema can be proven end-to-end before any UI exists.
 */
import { RATED_ITEMS } from '../src/data/items';
import { DECLINE_COPY, type Arm, type BlockOrder, type BrandPairing } from '../src/data/conditions';
import {
  blockAtPosition,
  brandForBlock,
  type BlockData,
  type BlockKey,
  type Session,
} from '../src/machine/types';

let counter = 0;
function rnd(min: number, max: number): number {
  // Deterministic pseudo-random so repeated runs are comparable.
  counter = (counter * 1103515245 + 12345) & 0x7fffffff;
  return min + (counter / 0x7fffffff) * (max - min);
}

function fakeBlock(
  key: BlockKey,
  arm: Arm,
  order: BlockOrder,
  pairing: BrandPairing,
  complete: boolean,
): BlockData {
  const condition = key === 'neutral' ? 'neutral' : arm;
  const position = blockAtPosition(order, 1) === key ? 1 : 2;
  const ratings: BlockData['ratings'] = {
    b1_guilt: null, b2_irritation: null, b3_manipulation: null, b4_trust: null,
  };
  if (complete) {
    for (const item of RATED_ITEMS) ratings[item.id] = Math.max(1, Math.min(7, Math.round(rnd(1, 7))));
  }
  return {
    key,
    condition,
    brandId: brandForBlock(pairing, key),
    position,
    declineLabel: DECLINE_COPY[condition],
    choice: complete ? (key === 'neutral' ? 'decline_button' : 'close_x') : null,
    latencyMs: complete ? Math.round(rnd(900, 6000)) : null,
    timeToFirstTouchMs: complete ? Math.round(rnd(400, 2500)) : null,
    cancelledTaps: complete ? Math.round(rnd(0, 3)) : 0,
    pointerCancels: complete ? Math.round(rnd(0, 6)) : 0,
    pressDwellMs: complete ? Math.round(rnd(60, 400)) : 0,
    postDismissDwellMs: complete ? Math.round(rnd(1200, 8000)) : null,
    continuationAutoAdvanced: complete ? false : null,
    scrollEvents: complete ? Math.round(rnd(2, 20)) : 0,
    rageTaps: complete ? Math.round(rnd(0, 2)) : 0,
    popupRenderGapMs: complete ? Math.round(rnd(80, 400)) : null,
    productViewed: complete ? 'bottle_tall' : null,
    timeOnStoreMs: complete ? Math.round(rnd(8000, 45000)) : null,
    timingInvalidated: false,
    ratings,
    downstreamChoice: complete ? 'compare' : null,
    openEnded: complete ? 'It felt a bit much, to be honest.' : '',
  };
}

export function fakeSession(opts: {
  participantId: string;
  arm: Arm;
  order: BlockOrder;
  pairing: BrandPairing;
  slot: number;
  complete: boolean;
  isDebug?: boolean;
}): Session {
  const { participantId, arm, order, pairing, slot, complete } = opts;
  const now = new Date().toISOString();
  return {
    schema: 2,
    step: complete ? 'debrief' : 'block_1',
    participantId,
    recruiterId: '2',
    isDebug: opts.isDebug ?? false,
    assignment: { source: 'server', slot, arm, order, pairing },
    blocks: {
      neutral: fakeBlock('neutral', arm, order, pairing, complete),
      exp: fakeBlock('exp', arm, order, pairing, complete),
    },
    endMatter: complete
      ? {
          awareBrand1Raw: 'neutral',
          awareBrand2Raw: arm,
          c1Raw: 'aurevella',
          c2Raw: 'veloure',
          // Deliberately contains a comma and a double quote, to prove CSV
          // quoting survives the whole round trip.
          c3Raw: 3,
          c4Raw: 'veloure',
          c5Raw: 3,
          c6Open: 'The second one felt pushy, almost like it was saying "you\'re cheap".',
          popupFreq: '4',
          dpAwareness: 'no',
          shoppingFreq: '3',
          ageBand: '25_34',
          gender: 'prefer_not',
          occupation: 'student',
        }
      : {
          awareBrand1Raw: null,
          awareBrand2Raw: null,
          c1Raw: null,
          c2Raw: null,
          c3Raw: null,
          c4Raw: null,
          c5Raw: null,
          c6Open: '',
          popupFreq: null,
          dpAwareness: null,
          shoppingFreq: null,
          ageBand: null,
          gender: null,
          occupation: null,
        },
    eventLog: [
      { t: 0, type: 'consent_accepted' },
      { t: 1234.5, type: 'popup_rendered', block: 'neutral', payload: { gap_ms: 142 } },
      { t: 3891.25, type: 'popup_choice', block: 'neutral', payload: { choice: 'decline_button' } },
    ],
    meta: {
      startedAtIso: now,
      startedAtPerf: 0,
      submittedAtIso: complete ? now : null,
      device: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36',
      viewport: '360x780',
      dpr: 3,
      touch: true,
      appVersion: 'test',
    },
    resumedAfterReload: false,
    lastStepReached: complete ? 'debrief' : 'block_1',
    submitAttempts: 0,
    submitError: null,
  };
}
