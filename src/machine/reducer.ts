/**
 * The reducer. Pure: (state, action) -> state, with no I/O and no clock reads
 * of its own — callers stamp actions using src/instrumentation/clock.ts so the
 * reducer stays testable and the event log stays honest.
 *
 * Every action appends to `eventLog`. The log is the audit trail: if a derived
 * timing column ever looks wrong, the truth is reconstructible from it.
 */
import { DECLINE_COPY, type Choice } from '../data/conditions';
import { RATED_ITEMS, type DownstreamChoice, type RatedItemId } from '../data/items';
import type {
  Assignment, BlockData, BlockKey, EndMatter, LoggedEvent, Session, Step,
} from './types';
import { blockAtPosition, brandForBlock } from './types';
import { nextStep, isTimingCritical } from './steps';

export const SCHEMA_VERSION = 2;

export type Action =
  | { type: 'log'; event: LoggedEvent }
  | { type: 'consent_accepted'; event: LoggedEvent }
  | { type: 'assignment_resolved'; assignment: Assignment; event: LoggedEvent }
  | { type: 'advance'; event: LoggedEvent }
  | { type: 'store_entered'; block: BlockKey; at: number; event: LoggedEvent }
  | { type: 'product_viewed'; block: BlockKey; sku: string; event: LoggedEvent }
  | { type: 'product_closed'; event: LoggedEvent }
  | { type: 'add_to_bag'; block: BlockKey; sku: string; timeOnStoreMs: number; event: LoggedEvent }
  | { type: 'popup_rendered'; block: BlockKey; renderGapMs: number; event: LoggedEvent }
  | { type: 'popup_telemetry'; block: BlockKey; patch: Partial<BlockData>; event?: LoggedEvent }
  | { type: 'popup_resolved'; block: BlockKey; choice: Choice; latencyMs: number | null; event: LoggedEvent }
  | { type: 'continuation_done'; block: BlockKey; dwellMs: number; autoAdvanced: boolean; event: LoggedEvent }
  | { type: 'rate'; block: BlockKey; itemId: RatedItemId; value: number; event: LoggedEvent }
  | { type: 'downstream_choice'; block: BlockKey; value: DownstreamChoice; event: LoggedEvent }
  | { type: 'block_open_ended'; block: BlockKey; value: string }
  | { type: 'end_matter'; patch: Partial<EndMatter>; event: LoggedEvent }
  | { type: 'submit_started'; submittedAtIso: string; event: LoggedEvent }
  | { type: 'submit_failed'; error: string; event: LoggedEvent }
  | { type: 'submit_succeeded'; event: LoggedEvent }
  | { type: 'restored'; step: Step; event: LoggedEvent };

function withEvent(session: Session, event: LoggedEvent | undefined): Session {
  if (!event) return session;
  return { ...session, eventLog: [...session.eventLog, event] };
}

/** Builds the two blocks once assignment is known. Keyed by condition. */
export function buildBlocks(assignment: Assignment): Record<BlockKey, BlockData> {
  const make = (key: BlockKey): BlockData => {
    const condition = key === 'neutral' ? ('neutral' as const) : assignment.arm;
    const ratings = {} as Record<RatedItemId, number | null>;
    for (const item of RATED_ITEMS) ratings[item.id] = null;
    return {
      key,
      condition,
      brandId: brandForBlock(assignment.pairing, key),
      position: blockAtPosition(assignment.order, 1) === key ? 1 : 2,
      declineLabel: DECLINE_COPY[condition],
      choice: null,
      latencyMs: null,
      timeToFirstTouchMs: null,
      cancelledTaps: 0,
      pointerCancels: 0,
      pressDwellMs: 0,
      postDismissDwellMs: null,
      continuationAutoAdvanced: null,
      scrollEvents: 0,
      rageTaps: 0,
      popupRenderGapMs: null,
      productViewed: null,
      timeOnStoreMs: null,
      timingInvalidated: false,
      ratings,
      downstreamChoice: null,
      openEnded: '',
    };
  };
  return { neutral: make('neutral'), exp: make('exp') };
}

function patchBlock(
  session: Session,
  key: BlockKey,
  patch: Partial<BlockData>,
): Session {
  if (!session.blocks) return session;
  return {
    ...session,
    blocks: { ...session.blocks, [key]: { ...session.blocks[key], ...patch } },
  };
}

function goto(session: Session, step: Step): Session {
  return { ...session, step, lastStepReached: step };
}

