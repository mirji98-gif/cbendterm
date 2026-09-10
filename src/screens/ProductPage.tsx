/**
 * Product page. "Add to bag" is what fires the pop-up.
 *
 * The trigger is checkout intent, not page load (PRD §4). By this point the
 * participant has browsed, chosen and committed — the personal investment that
 * Campbell (1995) shows drives inferences of manipulative intent.
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
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200">
        <div className="max-w-[560px] mx-auto px-3 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={api.productClosed}
            aria-label="Back"
            className="w-11 h-11 flex items-center justify-center rounded-full active:bg-neutral-100"
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

      <main className="flex-1 max-w-[560px] mx-auto w-full px-5 py-5">
        <div
          className="rounded-2xl aspect-square flex items-center justify-center mb-5"
          style={{ backgroundColor: brand.tile }}
        >
          <ProductArt shape={product.shape} accent={brand.accent} className="w-2/3 h-2/3" />
        </div>
        <h1 className="text-[20px] font-semibold leading-snug">{product.name}</h1>
        <p className="text-[13px] text-neutral-500 mt-1">{product.detail}</p>
        <p className="text-[18px] mt-3 tabular-nums">{formatRupees(product.price)}</p>
        <p className="text-[12px] text-neutral-500 mt-1">Inclusive of all taxes</p>

        <div className="mt-6 space-y-3 text-[14px] leading-relaxed text-neutral-700">
          <p>
            Made in small batches. Presented in {brand.name} packaging, ready to gift.
          </p>
          <ul className="text-[13px] text-neutral-600 space-y-1.5 pt-1">
            <li>Free delivery over ₹999</li>
            <li>14-day returns</li>
            <li>Dispatched in 2–3 working days</li>
          </ul>
        </div>
      </main>

      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-neutral-200">
        <div className="max-w-[560px] mx-auto px-5 py-3 safe-bottom">
          <button
            type="button"
            onClick={addToBag}
            className="w-full min-h-[52px] rounded-lg text-white text-[15px] font-medium transition-opacity active:opacity-90"
            style={{ backgroundColor: brand.accent }}
          >
            Add to bag
          </button>
        </div>
      </div>
    </div>
  );
}
