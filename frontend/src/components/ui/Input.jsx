import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

const CAMPO =
  'w-full rounded-md border bg-muted px-3 text-sm text-ink placeholder:text-ink-faint ' +
  'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

function bordas(erro) {
  return erro ? 'border-danger' : 'border-line focus:border-primary';
}

// Rótulo + campo + dica/erro. `className` vai no wrapper (largura, margem).
// forwardRef para funcionar direto com {...register('campo')} do react-hook-form.
function Campo({ id, label, error, hint, className, children }) {
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-soft">
          {label}
        </label>
      )}
      {children(descId)}
      {error ? (
        <p id={descId} className="mt-1 text-xs text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="mt-1 text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, error, hint, leftIcon, className, id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Campo id={inputId} label={label} error={error} hint={hint} className={className}>
      {(descId) => (
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-faint">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={descId}
            className={cn(CAMPO, 'h-10', leftIcon && 'pl-10', bordas(error))}
            {...rest}
          />
        </div>
      )}
    </Campo>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, id, rows = 3, ...rest },
  ref
) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <Campo id={areaId} label={label} error={error} hint={hint} className={className}>
      {(descId) => (
        <textarea
          ref={ref}
          id={areaId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={descId}
          className={cn(CAMPO, 'resize-none py-2', bordas(error))}
          {...rest}
        />
      )}
    </Campo>
  );
});

// Lista suspensa nativa (acessível por padrão). Mesmo contrato do Input.
export const Select = forwardRef(function Select(
  { label, error, hint, className, id, children, ...rest },
  ref
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Campo id={selectId} label={label} error={error} hint={hint} className={className}>
      {(descId) => (
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={descId}
          className={cn(CAMPO, 'h-10', bordas(error))}
          {...rest}
        >
          {children}
        </select>
      )}
    </Campo>
  );
});
