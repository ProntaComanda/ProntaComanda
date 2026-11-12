import { Badge, IconPlus } from '../ui';
import { cn } from '../../lib/cn';
import { dinheiro } from '../../utils/dinheiro';

/**
 * RF20/RF21 - produto do cardápio na tela do garçom, pensado para o toque: o "+" grande
 * adiciona 1 ao pedido e "Com observação" abre as opções (sugestões e quantidade).
 * `noPedido` = quanto desse produto já está no pedido em montagem.
 */
export default function ProdutoLinha({ produto, noPedido, desabilitado, onAdicionar, onObservacao }) {
  const indisponivel = produto.disponivel === false;

  return (
    <li className={cn('flex items-center gap-3 rounded-lg border border-line bg-surface p-3', indisponivel && 'opacity-60')}>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-tight">{produto.nome}</p>
        <p className="mt-0.5 text-sm tabular-nums text-ink-soft">{dinheiro(produto.preco)}</p>
        {indisponivel ? (
          <Badge tone="danger" className="mt-1.5">
            Indisponível
          </Badge>
        ) : (
          <button
            type="button"
            onClick={onObservacao}
            disabled={desabilitado}
            className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          >
            Com observação
          </button>
        )}
      </div>

      {!indisponivel && (
        <div className="flex shrink-0 items-center gap-2">
          {noPedido > 0 && (
            <span
              className="min-w-6 rounded-full bg-primary/15 px-2 py-0.5 text-center text-xs font-bold tabular-nums text-primary"
              aria-label={`${noPedido} no pedido`}
            >
              {noPedido}
            </span>
          )}
          <button
            type="button"
            onClick={onAdicionar}
            disabled={desabilitado}
            aria-label={`Adicionar ${produto.nome}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary text-white transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconPlus className="h-5 w-5" />
          </button>
        </div>
      )}
    </li>
  );
}
