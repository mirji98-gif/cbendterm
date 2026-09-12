/**
 * THE DISCOUNT POP-UP — the experimental stimulus.
 *
 * change_spec_v4_final.md Part 2: each brand now shows TWO pop-ups. This
 * component renders either one, selected by the `popup` prop — `p1` (fires on
 * checkout intent, i.e. add-to-bag) or `p2` (fires on the order-confirmation
 * screen). Both read their headline/subcopy/accept-label from an INVARIANT
 * constant (POPUP1_INVARIANT / POPUP2_INVARIANT) rather than a prop, so a
 * per-arm override of anything but the decline label is not expressible.
 *
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  The ONLY thing that differs between ARMS is `block.declineLabel`.     ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 * Both of a block's pop-ups show the SAME decline wording (Part 2: "never mix
 * levels within a brand"). Popup.identical.test.tsx renders all four
 * conditions for both p1 and p2, blanks the decline label, and asserts the
 * resulting DOM is byte-identical.
 *
 * The two buttons are deliberately IDENTICAL in weight — same border, same
 * background, same text colour, same size. A filled "accept" against an
 * outlined "decline" would be more realistic commercially, but it is itself a
 * dark pattern (visual interference) and would confound the wording
 * manipulation with a prominence manipulation.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ DELIBERATE DEVIATION FROM change_spec_v4_final.md Part 7.             │
 * └──────────────────────────────────────────────────────────────────────┘
 * Part 7's pop-up section calls for "Accept filled in the accent. Decline
 * outlined in --line with --ink text" — but Part 6 (do-not-change item 3,
 * which the spec's own Part 0 says Part 7 is constrained by) says exactly
 * that pattern — a filled accept against an outlined decline — is a second
 * dark pattern that confounds the wording manipulation with a prominence
 * manipulation. Both buttons stay visually IDENTICAL here (same outline,
 * same weight); only their sizing/spacing/tokens were updated for Part 7.
 * Flagged rather than silently resolved either way — see the PR/commit notes.
 *
 * Accepting either pop-up shows a confirmation on the NEXT screen (the
 * order-confirmation screen for p1, the continuation screen for p2) rather
 * than here — no email address or social handle is ever collected, and no
 * text input is ever rendered (change_spec_v4_final.md Part 2). Resolving
 * (accept, decline, close, backdrop, timeout) always advances immediately,
 * exactly like decline does, so the measured latency is unaffected by
 * whatever the following screen shows.
 */
import { useCallback, useEffect, useRef } from 'react';
import { POPUP1_INVARIANT, POPUP2_INVARIANT, type Choice } from '../data/conditions';
import { BRANDS } from '../data/brands';
import { TIMING } from '../data/config';
import { afterPaint } from '../instrumentation/clock';
import { usePopupTelemetry } from '../instrumentation/popupTelemetry';
import { useSession } from '../machine/SessionContext';
import type { BlockKey, PopupKey } from '../machine/types';

/**
 * Identical for both buttons — 48px tall (change_spec_v4_final.md Part 7),
 * ≥44px tap target either way; contrast is symmetric.
 */
const BUTTON_CLASS =
  'w-full min-h-[48px] px-4 py-3 rounded border-[1.5px] border-ink ' +
  'bg-card text-ink text-[15px] font-medium leading-snug ' +
  'transition-colors duration-150 active:bg-black/5';

export function Popup({ blockKey, popup }: { blockKey: BlockKey; popup: PopupKey }): JSX.Element {
  const api = useSession();
  const block = api.session.blocks![blockKey]!;
  const brand = BRANDS[block.brandId];
  const invariant = popup === 'p1' ? POPUP1_INVARIANT : POPUP2_INVARIANT;
  const tel = usePopupTelemetry();
  const resolved = useRef(false);

  const resolve = useCallback(
    (choice: Choice) => {
      if (resolved.current) return;
      resolved.current = true;
      const latency = tel.latency();
      api.popupTelemetry(blockKey, popup, tel.snapshot());
      api.popupResolved(blockKey, popup, choice, latency);
    },
    [api, blockKey, popup, tel],
  );

  // Zero point for latency_ms: the first COMPOSITED frame, not mount.
  useEffect(() => {
    afterPaint((t) => {
      tel.markRendered(t);
      // p1's trigger is add-to-bag; p2's trigger is p1 resolving.
      const triggerType = popup === 'p1' ? 'add_to_bag' : 'popup_resolved';
      const trigger = [...api.session.eventLog]
        .reverse()
        .find((e) => e.type === triggerType && e.block === blockKey);
      api.popupRendered(blockKey, popup, trigger ? t - trigger.t : 0);
    });
    // Intentionally mount-only: re-running would re-zero the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-advance. Without a timeout a participant who freezes loses the row.
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
        className="relative w-full sm:max-w-[420px] bg-card rounded-t-2xl sm:rounded-2xl
                   px-5 pt-6 pb-5 safe-bottom sm:pb-6 animate-sheet-in shadow-lg"
      >
        <button
          type="button"
          data-control="close"
          aria-label={invariant.closeAriaLabel}
          onClick={() => resolve('close_x')}
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center
                     rounded-full text-muted active:bg-black/5"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <p className="text-[13px] uppercase tracking-[0.14em] text-muted mb-2">
          {brand.name}
        </p>
        <h2 id="offer-headline" className="text-[22px] font-semibold leading-tight mb-2 text-ink tracking-[-0.01em]">
          {invariant.headline}
        </h2>
        <p className="text-[15px] text-muted leading-relaxed mb-5">
          {invariant.subcopy}
        </p>

        <div className="space-y-3">
          <button
            type="button"
            data-control="accept"
            onClick={() => resolve('accept')}
            className={BUTTON_CLASS}
          >
            {invariant.acceptLabel}
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
