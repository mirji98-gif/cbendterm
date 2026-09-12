/**
 * THE CLOCK. The only place in the application that reads a timer.
 *
 * Every behavioural timestamp comes from performance.now(): a monotonic clock
 * that cannot jump backwards when the device syncs its wall clock or crosses a
 * DST boundary. Date.now() is used ONLY for the two human-readable wall-clock
 * columns (started_at, submitted_at) and never for a duration.
 *
 * A null timing field in the exported CSV is data loss, not a cosmetic gap
 * (PRD §11 / non-negotiable 4). If you are tempted to write `Date.now()` in a
 * component, don't — src/instrumentation/clock.test.ts greps the source tree
 * and fails the build.
 */
import type { BlockKey, LoggedEvent, PopupKey } from '../machine/types';

/** Monotonic milliseconds since page load. Use for EVERY duration. */
export function now(): number {
  return performance.now();
}

/** Wall clock, UTC. Use only for started_at / submitted_at. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Round to 0.1 ms — sub-tenth-millisecond precision is noise on a phone. */
export function ms(value: number): number {
  return Math.round(value * 10) / 10;
}

export function makeEvent(
  type: string,
  payload?: Record<string, unknown>,
  block?: BlockKey,
  popup?: PopupKey,
): LoggedEvent {
  const event: LoggedEvent = { t: ms(now()), type };
  if (block) event.block = block;
  if (popup) event.popup = popup;
  if (payload && Object.keys(payload).length) event.payload = payload;
  return event;
}

/**
 * Resolves after the browser has actually PAINTED the next frame.
 *
 * A single requestAnimationFrame fires before paint, so measuring there
 * attributes zero cost to rendering. Two nested rAFs put the callback after
 * the first frame has been composited, which is the moment a participant can
 * genuinely see the pop-up — and therefore the correct zero point for
 * latency_ms. Getting this wrong biases every latency in the study downward.
 */
export function afterPaint(fn: (t: number) => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => fn(now()));
  });
}
