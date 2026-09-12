/**
 * THE CSV CONTRACT (v4 — change_spec_v4_final.md Part 5).
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
 * v4 changes from v3 (change_spec_group_codes.md): `recruiter_id` is removed
 * (Part 1 — three links, no recruiter dimension). Each brand block now shows
 * TWO pop-ups (Part 2), so every pop-up-specific behavioural field is split
 * into a `p1`/`p2` pair (checkout pop-up / order-confirmation pop-up); fields
 * that describe the BLOCK rather than either pop-up (condition, brand,
 * position, decline label, product viewed, time on store) stay singular.
 * Three new derived columns count accepted pop-ups per brand (Part 5).
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

/** Pop-up prefixes within a block. p1 = checkout, p2 = order confirmation. */
export const POPUP_PREFIXES = ['p1', 'p2'] as const;
export type PopupPrefix = (typeof POPUP_PREFIXES)[number];

const AWARENESS_VALUES = [
  ...(Object.keys(DECLINE_COPY) as (keyof typeof DECLINE_COPY)[]),
  'dont_remember',
] as const;

const BRAND_IDS: readonly BrandId[] = ['aurevella', 'veloure'] as const;
const COMPARATIVE_SENTINELS: readonly ComparativeSentinel[] = [
  'both', 'neither', 'compare_further', 'dont_remember',
];

// ── 1. Session identity (change_spec_v4_2 Part 2) ─────────────────────────
const SESSION_COLUMNS: ColumnSpec[] = [
  { name: 'participant_id', group: 'Session identity', type: 'string', description: 'Client-generated UUID, minted at consent. Upsert key — a checkpoint row and the final row share it.' },
  { name: 'app_version', group: 'Session identity', type: 'string', description: 'Build identifier, so a mid-fieldwork change is detectable in the data. 4.2.0 is the locked-pairing build.' },
  { name: 'status', group: 'Session identity', type: 'enum', values: ['complete', 'incomplete'], description: 'complete = participant reached submit. incomplete = a checkpoint row that was never superseded, i.e. the participant dropped out. Never a silent partial row: every incomplete row also carries abandoned=TRUE and abandoned_at_step.' },
  { name: 'is_debug', group: 'Session identity', type: 'bool', description: 'TRUE for ?debug=1 sessions. Debug runs write real rows through the real code path, so they are filterable rather than deletable-by-memory. Exclude them from every count.' },
  { name: 'started_at', group: 'Session identity', type: 'iso8601', description: 'Wall clock at consent, UTC. Phone clocks can be skewed — do not compute durations from this.' },
  { name: 'submitted_at', group: 'Session identity', type: 'iso8601', description: 'Wall clock at submit, UTC.' },
  { name: 'received_at', group: 'Session identity', type: 'iso8601', description: 'Server-side receipt time, written by the Apps Script. Compare with submitted_at to detect device clock skew.' },
  { name: 'duration_s', group: 'Session identity', type: 'float', description: 'Consent → submit, computed from performance.now() deltas rather than wall clock, so a device clock jump cannot corrupt it.' },
  { name: 'device', group: 'Session identity', type: 'string', description: 'Full user-agent string. Needed to interpret timing: mobile jank makes latency noisy, and device class is the first thing to check when it does.' },
  { name: 'viewport', group: 'Session identity', type: 'string', description: 'CSS pixel viewport at start, "WxH".' },
  { name: 'dpr', group: 'Session identity', type: 'float', description: 'devicePixelRatio at session start. Together with viewport it reconstructs the physical size the participant actually saw the pop-up at.' },
  { name: 'touch', group: 'Session identity', type: 'bool', description: 'TRUE if the device reported touch support. Press-dwell is near-meaningless when TRUE (no hover on touch).' },
  { name: 'abandoned', group: 'Session identity', type: 'bool', description: 'TRUE when the row is a checkpoint that was never superseded by a completed submit. Session-level because a participant abandons a session, not a pop-up. See the per-pop-up `*_abandoned` columns for which specific pop-ups were never reached.' },
  { name: 'abandoned_at_step', group: 'Session identity', type: 'string', description: 'Last step reached before the session stopped, as of the moment this row was written. Blank for completed sessions.' },
  { name: 'resumed_after_reload', group: 'Session identity', type: 'bool', description: 'TRUE if the participant reloaded mid-session and state was restored from localStorage. When the interrupted step was a pop-up, confirmation or continuation screen, that pop-up’s timing fields are NULL by design — never re-measured, because a re-rendered pop-up produces a clean-looking but meaningless latency.' },
];

