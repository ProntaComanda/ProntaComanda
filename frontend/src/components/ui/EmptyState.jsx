import { cn } from '../../lib/cn';

// Tela/lista vazia: explica o que falta e oferece o próximo passo.
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && <div className="mb-3 text-ink-faint">{icon}</div>}
      <h3 className="font-display text-base text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
