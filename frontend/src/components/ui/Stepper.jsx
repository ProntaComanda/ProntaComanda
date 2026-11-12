import { cn } from '../../lib/cn';
import { IconMinus, IconPlus, IconTrash } from './Icons';

const BOTAO =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Seletor de quantidade (− 2 +). Com `lixeira`, o "−" vira lixeira quando a
 * quantidade é 1 (carrinho: tirar o último item remove a linha).
 */
export function Stepper({
  valor,
  onDecrement,
  onIncrement,
  nome = 'item',
  lixeira = false,
  decrementoDesabilitado = false,
  incrementoDesabilitado = false,
  grande = false, // alvos de toque maiores (celular)
  className,
}) {
  const mostraLixeira = lixeira && valor <= 1;
  return (
    <div role="group" aria-label={`Quantidade de ${nome}`} className={cn('inline-flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={decrementoDesabilitado}
        aria-label={mostraLixeira ? `Remover ${nome}` : `Diminuir ${nome}`}
        className={cn(BOTAO, grande && 'h-10 w-10', 'border-line bg-muted hover:bg-tile', mostraLixeira ? 'text-danger-ink' : 'text-ink')}
      >
        {mostraLixeira ? <IconTrash className="h-4 w-4" /> : <IconMinus className="h-4 w-4" />}
      </button>
      <span className={cn('text-center font-semibold', grande ? 'w-8 text-base' : 'w-6 text-sm')} aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={incrementoDesabilitado}
        aria-label={`Aumentar ${nome}`}
        className={cn(BOTAO, grande && 'h-10 w-10', 'border-primary bg-primary text-white hover:brightness-110')}
      >
        <IconPlus className="h-4 w-4" />
      </button>
    </div>
  );
}
