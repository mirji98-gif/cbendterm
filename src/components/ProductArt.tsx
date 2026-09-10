/**
 * Product illustrations, drawn as inline SVG.
 *
 * Zero network weight, so the storefront paints instantly on mobile data and
 * never shows a loading state — which matters beyond polish: an image still
 * decoding when the pop-up fires would inflate popup_render_gap_ms and push
 * sessions over the §11 exclusion threshold.
 *
 * Both brands use the SAME eight illustrations with the same geometry; only
 * the accent colour differs. Brand identity therefore cannot be confounded
 * with product appeal.
 */
import type { ProductShape } from '../data/brands';

interface Props {
  shape: ProductShape;
  accent: string;
  className?: string;
}

const STROKE = '#3F3F46';

export function ProductArt({ shape, accent, className }: Props): JSX.Element {
  const common = {
    viewBox: '0 0 120 120',
    className,
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
  };
  const line = { stroke: STROKE, strokeWidth: 1.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

  switch (shape) {
    case 'bottle_tall':
      return (
        <svg {...common}>
          <path d="M44 44h32a6 6 0 0 1 6 6v44a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6V50a6 6 0 0 1 6-6Z" fill={accent} fillOpacity="0.16" {...line} />
          <path d="M52 36h16v8H52z" fill={accent} fillOpacity="0.3" {...line} />
          <path d="M50 22h20v14H50z" fill={accent} fillOpacity="0.5" {...line} />
          <path d="M44 66h32" {...line} />
          <path d="M44 78h32" stroke={STROKE} strokeWidth="0.8" strokeOpacity="0.4" />
        </svg>
      );
    case 'bottle_small':
      return (
        <svg {...common}>
          <path d="M40 56h40a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6V62a6 6 0 0 1 6-6Z" fill={accent} fillOpacity="0.16" {...line} />
          <path d="M54 48h12v8H54z" fill={accent} fillOpacity="0.3" {...line} />
          <path d="M52 34h16v14H52z" fill={accent} fillOpacity="0.5" {...line} />
          <ellipse cx="60" cy="76" rx="14" ry="9" fill={accent} fillOpacity="0.22" {...line} />
        </svg>
      );
    case 'scarf':
      return (
        <svg {...common}>
          <path d="M26 34h68v52H26z" fill={accent} fillOpacity="0.14" {...line} />
          <path d="M26 34 60 60 94 34M26 86l34-26 34 26" {...line} />
          <path d="M26 86v6M40 86v6M54 86v6M68 86v6M82 86v6M94 86v6" stroke={STROKE} strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="60" cy="60" r="6" fill={accent} fillOpacity="0.4" {...line} />
        </svg>
      );
    case 'sunglasses':
      return (
        <svg {...common}>
          <path d="M18 50h84" {...line} />
          <path d="M22 52h34a4 4 0 0 1 4 4v6a14 14 0 0 1-14 14h-14a14 14 0 0 1-14-14v-6a4 4 0 0 1 4-4Z" fill={accent} fillOpacity="0.3" {...line} />
          <path d="M64 52h34a4 4 0 0 1 4 4v6a14 14 0 0 1-14 14H74a14 14 0 0 1-14-14v-6a4 4 0 0 1 4-4Z" fill={accent} fillOpacity="0.3" {...line} />
          <path d="M56 58c2.6-1.6 5.4-1.6 8 0" {...line} />
        </svg>
      );
    case 'cardholder':
      return (
        <svg {...common}>
          <rect x="24" y="40" width="72" height="44" rx="6" fill={accent} fillOpacity="0.18" {...line} />
          <path d="M24 58h72" {...line} />
          <path d="M36 40v-4a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v4" fill={accent} fillOpacity="0.28" {...line} />
          <path d="M30 46h60M30 70h60" stroke={STROKE} strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.5" />
        </svg>
      );
    case 'travel_set':
      return (
        <svg {...common}>
          {[26, 52, 78].map((x) => (
            <g key={x}>
              <rect x={x} y="54" width="16" height="36" rx="4" fill={accent} fillOpacity="0.18" {...line} />
              <rect x={x + 5} y="42" width="6" height="12" rx="1.5" fill={accent} fillOpacity="0.45" {...line} />
              <path d={`M${x} 70h16`} stroke={STROKE} strokeWidth="0.8" strokeOpacity="0.4" />
            </g>
          ))}
        </svg>
      );
    case 'candle':
      return (
        <svg {...common}>
          <path d="M34 44h52v42a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8V44Z" fill={accent} fillOpacity="0.14" {...line} />
          <path d="M34 56h52" {...line} />
          <rect x="44" y="66" width="32" height="18" rx="2" fill={accent} fillOpacity="0.3" {...line} />
          <path d="M60 44v-8" {...line} />
          <ellipse cx="60" cy="44" rx="26" ry="5" fill={accent} fillOpacity="0.25" {...line} />
        </svg>
      );
    case 'keyring':
      return (
        <svg {...common}>
          <circle cx="60" cy="40" r="16" fill="none" {...line} />
          <circle cx="60" cy="40" r="12" stroke={STROKE} strokeWidth="0.8" strokeOpacity="0.4" fill="none" />
          <rect x="46" y="54" width="28" height="42" rx="6" fill={accent} fillOpacity="0.22" {...line} />
          <circle cx="60" cy="62" r="3" fill="none" {...line} />
          <path d="M52 76h16" stroke={STROKE} strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.5" />
        </svg>
      );
  }
}
