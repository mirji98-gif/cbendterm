/**
 * Session → one flat CSV row (v2).
 *
 * Keys are exactly src/data/columns.ts COLUMN_NAMES, in that order. A test
 * (serialize.test.ts) asserts the two lists match, so a column can never exist
 * in one place and not the other.
 *
 * Recoding (comparative block, and the difference scores) happens HERE,
 * not in R: the app has the true assignment available at the moment of
 * serialization, which is the most reliable place to compute it.
 * analysis_starter.R re-derives the same values from the raw columns as a
 * verification pass and flags any mismatch — see its "Recoding verification"
 * section — so a future bug in this file cannot go unnoticed.
 */
import { RATED_ITEMS, downstreamOrdinal } from '../data/items';
import { COLUMN_NAMES, BLOCK_PREFIXES } from '../data/columns';
import { BRANDS } from '../data/brands';
import { DECLINE_COPY, responseCode } from '../data/conditions';
import { isAwarenessCorrect } from '../data/awareness';
import { recodeBrandChoice, recodeComparativeScale, expBrandIsPositionTwo } from '../data/comparative';
import type { Session, BlockData, BlockKey } from '../machine/types';

export type Row = Record<string, string | number>;

/** Sheets-friendly booleans: TRUE/FALSE as text, matching the Apps Script. */
function bool(v: boolean | null): string {
  if (v === null) return '';
  return v ? 'TRUE' : 'FALSE';
}

function num(v: number | null | undefined): number | string {
  return v === null || v === undefined || Number.isNaN(v) ? '' : v;
}

function str(v: string | null | undefined): string {
  return v ?? '';
}

/**
 * Awareness correctness, by CONDITION. `null` when the participant has not
 * reached the awareness screen yet (a checkpoint row), which is distinct from
 * a wrong answer and must not be collapsed into FALSE.
 */
function awarenessCorrectByCondition(session: Session, key: BlockKey): boolean | null {
  const order = session.assignment?.order;
  const blocks = session.blocks;
  if (!order || !blocks) return null;
  const position = blocks[key].position;
  const raw = position === 1 ? session.endMatter.awareBrand1Raw : session.endMatter.awareBrand2Raw;
  return isAwarenessCorrect(raw, blocks[key].condition);
}

function blockBehaviouralColumns(session: Session, block: BlockData, prefix: string): Row {
  const p = (s: string) => `${prefix}_${s}`;
  const correct = awarenessCorrectByCondition(session, block.key);
  return {
    [p('condition')]: block.condition,
    [p('brand')]: BRANDS[block.brandId].name,
    [p('block_position')]: String(block.position),
    [p('decline_label')]: block.declineLabel,

    [p('choice')]: str(block.choice),
    [p('response_code')]: block.choice
      ? responseCode(block.choice, block.latencyMs, correct)
      : '',

    [p('latency_ms')]: num(block.latencyMs),
    [p('time_to_first_touch_ms')]: num(block.timeToFirstTouchMs),
    [p('cancelled_taps')]: block.cancelledTaps,
    [p('pointer_cancels')]: block.pointerCancels,
    [p('press_dwell_ms')]: num(block.pressDwellMs),
    [p('post_dismiss_dwell_ms')]: num(block.postDismissDwellMs),
    [p('continuation_auto_advanced')]: bool(block.continuationAutoAdvanced),
    [p('scroll_events')]: block.scrollEvents,
    [p('rage_taps')]: block.rageTaps,
    [p('popup_render_gap_ms')]: num(block.popupRenderGapMs),
    [p('product_viewed')]: str(block.productViewed),
    [p('time_on_store_ms')]: num(block.timeOnStoreMs),
  };
}

function blockSelfReportColumns(block: BlockData, prefix: string): Row {
  const p = (s: string) => `${prefix}_${s}`;
  const row: Row = {};
  for (const item of RATED_ITEMS) {
    row[p(item.id)] = num(block.ratings[item.id] ?? null);
  }
  row[p('b5_raw')] = str(block.downstreamChoice);
  row[p('b5_ord')] = num(downstreamOrdinal(block.downstreamChoice));
  row[p('b6_open')] = block.openEnded;
  return row;
}

/** Empty block columns, so a checkpoint row still has every key present. */
function emptyBlockColumns(prefix: string): Row {
  const row: Row = {};
  for (const name of COLUMN_NAMES) {
    if (name.startsWith(`${prefix}_`)) row[name] = '';
  }
  return row;
}

function diffColumns(blocks: Record<BlockKey, BlockData> | null): Row {
  const row: Row = {};
  if (!blocks) return row;
  for (const item of RATED_ITEMS) {
    const n = blocks.neutral.ratings[item.id];
    const e = blocks.exp.ratings[item.id];
    row[`diff_${item.id}`] = n != null && e != null ? num(e - n) : '';
  }
  const nOrd = downstreamOrdinal(blocks.neutral.downstreamChoice);
  const eOrd = downstreamOrdinal(blocks.exp.downstreamChoice);
  row.diff_b5 = nOrd != null && eOrd != null ? num(eOrd - nOrd) : '';
  return row;
}

