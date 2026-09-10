/**
 * THE ITEM BANK — single source of truth for the instrument.
 *
 * Every questionnaire item lives here exactly once. `codebook.md`, the CSV
 * column list (src/data/columns.ts), the Apps Script sheet header, and the
 * reverse-coding vector in analysis_starter.R are all GENERATED from this
 * file. Never hand-edit those; edit here and run `npm run gen`.
 *
 * Sources: Coulter & Pinto (1995) emotions; Campbell (1995) IMI;
 * Cotte, Coulter & Moore (2005) credibility; PRD §5.3.
 */

export type ScaleKind =
  /** 1 = strongly disagree … 7 = strongly agree */
  | 'likert_agree'
  /** 1 = not at all … 7 = very strongly */
  | 'emotion_intensity'
  /** 7-point bipolar, negative pole always at 1 (see codebook: polarity rule) */
  | 'semantic_diff'
  /** 1 = very unlikely … 7 = very likely */
  | 'likelihood';

/** Scale/factor an item loads on. One column group per factor in the CSV. */
export type Factor =
  | 'guilt'
  | 'anger'
  | 'happy'
  | 'distractor'
  | 'att_popup'
  | 'att_brand'
  | 'trust'
  | 'pi'
  | 'ri'
  | 'si'
  | 'imi'
  | 'cred'
  | 'attrib';

/**
 * Questionnaire screens, in FORCED order. This order is an experimental
 * validity constraint, not a layout preference (PRD §2.2): felt emotions are
 * measured before any item that mentions manipulation or intent, so that the
 * mediator cannot be contaminated by demand. Do not reorder.
 */
export type SectionId =
  | 'emotions'
  | 'attitudes'
  | 'imi'
  | 'attributions'
  | 'credibility';

/** Order is load-bearing. `SECTION_ORDER.indexOf` drives the step machine. */
export const SECTION_ORDER: readonly SectionId[] = [
  'emotions',
  'attitudes',
  'imi',
  'attributions',
  'credibility',
] as const;

export interface Section {
  id: SectionId;
  /** Shown at the top of the screen. `{BRAND}` is interpolated at render. */
  stem: string;
  /** Randomise item presentation order within this screen? */
  randomise: boolean;
}

export const SECTIONS: Record<SectionId, Section> = {
  emotions: {
    id: 'emotions',
    stem: 'How did that pop-up make you feel?',
    // PRD §5.3(a): "Present in a single randomised grid." Distractors stay in
    // the shuffle pool rather than being appended, or they stop distracting.
    randomise: true,
  },
  attitudes: {
    id: 'attitudes',
    stem: 'A few quick reactions to {BRAND}.',
    randomise: false,
  },
  imi: {
    id: 'imi',
    stem: 'How much do you agree with each statement?',
    randomise: true,
  },
  attributions: {
    id: 'attributions',
    stem: 'And how much do you agree with these?',
    randomise: true,
  },
  credibility: {
    id: 'credibility',
    stem: 'Thinking about the offer itself.',
    randomise: true,
  },
};

/**
 * Burden-reduction tiers (PRD §5.3 "Cut rule"). 0 = never cut. If piloting
 * runs over 7 minutes, raise CUT_TIER in src/data/config.ts to 1, then 2,
 * then 3 — in that order. IMI and the anger factor are tier 0 by mandate.
 */
export type CutTier = 0 | 1 | 2 | 3;

export interface Item {
  /** Column suffix. Final CSV column is `neutral_<id>` / `exp_<id>`. */
  id: string;
  /** Participant-facing text. `{BRAND}` interpolated at render time. */
  text: string;
  scale: ScaleKind;
  points: 7;
  /** Label under the 1 end. Always the negative/low pole. */
  anchorLow: string;
  /** Label under the 7 end. Always the positive/high pole. */
  anchorHigh: string;
  factor: Factor;
  /**
   * TRUE if the raw score must be flipped (8 - x) before the item joins its
   * scale score. Survives verbatim into codebook.md and analysis_starter.R.
   */
  reverse: boolean;
  section: SectionId;
  cutTier: CutTier;
  /** 'first_block_only' = dropped from block 1 but kept in block 2. */
  cutScope: 'both' | 'first_block_only';
  /** Analyst-facing note. Rendered into the codebook. */
  note?: string;
}

const EMO_LOW = 'Not at all';
const EMO_HIGH = 'Very strongly';
const AGREE_LOW = 'Strongly disagree';
const AGREE_HIGH = 'Strongly agree';
const LIKELY_LOW = 'Very unlikely';
const LIKELY_HIGH = 'Very likely';

/** Shorthand for the 12 single-word emotion adjectives. */
function emotion(
  id: string,
  text: string,
  factor: Factor,
  cutTier: CutTier = 0,
): Item {
  return {
    id,
    text,
    scale: 'emotion_intensity',
    points: 7,
    anchorLow: EMO_LOW,
    anchorHigh: EMO_HIGH,
    factor,
    reverse: false,
    section: 'emotions',
    cutTier,
    cutScope: 'both',
  };
}