// ── 2. Condition identity ─────────────────────────────────────────────────
// Every row must be reconstructable cold, without the code or an external
// mapping: which link, which arm, which order, which brand, and the literal
// strings the participant actually read.
const CONDITION_COLUMNS: ColumnSpec[] = [
  { name: 'group_code', group: 'Condition identity', type: 'enum', values: ['k7m2', 'p6hd', 'n1ls', ''], description: 'The raw ?g= value as received, when it decoded to an arm. Empty when the link carried no code or an unrecognised one — in which case assignment_source is "random". Recorded in the dataset only; never rendered anywhere a participant could see it.' },
  { name: 'arm', group: 'Condition identity', type: 'enum', values: ['mild', 'strong', 'autonomy'], description: 'Between-subjects framing arm, decoded from the recruiting link.' },
  { name: 'assignment_source', group: 'Condition identity', type: 'enum', values: ['group_code', 'random', 'debug'], description: 'group_code = arm decoded from a valid ?g= link. random = the code was missing or unrecognised, so the client picked an arm uniformly at random (never a fixed default). debug = forced via ?debug=1, which also sets is_debug.' },
  { name: 'order', group: 'Condition identity', type: 'enum', values: ['neutral_first', 'exp_first'], description: 'Which store the participant visited first. Randomised per session. Also determines which brand is "Brand 1" / "Brand 2" in the comparative block.' },
  { name: 'pairing', group: 'Condition identity', type: 'enum', values: ['locked_aurevella_neutral'], description: 'Brand-condition pairing. CONSTANT BY DESIGN as of change_spec_v4_2: Aurevella always carried the neutral pop-ups and Maison Veloure the experimental ones. Written on every row so the dataset documents the design rather than leaving it to be inferred. Brand is therefore confounded with condition — see README limitations.' },
  { name: 'brand_neutral', group: 'Condition identity', type: 'string', description: 'Brand that showed the neutral pop-ups. Always Aurevella.' },
  { name: 'brand_experimental', group: 'Condition identity', type: 'string', description: 'Brand that showed the experimental (arm) pop-ups. Always Maison Veloure. This is `exp_brand` in the recoding rules below.' },
  { name: 'decline_text_neutral', group: 'Condition identity', type: 'string', description: 'The literal decline-button string shown on both neutral pop-ups, written from the same constant the pop-up renders. Records what the participant actually saw rather than a label pointing at code that may since have changed — if a wording bug ever ships, this column is how you find out.' },
  { name: 'decline_text_experimental', group: 'Condition identity', type: 'string', description: 'The literal decline-button string shown on both experimental pop-ups, written from the same constant the pop-up renders. Must correspond to `arm` on every row; analysis_starter.R asserts this and refuses to run if it does not.' },
];

// ── Once-per-BLOCK behavioural columns (not per pop-up) ────────────────────
interface FieldSpec {
  suffix: string;
  type: ColumnType;
  values?: readonly string[];
  description: string;
}

const BLOCK_LEVEL: FieldSpec[] = [
  { suffix: 'condition', type: 'enum', values: ['neutral', 'mild', 'strong', 'autonomy'], description: 'Pop-up condition shown by both of this block\'s pop-ups. Redundant with arm+prefix; kept so each block row is self-describing.' },
  { suffix: 'brand', type: 'string', description: 'Brand shown in this block.' },
  { suffix: 'block_position', type: 'enum', values: ['1', '2'], description: 'Whether this block was seen first or second. Derivable from `order`; stored to make order effects trivial to model.' },
  { suffix: 'decline_label', type: 'string', description: 'The exact decline-button string this participant saw on BOTH of this block\'s pop-ups (change_spec_v4_final.md Part 2: decline wording is constant within a brand). Stored verbatim as a provenance check that the manipulation rendered as intended.' },
  { suffix: 'product_viewed', type: 'string', description: 'SKU the participant added to the bag.' },
  { suffix: 'time_on_store_ms', type: 'float', description: 'Storefront entry → add-to-bag. Engagement/investment proxy (Campbell 1995: personal investment drives inferences of manipulative intent).' },
];

