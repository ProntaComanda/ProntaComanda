import { cn } from '../../lib/cn';
import { Spinner } from '../ui';
import { agruparItens } from '../../utils/agruparItens';
import { decorrido } from '../../utils/tempo';
import { ESTILO_SITUACAO, ROTULO_BOTAO } from './estilos';

const pad = (valor, tamanho) => String(valor).padStart(tamanho, '0');

/**
 * Card de um pedido (uma comanda, só os itens do setor). A borda e o botão seguem a
 * situação (novo, em preparo, pronto, atrasado); o tempo fica amarelo ao chegar a 70% do prazo.
 */
export default function CardPedido({ pedido, situacao, emAlerta, agora, ocupado, onAvancar }) {
  const estilo = ESTILO_SITUACAO[situacao];
  // a cozinha vê "2x Hambúrguer" em vez de duas linhas iguais
  const itens = agruparItens(pedido.itens, (i) => i.statusKDS);

  return (
    <article className={cn('flex flex-col rounded-lg border border-l-4 border-line bg-surface p-4 shadow-sm', estilo.borda)}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl leading-none">#{pad(pedido.numeroComanda, 3)}</h3>
          <p className="mt-1 text-sm text-ink-soft">Mesa {pad(pedido.mesa?.numero ?? '--', 2)}</p>
        </div>
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            emAlerta ? 'text-amber-600 dark:text-amber-400' : estilo.texto
          )}
        >
          Há {decorrido(agora - new Date(pedido.lancadoEm).getTime())}
        </span>
      </header>

      <ul className="mt-3 flex-1 space-y-2 border-t border-line pt-3 text-sm">
        {itens.map((item) => (
          <li key={item.chave} className="grid grid-cols-[2rem_1fr]">
            <span className="pt-0.5 text-xs tabular-nums text-ink-faint">{item.quantidade}x</span>
            <div>
              <p className="font-medium">{item.nomeProduto}</p>
              {item.observacao && <p className="text-xs text-ink-soft">• {item.observacao}</p>}
            </div>
          </li>
        ))}
      </ul>

      <footer className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className={cn('text-xs font-bold uppercase tracking-wide', estilo.texto)}>{estilo.rotulo}</span>
        <button
          type="button"
          onClick={() => onAvancar(pedido.comandaId)}
          disabled={ocupado}
          className={cn(
            'inline-flex h-9 min-w-36 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold text-white transition',
            'disabled:cursor-not-allowed disabled:opacity-60',
            estilo.botao
          )}
        >
          {ocupado && <Spinner />}
          {ROTULO_BOTAO[pedido.statusGeral]}
        </button>
      </footer>
    </article>
  );
}
