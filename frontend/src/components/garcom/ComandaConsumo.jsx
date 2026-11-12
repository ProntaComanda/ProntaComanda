import { Badge } from '../ui';
import { cn } from '../../lib/cn';
import { agruparItens } from '../../utils/agruparItens';
import { ROTULO_STATUS_ITEM, subtotalComanda } from '../../utils/comanda';
import { dinheiro } from '../../utils/dinheiro';

// cor da bolinha de cada etapa (as mesmas cores do KDS)
const COR_STATUS = {
  pendente: 'bg-kds-novo',
  em_preparo: 'bg-kds-preparo',
  pronto: 'bg-kds-pronto',
  entregue: 'bg-ink-faint',
};

/**
 * RF23 - espelho de consumo: o que já foi lançado na comanda e em que etapa está cada item.
 * Itens iguais (mesmo produto, observação e etapa) aparecem empilhados: "2x Hambúrguer".
 */
export default function ComandaConsumo({ comanda }) {
  const itens = agruparItens(comanda.itens, (i) => (i.estornado ? 'estornado' : i.statusKDS));
  const prontos = comanda.itens
    .filter((i) => !i.estornado && i.statusKDS === 'pronto')
    .reduce((soma, i) => soma + i.quantidade, 0);

  return (
    <section className="rounded-lg border border-line bg-surface p-4" aria-label={`Consumo da comanda ${comanda.numero}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          Comanda #{String(comanda.numero).padStart(3, '0')}
        </h2>
        {prontos > 0 && (
          <Badge tone="ok">{prontos === 1 ? '1 pronto para entregar' : `${prontos} prontos para entregar`}</Badge>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="py-2 text-sm text-ink-faint">Nenhum item lançado ainda.</p>
      ) : (
        <ul className="divide-y divide-line">
          {itens.map((item) => (
            <li key={item.chave} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className={cn('font-medium', item.estornado && 'text-ink-faint line-through')}>
                  {item.quantidade}x {item.nomeProduto}
                </p>
                {item.observacao && <p className="text-xs text-ink-soft">• {item.observacao}</p>}
              </div>
              {item.estornado ? (
                <span className="shrink-0 text-xs font-medium text-danger-ink">Estornado</span>
              ) : (
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 text-xs',
                    item.statusKDS === 'pronto' ? 'font-semibold text-ok-ink' : 'text-ink-soft'
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', COR_STATUS[item.statusKDS])} aria-hidden="true" />
                  {ROTULO_STATUS_ITEM[item.statusKDS] ?? item.statusKDS}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 flex items-baseline justify-between border-t border-line pt-3 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Subtotal</span>
        <span className="font-bold tabular-nums">{dinheiro(subtotalComanda(comanda))}</span>
      </p>
    </section>
  );
}
