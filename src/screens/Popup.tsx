/**
 * THE DISCOUNT POP-UP — the experimental stimulus.
 *
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  The ONLY thing that differs between conditions is `block.declineLabel`║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * Headline, subcopy, accept label and close affordance are read straight from
 * POPUP_INVARIANT — they are not props, so a per-condition override is not
 * expressible in this component's interface. Popup.identical.test.tsx renders
 * all four conditions, blanks the decline label, and asserts the resulting DOM
 * is byte-identical.
 *
 * The two buttons are deliberately IDENTICAL in weight — same border, same
 * background, same text colour, same size. A filled "accept" against an
 * outlined "decline" would be more realistic commercially, but it is itself a
 * dark pattern (visual interference) and would confound the wording
 * manipulation with a prominence manipulation (PRD §6, accessibility floor).
 *
 * The pop-up fires on add-to-bag, not on page load, so the participant has
 * already invested effort — Campbell (1995) shows that personal investment is
 * what drives inferences of manipulative intent.
 */
import { useCallback, useEffect, useRef } from 'react';
import { POPUP_INVARIANT, type Choice } from '../data/conditions';
import { BRANDS } from '../data/brands';
import { TIMING } from '../data/config';
import { afterPaint } from '../instrumentation/clock';
import { usePopupTelemetry } from '../instrumentation/popupTelemetry';
import { useSession } from '../machine/SessionContext';
import type { BlockKey } from '../machine/types';

/** Identical for both buttons. ≥44px tap target; contrast is symmetric. */
const BUTTON_CLASS =
  'w-full min-h-[52px] px-4 py-3 rounded-lg border-[1.5px] border-neutral-900 ' +
  'bg-white text-neutral-900 text-[15px] font-medium leading-snug ' +
  'transition-colors duration-150 active:bg-neutral-100';

export function Popup({ blockKey }: { blockKey: BlockKey }): JSX.Element {
  const api = useSession();
  const block = api.session.blocks![blockKey]!;
  const brand = BRANDS[block.brandId];
  const tel = usePopupTelemetry();
  const resolved = useRef(false);

  const resolve = useCallback(
    (choice: Choice) => {
      if (resolved.current) return;
      resolved.current = true;
      const latency = tel.latency();
      api.popupTelemetry(blockKey, tel.snapshot());
      api.popupResolved(blockKey, choice, latency);
    },
    [api, blockKey, tel],
  );

  // Zero point for latency_ms: the first COMPOSITED frame, not mount.
  useEffect(() => {
    afterPaint((t) => {
      tel.markRendered(t);
      const addToBag = [...api.session.eventLog]
        .reverse()
        .find((e) => e.type === 'add_to_bag' && e.block === blockKey);
      api.popupRendered(blockKey, addToBag ? t - addToBag.t : 0);
    });
    // Intentionally mount-only: re-running would re-zero the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-advance. PRD defines an `abandon` code but no threshold; without one
  // a participant who freezes loses the entire row.
  useEffect(() => {
    const id = window.setTimeout(() => resolve('timeout'), TIMING.popupTimeoutMs);
    return () => window.clearTimeout(id);
  }, [resolve]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 animate-fade-in"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) resolve('backdrop');
      }}
    >
      <div
        ref={tel.modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-headline"
        className="relative w-full sm:max-w-[420px] bg-white rounded-t-2xl sm:rounded-2xl
                   px-5 pt-6 pb-5 safe-bottom sm:pb-6 animate-sheet-in shadow-xl"
      >
        <button
          type="button"
          data-control="close"
          aria-label={POPUP_INVARIANT.closeAriaLabel}
          onClick={() => resolve('close_x')}
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center
                     rounded-full text-neutral-500 active:bg-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 mb-2">
          {brand.name}
        </p>
        <h2 id="offer-headline" className="text-[22px] font-semibold leading-tight mb-2">
          {POPUP_INVARIANT.headline}
        </h2>
        <p className="text-[14px] text-neutral-600 leading-relaxed mb-5">
          {POPUP_INVARIANT.subcopy}
        </p>

        <div className="space-y-2.5">
          <button
            type="button"
            data-control="accept"
            onClick={() => resolve('accept')}
            className={BUTTON_CLASS}
          >
            {POPUP_INVARIANT.acceptLabel}
          </button>
          {/* ── THE MANIPULATION. The only condition-dependent value here. ── */}
          <button
            type="button"
            data-control="decline"
            onClick={() => resolve('decline_button')}
            className={BUTTON_CLASS}
          >
            {block.declineLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
