/**
 * Fictitious brands and their catalogues.
 *
 * Two invented brands in ONE category (fragrance and small accessories) so the
 * "flat 15% off" offer is equally relevant in both. Brand ↔ condition pairing
 * was counterbalanced up to v4.1; as of change_spec_v4_2_locked_pairing.md it
 * is FIXED, and brand identity is confounded with framing — see the box below.
 *
 * The two catalogues are STRUCTURALLY MATCHED: same six product archetypes,
 * same six prices, same order. Only the product names and the accent colour
 * differ, so the stores read as separate businesses without the stimuli
 * differing in anything that could affect the offer's appeal.
 *
 * CATEGORY NOTE. The PRD's ethics section (§9) bars appearance-domain stimuli.
 * Apparel with sizing and body imagery would induce self-conscious emotion at
 * baseline — the very thing the manipulation is supposed to move — so this
 * catalogue deliberately carries no clothing, no sizing and no models.
 *
 * The pop-up itself uses NO brand accent colour: its buttons are neutral
 * near-black in both stores. That keeps tap-target contrast byte-identical
 * across brands as well as across conditions.
 *
 * change_spec_v4_final.md Part 7: six products per store (not eight).
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ change_spec_v4_2: BRAND IS NOW CONFOUNDED WITH CONDITION.             │
 * └──────────────────────────────────────────────────────────────────────┘
 * Aurevella always carries the neutral pop-ups and Maison Veloure always
 * carries the experimental ones, so every difference between these two
 * catalogues lands directly on the treatment effect. Matching them is not
 * polish — it is the only remaining defence the design has. Anything that
 * differs between the two brand records below must be justified:
 *
 *   accent  — perceptually matched: both CIELAB L*=34, C*=16, differing only
 *             in hue (pine 186°, plum 342°). Relative luminance 0.0801 vs
 *             0.0805 (0.5% apart) and CIE chroma within 2%, so neither reads
 *             as lighter, darker or more colourful than the other. HSL
 *             saturation still differs (31% vs 16%) — that is an artefact of
 *             the HSL cylinder, not a perceptual difference; see the v4.2
 *             report. White text clears 8:1 on both.
 *   soft    — L*=94.2, C*=2.7 both sides; luminance 0.11% apart. Unread today
 *             (see the field's own note), matched anyway.
 *   tile    — same treatment: L*=96.5, C*=1.8 both sides; luminance 0.12%
 *             apart. Near-black body text clears 16.4:1 on both.
 *   names   — same convention (two-word English, botanical/material), same
 *             count, same prices, same details, same categories. Total
 *             product-name length is 102 characters on BOTH sides.
 */

export type BrandId = 'aurevella' | 'veloure';

/** SVG illustration archetypes. Both catalogues use the same six, in order. */
export type ProductShape =
  | 'bottle_tall'
  | 'bottle_small'
  | 'scarf'
  | 'sunglasses'
  | 'cardholder'
  | 'travel_set'
  | 'candle'
  | 'keyring';

export interface Product {
  /** SKU is shared across brands for the same archetype; prefixed at use. */
  sku: string;
  name: string;
  /** Short line under the name, as on a real product card. */
  detail: string;
  /** Price in whole rupees. Identical across brands for the same archetype. */
  price: number;
  shape: ProductShape;
}

export interface Brand {
  id: BrandId;
  name: string;
  /** Small line under the wordmark in the store header. */
  tagline: string;
  /** Accent colour. Store chrome only — never the pop-up. */
  accent: string;
  /**
   * Currently read by nothing — kept because it is the obvious place to reach
   * for if a soft accent wash is ever wanted, and an unmatched value sitting
   * here is how an asymmetry gets introduced by accident. Matched to the same
   * tolerance as the rest: L*=94.2, C*=2.7, luminance 0.11% apart.
   */
  accentSoft: string;
  /** Background wash for product tiles. */
  tile: string;
  categories: readonly string[];
  products: readonly Product[];
}

// change_spec_v4_final.md Part 7: six products, no more.
const PRICES = [2450, 1650, 3200, 2890, 1890, 1450] as const;

const SHAPES: readonly ProductShape[] = [
  'bottle_tall',
  'bottle_small',
  'scarf',
  'sunglasses',
  'cardholder',
  'candle',
] as const;

const DETAILS = [
  'Eau de Parfum · 50 ml',
  'Eau de Parfum · 30 ml',
  'Mulberry silk · 90 × 90 cm',
  'Acetate · polarised',
  'Full-grain leather · 4 slots',
  'Soy blend · 200 g · 40 hrs',
] as const;

function catalogue(names: readonly string[]): Product[] {
  return names.map((name, i) => ({
    sku: `${SHAPES[i]}`,
    name,
    detail: DETAILS[i]!,
    price: PRICES[i]!,
    shape: SHAPES[i]!,
  }));
}

export const BRANDS: Record<BrandId, Brand> = {
  aurevella: {
    id: 'aurevella',
    name: 'Aurevella',
    tagline: 'Fragrance & everyday things',
    accent: '#2E5752',
    accentSoft: '#E9F0EE',
    tile: '#F1F6F5',
    categories: ['New in', 'Fragrance', 'Accessories', 'Gifting'],
    products: catalogue([
      'Velvet Iris',
      'Amber Dusk',
      'Mulberry Silk Scarf',
      'Acetate Sunglasses — Fawn',
      'Leather Card Holder',
      'Fig & Cedar Candle',
    ]),
  },
  veloure: {
    id: 'veloure',
    name: 'Maison Veloure',
    tagline: 'Fragrance & everyday things',
    accent: '#644858',
    accentSoft: '#F3EDF0',
    tile: '#F8F4F6',
    categories: ['New in', 'Fragrance', 'Accessories', 'Gifting'],
    // Matched to Aurevella's convention: two-word English botanical/material
    // names for the bespoke items, the shared archetypes worded identically,
    // and the same total name length (102 characters each side). The previous
    // set ("Sillage Noir", "Blanc Neroli") was French-coded and read as more
    // luxury — harmless when pairing was counterbalanced, a direct confound
    // now that this brand is always the experimental one.
    products: catalogue([
      'Linen Neroli',
      'Birch Haze',
      'Mulberry Silk Scarf',
      'Acetate Sunglasses — Ash',
      'Leather Card Holder',
      'Oak & Ember Candle',
    ]),
  },
};

export const BRAND_IDS: readonly BrandId[] = ['aurevella', 'veloure'] as const;

/** Rupee formatting, as an Indian storefront would show it. */
export function formatRupees(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}
