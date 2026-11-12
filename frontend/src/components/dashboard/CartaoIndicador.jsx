import { cn } from '../../lib/cn';
import { IconArrowDown, IconArrowUp } from '../ui';
import { decimal } from '../../utils/numero';

/**
 * Seta + percentual de variação. `invertido`: quando subir é ruim (ex.: cancelamentos),
 * a cor troca (subiu = vermelho). Sem base de comparação, não mostra nada.
 */
export function SetaVariacao({ variacao, invertido = false }) {
  if (variacao == null) return null;
  const subiu = variacao >= 0;
  const bom = subiu !== invertido;
  const Seta = subiu ? IconArrowUp : IconArrowDown;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-semibold', bom ? 'text-ok-ink' : 'text-danger-ink')}>
      <Seta className="h-3.5 w-3.5" />
      {decimal(Math.abs(variacao))}%
    </span>
  );
}

/**
 * Indicador do topo (Ganhos Totais, Ticket Médio...). `valor` já vem formatado.
 * Todos os cards têm a mesma estrutura e a mesma altura: ícone + título, valor em destaque
 * e, por último, a variação em relação ao período anterior.
 */
export default function CartaoIndicador({ titulo, Icone, valor, variacao, comparacao, invertido, carregando }) {
  // valores longos (ex.: R$ 1.245.280,90) diminuem a fonte para nunca estourar o card
  const tamanhoValor = String(valor).length > 12 ? 'text-base' : 'text-xl';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-l-4 border-line border-l-primary bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-ink">
          <Icone className="h-5 w-5" />
        </span>
        <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-ink-soft">{titulo}</p>
      </div>

      {carregando ? (
        <span className="block h-7 w-28 animate-pulse rounded bg-muted" aria-label="Carregando" />
      ) : (
        <p className={cn('font-bold leading-none tabular-nums', tamanhoValor)}>{valor}</p>
      )}

      <p className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-line pt-3 text-xs">
        {variacao == null ? (
          <span className="text-ink-faint">{carregando ? '\u00a0' : 'sem comparação'}</span>
        ) : (
          <>
            <SetaVariacao variacao={variacao} invertido={invertido} />
            <span className="text-ink-soft">{comparacao}</span>
          </>
        )}
      </p>
    </div>
  );
}
