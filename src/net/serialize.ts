/**
 * Session → one flat CSV row.
 *
 * Keys are exactly src/data/columns.ts COLUMN_NAMES, in that order. A test
 * (serialize.test.ts) asserts the two lists match, so a column can never exist
 * in one place and not the other.
 */
import { BLOCK_ITEMS } from '../data/items';
import { COLUMN_NAMES, BLOCK_PREFIXES } from '../data/columns';
import { BRANDS } from '../data/brands';
import { DECLINE_COPY, responseCode } from '../data/conditions';
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
 * Recognition correctness. `null` when the participant has not reached the
 * recognition screen yet (a checkpoint row), which is distinct from a wrong
 * answer and must not be collapsed into FALSE.
 */
function recognitionCorrect(session: Session, key: BlockKey): boolean | null {
  const answer = key === 'neutral'
    ? session.endMatter.recognitionNeutral
    : session.endMatter.recognitionExp;
  if (answer === null) return null;
  const expected = key === 'neutral' ? 'neutral' : session.assignment?.arm;
  if (!expected) return null;
  return answer === expected;
}

function blockColumns(session: Session, block: BlockData, prefix: string): Row {
  const p = (s: string) => `${prefix}_${s}`;
  const correct = recognitionCorrect(session, block.key);
  const row: Row = {
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

  for (const item of BLOCK_ITEMS) {
    row[p(item.id)] = num(block.responses[item.id] ?? null);
  }
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
    cut_tier: session.cutTier,

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
      blocks ? blockColumns(session, blocks[prefix], prefix) : emptyBlockColumns(prefix),
    );
  }

  const e = session.endMatter;
  Object.assign(row, {
    recognition_neutral: str(e.recognitionNeutral),
    recognition_exp: str(e.recognitionExp),
    recognition_correct_neutral: bool(recognitionCorrect(session, 'neutral')),
    recognition_correct_exp: bool(recognitionCorrect(session, 'exp')),

    open_ended: e.openEnded,
    open_ended_skipped: bool(e.openEndedSkipped),

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
