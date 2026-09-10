/**
 * Questionnaire engine — one section per screen, forced order, no back.
 *
 * Section order comes from SECTION_ORDER in the item bank and is a validity
 * constraint, not a layout choice (PRD §2.2): felt emotions are measured
 * before any item that mentions manipulation or intent, so the mediator cannot
 * be contaminated by demand. Nothing in this component chooses the order.
 *
 * Item order WITHIN a randomised section is shuffled per participant and
 * recorded in `itemOrder`, so presentation order is auditable after the fact.
 * The distractor emotions stay in the shuffle pool rather than being appended,
 * or they stop distracting.
 */
import { useEffect, useMemo } from 'react';
import { Screen, PrimaryButton } from '../components/Screen';
import { ScaleRow, interpolate } from '../components/Scale';
import { BRANDS } from '../data/brands';
import { SECTIONS, SECTION_ORDER, activeItems, type Item } from '../data/items';
import { useSession } from '../machine/SessionContext';
import type { BlockKey } from '../machine/types';

/** Stable per participant+block+section, so a re-render never reshuffles. */
function seededOrder(items: Item[], seed: string): Item[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rng = () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function QuestionnaireBlock({ blockKey }: { blockKey: BlockKey }): JSX.Element {
  const api = useSession();
  const { session } = api;
  const block = session.blocks![blockKey]!;
  const brand = BRANDS[block.brandId];
  const sectionId = SECTION_ORDER[session.sectionIndex]!;
  const section = SECTIONS[sectionId];

  const items = useMemo(() => {
    const pool = activeItems(session.cutTier, (block.position - 1) as 0 | 1).filter(
      (i) => i.section === sectionId,
    );
    if (!section.randomise) return pool;
    const recorded = block.itemOrder[sectionId];
    if (recorded) {
      const byId = new Map(pool.map((i) => [i.id, i]));
      const restored = recorded.map((id) => byId.get(id)).filter((i): i is Item => Boolean(i));
      if (restored.length === pool.length) return restored;
    }
    return seededOrder(pool, `${session.participantId}:${blockKey}:${sectionId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.cutTier, block.position, sectionId, section.randomise, session.participantId, blockKey]);

  useEffect(() => {
    if (!block.itemOrder[sectionId]) {
      api.setItemOrder(blockKey, sectionId, items.map((i) => i.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, items]);

  // Scroll to top on section change: carrying scroll position from a long grid
  // into the next screen makes participants think the page did not advance.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sectionId, blockKey]);

  const answered = items.filter((i) => block.responses[i.id] != null).length;
  const complete = answered === items.length;

  return (
    <Screen
      footer={
        <div>
          {!complete && (
            <p className="text-[12px] text-neutral-500 mb-2 text-center">
              {items.length - answered} left on this page
            </p>
          )}
          <PrimaryButton onClick={api.sectionNext} disabled={!complete}>
            Continue
          </PrimaryButton>
        </div>
      }
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400 mb-2">
        {brand.name}
      </p>
      <h1 className="text-[19px] font-semibold leading-snug mb-1">
        {interpolate(section.stem, brand.name)}
      </h1>
      <p className="text-[13px] text-neutral-500 mb-2">
        There are no right answers — your first reaction is fine.
      </p>

      <div className="divide-y divide-neutral-150">
        {items.map((item) => (
          <ScaleRow
            key={item.id}
            item={item}
            brandName={brand.name}
            value={block.responses[item.id] ?? null}
            onChange={(v) => api.answer(blockKey, item.id, v)}
          />
        ))}
      </div>
    </Screen>
  );
}
