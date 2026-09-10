/**
 * ENFORCEMENT TEST for non-negotiable #1.
 *
 * The four decline wordings are the only permitted difference between
 * conditions. This test renders the pop-up in all four, replaces the decline
 * label with a fixed placeholder, and asserts the resulting DOM is
 * byte-identical — headline, offer, accept label, close button, tap-target
 * classes, contrast classes, animation classes and structure alike.
 *
 * If this test fails, a second difference has been introduced between
 * conditions and the manipulation is confounded. There is no statistical fix
 * for that after data collection. Do not "just update the snapshot".
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DECLINE_COPY, type PopupCondition } from '../data/conditions';
import type { BlockData } from '../machine/types';

const noop = () => {};

let currentBlock: BlockData;

vi.mock('../machine/SessionContext', () => ({
  useSession: () => ({
    session: { blocks: { neutral: currentBlock, exp: currentBlock }, eventLog: [] },
    popupTelemetry: noop,
    popupResolved: noop,
    popupRendered: noop,
  }),
}));

const { Popup } = await import('./Popup');

function blockFor(condition: PopupCondition): BlockData {
  return {
    key: 'neutral',
    condition,
    // Same brand in every condition: brand is counterbalanced separately, and
    // holding it fixed here isolates the wording as the only variable.
    brandId: 'aurevella',
    position: 1,
    declineLabel: DECLINE_COPY[condition],
    choice: null, latencyMs: null, timeToFirstTouchMs: null,
    cancelledTaps: 0, pointerCancels: 0, pressDwellMs: 0,
    postDismissDwellMs: null, continuationAutoAdvanced: null,
    scrollEvents: 0, rageTaps: 0, popupRenderGapMs: null,
    productViewed: null, timeOnStoreMs: null, timingInvalidated: false,
    responses: {}, itemOrder: {},
  };
}

/** Renders a condition and neutralises only the decline string. */
function normalisedMarkup(condition: PopupCondition): string {
  currentBlock = blockFor(condition);
  const { container } = render(<Popup blockKey="neutral" />);
  const html = container.innerHTML;
  cleanup();
  return html.split(DECLINE_COPY[condition]).join('«DECLINE»');
}

describe('pop-up is identical across conditions', () => {
  beforeEach(() => cleanup());

  const conditions: PopupCondition[] = ['neutral', 'mild', 'strong', 'autonomy'];

  it('renders byte-identical DOM once the decline label is neutralised', () => {
    const [baseline, ...rest] = conditions.map(normalisedMarkup);
    rest.forEach((markup, i) => {
      expect(
        markup,
        `condition "${conditions[i + 1]}" differs from "neutral" in something ` +
          'other than the decline wording',
      ).toBe(baseline);
    });
  });

  it('actually renders the assigned wording (the manipulation is present)', () => {
    for (const condition of conditions) {
      currentBlock = blockFor(condition);
      const { getByText } = render(<Popup blockKey="neutral" />);
      expect(getByText(DECLINE_COPY[condition])).toBeTruthy();
      cleanup();
    }
  });

  it('gives accept and decline the same tap target and contrast classes', () => {
    currentBlock = blockFor('strong');
    const { container } = render(<Popup blockKey="neutral" />);
    const accept = container.querySelector('[data-control="accept"]')!;
    const decline = container.querySelector('[data-control="decline"]')!;
    expect(decline.className).toBe(accept.className);
    expect(accept.className).toContain('min-h-[52px]');
    cleanup();
  });

  it('keeps the four wordings distinct', () => {
    const values = Object.values(DECLINE_COPY);
    expect(new Set(values).size).toBe(values.length);
  });
});
