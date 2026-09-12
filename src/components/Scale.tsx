/**
 * 7-point response row, and a variant for the comparative block's directional
 * items (§C3/C5), plus the single-select list shared by every choice-based
 * screen.
 */

export interface ScaleRowItem {
  id: string;
  text: string;
  anchorLow: string;
  anchorHigh: string;
}

interface Props {
  item: ScaleRowItem;
  value: number | null;
  onChange: (value: number) => void;
}

export function ScaleRow({ item, value, onChange }: Props): JSX.Element {
  const points = [1, 2, 3, 4, 5, 6, 7];
  return (
    <fieldset className="py-4 border-b border-neutral-150 last:border-0">
      <legend className="text-[15px] leading-snug text-neutral-900 mb-3">{item.text}</legend>
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
        <span>{item.anchorLow}</span>
        <span>{item.anchorHigh}</span>
      </div>
    </fieldset>
  );
}

/**
 * Directional comparison row for C3/C5: 1 = much less … 4 = about the same …
 * 7 = much more. A third, centred label under the midpoint is the one thing
 * ScaleRow doesn't need elsewhere, so it gets its own small component rather
 * than growing ScaleRow's props for a single consumer.
 */
export function ComparativeScaleRow({
  text,
  low,
  mid,
  high,
  value,
  onChange,
}: {
  text: string;
  low: string;
  mid: string;
  high: string;
  value: number | null;
  onChange: (value: number) => void;
}): JSX.Element {
  const points = [1, 2, 3, 4, 5, 6, 7];
  return (
    <fieldset className="py-4 border-b border-neutral-150 last:border-0">
      <legend className="text-[15px] leading-snug text-neutral-900 mb-3">{text}</legend>
      <div className="flex gap-1.5" role="radiogroup">
        {points.map((p) => {
          const selected = value === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${p}${p === 1 ? ` — ${low}` : p === 4 ? ` — ${mid}` : p === 7 ? ` — ${high}` : ''}`}
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
      <div className="grid grid-cols-3 mt-1.5 text-[11px] text-neutral-500">
        <span className="text-left">{low}</span>
        <span className="text-center">{mid}</span>
        <span className="text-right">{high}</span>
      </div>
    </fieldset>
  );
}

/** Single-select list, for awareness / comparative / covariates / demographics. */
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
