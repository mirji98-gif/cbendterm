/**
 * Fictitious brands and their catalogues.
 *
 * Two invented brands in ONE category (fragrance and small accessories) so the
 * "flat 15% off" offer is equally relevant in both. Brand ↔ condition pairing
 * is counterbalanced (see sequence.ts), so brand identity is never confounded
 * with framing.
 *
 * The two catalogues are STRUCTURALLY MATCHED: same eight product archetypes,
 * same eight prices, same order. Only the product names and the accent colour
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
 */

export type BrandId = 'aurevella' | 'veloure';

/** SVG illustration archetypes. Both catalogues use the same eight, in order. */
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
  accentSoft: string;
  /** Background wash for product tiles. */
  tile: string;
  categories: readonly string[];
  products: readonly Product[];
}

const PRICES = [2450, 1650, 3200, 2890, 1890, 2150, 1450, 890] as const;

const SHAPES: readonly ProductShape[] = [
  'bottle_tall',
  'bottle_small',
  'scarf',
  'sunglasses',
  'cardholder',
  'travel_set',
  'candle',
  'keyring',
] as const;

const DETAILS = [
  'Eau de Parfum · 50 ml',
  'Eau de Parfum · 30 ml',
  'Mulberry silk · 90 × 90 cm',
  'Acetate · polarised',
  'Full-grain leather · 4 slots',
  '3 × 8 ml travel sprays',
  'Soy blend · 200 g · 40 hrs',
  'Full-grain leather',
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
    accent: '#6D2E52',
    accentSoft: '#F5ECF2',
    tile: '#F7F3F5',
    categories: ['New in', 'Fragrance', 'Accessories', 'Gifting'],
    products: catalogue([
      'Velvet Iris',
      'Amber Dusk',
      'Mulberry Silk Scarf',
      'Acetate Sunglasses — Fawn',
      'Leather Card Holder',
      'Discovery Set',
      'Fig & Cedar Candle',
      'Leather Keyring',
    ]),
  },
  veloure: {
    id: 'veloure',
    name: 'Maison Veloure',
    tagline: 'Fragrance & everyday things',
    accent: '#1F5049',
    accentSoft: '#EAF2F0',
    tile: '#F2F6F5',
    categories: ['New in', 'Fragrance', 'Accessories', 'Gifting'],
    products: catalogue([
      'Sillage Noir',
      'Blanc Neroli',
      'Mulberry Silk Scarf',
      'Acetate Sunglasses — Ash',
      'Leather Card Holder',
      'Discovery Set',
      'Vetiver & Smoke Candle',
      'Leather Keyring',
    ]),
  },
};

export const BRAND_IDS: readonly BrandId[] = ['aurevella', 'veloure'] as const;

/** Rupee formatting, as an Indian storefront would show it. */
export function formatRupees(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}
