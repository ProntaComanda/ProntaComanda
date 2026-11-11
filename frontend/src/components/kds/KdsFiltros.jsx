import { cn } from '../../lib/cn';
import { IconSearch, Input } from '../ui';
import { ESTILO_SITUACAO } from './estilos';

const FILTROS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'novo', rotulo: 'Novos' },
  { chave: 'preparo', rotulo: 'Em preparo' },
  { chave: 'pronto', rotulo: 'Prontos' },
  { chave: 'atrasado', rotulo: 'Atrasados' },
];

// Barra de filtros por situação + busca. Os contadores usam as mesmas regras dos cards do topo.
export default function KdsFiltros({ filtro, onFiltro, contagens, busca, onBusca }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-2">
      <div role="group" aria-label="Filtrar pedidos" className="flex flex-wrap items-center gap-1">
        {FILTROS.map(({ chave, rotulo }) => {
          const ativo = filtro === chave;
          const estilo = ESTILO_SITUACAO[chave];
          const total = contagens[chave];
          return (
            <button
              key={chave}
              type="button"
              aria-pressed={ativo}
              onClick={() => onFiltro(chave)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition',
                ativo ? estilo.chipAtivo : 'text-ink-soft hover:text-ink'
              )}
            >
              {rotulo}
              <span
                className={cn(
                  'min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums',
                  ativo
                    ? estilo.contagemAtiva
                    : chave === 'atrasado' && total > 0
                      ? 'bg-kds-atrasado/20 text-kds-atrasado'
                      : 'bg-tile text-ink-soft'
                )}
              >
                {total}
              </span>
            </button>
          );
        })}
      </div>

      <Input
        className="sm:w-72"
        leftIcon={<IconSearch className="h-4 w-4" />}
        value={busca}
        onChange={(e) => onBusca(e.target.value)}
        placeholder="Buscar pedido..."
        aria-label="Buscar pedido por comanda, mesa ou item"
      />
    </div>
  );
}