// ── Per-POP-UP behavioural columns (p1 = checkout, p2 = order confirmation) ─
const POPUP_LEVEL: FieldSpec[] = [
  // change_spec_v4_2 Part 2: three descriptive columns so each pop-up is
  // interpretable on its own, without reconstructing it from arm + order.
  { suffix: 'brand', type: 'enum', values: ['Aurevella', 'Maison Veloure'], description: 'Which store showed this pop-up. Fixed by condition as of v4.2 — Aurevella for the neutral pair, Maison Veloure for the experimental pair.' },
  { suffix: 'ask', type: 'enum', values: ['email', 'social_follow'], description: 'What this pop-up asked for in exchange for the discount: an email address at checkout (p1) or a social follow after purchase (p2). Neither is ever actually collected.' },
  { suffix: 'position', type: 'enum', values: ['1', '2', '3', '4'], description: 'Where this pop-up fell in the session, 1-4. Derived from `order`. THIS IS WHAT LETS YOU TEST FATIGUE: with four pop-ups, acceptance very likely declines across the session, and without position that decline cannot be separated from condition.' },

  { suffix: 'choice', type: 'enum', values: ['accept', 'decline_button', 'close_x', 'backdrop', 'timeout'], description: 'How this pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s).' },
  { suffix: 'response_code', type: 'enum', values: ['comply', 'resist', 'avoid', 'ignore'], description: 'Derived coding. Recomputed in analysis_starter.R from choice + latency + awareness so the Ignore threshold can be re-tuned; the stored value uses 1500 ms.' },
  { suffix: 'latency_ms', type: 'float', description: 'This pop-up fully rendered → first committed action. A primary behavioural DV. NULL means data loss, not "no response".' },
  { suffix: 'time_to_first_touch_ms', type: 'float', description: 'Pop-up rendered → first pointerdown anywhere in the modal.' },
  { suffix: 'cancelled_taps', type: 'int', description: 'pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal.' },
  { suffix: 'pointer_cancels', type: 'int', description: 'pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps would make that column largely a measure of scrolling.' },
  { suffix: 'press_dwell_ms', type: 'float', description: 'Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation.' },
  { suffix: 'post_dismiss_dwell_ms', type: 'float', description: 'For p1: time on the order-confirmation screen before pop-up 2 renders (necessarily short — there is no participant action in between). For p2: time on the real continuation screen before advancing.' },
  { suffix: 'continuation_auto_advanced', type: 'bool', description: 'p2 only: TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks p2_post_dismiss_dwell_ms as ceiling-censored. Always FALSE for p1, which has no auto-advance concept.' },
  { suffix: 'scroll_events', type: 'int', description: 'Scroll events while this pop-up was open.' },
  { suffix: 'rage_taps', type: 'int', description: 'Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy.' },
  { suffix: 'popup_render_gap_ms', type: 'float', description: 'Trigger action (add-to-bag for p1; pop-up 1 resolving for p2) → this pop-up\'s first painted frame (double-rAF after mount). Sessions with a >2s render gap are excluded (see codebook §10).' },
  { suffix: 'abandoned', type: 'bool', description: 'TRUE when this pop-up was never resolved (choice is blank) — either because the row is a checkpoint the participant dropped out of before reaching it, or dropped after it rendered but before responding. Always FALSE on a complete row.' },
];

function blockLevelColumns(prefix: BlockPrefix): ColumnSpec[] {
  const label = prefix === 'neutral' ? 'neutral' : 'experimental';
  return BLOCK_LEVEL.map((b) => ({
    name: `${prefix}_${b.suffix}`,
    group: `Behavioural — ${label} block`,
    type: b.type,
    ...(b.values ? { values: b.values } : {}),
    description: b.description,
  }));
}

