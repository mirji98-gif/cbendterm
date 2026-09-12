/**
 * Order-confirmation screen (change_spec_v4_final.md Part 2/3, new screen).
 *
 * Lands immediately after pop-up 1 resolves, with pop-up 2 overlaid on top of
 * it right away (App.tsx composes them together, the same way ProductPage and
 * pop-up 1 are composed). There is no participant action here before pop-up 2
 * appears — this screen's only job is to close out the cover story's
 * "checkout" plausibly and to be the surface pop-up 2 interrupts.
 *
 * A fake order number is generated per block (stable across re-renders,
 * cosmetic only, never sent anywhere) purely for storefront realism — a real
 * confirmation page always shows one.
 */
import { useMemo } from 'react';
import { BRANDS } from '../data/brands';
import { ORDER_CONFIRMATION } from '../data/copy';
import { useSession } from '../machine/SessionContext';
import type { BlockKey } from '../machine/types';

function orderNumber(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `AV${(h % 900000 + 100000)}`;
}

export function OrderConfirmation({ blockKey }: { blockKey: BlockKey }): JSX.Element {
  const api = useSession();
  const block = api.session.blocks![blockKey]!;
  const brand = BRANDS[block.brandId];
  const order = useMemo(
    () => orderNumber(`${api.session.participantId}:${blockKey}`),
    [api.session.participantId, blockKey],
  );
  const discountApplied = block.p1.choice === 'accept';

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col">
      <header className="border-b border-line">
        <div className="max-w-[560px] mx-auto px-4 pt-4 pb-3">
          <p className="text-[17px] font-semibold tracking-tight" style={{ color: brand.accent }}>
            {brand.name}
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-[560px] mx-auto w-full px-4 py-10 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: brand.tile }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke={brand.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-[22px] font-semibold leading-snug mb-1.5 text-ink tracking-[-0.01em]">{ORDER_CONFIRMATION.title}</h1>
        <p className="text-[13px] text-muted mb-4 tabular-nums">Order #{order}</p>
        <p className="text-[15px] leading-relaxed text-muted max-w-[380px]">
          {ORDER_CONFIRMATION.body}
        </p>
        {discountApplied && (
          <p className="text-[15px] leading-relaxed text-ink font-medium mt-3">
            {ORDER_CONFIRMATION.discountLine}
          </p>
        )}
      </main>
    </div>
  );
}
