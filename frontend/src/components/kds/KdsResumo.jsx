import { cn } from '../../lib/cn';
import { IconAlert, IconBowl, IconClipboard, IconFileText } from '../ui';
import { ESTILO_SITUACAO } from './estilos';

const CARDS = [
  { chave: 'todos', rotulo: 'Total de pedidos', Icone: IconClipboard },
  { chave: 'novo', rotulo: 'Novos', Icone: IconFileText },
  { chave: 'preparo', rotulo: 'Em preparo', Icone: IconBowl },
  { chave: 'atrasado', rotulo: 'Atrasados', Icone: IconAlert },
];

// Os quatro números do topo da Cozinha. `contagens` vem de KDSBoard.
export default function KdsResumo({ contagens }) {
  return (
    <section aria-label="Resumo dos pedidos" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map(({ chave, rotulo, Icone }) => {
        const estilo = ESTILO_SITUACAO[chave];
        return (
          <div
            key={chave}
            className={cn(
              'flex items-center gap-4 rounded-lg border border-t-2 border-line bg-surface p-4 shadow-sm',
              estilo.topo
            )}
          >
            <span
              className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-md', estilo.fundo, estilo.texto)}
            >
              <Icone className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-3xl leading-none tabular-nums">{contagens[chave]}</p>
              <p className="mt-1 truncate text-sm text-ink-soft">{rotulo}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