function popupColumns(prefix: BlockPrefix, popup: PopupPrefix): ColumnSpec[] {
  const label = prefix === 'neutral' ? 'neutral' : 'experimental';
  const popupLabel = popup === 'p1' ? 'checkout pop-up' : 'order-confirmation pop-up';
  return POPUP_LEVEL.map((f) => ({
    name: `${prefix}_${popup}_${f.suffix}`,
    group: `Behavioural — ${label} block, ${popupLabel}`,
    type: f.type,
    ...(f.values ? { values: f.values } : {}),
    description: f.description,
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
  ];
}

// ── Open-ended, grouped together near the end (change_spec_v4_2 Part 3) ────
// Free text is wide and irregular; keeping it out of the numeric blocks makes
// the Sheet readable, and keeping the three together makes them easy to
// read (or strip) in one pass.
const OPEN_ENDED_COLUMNS: ColumnSpec[] = [
  { name: 'neutral_b6_open', group: 'Open-ended', type: 'string', description: 'Optional open-ended for the neutral brand, asked once per brand. Blank = skipped, which is always allowed.' },
  { name: 'exp_b6_open', group: 'Open-ended', type: 'string', description: 'Optional open-ended for the experimental brand, asked once per brand. Blank = skipped, which is always allowed.' },
  { name: 'c6_open', group: 'Open-ended', type: 'string', description: 'Optional open-ended from the comparative block: the biggest difference noticed between the two experiences. Blank = skipped.' },
];

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

// ── Acceptance counts (change_spec_v4_final.md Part 5 — new in v4) ─────────
const ACCEPTS_COLUMNS: ColumnSpec[] = [
  { name: 'neutral_accepts', group: 'Difference scores', type: 'int', description: 'Count of the neutral block\'s two pop-ups accepted (0-2).' },
  { name: 'exp_accepts', group: 'Difference scores', type: 'int', description: 'Count of the experimental block\'s two pop-ups accepted (0-2).' },
  { name: 'diff_accepts', group: 'Difference scores', type: 'int', description: 'exp_accepts − neutral_accepts. A second, purely behavioural acceptance-count outcome alongside the rated-item difference scores.' },
];

// ── Awareness (screen 10) — keyed by PRESENTATION POSITION ─────────────────
const AWARENESS_COLUMNS: ColumnSpec[] = [
  { name: 'aware_brand1_raw', group: 'Awareness', type: 'enum', values: AWARENESS_VALUES, description: 'Which statement the participant chose for the brand shown FIRST (position 1, not condition).' },
  { name: 'aware_brand2_raw', group: 'Awareness', type: 'enum', values: AWARENESS_VALUES, description: 'Same, for the brand shown SECOND (position 2).' },
  { name: 'aware_neutral_correct', group: 'Awareness', type: 'bool', description: 'TRUE if the participant correctly identified the statement for whichever brand carried the NEUTRAL pop-ups (recoded by condition, not position). "Don\'t remember" counts as incorrect.' },
  { name: 'aware_exp_correct', group: 'Awareness', type: 'bool', description: 'Same, for the brand that carried the EXPERIMENTAL pop-ups. Feeds the "Ignore" response code.' },
];

// ── Comparative block (screen 11) — raw AND recoded ─────────────────────────
const COMPARATIVE_COLUMNS: ColumnSpec[] = [
  { name: 'c1_raw', group: 'Comparative', type: 'enum', values: [...BRAND_IDS, 'both', 'neither', 'dont_remember'], description: `Raw answer: which brand's pop-ups felt more manipulative. A brand id, or a sentinel (${COMPARATIVE_SENTINELS.filter((s) => s !== 'compare_further').join(', ')}).` },
  { name: 'c2_raw', group: 'Comparative', type: 'enum', values: [...BRAND_IDS, 'both', 'neither'], description: 'Raw answer: which brand the participant would trust more.' },
  { name: 'c3_raw', group: 'Comparative', type: 'int', scale: '1 = much less … 4 = about the same … 7 = much more', description: 'Raw answer: trust in Brand 1 (position 1) compared with Brand 2 (position 2). NOT yet relative to condition — see c3_recoded.' },
  { name: 'c4_raw', group: 'Comparative', type: 'enum', values: [...BRAND_IDS, 'compare_further', 'neither'], description: 'Raw answer: which brand the participant would choose for their next purchase.' },
  { name: 'c5_raw', group: 'Comparative', type: 'int', scale: '1 = much worse … 4 = about the same … 7 = much better', description: 'Raw answer: overall experience with Brand 1 compared with Brand 2. NOT yet relative to condition — see c5_recoded.' },

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

  { name: 'age_band', group: 'Demographics', type: 'enum', values: ['18_24', '25_34', '35_44', '45_plus', 'prefer_not'], description: 'Self-reported age band. Collected as a band rather than a number so no participant is individually identifiable in a small sample.' },
  { name: 'gender', group: 'Demographics', type: 'enum', values: ['woman', 'man', 'non_binary', 'prefer_not'], description: 'Self-reported gender, including a prefer-not-to-say option. Covariate only; the design is not powered to test gender differences at this sample size.' },
  { name: 'occupation', group: 'Demographics', type: 'enum', values: ['student', 'working', 'both', 'other'], description: 'Student / working status.' },

];

const EVENT_LOG_COLUMN: ColumnSpec = {
  name: 'event_log_json',
  group: 'Raw',
  type: 'json',
  description: 'Full ordered event log, every entry stamped with performance.now(). This is the audit trail: if a derived timing column looks wrong, the truth is in here. Last column by design — it is very wide and would otherwise obstruct reading the Sheet.',
};

/**
 * THE canonical column order. Everything downstream reads this.
 *
 * change_spec_v4_2 Part 3 fixes the grouping: session identity → condition
 * identity → per-pop-up behaviour → self-report → derived → open-ended →
 * event log last.
 */
export const COLUMNS: readonly ColumnSpec[] = [
  ...SESSION_COLUMNS,
  ...CONDITION_COLUMNS,
  ...BLOCK_PREFIXES.flatMap((p) => [
    ...blockLevelColumns(p),
    ...POPUP_PREFIXES.flatMap((popup) => popupColumns(p, popup)),
  ]),
  ...BLOCK_PREFIXES.flatMap((p) => blockSelfReportColumns(p)),
  ...AWARENESS_COLUMNS,
  ...COMPARATIVE_COLUMNS,
  ...END_COLUMNS,
  ...DIFF_COLUMNS,
  ...ACCEPTS_COLUMNS,
  ...OPEN_ENDED_COLUMNS,
  EVENT_LOG_COLUMN,
];

export const COLUMN_NAMES: readonly string[] = COLUMNS.map((c) => c.name);
