/**
 * Questionnaire engine (v2) — ONE screen per block: B1–B4 rated items in
 * fixed order, B5 downstream choice, B6 optional open-ended.
 *
 * Order is unchanged from v1 in spirit and still matters (Instrument_v2.md):
 * feelings (guilt, irritation) before any item that names pressure or intent
 * (manipulation). RATED_ITEMS in src/data/items.ts is the single fixed
 * sequence — this component renders it in array order and never reorders it.
 * Unlike v1, items are NOT shuffled within the screen: with only four items,
 * "feelings before intent" is a per-item constraint, and shuffling risks
 * putting the manipulation item before irritation by chance.
 */
import { useEffect } from 'react';
import { Screen, PrimaryButton } from '../components/Screen';
import { ScaleRow, ChoiceList } from '../components/Scale';
import { BRANDS } from '../data/brands';
import { RATED_ITEMS, DOWNSTREAM_CHOICE_OPTIONS, DOWNSTREAM_CHOICE_STEM, BLOCK_OPEN_ENDED_STEM, type DownstreamChoice } from '../data/items';
import { useSession } from '../machine/SessionContext';
import type { BlockKey } from '../machine/types';

export function QuestionnaireBlock({ blockKey }: { blockKey: BlockKey }): JSX.Element {
  const api = useSession();
  const { session } = api;
  const block = session.blocks![blockKey]!;
  const brand = BRANDS[block.brandId];

  // Scroll to top on block change: carrying scroll position from the first
  // block's screen into the second makes participants think the page did not
  // advance.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [blockKey]);

  const ratedComplete = RATED_ITEMS.every((i) => block.ratings[i.id] != null);
  const complete = ratedComplete && block.downstreamChoice != null;

  return (
    <Screen
      footer={
        <PrimaryButton onClick={() => api.advance()} disabled={!complete}>
          Continue
        </PrimaryButton>
      }
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400 mb-2">
        {brand.name}
      </p>
      <h1 className="text-[19px] font-semibold leading-snug mb-1">A few quick reactions</h1>
      <p className="text-[13px] text-neutral-500 mb-2">
        There are no right answers — your first reaction is fine.
      </p>

      <div className="divide-y divide-neutral-150">
        {RATED_ITEMS.map((item) => (
          <ScaleRow
            key={item.id}
            item={item}
            value={block.ratings[item.id] ?? null}
            onChange={(v) => api.rate(blockKey, item.id, v)}
          />
        ))}
      </div>

      <div className="pt-5 pb-2">
        <p className="text-[15px] leading-snug text-neutral-900 mb-3">{DOWNSTREAM_CHOICE_STEM}</p>
        <ChoiceList
          name={`downstream-${blockKey}`}
          options={DOWNSTREAM_CHOICE_OPTIONS}
          value={block.downstreamChoice}
          onChange={(v) => api.setDownstreamChoice(blockKey, v as DownstreamChoice)}
        />
      </div>

      <div className="pt-5">
        <p className="text-[14px] leading-snug text-neutral-700 mb-2">{BLOCK_OPEN_ENDED_STEM}</p>
        <textarea
          value={block.openEnded}
          onChange={(e) => api.setBlockOpenEnded(blockKey, e.target.value)}
          placeholder="Optional — a sentence or two is plenty."
          rows={3}
          className="w-full rounded-lg border border-neutral-300 p-3 text-[15px] leading-relaxed
                     focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400"
        />
      </div>
    </Screen>
  );
}
