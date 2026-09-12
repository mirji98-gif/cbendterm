/**
 * THE CSV CONTRACT (v2).
 *
 * One row per participant. This file defines every column exactly once and is
 * the shared source for:
 *   - src/net/serialize.ts   (builds the row)
 *   - apps-script/Code.gs     (sheet header, via scripts/gen-apps-script.ts)
 *   - codebook.md             (via scripts/gen-codebook.ts)
 *   - analysis_starter.R      (column list, via gen-codebook)
 *
 * Because all four are generated from here, a column cannot exist in the CSV
 * without appearing in the codebook.
 *
 * Replaces the v1 column set (Instrument_v2.md replaces PRD §8): the
 * multi-item, multi-factor battery is gone, replaced by five single-item
 * measures per pop-up, an awareness check keyed by presentation position, and
 * a comparative block stored both raw and recoded relative to the
 * experimental brand.
 */
import { RATED_ITEMS, DOWNSTREAM_CHOICE_OPTIONS, SCALE_LABELS, type RatedItem } from './items';
import { DECLINE_COPY } from './conditions';
import type { ComparativeSentinel } from './comparative';
import type { BrandId } from './brands';

export type ColumnType =
  | 'string'
  | 'int'
  | 'float'
  | 'bool'
  | 'iso8601'
  | 'json'
  | 'enum'
  | 'likert7';

export interface ColumnSpec {
  name: string;
  group: string;
  description: string;
  type: ColumnType;
  /** Permitted values for enum columns. */
  values?: readonly string[];
  /** Human-readable scale description; present for rated items. */
  scale?: string;
  note?: string;
}

/** Block prefixes. Keyed by CONDITION, not by presentation position. */
export const BLOCK_PREFIXES = ['neutral', 'exp'] as const;
export type BlockPrefix = (typeof BLOCK_PREFIXES)[number];

const AWARENESS_VALUES = [
  ...(Object.keys(DECLINE_COPY) as (keyof typeof DECLINE_COPY)[]),
  'dont_remember',
] as const;

const BRAND_IDS: readonly BrandId[] = ['aurevella', 'veloure'] as const;
const COMPARATIVE_SENTINELS: readonly ComparativeSentinel[] = [
  'both', 'neither', 'compare_further', 'dont_remember',
];

// ── Session-level identification and metadata ─────────────────────────────
const SESSION_COLUMNS: ColumnSpec[] = [
  { name: 'participant_id', group: 'Session', type: 'string', description: 'Client-generated UUID, minted at consent. Upsert key — a checkpoint row and the final row share it.' },
  { name: 'recruiter_id', group: 'Session', type: 'string', description: 'From ?r=1..4 in the recruiting link. Empty if the link carried no tag.' },
  { name: 'status', group: 'Session', type: 'enum', values: ['partial', 'complete'], description: 'complete = participant reached submit. partial = a checkpoint row that was never superseded, i.e. the participant dropped out.' },
  { name: 'is_debug', group: 'Session', type: 'bool', description: 'TRUE for ?debug=1 sessions. Debug runs write real rows through the real code path; filter them out of every count and export.' },
  { name: 'app_version', group: 'Session', type: 'string', description: 'Build identifier, so a mid-fieldwork change (e.g. the v1→v2 instrument swap) is detectable in the data.' },

  { name: 'assignment_source', group: 'Assignment', type: 'enum', values: ['server', 'fallback', 'debug'], description: "server = slot from the Apps Script assign endpoint. fallback = assign endpoint failed and the client randomised. debug = forced via URL. Report the fallback count as a limitation." },
  { name: 'slot', group: 'Assignment', type: 'int', description: 'Index into the pre-generated sequence (see codebook §Assignment sequence). -1 for fallback assignment.' },
  { name: 'arm', group: 'Assignment', type: 'enum', values: ['mild', 'strong', 'autonomy'], description: 'Between-subjects framing arm.' },
  { name: 'order', group: 'Assignment', type: 'enum', values: ['neutral_first', 'exp_first'], description: 'Presentation order counterbalance. Also determines which brand is "Brand 1" / "Brand 2" in the comparative block.' },
  { name: 'pairing', group: 'Assignment', type: 'enum', values: ['aurevella_neutral', 'veloure_neutral'], description: 'Brand-condition pairing counterbalance: which brand carried the neutral pop-up.' },
  { name: 'brand_neutral', group: 'Assignment', type: 'string', description: 'Brand that showed the neutral pop-up.' },
  { name: 'brand_experimental', group: 'Assignment', type: 'string', description: 'Brand that showed the experimental (arm) pop-up. This is `exp_brand` in the recoding rules below.' },

  { name: 'started_at', group: 'Timing', type: 'iso8601', description: 'Wall clock at consent, UTC. Phone clocks can be skewed — do not compute durations from this.' },
  { name: 'submitted_at', group: 'Timing', type: 'iso8601', description: 'Wall clock at submit, UTC.' },
  { name: 'received_at', group: 'Timing', type: 'iso8601', description: 'Server-side receipt time, written by the Apps Script. Compare with submitted_at to detect device clock skew.' },
  { name: 'duration_s', group: 'Timing', type: 'float', description: 'Consent → submit, computed from performance.now() deltas rather than wall clock, so a device clock jump cannot corrupt it.' },

  { name: 'device', group: 'Environment', type: 'string', description: 'Full user-agent string. Needed to interpret timing: PRD §11 notes mobile jank makes latency noisy, and device class is the first thing to check when it does.' },
  { name: 'viewport', group: 'Environment', type: 'string', description: 'CSS pixel viewport at start, "WxH".' },
  { name: 'dpr', group: 'Environment', type: 'float', description: 'devicePixelRatio at session start. Together with viewport it reconstructs the physical size the participant actually saw the pop-up at.' },
  { name: 'touch', group: 'Environment', type: 'bool', description: 'TRUE if the device reported touch support. Press-dwell is near-meaningless when TRUE (no hover on touch).' },

  { name: 'abandoned', group: 'Attrition', type: 'bool', description: 'TRUE when the row is a checkpoint that was never superseded by a completed submit. Session-level because per-block abandonment is not identifiable — a participant abandons a session, not a pop-up.' },
  { name: 'abandoned_at_step', group: 'Attrition', type: 'string', description: 'Last step reached before the session stopped. Blank for completed sessions.' },
  { name: 'resumed_after_reload', group: 'Attrition', type: 'bool', description: 'TRUE if the participant reloaded mid-session and state was restored from localStorage. When the interrupted step was a pop-up or continuation screen, that block’s timing fields are NULL by design — never re-measured, because a re-rendered pop-up produces a clean-looking but meaningless latency.' },
];