export function reducer(session: Session, action: Action): Session {
  const s = withEvent(session, 'event' in action ? action.event : undefined);

  switch (action.type) {
    case 'log':
      return s;

    case 'consent_accepted':
      return goto(s, 'assigning');

    case 'assignment_resolved':
      return goto(
        { ...s, assignment: action.assignment, blocks: buildBlocks(action.assignment) },
        'instructions',
      );

    case 'advance': {
      const next = nextStep(s.step);
      return next ? goto(s, next) : s;
    }

    case 'store_entered':
      return patchBlock(s, action.block, {});

    case 'product_viewed': {
      const viewed = patchBlock(s, action.block, { productViewed: action.sku });
      const next = nextStep(viewed.step);
      return next ? goto(viewed, next) : viewed;
    }

    // Returning to the storefront from a product page. Permitted because these
    // are SHOPPING steps, where browsing back and forth is what makes the
    // store feel real. The questionnaire remains strictly forward-only — there
    // is no action that can move `step` backwards once a block begins.
    case 'product_closed': {
      if (s.step === 'product_1') return goto(s, 'store_1');
      if (s.step === 'product_2') return goto(s, 'store_2');
      return s;
    }

    case 'add_to_bag': {
      const withBag = patchBlock(s, action.block, {
        productViewed: action.sku,
        timeOnStoreMs: action.timeOnStoreMs,
      });
      const next = nextStep(withBag.step);
      return next ? goto(withBag, next) : withBag;
    }

    case 'popup_rendered':
      return patchBlock(s, action.block, { popupRenderGapMs: action.renderGapMs });

    case 'popup_telemetry':
      return patchBlock(s, action.block, action.patch);

    case 'popup_resolved': {
      const block = s.blocks?.[action.block];
      // A reload during this block invalidated its clock. Record the CHOICE
      // (which is still meaningful) but leave latency null rather than
      // reporting a number measured from a re-render.
      const invalidated = block?.timingInvalidated ?? false;
      const resolved = patchBlock(s, action.block, {
        choice: action.choice,
        latencyMs: invalidated ? null : action.latencyMs,
      });
      const next = nextStep(resolved.step);
      return next ? goto(resolved, next) : resolved;
    }

    case 'continuation_done': {
      const block = s.blocks?.[action.block];
      const invalidated = block?.timingInvalidated ?? false;
      const done = patchBlock(s, action.block, {
        postDismissDwellMs: invalidated ? null : action.dwellMs,
        continuationAutoAdvanced: action.autoAdvanced,
      });
      const next = nextStep(done.step);
      return next ? goto(done, next) : done;
    }

    case 'rate': {
      if (!s.blocks) return s;
      const block = s.blocks[action.block];
      return patchBlock(s, action.block, {
        ratings: { ...block.ratings, [action.itemId]: action.value },
      });
    }

    case 'downstream_choice':
      return patchBlock(s, action.block, { downstreamChoice: action.value });

    case 'block_open_ended':
      return patchBlock(s, action.block, { openEnded: action.value });

    case 'end_matter': {
      return { ...s, endMatter: { ...s.endMatter, ...action.patch } };
    }

    case 'submit_started':
      return goto(
        {
          ...s,
          meta: { ...s.meta, submittedAtIso: action.submittedAtIso },
          submitAttempts: s.submitAttempts + 1,
          submitError: null,
        },
        'submitting',
      );

    case 'submit_failed':
      return goto({ ...s, submitError: action.error }, 'rescue');

    case 'submit_succeeded':
      return goto({ ...s, submitError: null }, 'debrief');

    case 'restored': {
      // Restoring INTO a pop-up or continuation screen means the participant
      // reloaded mid-measurement. Never re-show an answered pop-up, and never
      // re-measure: a re-rendered pop-up yields a clean-looking but entirely
      // meaningless latency. Flag it and null the block's timing instead.
      let restored: Session = { ...s, resumedAfterReload: true };
      const key = /_1$/.test(action.step)
        ? restored.assignment && blockAtPosition(restored.assignment.order, 1)
        : /_2$/.test(action.step)
          ? restored.assignment && blockAtPosition(restored.assignment.order, 2)
          : null;
      if (key && isTimingCritical(action.step)) {
        restored = patchBlock(restored, key, {
          timingInvalidated: true,
          latencyMs: null,
          timeToFirstTouchMs: null,
          pressDwellMs: 0,
          postDismissDwellMs: null,
          popupRenderGapMs: null,
        });
      }
      return restored;
    }

    default:
      return s;
  }
}

export function emptyEndMatter(): EndMatter {
  return {
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
  };
}

export function initialSession(opts: {
  participantId: string;
  recruiterId: string;
  isDebug: boolean;
  startedAtIso: string;
  startedAtPerf: number;
  device: string;
  viewport: string;
  dpr: number;
  touch: boolean;
  appVersion: string;
}): Session {
  return {
    schema: SCHEMA_VERSION,
    step: 'consent',
    participantId: opts.participantId,
    recruiterId: opts.recruiterId,
    isDebug: opts.isDebug,
    assignment: null,
    blocks: null,
    endMatter: emptyEndMatter(),
    eventLog: [],
    meta: {
      startedAtIso: opts.startedAtIso,
      startedAtPerf: opts.startedAtPerf,
      submittedAtIso: null,
      device: opts.device,
      viewport: opts.viewport,
      dpr: opts.dpr,
      touch: opts.touch,
      appVersion: opts.appVersion,
    },
    resumedAfterReload: false,
    lastStepReached: 'consent',
    submitAttempts: 0,
    submitError: null,
  };
}
