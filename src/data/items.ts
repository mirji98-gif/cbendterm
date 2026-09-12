/**
 * THE ITEM BANK — single source of truth for the instrument (v2).
 *
 * Instrument v2 replaces the v1 multi-item, multi-factor battery with five
 * single-item measures per BRAND (`Instrument_v2.md`, which replaces PRD §4
 * and §5). This is a deliberate reliability-for-completion trade: at N = 40 on
 * phones, a participant who quits at minute seven is a bigger threat to the
 * study than a single-item measure with unknown reliability.
 *
 * change_spec_v4_final.md Part 4: each brand now shows TWO pop-ups, but B1–B6
 * are still asked once per brand (not once per pop-up) — the stems below refer
 * to "this brand's offers" rather than "this pop-up" or "this offer".
 *
 * `codebook.md`, the CSV column list (src/data/columns.ts), the Apps Script
 * sheet header, and `analysis/generated_scales.R` are all GENERATED from this
 * file (and src/data/awareness.ts, src/data/comparative.ts). Never hand-edit
 * those; edit here and run `npm run gen`.
 *
 * WHAT'S KEPT vs v1: perceived manipulation, irritation (the mediator),
 * brand trust, a downstream behavioural choice, awareness, and the
 * within-person difference score. WHAT'S GIVEN UP: Cronbach's alpha, the
 * credibility axis, brand attributions, and the guilt/anger/amusement factor
 * structure. State this trade-off in the limitations slide.
 */

export type ScaleKind =
  /** 1 = strongly disagree … 7 = strongly agree */
  | 'agree'
  /** 1 = not at all … 7 = very strongly */
  | 'intensity';

export const SCALE_LABELS: Record<ScaleKind, string> = {
  agree: '7-point Likert, 1 = strongly disagree … 7 = strongly agree',
  intensity: '7-point intensity, 1 = not at all … 7 = very strongly',
};

/** A single rated item. No factor, no reverse flag — v2 has neither. */
export interface RatedItem {
  /** Column suffix. Final CSV column is `neutral_<id>` / `exp_<id>`. */
  id: 'b1_guilt' | 'b2_irritation' | 'b3_manipulation' | 'b4_trust';
  /** Participant-facing text, verbatim from Instrument_v2.md. */
  text: string;
  scale: ScaleKind;
  anchorLow: string;
  anchorHigh: string;
  /** Analyst-facing note. Rendered into the codebook. */
  note: string;
}

/**
 * B1–B4, in FIXED, FORCED order — the array order IS the presentation order.
 * This is a validity constraint, not a layout choice: feelings (guilt,
 * irritation) must be measured before any item that names pressure or intent
 * (manipulation), or the mediator is contaminated by demand. There is no
 * randomisation here, deliberately — with only four items the "emotions
 * before intent" rule is a per-item ordering constraint, not a category-level
 * one, so shuffling within the screen could put B3 before B2 by chance.
 */
export const RATED_ITEMS: readonly RatedItem[] = [
  {
    id: 'b1_guilt',
    text: "I felt guilty about declining this brand's offers.",
    scale: 'intensity',
    anchorLow: 'Not at all',
    anchorHigh: 'Very strongly',
    note:
      'Keeps H1 testable — without a guilt item there is no basis for calling this a guilt appeal, ' +
      'which is the entire premise of the Peng et al. prediction. Worded as guilt about DECLINING, ' +
      'not about the brand. change_spec_v4_final.md Part 4 moves the stem to brand level: with two ' +
      "pop-ups per brand now sharing the same decline wording, \"this brand's offers\" (plural) is " +
      'the accurate referent, not any single pop-up.',
  },
  {
    id: 'b2_irritation',
    text: "I felt irritated by the way this brand presented its offers.",
    scale: 'intensity',
    anchorLow: 'Not at all',
    anchorHigh: 'Very strongly',
    note:
      'THE MEDIATOR. Per Coulter & Pinto (1995), anger/irritation — not felt guilt — carries the ' +
      'damage to trust and purchase intention. Treat this as the mediator in analysis, not a ' +
      'descriptive aside.',
  },
  {
    id: 'b3_manipulation',
    text: "The way this brand presented its offers was intended to pressure me into accepting.",
    scale: 'agree',
    anchorLow: 'Strongly disagree',
    anchorHigh: 'Strongly agree',
    note: 'Tests H3 (perceived manipulative intent).',
  },
  {
    id: 'b4_trust',
    text: 'I would trust this brand.',
    scale: 'agree',
    anchorLow: 'Strongly disagree',
    anchorHigh: 'Strongly agree',
    note:
      'Deliberately LEVEL-framed, not change-framed ("compared with before" etc.). The within-person ' +
      'difference score (experimental − neutral) is what measures the trust penalty; if the item ' +
      'itself also contained a comparison, the two would nest and become uninterpretable. A level ' +
      'item also lets trust go UP, which H4 predicts for the autonomy arm — a change-framed item ' +
      'cannot detect that.',
  },
] as const;

export type RatedItemId = (typeof RATED_ITEMS)[number]['id'];

export const RATED_ITEM_IDS: readonly RatedItemId[] = RATED_ITEMS.map((i) => i.id);

// ── B5: downstream behavioural choice ───────────────────────────────────────

/**
 * Single-select. Stored raw AND as a derived ordinal (`b5_ord`) so it can be
 * differenced like the rated items. With 13 per arm, the raw five-way
 * cross-tab will have cells of two or three people — report the ordinal
 * difference score as the headline and the cross-tab as colour.
 */
export type DownstreamChoice = 'buy' | 'compare' | 'competitor' | 'avoid' | 'not_sure';

export const DOWNSTREAM_CHOICE_STEM =
  'If you were actually shopping for this type of product, which would you be most likely to do ' +
  'after this experience?';

export const DOWNSTREAM_CHOICE_OPTIONS: readonly { value: DownstreamChoice; label: string }[] = [
  { value: 'buy', label: 'Buy from this brand' },
  { value: 'compare', label: 'Consider buying from this brand, but compare alternatives first' },
  { value: 'competitor', label: 'Probably choose a competing brand instead' },
  { value: 'avoid', label: 'I would avoid buying either way' },
  { value: 'not_sure', label: 'Not sure' },
];

/** Ordinal mapping: buy=3 … avoid=0, not_sure=NA (excluded from the difference score). */
export const DOWNSTREAM_ORDINAL: Record<DownstreamChoice, number | null> = {
  buy: 3,
  compare: 2,
  competitor: 1,
  avoid: 0,
  not_sure: null,
};

export function downstreamOrdinal(raw: DownstreamChoice | null): number | null {
  return raw === null ? null : DOWNSTREAM_ORDINAL[raw];
}

// ── B6: open-ended ───────────────────────────────────────────────────────────

/** Optional, skippable immediately — no minimum length, no forced wait. */
export const BLOCK_OPEN_ENDED_STEM =
  'What, if anything, stood out to you about the way this brand presented its offers?';
