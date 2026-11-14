import { Button, IconLogout, Logo, ThemeToggle } from '../ui';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../store/authStore';

// Barra de topo dos perfis de uma tela só: logo, quem está logado, tema e sair.
// Usada pelo garçom (RF19, com o status do tempo real em `conectado`) e pelo caixa (sem
// `conectado`: aparece o perfil no lugar). Altura fixa de 4rem, já contando a borda: o layout
// do caixa conta com ela.
// `esticado`: ocupa a largura toda, com logo e nome no canto esquerdo e tema e sair no direito
// (tela de computador, como a do caixa). Sem ele, o conteúdo fica centralizado em até 64rem.
export default function CabecalhoGarcom({ conectado, esticado = false }) {
  const funcionario = useAuthStore((s) => s.funcionario);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-10 h-16 border-b border-line bg-surface/95 backdrop-blur">
      <div
        className={cn(
          'flex h-full items-center justify-between gap-3',
          esticado ? 'px-8' : 'mx-auto max-w-5xl px-4'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="h-7 shrink-0 text-ink" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{funcionario?.nome}</p>
            {conectado === undefined ? (
              <p className="text-xs capitalize text-ink-soft">{funcionario?.perfil}</p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-ink-soft">
                <span
                  className={cn('h-2 w-2 rounded-full', conectado ? 'bg-ok' : 'animate-pulse bg-ink-faint')}
                  aria-hidden="true"
                />
                {conectado ? 'Conectado' : 'Reconectando...'}
              </p>
            )}
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
