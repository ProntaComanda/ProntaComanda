import { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

const VARIANTES = {
  // Gradiente laranja->vermelho: ação principal ("Entrar", "Fechar Mesa", "Finalizar pedido")
  primary: 'bg-brand-gradient text-white shadow-sm hover:brightness-110',
  // Laranja sólido: ações dentro de cards ("Adicionar")
  solid: 'bg-primary text-white hover:brightness-110',
  // Preto no claro, claro no escuro: ações de gestão ("Adicionar Mesa", "Nova comanda")
  strong: 'bg-strong text-strong-ink hover:opacity-90',
  danger: 'bg-danger text-white hover:brightness-110',
  secondary: 'bg-tile text-ink hover:brightness-95 dark:hover:brightness-125',
  ghost: 'bg-transparent text-ink-soft hover:bg-muted hover:text-ink',
};

const TAMANHOS = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
};

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    type = 'button',
    disabled,
    className,
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-md font-semibold',
        'transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTES[variant],
        TAMANHOS[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
    </button>
  );
});
