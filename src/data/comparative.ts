/**
 * Comparative block — screen 11 (Instrument_v2.md §"Screen 11").
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ BRAND POSITION IS NOT CONDITION.                                     │
 * └──────────────────────────────────────────────────────────────────────┘
 * Roughly half of participants saw the neutral pop-up on the FIRST brand and
 * half on the SECOND. "Brand 1" / "Brand 2" below refer to PRESENTATION
 * POSITION (whichever storefront a participant visited first / second), never
 * to condition. Every raw answer here is stored as an actual brand id
 * ('aurevella' | 'veloure') or a sentinel, and MUST be recoded relative to
 * `expBrand` before it means anything about the manipulation — never
 * interpreted as "first vs second" directly. The recode functions below are
 * the only place that translation happens; nothing else in the app may
 * hand-roll it. src/data/comparative.test.ts exercises them against both
 * `order` values and asserts the recoded meaning stays fixed to CONDITION
 * while the raw value's relationship to position flips.
 *
 * CAUTION FOR THE LIMITATIONS SLIDE (keep this alongside the numbers):
 * asking participants to compare the two pop-ups directly makes the
 * manipulation salient and invites them to construct a difference they may
 * not have felt. This block is corroborating evidence, not primary evidence.
 * Primary evidence is the behavioural logs and the B1–B5 difference scores,
 * both collected before this block exists. If this block contradicts the
 * behavioural data, believe the behavioural data.
 */
import type { BrandId } from './brands';
import type { BlockOrder } from './conditions';

/** Non-brand answer options. Which subset applies depends on the item. */
export type ComparativeSentinel = 'both' | 'neither' | 'compare_further' | 'dont_remember';

/** A raw comparative answer: either an actual brand id, or a sentinel. */
export type ComparativeRaw = BrandId | ComparativeSentinel;

export interface ComparativeOption {
  value: ComparativeRaw;
  label: string;
}

/** The two brands as the participant actually encountered them, by position. */
export interface BrandRef {
  id: BrandId;
  name: string;
}

// ── Stems. {BRAND1} / {BRAND2} are interpolated at render time, in POSITION
// order — the same interpolation convention as {BRAND} elsewhere. ──────────

export const C1_STEM =
  "Thinking about the two offers you just saw, which brand's pop-up felt more like it was " +
  'trying to pressure you into accepting?';
export const C2_STEM = 'After seeing both offers, which brand would you trust more?';
export const C3_STEM = 'Compared with {BRAND2}, how much do you trust {BRAND1}?';
export const C4_STEM = 'If you had to choose one of these brands for your next purchase, which would you choose?';
export const C5_STEM = 'Overall, how would you rate your experience with {BRAND1} compared with {BRAND2}?';
export const C6_STEM = 'Thinking about both brands, what was the biggest difference you noticed between the two experiences?';

/** Replaces {BRAND1} / {BRAND2} placeholders with the real brand names. */
export function withBrands(text: string, brand1: BrandRef, brand2: BrandRef): string {
  return text.split('{BRAND1}').join(brand1.name).split('{BRAND2}').join(brand2.name);
}

export function c1Options(brand1: BrandRef, brand2: BrandRef): ComparativeOption[] {
  return [
    { value: brand1.id, label: brand1.name },
    { value: brand2.id, label: brand2.name },
    { value: 'both', label: 'Both equally' },
    { value: 'neither', label: 'Neither' },
    { value: 'dont_remember', label: "Don't remember" },
  ];
}

export function c2Options(brand1: BrandRef, brand2: BrandRef): ComparativeOption[] {
  return [
    { value: brand1.id, label: brand1.name },
    { value: brand2.id, label: brand2.name },
    { value: 'both', label: 'Both equally' },
    { value: 'neither', label: 'Neither' },
  ];
}

export function c4Options(brand1: BrandRef, brand2: BrandRef): ComparativeOption[] {
  return [
    { value: brand1.id, label: brand1.name },
    { value: brand2.id, label: brand2.name },
    { value: 'compare_further', label: 'Compare further first' },
    { value: 'neither', label: 'Neither' },
  ];
}

/**
 * Directional anchors, per Instrument_v2.md. C3 and C5 use DIFFERENT wording
 * ("less/more" vs "worse/better") even though both are 1–7 with the same
 * midpoint — do not collapse them into one shared constant, or one item ends
 * up with the other's anchors.
 */
export const C3_SCALE = { low: 'Much less', mid: 'About the same', high: 'Much more' } as const;
export const C5_SCALE = { low: 'Much worse', mid: 'About the same', high: 'Much better' } as const;

// ── Recoding (for the CSV and for analysis_starter.R's verification pass) ──

/**
 * C1 / C2 / C4 recode to the same rule: does the raw answer name the brand
 * that carried the EXPERIMENTAL pop-up? `null` only applies to C1's
 * "don't remember" option — C2 and C4 have no such option, so every other
 * sentinel (both / neither / compare_further) recodes to 0 per the
 * instrument's literal rule, not to NA.
 */
export function recodeBrandChoice(raw: ComparativeRaw | null, expBrand: BrandId): 0 | 1 | null {
  if (raw === null) return null;
  if (raw === 'dont_remember') return null;
  return raw === expBrand ? 1 : 0;
}

/**
 * C3 / C5 recode to "experimental relative to neutral" regardless of which
 * position the experimental brand occupied. The item is anchored "compared
 * with Brand 2, ... Brand 1" — if Brand 1 is the neutral brand (i.e. the
 * experimental brand is Brand 2), the raw scale runs backwards relative to
 * the manipulation and must be reversed: `8 - raw`.
 *
 * `expBrandIsPositionTwo` is `order === 'neutral_first'` at the call site:
 * neutral-first means position 1 = neutral = Brand 1, so the experimental
 * brand is Brand 2.
 */
export function recodeComparativeScale(raw: number | null, expBrandIsPositionTwo: boolean): number | null {
  if (raw === null) return null;
  return expBrandIsPositionTwo ? 8 - raw : raw;
}

/** Whether the experimental brand sits at position 2, from `order` alone. */
export function expBrandIsPositionTwo(order: BlockOrder): boolean {
  return order === 'neutral_first';
}
