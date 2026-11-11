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
 * Indicador do topo (Ganhos Totais, Total de Pedidos...). `valor` já vem formatado.
 * `extra` é uma linha opcional entre o valor e a variação (ex.: Ticket Médio).
 */
export default function CartaoIndicador({ titulo, Icone, valor, variacao, comparacao, invertido, extra, carregando }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-l-4 border-line border-l-primary bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-ink">
          <Icone className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{titulo}</p>
          {carregando ? (
            <span className="mt-1 block h-6 w-24 animate-pulse rounded bg-muted" aria-label="Carregando" />
          ) : (
            <p className="text-xl font-bold leading-tight tabular-nums">{valor}</p>
          )}
        </div>
      </div>

      {extra}

      <p className="mt-auto flex flex-wrap items-center gap-x-1.5 text-xs">
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
