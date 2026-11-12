import { memo } from 'react';
import { cn } from '../../lib/cn';
import Cronometro from './Cronometro';

// A cor da borda de baixo é só a projeção do status (RNF03): o status é a fonte da verdade.
const BORDA = {
  livre: 'border-b-ok',
  ocupada: 'border-b-danger',
  aguardando_fechamento: 'border-b-kds-preparo',
};

export const TOM_STATUS_MESA = { livre: 'neutral', ocupada: 'ok', aguardando_fechamento: 'warning' };

export const ROTULO_STATUS_MESA = {
  livre: 'Livre',
  ocupada: 'Aberta',
  aguardando_fechamento: 'Aguardando fechamento',
};

/**
 * Plaquinha de mesa do mapa (RF04): aba com o cronômetro, número grande e
 * borda colorida embaixo (verde = livre, vermelho = aberta, laranja = pediu a conta).
 */
function MesaCard({ mesa, selecionada, onSelecionar }) {
  const numero = String(mesa.numero).padStart(2, '0');
  const comTempo = mesa.status !== 'livre' && mesa.abertaEm;

  return (
    <button
      type="button"
      onClick={() => onSelecionar(mesa)}
      aria-pressed={selecionada}
      aria-label={`Mesa ${numero}, ${ROTULO_STATUS_MESA[mesa.status].toLowerCase()}`}
      className={cn(
        // O destaque cobre o card inteiro (aba + plaquinha), não só o quadrado.
        'group flex flex-col items-stretch rounded-xl border p-2 transition',
        selecionada
          ? 'border-line bg-[#ececec] shadow-md dark:bg-surface'
          : 'border-transparent hover:bg-surface/60'
      )}
    >
      <span
        className={cn(
          'mx-auto -mb-px flex h-7 w-[62%] items-center justify-center rounded-t-lg',
          'border border-b-0 border-line bg-[#d6d6d6] text-[11px] font-semibold tabular-nums text-ink-soft dark:bg-[#222222]'
        )}
      >
        {comTempo ? <Cronometro desde={mesa.abertaEm} /> : '--:--:--'}
      </span>

      <span
        className={cn(
          'flex aspect-[7/8] flex-col items-center justify-center rounded-lg',
          'border border-b-4 border-line bg-tile shadow-sm transition group-hover:brightness-95',
          'dark:group-hover:brightness-125',
          BORDA[mesa.status]
        )}
      >
        <span
          className={cn(
            'font-display leading-none text-ink/70 [text-shadow:0_3px_4px_rgb(0_0_0/0.25)]',
            numero.length > 2 ? 'text-5xl' : 'text-6xl'
          )}
        >
          {numero}
        </span>
        <span className="mt-3 font-display text-lg text-ink">Mesa</span>
      </span>
    </button>
  );
}

export default memo(MesaCard);
