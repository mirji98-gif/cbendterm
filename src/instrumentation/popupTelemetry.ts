/**
 * Pop-up behavioural instrumentation.
 *
 * Captures the measures that only exist because the participant made a real
 * choice in a real interface (PRD §1). Attach `modalRef` to the modal root and
 * mark each interactive control with `data-control="accept|decline|close"`.
 *
 * Two implementation details that decide whether the data means anything:
 *
 * 1. CANCELLED TAPS use document.elementFromPoint at pointerup, NOT the event
 *    target. Touch pointers get implicit pointer capture, so a finger that
 *    slides off a button still fires pointerup on that button — checking
 *    e.target would report zero cancelled taps on every phone in the sample.
 *
 * 2. POINTERCANCEL IS COUNTED SEPARATELY from cancelled taps. On Android,
 *    pointercancel fires whenever a touch turns into a scroll, and the pop-up
 *    is a scrollable bottom sheet. Folding the two together (as PRD §5.1 does)
 *    would make `cancelled_taps` largely a measure of scrolling.
 */
import { useCallback, useRef } from 'react';
import { now, ms } from './clock';
import { TIMING } from '../data/config';
import type { PopupResult } from '../machine/types';

interface Tap {
  t: number;
  x: number;
  y: number;
}

export interface PopupTelemetry {
  /** Ref callback for the modal root. Attaches and detaches all listeners. */
  modalRef: (el: HTMLElement | null) => void;
  /** Call from afterPaint() once the pop-up's first frame is composited. */
  markRendered: (t: number) => void;
  /** Milliseconds since the pop-up was painted. Null if never marked. */
  latency: () => number | null;
  /** Accumulated telemetry, for dispatch at the moment of the committed action. */
  snapshot: () => Partial<PopupResult>;
}

export function usePopupTelemetry(): PopupTelemetry {
  const renderedAt = useRef<number | null>(null);
  const firstTouchAt = useRef<number | null>(null);
  const cancelledTaps = useRef(0);
  const pointerCancels = useRef(0);
  const pressDwellMs = useRef(0);
  const rageTaps = useRef(0);
  const scrollEvents = useRef(0);

  const declinePressStart = useRef<number | null>(null);
  const downControl = useRef<Element | null>(null);
  const recentTaps = useRef<Tap[]>([]);
  const cleanup = useRef<(() => void) | null>(null);

  const controlOf = (node: EventTarget | null): Element | null =>
    node instanceof Element ? node.closest('[data-control]') : null;

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (firstTouchAt.current === null && renderedAt.current !== null) {
      firstTouchAt.current = now() - renderedAt.current;
    }

    // Rage taps: >=3 pointerdowns inside rageTapWindowMs within rageTapRadiusPx.
    const t = now();
    const recent = recentTaps.current.filter((p) => t - p.t <= TIMING.rageTapWindowMs);
    recent.push({ t, x: e.clientX, y: e.clientY });
    if (recent.length >= 3) {
      const xs = recent.map((p) => p.x);
      const ys = recent.map((p) => p.y);
      const spread = Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      );
      if (spread <= TIMING.rageTapRadiusPx) {
        rageTaps.current += 1;
        recent.length = 0; // count each run once, not once per extra tap
      }
    }
    recentTaps.current = recent;

    const control = controlOf(e.target);
    downControl.current = control;
    if (control?.getAttribute('data-control') === 'decline') {
      declinePressStart.current = t;
    }
  }, []);

  const endPress = useCallback(() => {
    if (declinePressStart.current !== null) {
      pressDwellMs.current += now() - declinePressStart.current;
      declinePressStart.current = null;
    }
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      endPress();
      const started = downControl.current;
      downControl.current = null;
      if (!started) return;
      // Where the finger actually LIFTED, not where the capture says it did.
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const endedOn = under ? under.closest('[data-control]') : null;
      if (endedOn !== started) cancelledTaps.current += 1;
    },
    [endPress],
  );

  const onPointerCancel = useCallback(() => {
    endPress();
    downControl.current = null;
    pointerCancels.current += 1;
  }, [endPress]);

  const onScroll = useCallback(() => {
    scrollEvents.current += 1;
  }, []);

  const modalRef = useCallback(
    (el: HTMLElement | null) => {
      cleanup.current?.();
      cleanup.current = null;
      if (!el) return;

      el.addEventListener('pointerdown', onPointerDown, { passive: true });
      el.addEventListener('pointerup', onPointerUp, { passive: true });
      el.addEventListener('pointercancel', onPointerCancel, { passive: true });
      el.addEventListener('scroll', onScroll, { passive: true, capture: true });
      window.addEventListener('scroll', onScroll, { passive: true });

      cleanup.current = () => {
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('pointerup', onPointerUp);
        el.removeEventListener('pointercancel', onPointerCancel);
        el.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('scroll', onScroll);
      };
    },
    [onPointerDown, onPointerUp, onPointerCancel, onScroll],
  );

  const markRendered = useCallback((t: number) => {
    if (renderedAt.current === null) renderedAt.current = t;
  }, []);

  const latency = useCallback(
    () => (renderedAt.current === null ? null : ms(now() - renderedAt.current)),
    [],
  );

  const snapshot = useCallback((): Partial<PopupResult> => {
    endPress();
    return {
      timeToFirstTouchMs: firstTouchAt.current === null ? null : ms(firstTouchAt.current),
      cancelledTaps: cancelledTaps.current,
      pointerCancels: pointerCancels.current,
      pressDwellMs: ms(pressDwellMs.current),
      rageTaps: rageTaps.current,
      scrollEvents: scrollEvents.current,
    };
  }, [endPress]);

  return { modalRef, markRendered, latency, snapshot };
}
