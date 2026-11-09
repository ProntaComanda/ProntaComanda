import { cn } from '../../lib/cn';

// Cloche (campânula) do Pronta Comanda, desenhada em SVG com currentColor.
// `realce` é a cor do reflexo no domo (deve contrastar com a cor do logo).
// Troque pelo arquivo oficial do logo quando houver (basta manter o nome/props).
export function Logo({ className, showName = false, realce = 'rgb(var(--surface))' }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 100 80" className="h-full w-auto" fill="currentColor" role="img" aria-label="Pronta Comanda">
        <circle cx="50" cy="8" r="6" />
        <path d="M8 62a42 42 0 0 1 84 0z" />
        <path
          d="M22 56a28 28 0 0 1 24-26"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ stroke: realce }}
        />
        <rect x="4" y="66" width="92" height="6" rx="3" />
        <rect x="14" y="75" width="72" height="3" rx="1.5" />
      </svg>
      {showName && <span className="font-display text-lg leading-none">ProntaComanda</span>}
    </span>
  );
}
