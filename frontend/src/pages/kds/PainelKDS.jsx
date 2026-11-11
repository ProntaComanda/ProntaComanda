import { useState } from 'react';
import KDSBoard from '../../components/kds/KDSBoard';
import KdsAjudaModal from '../../components/kds/KdsAjudaModal';
import PageHeader from '../../components/layout/PageHeader';
import { Button, IconLogout, ThemeToggle } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';

/**
 * RF01 - Cozinha e Bar só enxergam isto: o KDS, e nada mais. Sem sidebar
 * de Cardápio/Funcionários/Dashboard/etc — RF01 pede que cada perfil veja
 * só o que usa, não só que seja bloqueado de clicar no resto.
 */
export default function PainelKDS() {
  const funcionario = useAuthStore((s) => s.funcionario);
  const logout = useAuthStore((s) => s.logout);
  const [ajuda, setAjuda] = useState(false);

  // cozinha -> itens marcados setorPreparo='cozinha'; bar -> 'bar'
  const setor = funcionario?.perfil === 'bar' ? 'bar' : 'cozinha';

  // Ao limpar a sessão, a RotaProtegida redireciona para /login; se a chamada falhar,
  // a store já limpou a sessão: nada a tratar aqui.
  const sair = () => logout().catch(() => {});

  return (
    <div className="min-h-screen bg-canvas p-8 text-ink">
      <PageHeader
        titulo={setor === 'bar' ? 'Bar' : 'Cozinha'}
        descricao="Acompanhe e organize os pedidos em preparo em tempo real"
        onAjuda={() => setAjuda(true)}
        acoes={
          <>
            <span className="hidden text-sm text-ink-soft sm:inline">{funcionario?.nome}</span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" leftIcon={<IconLogout className="h-4 w-4" />} onClick={sair}>
              Sair
            </Button>
          </>
        }
      />

      <KDSBoard setor={setor} />

      <KdsAjudaModal aberto={ajuda} onFechar={() => setAjuda(false)} />
    </div>
  );
}
