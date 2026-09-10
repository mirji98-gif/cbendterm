/**
 * 7-point response row.
 *
 * Anchor polarity is fixed by the item bank: the negative pole is always at 1
 * (see codebook §"Scale polarity"). That is why no semantic differential in
 * this instrument needs reverse-coding, and why a component must never flip
 * an item's anchors for layout reasons.
 */
import type { Item } from '../data/items';

export function interpolate(text: string, brandName: string): string {
  return text.split('{BRAND}').join(brandName);
}

interface Props {
  item: Item;
  brandName: string;
  value: number | null;
  onChange: (value: number) => void;
}

export function ScaleRow({ item, brandName, value, onChange }: Props): JSX.Element {
  const points = [1, 2, 3, 4, 5, 6, 7];
  const isDifferential = item.scale === 'semantic_diff';
  return (
    <fieldset className="py-4 border-b border-neutral-150 last:border-0">
      <legend className="text-[15px] leading-snug text-neutral-900 mb-3">
        {interpolate(item.text, brandName)}
      </legend>
      <div className="flex gap-1.5" role="radiogroup">
        {points.map((p) => {
          const selected = value === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${p}${p === 1 ? ` — ${item.anchorLow}` : p === 7 ? ` — ${item.anchorHigh}` : ''}`}
              onClick={() => onChange(p)}
              className={
                'flex-1 min-h-[46px] rounded-md border text-[14px] font-medium transition-colors ' +
                (selected
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-300 active:bg-neutral-100')
              }
            >
              {p}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 text-[11px] text-neutral-500">
        <span className={isDifferential ? 'font-medium' : ''}>{item.anchorLow}</span>
        <span className={isDifferential ? 'font-medium' : ''}>{item.anchorHigh}</span>
      </div>
    </fieldset>
  );
}

/** Single-select list, for recognition / covariates / demographics. */
export function ChoiceList({
  options,
  value,
  onChange,
  name,
}: {
  options: readonly { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
  name: string;
}): JSX.Element {
  return (
    <div className="space-y-2" role="radiogroup" aria-label={name}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={
              'w-full min-h-[52px] px-4 py-3 rounded-lg border text-left text-[15px] leading-snug transition-colors ' +
              (selected
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-800 border-neutral-300 active:bg-neutral-100')
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
