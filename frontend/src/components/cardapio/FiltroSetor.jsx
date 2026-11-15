import { cn } from '../../lib/cn';
import { IconChef, IconGrid, IconMartini } from '../ui';

const OPCOES = [
  { valor: 'todos', rotulo: 'Todos os setores', Icone: IconGrid },
  { valor: 'cozinha', rotulo: 'Só cozinha', Icone: IconChef },
  { valor: 'bar', rotulo: 'Só bar', Icone: IconMartini },
];

/**
 * Filtro por setor de preparo do Cardápio (admin): três botões de ícone, "todos", cozinha e bar.
 * `valor`: 'todos' | 'cozinha' | 'bar'. A altura (40px) é a mesma do campo de busca ao lado.
 */
export default function FiltroSetor({ valor, onChange }) {
  return (
    <div
      role="group"
      aria-label="Filtrar por setor de preparo"
      className="inline-flex shrink-0 rounded-md border border-line bg-muted p-0.5"
    >
      {OPCOES.map(({ valor: opcao, rotulo, Icone }) => {
        const ativo = valor === opcao;
        return (
          <button
            key={opcao}
            type="button"
            aria-pressed={ativo}
            aria-label={rotulo}
            title={rotulo}
            onClick={() => onChange(opcao)}
            className={cn(
              'inline-flex h-9 w-10 items-center justify-center rounded transition',
              ativo ? 'bg-brand-gradient text-white shadow-sm' : 'text-ink-soft hover:text-ink'
            )}
          >
            <Icone className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
