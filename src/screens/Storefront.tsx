/**
 * Mock storefront.
 *
 * Realism matters more than polish (PRD §6): the participant must not feel
 * they are in a psychology experiment. Hence a category strip, a bag icon with
 * a count, rupee prices and a plausible footer — and NO progress bar.
 */
import { useEffect, useRef } from 'react';
import { BRANDS, formatRupees } from '../data/brands';
import { ProductArt } from '../components/ProductArt';
import { useSession } from '../machine/SessionContext';
import { now } from '../instrumentation/clock';
import type { BlockKey } from '../machine/types';

export function Storefront({ blockKey }: { blockKey: BlockKey }): JSX.Element {
  const api = useSession();
  const block = api.session.blocks![blockKey]!;
  const brand = BRANDS[block.brandId];
  const entered = useRef<number | null>(null);

  useEffect(() => {
    if (entered.current === null) {
      entered.current = now();
      api.storeEntered(blockKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200">
        <div className="max-w-[560px] mx-auto px-5 pt-4 pb-3 flex items-start justify-between">
          <div>
            <p className="text-[18px] font-semibold tracking-tight" style={{ color: brand.accent }}>
              {brand.name}
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">{brand.tagline}</p>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-700 pt-1" aria-label="Bag">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 6h12l-1 11H5L4 6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M7.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] tabular-nums">0</span>
          </div>
        </div>
        <div className="max-w-[560px] mx-auto px-5 pb-3 flex gap-4 overflow-x-auto">
          {brand.categories.map((c, i) => (
            <span
              key={c}
              className={
                'text-[13px] whitespace-nowrap pb-1 ' +
                (i === 0
                  ? 'text-neutral-900 border-b-2'
                  : 'text-neutral-500 border-b-2 border-transparent')
              }
              style={i === 0 ? { borderColor: brand.accent } : undefined}
            >
              {c}
            </span>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-[560px] mx-auto w-full px-5 py-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {brand.products.map((p) => (
            <button
              key={p.sku}
              type="button"
              onClick={() => api.productViewed(blockKey, p.sku)}
              className="text-left"
            >
              <div
                className="rounded-xl aspect-square flex items-center justify-center mb-2"
                style={{ backgroundColor: brand.tile }}
              >
                <ProductArt shape={p.shape} accent={brand.accent} className="w-3/4 h-3/4" />
              </div>
              <p className="text-[14px] leading-snug text-neutral-900">{p.name}</p>
              <p className="text-[12px] text-neutral-500 mt-0.5">{p.detail}</p>
              <p className="text-[14px] text-neutral-900 mt-1 tabular-nums">{formatRupees(p.price)}</p>
            </button>
          ))}
        </div>
      </main>

      <footer className="border-t border-neutral-200 mt-4">
        <div className="max-w-[560px] mx-auto px-5 py-6 text-[12px] text-neutral-500 space-y-1">
          <p>Free delivery on orders over ₹999 · 14-day returns</p>
          <p>Help · Track order · Contact us</p>
          <p className="pt-2 text-neutral-400">© {brand.name}</p>
        </div>
      </footer>
    </div>
  );
}