// ── Per-block behavioural columns (unchanged from v1 / PRD §5.1) ──────────
interface BehaviouralSpec {
  suffix: string;
  type: ColumnType;
  values?: readonly string[];
  description: string;
}

const BEHAVIOURAL: BehaviouralSpec[] = [
  { suffix: 'condition', type: 'enum', values: ['neutral', 'mild', 'strong', 'autonomy'], description: 'Pop-up condition shown in this block. Redundant with arm+prefix; kept so each block row is self-describing.' },
  { suffix: 'brand', type: 'string', description: 'Brand shown in this block.' },
  { suffix: 'block_position', type: 'enum', values: ['1', '2'], description: 'Whether this block was seen first or second. Derivable from `order`; stored to make order effects trivial to model.' },
  { suffix: 'decline_label', type: 'string', description: 'The exact decline-button string this participant saw. Stored verbatim as a provenance check that the manipulation rendered as intended.' },

  { suffix: 'choice', type: 'enum', values: ['accept', 'decline_button', 'close_x', 'backdrop', 'timeout'], description: 'How the pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s); PRD names an `abandon` code but gives no threshold, and without one a frozen participant loses the whole row.' },
  { suffix: 'response_code', type: 'enum', values: ['comply', 'resist', 'avoid', 'ignore'], description: 'Derived coding (PRD §5.2). Recomputed in analysis_starter.R from choice + latency + awareness so the Ignore threshold can be re-tuned; the stored value uses 1500 ms.' },

  { suffix: 'latency_ms', type: 'float', description: 'Pop-up fully rendered → first committed action. THE primary behavioural DV. NULL means data loss, not "no response".' },
  { suffix: 'time_to_first_touch_ms', type: 'float', description: 'Pop-up rendered → first pointerdown anywhere in the modal.' },
  { suffix: 'cancelled_taps', type: 'int', description: 'pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal.' },
  { suffix: 'pointer_cancels', type: 'int', description: 'pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps (as PRD §5.1 does) would make that column largely a measure of scrolling.' },
  { suffix: 'press_dwell_ms', type: 'float', description: 'Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation. Interpret with care.' },
  { suffix: 'post_dismiss_dwell_ms', type: 'float', description: 'Time on the continuation screen before advancing.' },
  { suffix: 'continuation_auto_advanced', type: 'bool', description: 'TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks post_dismiss_dwell_ms as ceiling-censored.' },
  { suffix: 'scroll_events', type: 'int', description: 'Scroll events during this block.' },
  { suffix: 'rage_taps', type: 'int', description: 'Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy.' },
  { suffix: 'popup_render_gap_ms', type: 'float', description: 'Add-to-bag pointerdown → pop-up first painted frame (double-rAF after mount). PRD §11 excludes sessions with a >2 s render gap; this is the column that rule applies to.' },
  { suffix: 'product_viewed', type: 'string', description: 'SKU the participant added to the bag.' },
  { suffix: 'time_on_store_ms', type: 'float', description: 'Storefront entry → add-to-bag. Engagement/investment proxy (Campbell 1995: personal investment drives inferences of manipulative intent).' },
];