function awarenessColumns(session: Session): Row {
  const e = session.endMatter;
  return {
    aware_brand1_raw: str(e.awareBrand1Raw),
    aware_brand2_raw: str(e.awareBrand2Raw),
    aware_neutral_correct: bool(awarenessCorrectByCondition(session, 'neutral')),
    aware_exp_correct: bool(awarenessCorrectByCondition(session, 'exp')),
  };
}

function comparativeColumns(session: Session): Row {
  const e = session.endMatter;
  const blocks = session.blocks;
  const order = session.assignment?.order;
  if (!blocks || !order) {
    return {
      c1_raw: '', c2_raw: '', c3_raw: '', c4_raw: '', c5_raw: '', c6_open: '',
      c1_exp_more_manipulative: '', c2_trust_exp_more: '', c3_recoded: '',
      c4_choose_exp: '', c5_recoded: '',
    };
  }
  const expBrand = blocks.exp.brandId;
  const brand2IsExp = expBrandIsPositionTwo(order);

  return {
    c1_raw: str(e.c1Raw),
    c2_raw: str(e.c2Raw),
    c3_raw: num(e.c3Raw),
    c4_raw: str(e.c4Raw),
    c5_raw: num(e.c5Raw),
    c6_open: e.c6Open,

    c1_exp_more_manipulative: bool(boolFromZeroOne(recodeBrandChoice(e.c1Raw, expBrand))),
    c2_trust_exp_more: bool(boolFromZeroOne(recodeBrandChoice(e.c2Raw, expBrand))),
    c3_recoded: num(recodeComparativeScale(e.c3Raw, brand2IsExp)),
    c4_choose_exp: bool(boolFromZeroOne(recodeBrandChoice(e.c4Raw, expBrand))),
    c5_recoded: num(recodeComparativeScale(e.c5Raw, brand2IsExp)),
  };
}

function boolFromZeroOne(v: 0 | 1 | null): boolean | null {
  return v === null ? null : v === 1;
}

export interface SerializeOptions {
  /** 'partial' for a checkpoint write, 'complete' for the final submit. */
  status: 'partial' | 'complete';
  /** Elapsed seconds from performance.now() deltas, never wall clock. */
  durationS: number;
}

export function serializeSession(session: Session, opts: SerializeOptions): Row {
  const a = session.assignment;
  const blocks = session.blocks;

  const row: Row = {
    participant_id: session.participantId,
    recruiter_id: session.recruiterId,
    status: opts.status,
    is_debug: bool(session.isDebug),
    app_version: session.meta.appVersion,

    assignment_source: a ? a.source : '',
    slot: a ? a.slot : '',
    arm: a ? a.arm : '',
    order: a ? a.order : '',
    pairing: a ? a.pairing : '',
    brand_neutral: blocks ? BRANDS[blocks.neutral.brandId].name : '',
    brand_experimental: blocks ? BRANDS[blocks.exp.brandId].name : '',

    started_at: session.meta.startedAtIso,
    submitted_at: str(session.meta.submittedAtIso),
    received_at: '', // written server-side by the Apps Script
    duration_s: Math.round(opts.durationS * 10) / 10,

    device: session.meta.device,
    viewport: session.meta.viewport,
    dpr: session.meta.dpr,
    touch: bool(session.meta.touch),

    abandoned: bool(opts.status === 'partial'),
    abandoned_at_step: opts.status === 'partial' ? session.lastStepReached : '',
    resumed_after_reload: bool(session.resumedAfterReload),
  };

  for (const prefix of BLOCK_PREFIXES) {
    Object.assign(
      row,
      blocks
        ? {
            ...blockBehaviouralColumns(session, blocks[prefix], prefix),
            ...blockSelfReportColumns(blocks[prefix], prefix),
          }
        : emptyBlockColumns(prefix),
    );
  }

  Object.assign(row, diffColumns(blocks));
  Object.assign(row, awarenessColumns(session));
  Object.assign(row, comparativeColumns(session));

  const e = session.endMatter;
  Object.assign(row, {
    popup_freq: str(e.popupFreq),
    dp_awareness: str(e.dpAwareness),
    shopping_freq: str(e.shoppingFreq),
    age_band: str(e.ageBand),
    gender: str(e.gender),
    occupation: str(e.occupation),

    event_log_json: JSON.stringify(session.eventLog),
  });

  // Emit in canonical order with no extras and no gaps.
  const ordered: Row = {};
  for (const name of COLUMN_NAMES) ordered[name] = row[name] ?? '';
  return ordered;
}

/** Decline label for a condition — used when blocks are constructed. */
export function declineLabelFor(condition: keyof typeof DECLINE_COPY): string {
  return DECLINE_COPY[condition];
}