function agree(
  id: string,
  text: string,
  factor: Factor,
  section: SectionId,
  reverse: boolean,
  opts: { cutTier?: CutTier; cutScope?: Item['cutScope']; note?: string } = {},
): Item {
  return {
    id,
    text,
    scale: 'likert_agree',
    points: 7,
    anchorLow: AGREE_LOW,
    anchorHigh: AGREE_HIGH,
    factor,
    reverse,
    section,
    cutTier: opts.cutTier ?? 0,
    cutScope: opts.cutScope ?? 'both',
    ...(opts.note ? { note: opts.note } : {}),
  };
}

function differential(
  id: string,
  text: string,
  low: string,
  high: string,
  factor: Factor,
  section: SectionId,
  reverse: boolean,
  note?: string,
): Item {
  return {
    id,
    text,
    scale: 'semantic_diff',
    points: 7,
    anchorLow: low,
    anchorHigh: high,
    factor,
    reverse,
    section,
    cutTier: 0,
    cutScope: 'both',
    ...(note ? { note } : {}),
  };
}

/**
 * Block item bank — identical for the neutral and experimental blocks.
 * Array order is the CSV column order within each section.
 */
export const BLOCK_ITEMS: readonly Item[] = [
  // ── (a) Felt emotions ──────────────────────────────────────────────────
  // Coulter & Pinto (1995). Anger is the theorised mediator; guilt is
  // predicted to follow an inverted U. Distractors keep guilt non-salient.
  emotion('guilt_1', 'Guilty', 'guilt'),
  emotion('guilt_2', 'Ashamed', 'guilt'),
  emotion('guilt_3', 'Accountable', 'guilt'),
  emotion('guilt_4', 'Irresponsible', 'guilt'),
  emotion('anger_1', 'Annoyed', 'anger'),
  emotion('anger_2', 'Angry', 'anger'),
  emotion('anger_3', 'Irritated', 'anger'),
  emotion('happy_1', 'Amused', 'happy', 2),
  emotion('happy_2', 'Happy', 'happy', 2),
  emotion('happy_3', 'Good', 'happy', 2),
  emotion('distractor_1', 'Surprised', 'distractor'),
  emotion('distractor_2', 'Bored', 'distractor'),

  // ── (b) Attitudes and intentions ───────────────────────────────────────
  // Polarity rule: negative pole at 1 throughout, so no differential needs
  // reverse-coding. See codebook §"Scale polarity".
  differential('att_popup_1', 'The pop-up you just saw was…', 'Bad', 'Good', 'att_popup', 'attitudes', false),
  differential('att_popup_2', 'The pop-up you just saw was…', 'Unfavourable', 'Favourable', 'att_popup', 'attitudes', false),
  differential('att_popup_3', 'The pop-up you just saw was…', 'Negative', 'Positive', 'att_popup', 'attitudes', false),
  differential('att_brand_1', 'Overall, {BRAND} is…', 'Bad', 'Good', 'att_brand', 'attitudes', false),
  differential('att_brand_2', 'Overall, {BRAND} is…', 'Unfavourable', 'Favourable', 'att_brand', 'attitudes', false),
  differential('att_brand_3', 'Overall, {BRAND} is…', 'Negative', 'Positive', 'att_brand', 'attitudes', false),

  agree('trust_1', 'I would trust {BRAND} with my payment details.', 'trust', 'attitudes', false),
  agree('trust_2', '{BRAND} deals with customers honestly.', 'trust', 'attitudes', false),
  agree(
    'trust_3',
    '{BRAND} is upfront about what it wants from me.',
    'trust',
    'attitudes',
    false,
    { note: 'Expected to cross-load with IMI. Consider reporting trust with and without it.' },
  ),

  {
    id: 'pi',
    text: 'How likely would you be to buy from {BRAND}?',
    scale: 'likelihood',
    points: 7,
    anchorLow: LIKELY_LOW,
    anchorHigh: LIKELY_HIGH,
    factor: 'pi',
    reverse: false,
    section: 'attitudes',
    cutTier: 0,
    cutScope: 'both',
    note: 'Single-item outcome. Higher = better for the brand.',
  },
  {
    id: 'ri',
    text: 'How likely would you be to recommend {BRAND} to a friend?',
    scale: 'likelihood',
    points: 7,
    anchorLow: LIKELY_LOW,
    anchorHigh: LIKELY_HIGH,
    factor: 'ri',
    reverse: false,
    section: 'attitudes',
    cutTier: 0,
    cutScope: 'both',
    note: 'Single-item outcome. Higher = better for the brand.',
  },
  {
    id: 'si',
    text: 'How likely would you be to buy from a competitor instead?',
    scale: 'likelihood',
    points: 7,
    anchorLow: LIKELY_LOW,
    anchorHigh: LIKELY_HIGH,
    factor: 'si',
    reverse: false,
    section: 'attitudes',
    cutTier: 3,
    cutScope: 'both',
    note:
      'Single-item outcome, NOT reverse-coded (it belongs to no multi-item scale). ' +
      'Direction runs opposite to pi/ri: higher = WORSE for the brand. Do not ' +
      'average it with pi/ri.',
  },

  // ── (c) Perceived manipulative intent ──────────────────────────────────
  // Campbell (1995), adapted "ad" -> "pop-up". Scored so that HIGH = MORE
  // perceived manipulative intent; items worded the other way reverse.
  agree('imi_1', 'The way this pop-up tries to persuade people seems acceptable to me.', 'imi', 'imi', true),
  agree('imi_2', '{BRAND} tried to manipulate shoppers in ways that I don’t like.', 'imi', 'imi', false),
  agree(
    'imi_3',
    'I was annoyed by this pop-up because {BRAND} seemed to be trying to inappropriately manage or control shoppers.',
    'imi',
    'imi',
    false,
  ),
  agree(
    'imi_4',
    'I didn’t mind this pop-up; {BRAND} tried to be persuasive without being excessively manipulative.',
    'imi',
    'imi',
    true,
  ),
  agree('imi_5', 'This pop-up was fair in what was said and shown.', 'imi', 'imi', true),
  differential(
    'imi_6',
    'This pop-up was…',
    'Unfair',
    'Fair',
    'imi',
    'imi',
    true,
    'Sole semantic differential in the IMI block. PRD §5.3(c) does not mark it (R), ' +
      'but it must be: with "Fair" at the high anchor it runs opposite to the scale ' +
      '(high = more manipulative intent). Left unreversed it deflates alpha and ' +
      'biases the scale score.',
  ),

  // ── (d) Brand attributions ─────────────────────────────────────────────
  // Scored so that HIGH = MORE negative/manipulative attribution.
  agree(
    'attrib_1',
    '{BRAND} is trying to manipulate my feelings.',
    'attrib',
    'attributions',
    false,
    { note: 'Near-duplicate of imi_2; the two are not independent evidence.' },
  ),
  agree('attrib_2', '{BRAND} is mainly concerned with making money.', 'attrib', 'attributions', false),
  agree('attrib_3', '{BRAND} has customers’ best interests at heart.', 'attrib', 'attributions', true),

  // ── (e) Credibility ────────────────────────────────────────────────────
  // Cotte et al. (2005). Distinct from, and negatively correlated with, IMI.
  agree('cred_1', 'The offer in the pop-up was believable.', 'cred', 'credibility', false, {
    cutTier: 1,
    cutScope: 'first_block_only',
  }),
  agree('cred_2', 'The offer in the pop-up was truthful.', 'cred', 'credibility', false, {
    cutTier: 1,
    cutScope: 'first_block_only',
  }),
  agree('cred_3', 'The offer in the pop-up was realistic.', 'cred', 'credibility', false, {
    cutTier: 1,
    cutScope: 'first_block_only',
  }),
];