function blockBehaviouralColumns(prefix: BlockPrefix): ColumnSpec[] {
  const label = prefix === 'neutral' ? 'neutral' : 'experimental';
  return BEHAVIOURAL.map((b) => ({
    name: `${prefix}_${b.suffix}`,
    group: `Behavioural — ${label} block`,
    type: b.type,
    ...(b.values ? { values: b.values } : {}),
    description: b.description,
  }));
}

function ratedItemColumn(prefix: BlockPrefix, item: RatedItem): ColumnSpec {
  const label = prefix === 'neutral' ? 'neutral' : 'experimental';
  const anchors = `1 = ${item.anchorLow} … 7 = ${item.anchorHigh}`;
  return {
    name: `${prefix}_${item.id}`,
    group: `Self-report — ${label} block`,
    type: 'likert7',
    description: item.text,
    scale: `${SCALE_LABELS[item.scale]} (${anchors})`,
    note: item.note,
  };
}

function blockSelfReportColumns(prefix: BlockPrefix): ColumnSpec[] {
  const label = prefix === 'neutral' ? 'neutral' : 'experimental';
  return [
    ...RATED_ITEMS.map((item) => ratedItemColumn(prefix, item)),
    {
      name: `${prefix}_b5_raw`,
      group: `Self-report — ${label} block`,
      type: 'enum',
      values: DOWNSTREAM_CHOICE_OPTIONS.map((o) => o.value),
      description: 'Downstream behavioural choice: what the participant says they would do next.',
    },
    {
      name: `${prefix}_b5_ord`,
      group: `Self-report — ${label} block`,
      type: 'int',
      description: 'Ordinal recode of b5_raw: buy=3, compare=2, competitor=1, avoid=0, not_sure=blank. Feeds diff_b5.',
    },
    {
      name: `${prefix}_b6_open`,
      group: `Self-report — ${label} block`,
      type: 'string',
      description: 'Optional open-ended: "What, if anything, stood out to you about the way the offer was presented?" Blank = skipped, which is always allowed.',
    },
  ];
}

const DIFF_COLUMNS: ColumnSpec[] = [
  ...RATED_ITEMS.map((item) => ({
    name: `diff_${item.id}`,
    group: 'Difference scores',
    type: 'float' as const,
    description: `exp_${item.id} − neutral_${item.id}. THE PRIMARY OUTCOME for this measure (within-person, experimental minus neutral).`,
  })),
  {
    name: 'diff_b5',
    group: 'Difference scores',
    type: 'float',
    description: 'exp_b5_ord − neutral_b5_ord. Blank if either side is not_sure.',
  },
];

// ── Awareness (screen 10) — keyed by PRESENTATION POSITION ─────────────────
const AWARENESS_COLUMNS: ColumnSpec[] = [
  { name: 'aware_brand1_raw', group: 'Awareness', type: 'enum', values: AWARENESS_VALUES, description: 'Which statement the participant chose for the brand shown FIRST (position 1, not condition).' },
  { name: 'aware_brand2_raw', group: 'Awareness', type: 'enum', values: AWARENESS_VALUES, description: 'Same, for the brand shown SECOND (position 2).' },
  { name: 'aware_neutral_correct', group: 'Awareness', type: 'bool', description: 'TRUE if the participant correctly identified the statement for whichever brand carried the NEUTRAL pop-up (recoded by condition, not position). "Don\'t remember" counts as incorrect.' },
  { name: 'aware_exp_correct', group: 'Awareness', type: 'bool', description: 'Same, for the brand that carried the EXPERIMENTAL pop-up. Feeds the "Ignore" response code.' },
];

