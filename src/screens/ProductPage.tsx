/**
 * Product page. "Add to bag" is what fires the pop-up.
 *
 * The trigger is checkout intent, not page load (PRD §4). By this point the
 * participant has browsed, chosen and committed — the personal investment that
 * Campbell (1995) shows drives inferences of manipulative intent.
 *
 * change_spec_v4_final.md Part 7: full-width image, name, price, two lines of
 * description, one button. Nothing else — no reviews, ratings, related
 * products or accordion. Real small D2C stores are sparse; clutter also gives
 * participants more to look at and adds noise to the dwell-time measures.
 */
import { BRANDS, formatRupees } from '../data/brands';
import { ProductArt } from '../components/ProductArt';
import { useSession } from '../machine/SessionContext';
import { now } from '../instrumentation/clock';
import type { BlockKey } from '../machine/types';

export function ProductPage({ blockKey }: { blockKey: BlockKey }): JSX.Element {
  const api = useSession();
  const block = api.session.blocks![blockKey]!;
  const brand = BRANDS[block.brandId];
  const product =
    brand.products.find((p) => p.sku === block.productViewed) ?? brand.products[0]!;

  const addToBag = () => {
    // Time on store comes from the logged store_entered event rather than a
    // component ref, so a remount cannot silently reset it.
    const entered = [...api.session.eventLog]
      .reverse()
      .find((e) => e.type === 'store_entered' && e.block === blockKey);
    api.addToBag(blockKey, product.sku, entered ? now() - entered.t : 0);
  };

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-line">
        <div className="max-w-[560px] mx-auto px-2 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={api.productClosed}
            aria-label="Back"
            className="w-11 h-11 flex items-center justify-center rounded-full active:bg-black/5"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M11 3 5 9l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-[15px] font-semibold tracking-tight" style={{ color: brand.accent }}>
            {brand.name}
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-[560px] mx-auto w-full px-4 py-4">
        <div
          className="rounded aspect-[4/5] flex items-center justify-center mb-5 bg-card"
          style={{ backgroundColor: brand.tile }}
        >
          <ProductArt shape={product.shape} accent={brand.accent} className="w-2/3 h-2/3" />
        </div>
        <h1 className="text-[22px] font-semibold leading-snug tracking-[-0.01em]">{product.name}</h1>
        <p className="text-[17px] mt-2 tabular-nums text-ink tracking-[-0.01em]">{formatRupees(product.price)}</p>

        <p className="text-[15px] leading-relaxed text-muted mt-4">
          {product.detail}. Made in small batches, presented in {brand.name} packaging.
        </p>
      </main>

      <div className="sticky bottom-0 bg-surface/95 backdrop-blur border-t border-line">
        <div className="max-w-[560px] mx-auto px-4 py-3 safe-bottom">
          <button
            type="button"
            onClick={addToBag}
            className="w-full min-h-[52px] rounded text-white text-[15px] font-medium transition-opacity active:opacity-90"
            style={{ backgroundColor: brand.accent }}
          >
            Add to bag
          </button>
        </div>
      </div>
    </div>
  );
}
