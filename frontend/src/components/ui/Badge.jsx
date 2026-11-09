import { cn } from '../../lib/cn';

const TONS = {
  ok: 'bg-ok-soft text-ok-ink', // Disponível, Aberta
  danger: 'bg-danger-soft text-danger-ink', // Indisponível, Fechada
  warning: 'bg-warn-soft text-warn-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-muted text-ink-soft',
};

const PONTOS = {
  ok: 'bg-ok',
  danger: 'bg-danger',
  warning: 'bg-kds-preparo',
  info: 'bg-kds-novo',
  neutral: 'bg-ink-faint',
};

// Pílula de status com bolinha: "● Disponível", "● Indisponível"
export function Badge({ tone = 'neutral', dot = true, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        TONS[tone],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', PONTOS[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
