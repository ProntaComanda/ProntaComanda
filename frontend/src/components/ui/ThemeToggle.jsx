import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../lib/cn';
import { IconTheme } from './Icons';

// Botão de tema (meio círculo) da sidebar do design.
export function ThemeToggle({ className }) {
  const tema = useThemeStore((s) => s.tema);
  const alternar = useThemeStore((s) => s.alternar);
  const rotulo = tema === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro';
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition hover:bg-muted hover:text-ink',
        className
      )}
    >
      <IconTheme />
    </button>
  );
}