/** Multi-item scales that get a scale score + Cronbach's alpha. */
export const MULTI_ITEM_FACTORS: readonly Factor[] = [
  'guilt',
  'anger',
  'happy',
  'att_popup',
  'att_brand',
  'trust',
  'imi',
  'cred',
  'attrib',
] as const;

/** Single-item outcomes: reported raw, never averaged into a scale. */
export const SINGLE_ITEM_FACTORS: readonly Factor[] = ['pi', 'ri', 'si'] as const;

export const FACTOR_LABELS: Record<Factor, string> = {
  guilt: 'Felt guilt',
  anger: 'Felt anger / irritation',
  happy: 'Felt happy / amused',
  distractor: 'Distractor (not scored)',
  att_popup: 'Attitude toward the pop-up',
  att_brand: 'Attitude toward the brand',
  trust: 'Brand trust',
  pi: 'Purchase intention',
  ri: 'Recommendation intention',
  si: 'Switching intention',
  imi: 'Perceived manipulative intent',
  cred: 'Offer credibility',
  attrib: 'Negative brand attribution',
};

export const SCALE_LABELS: Record<ScaleKind, string> = {
  likert_agree: '7-point Likert, 1 = strongly disagree … 7 = strongly agree',
  emotion_intensity: '7-point intensity, 1 = not at all … 7 = very strongly',
  semantic_diff: '7-point semantic differential, negative pole at 1',
  likelihood: '7-point likelihood, 1 = very unlikely … 7 = very likely',
};

export function itemsInSection(section: SectionId): Item[] {
  return BLOCK_ITEMS.filter((i) => i.section === section);
}

export function itemsInFactor(factor: Factor): Item[] {
  return BLOCK_ITEMS.filter((i) => i.factor === factor);
}

/**
 * Items actually administered for a given block position under the active cut
 * tier. `blockIndex` is 0 for the first block a participant sees and 1 for the
 * second — position, NOT condition, because the PRD's cut rule is positional
 * ("drop credibility from Block A only").
 */
export function activeItems(cutTier: CutTier, blockIndex: 0 | 1): Item[] {
  return BLOCK_ITEMS.filter((item) => {
    if (item.cutTier === 0) return true;
    if (item.cutTier > cutTier) return true; // not yet cut at this tier
    if (item.cutScope === 'first_block_only') return blockIndex !== 0;
    return false;
  });
}
