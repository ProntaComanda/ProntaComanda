import { Button, IconLogout, Logo, ThemeToggle } from '../ui';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../store/authStore';

// RF19 - cabeçalho do garçom: quem está logado, se o tempo real está conectado, tema e sair.
export default function CabecalhoGarcom({ conectado }) {
  const funcionario = useAuthStore((s) => s.funcionario);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="h-7 shrink-0 text-ink" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{funcionario?.nome}</p>
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span
                className={cn('h-2 w-2 rounded-full', conectado ? 'bg-ok' : 'animate-pulse bg-ink-faint')}
                aria-hidden="true"
              />
              {conectado ? 'Conectado' : 'Reconectando...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<IconLogout className="h-4 w-4" />}
            onClick={() => logout().catch(() => {})}
          >
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
