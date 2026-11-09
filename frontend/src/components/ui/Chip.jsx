import { cn } from '../../lib/cn';

// Filtro em pílula (categorias do cardápio, filtros da Cozinha).
// `count` mostra o contador ao lado do texto, como nos filtros do KDS.
export function Chip({ active = false, count, className, children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full px-5 text-xs font-semibold transition',
        active ? 'bg-brand-gradient text-white shadow-md' : 'bg-muted text-ink-soft hover:text-ink',
        className
      )}
      {...rest}
    >
      {children}
      {count != null && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px]',
            active ? 'bg-white/25' : 'bg-tile text-ink-soft'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
