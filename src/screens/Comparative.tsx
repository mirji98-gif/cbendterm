/**
 * Comparative block (Instrument_v2.md, screen 11).
 *
 * Uses the real brand names throughout. "Brand 1" / "Brand 2" mean
 * PRESENTATION POSITION (first store visited / second), never condition —
 * see src/data/comparative.ts for why that distinction has to survive all
 * the way to the recoded columns.
 *
 * This block is corroborating evidence, not primary evidence (see the
 * caution in src/data/comparative.ts and codebook.md §5). Nothing about that
 * changes how it's built — only how it should be read.
 */
import { Screen, PrimaryButton, Heading } from '../components/Screen';
import { ChoiceList, ComparativeScaleRow } from '../components/Scale';
import {
  C1_STEM, C2_STEM, C3_STEM, C4_STEM, C5_STEM, C6_STEM,
  C3_SCALE, C5_SCALE, withBrands, c1Options, c2Options, c4Options,
  type BrandRef, type ComparativeRaw,
} from '../data/comparative';
import { BRANDS } from '../data/brands';
import { useSession } from '../machine/SessionContext';
import { blockAtPosition } from '../machine/types';

export function Comparative(): JSX.Element {
  const api = useSession();
  const { session } = api;
  const order = session.assignment!.order;
  const brand1Key = blockAtPosition(order, 1);
  const brand2Key = blockAtPosition(order, 2);

  const brand1: BrandRef = { id: session.blocks![brand1Key]!.brandId, name: BRANDS[session.blocks![brand1Key]!.brandId].name };
  const brand2: BrandRef = { id: session.blocks![brand2Key]!.brandId, name: BRANDS[session.blocks![brand2Key]!.brandId].name };

  const e = session.endMatter;
  const complete = e.c1Raw != null && e.c2Raw != null && e.c3Raw != null && e.c4Raw != null && e.c5Raw != null;

  return (
    <Screen
      footer={
        <PrimaryButton onClick={() => api.advance()} disabled={!complete}>
          Continue
        </PrimaryButton>
      }
    >
      <Heading>Comparing the two</Heading>
      <p className="text-[13px] text-neutral-500 mb-5">
        A few last questions about both stores together.
      </p>

      <section className="mb-6">
        <p className="text-[15px] leading-snug text-neutral-900 mb-3">{C1_STEM}</p>
        <ChoiceList
          name="c1"
          options={c1Options(brand1, brand2)}
          value={e.c1Raw}
          onChange={(v) => api.setEndMatter({ c1Raw: v as ComparativeRaw })}
        />
      </section>

      <section className="mb-6">
        <p className="text-[15px] leading-snug text-neutral-900 mb-3">{C2_STEM}</p>
        <ChoiceList
          name="c2"
          options={c2Options(brand1, brand2)}
          value={e.c2Raw}
          onChange={(v) => api.setEndMatter({ c2Raw: v as ComparativeRaw })}
        />
      </section>

      <ComparativeScaleRow
        text={withBrands(C3_STEM, brand1, brand2)}
        low={C3_SCALE.low}
        mid={C3_SCALE.mid}
        high={C3_SCALE.high}
        value={e.c3Raw}
        onChange={(v) => api.setEndMatter({ c3Raw: v })}
      />

      <section className="mb-6 pt-2">
        <p className="text-[15px] leading-snug text-neutral-900 mb-3">{C4_STEM}</p>
        <ChoiceList
          name="c4"
          options={c4Options(brand1, brand2)}
          value={e.c4Raw}
          onChange={(v) => api.setEndMatter({ c4Raw: v as ComparativeRaw })}
        />
      </section>

      <ComparativeScaleRow
        text={withBrands(C5_STEM, brand1, brand2)}
        low={C5_SCALE.low}
        mid={C5_SCALE.mid}
        high={C5_SCALE.high}
        value={e.c5Raw}
        onChange={(v) => api.setEndMatter({ c5Raw: v })}
      />

      <div className="pt-5">
        <p className="text-[14px] leading-snug text-neutral-700 mb-2">{C6_STEM}</p>
        <textarea
          value={e.c6Open}
          onChange={(ev) => api.setEndMatter({ c6Open: ev.target.value })}
          placeholder="Optional — a sentence or two is plenty."
          rows={3}
          className="w-full rounded-lg border border-neutral-300 p-3 text-[15px] leading-relaxed
                     focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400"
        />
      </div>
    </Screen>
  );
}
