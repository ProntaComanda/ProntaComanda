import { cn } from '../../lib/cn';

// Lista com barra de proporção: serve ao Top 5 Produtos (com número da posição) e ao
// Status dos Pedidos. Cada item: { chave, rotulo, proporcao (0 a 1), extra }.
export default function ListaBarras({ itens, vazio, numerar = false }) {
  if (!itens.length) return <p className="py-8 text-center text-sm text-ink-faint">{vazio}</p>;

  return (
    <ul className="space-y-3.5">
      {itens.map((item, i) => (
        <li
          key={item.chave}
          className={cn(
            'grid items-center gap-3 text-sm',
            numerar ? 'grid-cols-[1.5rem_minmax(0,9rem)_1fr_auto]' : 'grid-cols-[minmax(0,9rem)_1fr_auto]'
          )}
        >
          {numerar && (
            <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-xs font-bold text-white">
              {i + 1}
            </span>
          )}
          <span className="truncate" title={item.rotulo}>
            {item.rotulo}
          </span>
          {/* a barra é decorativa: o valor ao lado já diz tudo */}
          <span className="h-1.5 overflow-hidden rounded-full bg-tile" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, item.proporcao * 100))}%` }}
            />
          </span>
          <span className="min-w-[5.5rem] text-right text-xs tabular-nums text-ink-soft">{item.extra}</span>
        </li>
      ))}
    </ul>
  );
}
