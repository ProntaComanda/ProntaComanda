import { useState } from 'react';
import { Button, IconChevronDown, Stepper } from '../ui';
import { cn } from '../../lib/cn';
import { dinheiro } from '../../utils/dinheiro';

/**
 * RF20 - pedido em montagem, fixo no pé da tela (sempre à mão no celular). Dá para recolher a
 * lista e ficar só com o total e o botão. O "−" vira lixeira quando a linha chega a 1.
 */
export default function CarrinhoPedido({ linhas, numeroComanda, enviando, onAlterar, onEnviar }) {
  const [aberto, setAberto] = useState(true);
  const itens = linhas.reduce((n, l) => n + l.quantidade, 0);
  const total = linhas.reduce((soma, l) => soma + l.quantidade * l.produto.preco, 0);

  return (
    <section
      aria-label="Pedido em montagem"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-3xl border-t border-line bg-surface shadow-[0_-8px_24px_rgb(0_0_0/0.12)] md:rounded-t-xl md:border-x"
    >
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold">
            Pedido · Comanda #{String(numeroComanda).padStart(3, '0')}
          </span>
          <span className="text-xs text-ink-soft">{itens === 1 ? '1 item' : `${itens} itens`}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-bold tabular-nums">{dinheiro(total)}</span>
          <IconChevronDown className={cn('h-5 w-5 text-ink-soft transition-transform', !aberto && 'rotate-180')} />
        </span>
      </button>

      {aberto && (
        <ul className="max-h-[38vh] divide-y divide-line overflow-y-auto border-t border-line px-4">
          {linhas.map((linha) => (
            <li key={linha.chave} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{linha.produto.nome}</p>
                {linha.observacao && <p className="text-xs text-ink-soft">• {linha.observacao}</p>}
              </div>
              <Stepper
                grande
                lixeira
                nome={linha.produto.nome}
                valor={linha.quantidade}
                onDecrement={() => onAlterar(linha.chave, -1)}
                onIncrement={() => onAlterar(linha.chave, 1)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Button fullWidth size="lg" loading={enviando} onClick={onEnviar}>
          Enviar pedido
        </Button>
      </div>
    </section>
  );
}