// ── Comparative block (screen 11) — raw AND recoded ─────────────────────────
const COMPARATIVE_COLUMNS: ColumnSpec[] = [
  { name: 'c1_raw', group: 'Comparative', type: 'enum', values: [...BRAND_IDS, 'both', 'neither', 'dont_remember'], description: `Raw answer: which brand's pop-up felt more manipulative. A brand id, or a sentinel (${COMPARATIVE_SENTINELS.filter((s) => s !== 'compare_further').join(', ')}).` },
  { name: 'c2_raw', group: 'Comparative', type: 'enum', values: [...BRAND_IDS, 'both', 'neither'], description: 'Raw answer: which brand the participant would trust more.' },
  { name: 'c3_raw', group: 'Comparative', type: 'int', scale: '1 = much less … 4 = about the same … 7 = much more', description: 'Raw answer: trust in Brand 1 (position 1) compared with Brand 2 (position 2). NOT yet relative to condition — see c3_recoded.' },
  { name: 'c4_raw', group: 'Comparative', type: 'enum', values: [...BRAND_IDS, 'compare_further', 'neither'], description: 'Raw answer: which brand the participant would choose for their next purchase.' },
  { name: 'c5_raw', group: 'Comparative', type: 'int', scale: '1 = much worse … 4 = about the same … 7 = much better', description: 'Raw answer: overall experience with Brand 1 compared with Brand 2. NOT yet relative to condition — see c5_recoded.' },
  { name: 'c6_open', group: 'Comparative', type: 'string', description: 'Optional open-ended: biggest difference noticed between the two experiences. Blank = skipped.' },

  { name: 'c1_exp_more_manipulative', group: 'Comparative — recoded', type: 'bool', description: 'c1_raw == brand_experimental. Blank if c1_raw is "dont_remember".' },
  { name: 'c2_trust_exp_more', group: 'Comparative — recoded', type: 'bool', description: 'c2_raw == brand_experimental. "Both"/"neither" recode to FALSE per the instrument\'s literal rule, not blank.' },
  { name: 'c3_recoded', group: 'Comparative — recoded', type: 'int', description: 'c3_raw, reversed (8 − raw) when the experimental brand was Brand 2. Reads as "trust in the experimental brand relative to the neutral brand" regardless of presentation order.' },
  { name: 'c4_choose_exp', group: 'Comparative — recoded', type: 'bool', description: 'c4_raw == brand_experimental. "Compare further"/"neither" recode to FALSE per the instrument\'s literal rule.' },
  { name: 'c5_recoded', group: 'Comparative — recoded', type: 'int', description: 'c5_raw, reversed (8 − raw) when the experimental brand was Brand 2. Reads as "experience with the experimental brand relative to the neutral brand" regardless of presentation order.' },
];

// ── End-of-study columns ──────────────────────────────────────────────────
const END_COLUMNS: ColumnSpec[] = [
  { name: 'popup_freq', group: 'Covariates', type: 'enum', values: ['1', '2', '3', '4', '5'], description: 'How often do you see discount pop-ups when shopping online? 1 = never … 5 = very often.' },
  { name: 'dp_awareness', group: 'Covariates', type: 'enum', values: ['yes', 'no', 'not_sure'], description: "Before today, had you come across the term 'dark patterns'?" },
  { name: 'shopping_freq', group: 'Covariates', type: 'enum', values: ['1', '2', '3', '4', '5'], description: 'How often do you shop online? 1 = rarely or never … 5 = several times a week.' },

  { name: 'age_band', group: 'Demographics', type: 'enum', values: ['18_24', '25_34', '35_44', '45_plus', 'prefer_not'], description: 'Self-reported age band. Collected as a band rather than a number so no participant is individually identifiable in a sample of 40.' },
  { name: 'gender', group: 'Demographics', type: 'enum', values: ['woman', 'man', 'non_binary', 'prefer_not'], description: 'Self-reported gender, including a prefer-not-to-say option. Covariate only; the design is not powered to test gender differences at N=40.' },
  { name: 'occupation', group: 'Demographics', type: 'enum', values: ['student', 'working', 'both', 'other'], description: 'Student / working status.' },

  { name: 'event_log_json', group: 'Raw', type: 'json', description: 'Full ordered event log, every entry stamped with performance.now(). This is the audit trail: if a derived timing column looks wrong, the truth is in here.' },
];

/** THE canonical column order. Everything downstream reads this. */
export const COLUMNS: readonly ColumnSpec[] = [
  ...SESSION_COLUMNS,
  ...BLOCK_PREFIXES.flatMap((p) => [
    ...blockBehaviouralColumns(p),
    ...blockSelfReportColumns(p),
  ]),
  ...DIFF_COLUMNS,
  ...AWARENESS_COLUMNS,
  ...COMPARATIVE_COLUMNS,
  ...END_COLUMNS,
];

export const COLUMN_NAMES: readonly string[] = COLUMNS.map((c) => c.name);
