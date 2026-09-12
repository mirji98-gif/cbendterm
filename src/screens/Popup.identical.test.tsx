/**
 * ENFORCEMENT TEST for non-negotiable #1, extended for
 * change_spec_v4_final.md Part 2 (two pop-ups per brand).
 *
 * The four decline wordings are the only permitted difference between arms.
 * This test renders BOTH pop-ups (p1 and p2) in all four conditions, replaces
 * the decline label with a fixed placeholder, and asserts the resulting DOM
 * is byte-identical ACROSS ARMS for a given pop-up — headline, offer, accept
 * label, close button, tap-target classes, contrast classes, animation
 * classes and structure alike. It also asserts p1 and p2 differ from each
 * other in copy (they are different pop-ups) but share the exact same
 * decline wording within one block (Part 2: "never mix levels within a
 * brand").
 *
 * If this test fails, a second difference has been introduced between
 * conditions and the manipulation is confounded. There is no statistical fix
 * for that after data collection. Do not "just update the snapshot".
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DECLINE_COPY, type PopupCondition } from '../data/conditions';
import { emptyPopupResult, type BlockData, type PopupKey } from '../machine/types';

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
    productViewed: null,
    timeOnStoreMs: null,
    p1: emptyPopupResult(),
    p2: emptyPopupResult(),
    ratings: { b1_guilt: null, b2_irritation: null, b3_manipulation: null, b4_trust: null },
    downstreamChoice: null, openEnded: '',
  };
}

/** Renders a condition's pop-up and neutralises only the decline string. */
function normalisedMarkup(condition: PopupCondition, popup: PopupKey): string {
  currentBlock = blockFor(condition);
  const { container } = render(<Popup blockKey="neutral" popup={popup} />);
  const html = container.innerHTML;
  cleanup();
  return html.split(DECLINE_COPY[condition]).join('«DECLINE»');
}

const conditions: PopupCondition[] = ['neutral', 'mild', 'strong', 'autonomy'];

describe('pop-up 1 is identical across conditions', () => {
  beforeEach(() => cleanup());

  it('renders byte-identical DOM once the decline label is neutralised', () => {
    const [baseline, ...rest] = conditions.map((c) => normalisedMarkup(c, 'p1'));
    rest.forEach((markup, i) => {
      expect(
        markup,
        `condition "${conditions[i + 1]}" differs from "neutral" in something ` +
          'other than the decline wording (pop-up 1)',
      ).toBe(baseline);
    });
  });
});

describe('pop-up 2 is identical across conditions', () => {
  beforeEach(() => cleanup());

  it('renders byte-identical DOM once the decline label is neutralised', () => {
    const [baseline, ...rest] = conditions.map((c) => normalisedMarkup(c, 'p2'));
    rest.forEach((markup, i) => {
      expect(
        markup,
        `condition "${conditions[i + 1]}" differs from "neutral" in something ` +
          'other than the decline wording (pop-up 2)',
      ).toBe(baseline);
    });
  });
});

describe('pop-up 1 and pop-up 2', () => {
  beforeEach(() => cleanup());

  it('show the SAME decline wording within one block (never mixed levels)', () => {
    for (const condition of conditions) {
      currentBlock = blockFor(condition);
      const { getAllByText: getAllByText1 } = render(<Popup blockKey="neutral" popup="p1" />);
      expect(getAllByText1(DECLINE_COPY[condition]).length).toBeGreaterThan(0);
      cleanup();
      currentBlock = blockFor(condition);
      const { getAllByText: getAllByText2 } = render(<Popup blockKey="neutral" popup="p2" />);
      expect(getAllByText2(DECLINE_COPY[condition]).length).toBeGreaterThan(0);
      cleanup();
    }
  });

  it('differ from each other in headline/subcopy/accept label (they are different pop-ups)', () => {
    currentBlock = blockFor('neutral');
    const { getByText: getByText1 } = render(<Popup blockKey="neutral" popup="p1" />);
    expect(getByText1('Add your email, get 15% off this order')).toBeTruthy();
    cleanup();
    currentBlock = blockFor('neutral');
    const { getByText: getByText2 } = render(<Popup blockKey="neutral" popup="p2" />);
    expect(getByText2('Follow us, get 15% off your next order')).toBeTruthy();
    cleanup();
  });

  // change_spec_v4_1_popup_copy.md: the ask has to be IN the headline, at
  // headline weight — not in the grey subtext where a phone skimmer misses it.
  it('states the ask in the headline element, not only in the subcopy', () => {
    for (const [popup, ask] of [['p1', /add your email/i], ['p2', /follow us/i]] as const) {
      currentBlock = blockFor('neutral');
      const { container } = render(<Popup blockKey="neutral" popup={popup} />);
      const headline = container.querySelector('#offer-headline')!;
      expect(headline.textContent, `pop-up ${popup} headline must carry the ask`).toMatch(ask);
      expect(headline.className).toContain('font-semibold');
      cleanup();
    }
  });

  it('actually render the assigned wording (the manipulation is present)', () => {
    for (const popup of ['p1', 'p2'] as const) {
      for (const condition of conditions) {
        currentBlock = blockFor(condition);
        const { getByText } = render(<Popup blockKey="neutral" popup={popup} />);
        expect(getByText(DECLINE_COPY[condition])).toBeTruthy();
        cleanup();
      }
    }
  });

  it('give accept and decline the same tap target and contrast classes, on both pop-ups', () => {
    for (const popup of ['p1', 'p2'] as const) {
      currentBlock = blockFor('strong');
      const { container } = render(<Popup blockKey="neutral" popup={popup} />);
      const accept = container.querySelector('[data-control="accept"]')!;
      const decline = container.querySelector('[data-control="decline"]')!;
      expect(decline.className).toBe(accept.className);
      expect(accept.className).toContain('min-h-[48px]');
      cleanup();
    }
  });

  it('keeps the four wordings distinct', () => {
    const values = Object.values(DECLINE_COPY);
    expect(new Set(values).size).toBe(values.length);
  });
});
